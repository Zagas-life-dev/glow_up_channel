import { submissions } from "./db"
import { notifySubmitter, notifyTeam } from "./notify"
import { verifyPayment } from "./paystack"

export type ConfirmResult =
  | { ok: true; ref: string; amountNg: number; alreadyPaid: boolean }
  | { ok: false; status: number; error: string }

/**
 * Marks a submission paid once Paystack agrees it was. Called both when the
 * person lands back on the site and from the webhook, so it has to be safe to
 * run twice for the same reference.
 */
export async function confirmPayment(reference: string): Promise<ConfirmResult> {
  const collection = await submissions()
  const doc = await collection.findOne({ ref: reference })
  if (!doc) return { ok: false, status: 404, error: "We could not find that payment" }

  if (doc.status === "paid") {
    return { ok: true, ref: doc.ref, amountNg: doc.amountNg, alreadyPaid: true }
  }

  const result = await verifyPayment(reference)
  if (!result.successful) {
    return { ok: false, status: 400, error: "That payment did not go through" }
  }
  if (result.amountNg < doc.amountNg) {
    console.error(`work-with-us ${doc.ref}: paid ${result.amountNg}, expected ${doc.amountNg}`)
    return { ok: false, status: 400, error: "The amount paid does not match" }
  }

  const payment = {
    reference,
    channel: result.channel,
    paidAt: new Date(),
    amountNg: result.amountNg,
  }
  // Only the first caller through here updates the row and sends the emails.
  const updated = await collection.updateOne(
    { ref: doc.ref, status: { $ne: "paid" } },
    { $set: { status: "paid", payment, updatedAt: new Date() } },
  )
  if (updated.modifiedCount === 0) {
    return { ok: true, ref: doc.ref, amountNg: doc.amountNg, alreadyPaid: true }
  }

  const paid = { ...doc, status: "paid" as const, payment }
  await Promise.all([notifyTeam(paid), notifySubmitter(paid)])

  return { ok: true, ref: doc.ref, amountNg: doc.amountNg, alreadyPaid: false }
}
