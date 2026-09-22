import { getOrder, markOrderPaid } from "./api"
import { notifySubmitter, notifyTeam } from "./notify"
import { verifyPayment } from "./paystack"

export type ConfirmResult =
  | { ok: true; ref: string; amountNg: number; alreadyPaid: boolean; track: string }
  | { ok: false; status: number; error: string }

/**
 * Marks an order paid once Paystack agrees it was, and releases its items into
 * the review queue. Called both when the person lands back on the site and from
 * the webhook, so it has to be safe to run twice for the same reference.
 *
 * Paystack is asked here rather than in the backend: the secret key belongs to
 * the storefront, which is the side that started the payment. The backend is
 * told the answer and owns what that means for the order — including the
 * conditional update that makes a second call a no-op.
 */
export async function confirmPayment(reference: string): Promise<ConfirmResult> {
  const found = await getOrder(reference)
  if (!found.ok) {
    return found.status === 404
      ? { ok: false, status: 404, error: "We could not find that payment" }
      : { ok: false, status: found.status, error: found.error }
  }

  const doc = found.data.order
  if (doc.status === "paid") {
    return { ok: true, ref: doc.ref, amountNg: doc.amountNg, alreadyPaid: true, track: doc.track }
  }

  const checked = await verifyPayment(reference)
  if (!checked.ok) {
    // Paystack could not be asked, so we do not know. "That payment did not go
    // through" would be a guess here, and the wrong one for someone whose card
    // has already been charged — hold the reference open instead. A missing key
    // is this host's configuration, not the customer's problem, and it reads
    // the same to them either way: nothing is lost, quote the reference.
    console.error(`work-with-us ${doc.ref}: could not verify (${checked.reason}) — ${checked.error}`)
    return {
      ok: false,
      status: 503,
      error: `We could not check that payment just now. Nothing is lost — quote ${doc.ref} and we will confirm it.`,
    }
  }

  const result = checked.data
  if (!result.successful) {
    return { ok: false, status: 400, error: "That payment did not go through" }
  }
  if (result.amountNg < doc.amountNg) {
    console.error(`work-with-us ${doc.ref}: paid ${result.amountNg}, expected ${doc.amountNg}`)
    return { ok: false, status: 400, error: "The amount paid does not match" }
  }

  const recorded = await markOrderPaid(doc.ref, {
    reference,
    channel: result.channel,
    paidAt: new Date(),
    amountNg: result.amountNg,
  })
  if (!recorded.ok) {
    // The money is taken but the order is not marked. Say so rather than
    // reporting a failed payment: the reference is the thread back to it, and
    // calling this again once the backend is up finishes the job.
    console.error(`work-with-us ${doc.ref}: paid but not recorded — ${recorded.error}`)
    return {
      ok: false,
      status: 502,
      error: `Your payment went through, but we could not file it just now. Quote ${doc.ref} and we will sort it.`,
    }
  }

  // Only the call that actually moved the order sends the emails.
  if (recorded.data.alreadyPaid) {
    return { ok: true, ref: doc.ref, amountNg: doc.amountNg, alreadyPaid: true, track: doc.track }
  }

  // Both report their own failures and neither rejects, so a mail outage or an
  // unset SES variable cannot turn a confirmed payment back into an error the
  // customer sees.
  const { order, items } = recorded.data
  await Promise.all([notifyTeam(order, items), notifySubmitter(order, items)])

  return { ok: true, ref: doc.ref, amountNg: doc.amountNg, alreadyPaid: false, track: doc.track }
}
