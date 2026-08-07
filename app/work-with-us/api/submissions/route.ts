import { NextResponse } from "next/server"

import { buildOrder, trackForKind } from "../../config"
import { newRef, submissions, type SubmissionDoc } from "../../server/db"
import { notifySubmitter, notifyTeam } from "../../server/notify"
import { parsePayload } from "../../server/payload"
import { initializePayment } from "../../server/paystack"

/**
 * Saves a submission and, when there is something to pay, starts the payment.
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

  const doc: SubmissionDoc = {
    ...payload,
    ref: newRef(),
    track: trackForKind(payload.kind),
    quantity: payload.entries.length,
    order,
    amountNg: order.total,
    status: order.total > 0 ? "awaiting_payment" : "pending_review",
    createdAt: now,
    updatedAt: now,
  }

  try {
    const collection = await submissions()
    await collection.insertOne(doc)

    if (doc.amountNg > 0) {
      const authorizationUrl = await initializePayment({
        email: doc.contact.email,
        amountNg: doc.amountNg,
        reference: doc.ref,
        callbackUrl: `${new URL(request.url).origin}/work-with-us`,
        metadata: { ref: doc.ref, kind: doc.kind },
      })
      // Nothing is announced yet — the team hears about it once it is paid for.
      return NextResponse.json({ ref: doc.ref, amountNg: doc.amountNg, authorizationUrl })
    }

    await Promise.all([notifyTeam(doc), notifySubmitter(doc)])
    return NextResponse.json({ ref: doc.ref, amountNg: 0 })
  } catch (error) {
    console.error("work-with-us submission failed:", error)
    return NextResponse.json({ error: "We could not save that. Please try again." }, { status: 500 })
  }
}
