import { NextResponse } from "next/server"

import {
  BUNDLES,
  PROMOTION_ITEMS,
  buildOrder,
  contentTypeForKind,
  trackForKind,
  type SubmissionPayload,
} from "../../config"
import { itemRef, items, newRef, orders, type ItemDoc, type OrderDoc } from "../../server/db"
import { notifySubmitter, notifyTeam } from "../../server/notify"
import { parsePayload } from "../../server/payload"
import { initializePayment } from "../../server/paystack"

/**
 * Splits one submission into the things we will have to act on: a listing
 * batch becomes one item per listing, a promotion becomes a single item
 * carrying what was bought.
 */
function buildItems(
  payload: SubmissionPayload,
  orderRef: string,
  status: ItemDoc["status"],
  now: Date,
): ItemDoc[] {
  const base = {
    orderRef,
    kind: payload.kind,
    contact: payload.contact,
    status,
    createdAt: now,
    updatedAt: now,
  }

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
        ...base,
        ref: itemRef(orderRef, 1),
        itemType: "promotion",
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

  return payload.entries.map((fields, index) => ({
    ...base,
    ref: itemRef(orderRef, index + 1),
    itemType: "listing" as const,
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
  const now = new Date()
  const ref = newRef()
  const unpaid = order.total > 0

  const orderDoc: OrderDoc = {
    ref,
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
    status: unpaid ? "awaiting_payment" : "pending_review",
    createdAt: now,
    updatedAt: now,
  }

  // Nothing can be reviewed before it is paid for, so unpaid items sit out of
  // the queue until the payment confirms and moves them across.
  const itemDocs = buildItems(payload, ref, unpaid ? "awaiting_payment" : "pending_review", now)

  try {
    await (await orders()).insertOne(orderDoc)
    await (await items()).insertMany(itemDocs)

    if (unpaid) {
      const authorizationUrl = await initializePayment({
        email: orderDoc.contact.email,
        amountNg: orderDoc.amountNg,
        reference: ref,
        callbackUrl: `${new URL(request.url).origin}/work-with-us`,
        metadata: { ref, kind: orderDoc.kind },
      })
      // Nothing is announced yet — the team hears about it once it is paid for.
      return NextResponse.json({ ref, amountNg: orderDoc.amountNg, authorizationUrl })
    }

    await Promise.all([notifyTeam(orderDoc, itemDocs), notifySubmitter(orderDoc, itemDocs)])
    return NextResponse.json({ ref, amountNg: 0 })
  } catch (error) {
    console.error("work-with-us submission failed:", error)
    return NextResponse.json({ error: "We could not save that. Please try again." }, { status: 500 })
  }
}
