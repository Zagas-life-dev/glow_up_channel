import { NextResponse } from "next/server"

import { promotionRunDays } from "../../../../config"
import { getItem, reviewItem } from "../../../../server/api"
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
