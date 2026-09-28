import { NextResponse } from "next/server"

import { promotionRunDays } from "../../../../config"
import { getItem, getOrder, reviewItem } from "../../../../server/api"
import { verifyPayment } from "../../../../server/paystack"
import { publishListing, startPromotion } from "../../../../server/publish"

type Action = "approve" | "reject" | "clarify" | "deliver"

const ACTIONS: Action[] = ["approve", "reject", "clarify", "deliver"]

/**
 * Approve, reject, ask for a correction, or mark delivered. Approving a listing
 * publishes it to the platform using the signed-in admin's own permissions;
 * approving a promotion starts it against whatever it points at.
 *
 * Approving is the only action that reaches outside the order book, so it is
 * the only one that happens in two steps here: publish or grant first, through
 * the platform's ordinary create endpoints, then tell the order book what came
 * of it. The order book re-checks the same preconditions before it writes, so
 * two reviewers racing each other cannot publish the same listing twice.
 *
 * None of these email the customer. Telling someone their listing is live, or
 * what needs fixing, is a message a person writes — the queue opens Gmail with
 * the right template so it goes from a real inbox and replies come back to one.
 */
/**
 * Whether the order behind an item was really paid for. Free orders pass; a paid
 * one passes only if Paystack says its reference succeeded for at least the
 * order's amount. The order's ref is the Paystack reference — a retried payment
 * is saved as a new order under a new ref, so the two always match.
 */
async function confirmPaid(
  orderRef: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const found = await getOrder(orderRef)
  if (!found.ok) return { ok: false, status: found.status, error: found.error }
  const { amountNg } = found.data.order
  if (amountNg <= 0) return { ok: true }

  const checked = await verifyPayment(orderRef)
  // "refused" is Paystack answering — e.g. it has never heard of the reference.
  // That is a no, not an outage, so it falls through to the not-paid answer.
  if (!checked.ok && checked.reason !== "refused") {
    return {
      ok: false,
      status: 503,
      error: `Could not check with Paystack that ${orderRef} was paid (${checked.error}). Try again in a moment.`,
    }
  }
  if (!checked.ok || !checked.data.successful || checked.data.amountNg < amountNg) {
    console.error(`work-with-us ${orderRef}: marked paid but Paystack says otherwise`)
    return {
      ok: false,
      status: 400,
      error: `Paystack has no successful payment of ${amountNg} naira for ${orderRef}. Do not publish this until it is paid.`,
    }
  }
  return { ok: true }
}

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!token) {
    return NextResponse.json(
      { error: "Sign in with an admin account to do this." },
      { status: 401 },
    )
  }

  let ref = ""
  let action: Action = "approve"
  let note = ""
  try {
    const body = await request.json()
    ref = typeof body?.ref === "string" ? body.ref.trim().slice(0, 80) : ""
    action = body?.action
    note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : ""
  } catch {
    // handled below
  }
  if (!ref || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Nothing to do" }, { status: 400 })
  }

  // Everything except approving is a state change and nothing else.
  if (action !== "approve") {
    const result = await reviewItem(ref, { action, note }, token)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  }

  const found = await getItem(ref, token)
  if (!found.ok) {
    const error = found.status === 404 ? "We could not find that item" : found.error
    return NextResponse.json({ error }, { status: found.status })
  }

  const { item, target, approval } = found.data

  if (!approval.canApprove) {
    return approval.alreadyDone
      ? NextResponse.json({ ref, status: approval.status, alreadyDone: true })
      : NextResponse.json({ error: approval.reason ?? "That did not work" }, { status: 400 })
  }

  // The backend's /paid route is open, so "paid" on the order is a claim, not a
  // proof. Approving is the step with an effect, so it asks Paystack itself.
  const paid = await confirmPaid(item.orderRef)
  if (!paid.ok) return NextResponse.json({ error: paid.error }, { status: paid.status })

  // --- Approving a listing: publish it --------------------------------------
  if (item.itemType === "listing") {
    const published = await publishListing({ token }, item)
    if (!published.ok) return NextResponse.json({ error: published.error }, { status: 502 })

    const result = await reviewItem(ref, { action, publishedId: published.contentId }, token)
    if (!result.ok) {
      // Published, but the queue still says otherwise. Name the id so the row
      // can be reconciled by hand rather than published a second time.
      console.error(`work-with-us ${ref}: published ${published.contentId} but not recorded`)
      return NextResponse.json(
        {
          error: `Published as ${published.contentId}, but the queue could not be updated: ${result.error}`,
        },
        { status: 502 },
      )
    }
    return NextResponse.json(result.data)
  }

  // --- Approving a promotion: start it --------------------------------------
  // Social and community work has nothing to run against on the platform, so
  // approving it just says the team has taken it on.
  const needsPlatform = promotionRunDays(item.promotions ?? []) !== null

  if (needsPlatform && !target) {
    // Say which of the two it is. "Publish the listing first" was shown even
    // when no target had ever been recorded, which sent reviewers looking for
    // a listing that does not exist.
    return NextResponse.json(
      {
        error: item.target?.listingRef
          ? `Publish listing ${item.target.listingRef} first — this promotion runs against it.`
          : "This promotion has no target recorded, so there is nothing to run it against. Start it by hand.",
      },
      { status: 400 },
    )
  }

  const started =
    needsPlatform && target
      ? await startPromotion({ token }, item, target)
      : ({ ok: true, days: null } as const)
  if (!started.ok) return NextResponse.json({ error: started.error }, { status: 502 })

  const result = await reviewItem(ref, { action, target, days: started.days }, token)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result.data)
}
