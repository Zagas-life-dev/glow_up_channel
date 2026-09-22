import { NextResponse } from "next/server"

import {
  BUNDLES,
  PROMOTION_ITEMS,
  buildOrder,
  contentTypeForKind,
  trackForKind,
  type SubmissionPayload,
} from "../../config"
import { createSubmission, type ItemDraft, type OrderDraft } from "../../server/api"
import { notifySubmitter, notifyTeam } from "../../server/notify"
import { parsePayload } from "../../server/payload"
import { initializePayment } from "../../server/paystack"

/**
 * Splits one submission into the things we will have to act on: a listing
 * batch becomes one item per listing, a promotion becomes a single item
 * carrying what was bought.
 *
 * References are not assigned here. The order book mints them, because it owns
 * the collection and can retry a collision instead of storing one.
 */
function buildItems(payload: SubmissionPayload): ItemDraft[] {
  if (payload.kind === "promotion") {
    const bundle = BUNDLES.find((entry) => entry.id === payload.bundleId)
    // A bundle is stored as the items it contains so the queue shows the work,
    // even though the price came from the bundle, not from adding these up.
    const bought = payload.promotions.flatMap((chosen) => {
      const item = PROMOTION_ITEMS.find((entry) => entry.id === chosen.id)
      return item
        ? [{ id: item.id, label: item.label, quantity: chosen.quantity, price: item.price }]
        : []
    })
    if (bundle) {
      bought.unshift({ id: bundle.id, label: bundle.label, quantity: 1, price: bundle.price })
    }

    return [
      {
        itemType: "promotion",
        kind: payload.kind,
        contentType: null,
        fields: payload.entries[0] ?? {},
        promotions: bought,
        target: {
          title: payload.entries[0]?.title ?? "",
          contentId: null,
          listingRef: null,
        },
      },
    ]
  }

  return payload.entries.map((fields) => ({
    itemType: "listing" as const,
    kind: payload.kind,
    contentType: contentTypeForKind(payload.kind),
    fields,
  }))
}

/**
 * Saves an order and, when there is something to pay, starts the payment.
 * The amount comes from config.ts on this side — the browser cannot set a price.
 */
export async function POST(request: Request) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Nothing to submit" }, { status: 400 })
  }

  const parsed = parsePayload(raw)
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { payload } = parsed
  const order = buildOrder(payload)
  const unpaid = order.total > 0

  const draft: OrderDraft = {
    track: trackForKind(payload.kind),
    kind: payload.kind,
    quantity: payload.entries.length,
    duration: payload.duration,
    bundleId: payload.bundleId,
    promotions: payload.promotions,
    revenueShare: payload.revenueShare,
    contact: payload.contact,
    order,
    amountNg: order.total,
  }

  // Nothing can be reviewed before it is paid for. The order book parks an
  // unpaid order's items out of the queue until the payment confirms.
  const created = await createSubmission({ order: draft, items: buildItems(payload) })
  if (!created.ok) {
    console.error("work-with-us submission failed:", created.error)
    return NextResponse.json(
      { error: "We could not save that. Please try again." },
      { status: 500 },
    )
  }

  const { order: orderDoc, items: itemDocs } = created.data

  if (unpaid) {
    const started = await initializePayment({
      email: orderDoc.contact.email,
      amountNg: orderDoc.amountNg,
      reference: orderDoc.ref,
      callbackUrl: `${new URL(request.url).origin}/work-with-us`,
      metadata: { ref: orderDoc.ref, kind: orderDoc.kind },
    })

    if (!started.ok) {
      // The order is saved; only the payment page failed — an unset
      // PAYSTACK_SECRET_KEY, Paystack down, or Paystack saying no. Hand back the
      // reference rather than a bare error, so the submission is not lost and
      // can be picked up from the queue.
      console.error(
        `work-with-us ${orderDoc.ref} saved but payment could not start (${started.reason}):`,
        started.error,
      )
      return NextResponse.json(
        {
          ref: orderDoc.ref,
          error: `We saved your submission as ${orderDoc.ref}, but could not open the payment page. Quote that reference and we will send you a link.`,
        },
        { status: 502 },
      )
    }

    // Nothing is announced yet — the team hears about it once it is paid for.
    return NextResponse.json({
      ref: orderDoc.ref,
      amountNg: orderDoc.amountNg,
      authorizationUrl: started.data,
    })
  }

  // A free submission is complete the moment it is saved. The two emails are a
  // courtesy on top of that and neither rejects, so a mail outage cannot be the
  // reason someone is told their submission did not arrive — which is what the
  // shared catch here used to do, under the wrong message at that.
  await Promise.all([notifyTeam(orderDoc, itemDocs), notifySubmitter(orderDoc, itemDocs)])
  return NextResponse.json({ ref: orderDoc.ref, amountNg: 0 })
}
