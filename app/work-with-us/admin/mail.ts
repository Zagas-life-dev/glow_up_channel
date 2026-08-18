/**
 * The customer back-and-forth, composed by hand in Gmail.
 *
 * Every one of these is a message a person decides to send after looking at a
 * submission — approval, a correction, a rejection, a delivery confirmation. So
 * rather than firing them from the server, the review queue opens Gmail with
 * the right template already filled in, and whoever is reviewing edits the one
 * bracketed detail and hits send. The reply then lands in a normal inbox, which
 * is the whole point: this is a conversation, not a notification.
 *
 * Wording comes from the Flow & Customer Communications doc, §10 through §22.
 * Two rules from §27 that the templates encode and you should keep:
 *   - Never say "your submission has an issue". Name the exact field.
 *   - Never call an opportunity a scam. Say "unable to verify".
 */

import { naira } from "../config"

export type MailTemplate = {
  id: string
  /** What the button says in the queue. */
  label: string
  /** Why you would send this one. */
  hint: string
  subject: (ctx: MailContext) => string
  body: (ctx: MailContext) => string
}

export type MailContext = {
  ref: string
  orderRef: string
  name: string
  title: string
  product: string
  amountNg: number
  liveUrl?: string
}

const hi = (ctx: MailContext) => `Hi ${ctx.name.split(" ")[0] || "there"},`
const signOff = "UP"

/** Every template closes on the order ID — §27 requires it in operational mail. */
function close(ctx: MailContext): string {
  return `Order ID: ${ctx.orderRef}\n\n${signOff}`
}

export const TEMPLATES: MailTemplate[] = [
  {
    id: "in-review",
    label: "In review",
    hint: "They have waited a while and nothing has moved yet.",
    subject: (c) => `We've received your submission — UP is reviewing it (${c.orderRef})`,
    body: (c) => `${hi(c)}

We've received the details for your ${c.product}. Our team is reviewing the submission before delivery.

We're checking that:
• the opportunity is clearly described
• the information and dates are accurate
• the destination link works
• the content is relevant to the UP audience
• the assets can be used as submitted
• the request matches the product purchased

If everything checks out, we'll move it forward. If we need a correction, we'll contact you with exactly what needs to change.

${close(c)}`,
  },
  {
    id: "clarification",
    label: "Needs clarification",
    hint: "Name the exact field, link, date or asset — never just 'there's an issue'.",
    subject: (c) => `Action needed for your UP order — ${c.orderRef}`,
    body: (c) => `${hi(c)}

We've reviewed your ${c.product} submission and need one detail corrected before we can continue.

What we need:
[NAME THE EXACT FIELD, LINK, DATE OR ASSET]

Your payment has been received and your order remains open. Once we have the correction, we'll continue the review.

${close(c)}`,
  },
  {
    id: "approved",
    label: "Approved",
    hint: "Passed review and is going into delivery.",
    subject: (c) => `Approved — your ${c.product} is moving to delivery`,
    body: (c) => `${hi(c)}

Good news — ${c.title || "your submission"} has passed our review and is approved for ${c.product}.

Next step: [PUBLISH / SCHEDULE / PRODUCTION / DISTRIBUTION]

Expected delivery: [DATE / TIME WINDOW]

We'll send you another update once the deliverable is live.

${close(c)}`,
  },
  {
    id: "scheduled",
    label: "Scheduled",
    hint: "A date is set — community pushes and social work.",
    subject: (c) => `Your ${c.product} is scheduled`,
    body: (c) => `${hi(c)}

Your ${c.product} has been approved and scheduled.

Scheduled for: [DATE]
Time/window: [TIME]
Channel: [SURFACE]

We'll confirm once the scheduled delivery has been completed.

${close(c)}`,
  },
  {
    id: "delivered",
    label: "Delivered",
    hint: "Completed. Include the proof link.",
    subject: (c) => `Delivered — your ${c.product} is complete`,
    body: (c) => `${hi(c)}

Your ${c.product} has been completed.

What was delivered:
• [DELIVERABLE]
• [DELIVERABLE]

Published / delivered here:
${c.liveUrl || "[LINK]"}

Delivery date: [DATE]

Thank you for trusting UP with your distribution.

${close(c)}`,
  },
  {
    id: "cannot-verify",
    label: "Cannot verify",
    hint: "Never say scam. 'Unable to verify' is the approved wording.",
    subject: (c) => `Important update about your UP order — ${c.orderRef}`,
    body: (c) => `${hi(c)}

We've reviewed the opportunity submitted for ${c.product} and we're unable to verify it to the standard required for publication on UP.

We found the following:
[FACTUAL DESCRIPTION — e.g. the organisation or destination could not be independently verified, or the information conflicts with available evidence]

Because UP is responsible for what we distribute to our audience, we can't publish or promote an opportunity that we cannot reasonably verify.

Your order is on hold while we determine the appropriate next step under our submission and refund policy.

We will follow up with:
[REFUND / REQUEST FOR VERIFICATION / CANCELLATION]

Thank you for understanding why we take this seriously.

${close(c)}`,
  },
  {
    id: "rejected",
    label: "Cannot deliver",
    hint: "Policy-based reason, stated plainly. Do not shame the customer.",
    subject: (c) => `Update on your UP order — ${c.orderRef}`,
    body: (c) => `${hi(c)}

We've completed our review of your ${c.product} submission. Unfortunately we're unable to proceed with the requested distribution because [POLICY-BASED REASON].

We can't publish or promote this submission through UP in its current form.

Your order is now being handled under our [REFUND / CANCELLATION / ALTERNATIVE] process. We'll confirm the next step separately.

If you believe we've misunderstood the submission, reply with more information and reference your order ID.

${close(c)}`,
  },
  {
    id: "mismatch",
    label: "Wrong product",
    hint: "They bought one thing but asked for another. Explain, don't accuse.",
    subject: (c) => `Quick update on your UP order — ${c.orderRef}`,
    body: (c) => `${hi(c)}

Thanks for your order. We've reviewed the details you submitted.

One thing to clarify before we continue: this came in under ${c.product}, but the information provided indicates that [EXPLAIN — e.g. the event is commercial and falls outside the criteria for a free listing].

Your payment was for ${c.product}, and we can proceed with that once the submission matches its scope.

Reply to this email and we'll help you work out the right route.

${close(c)}`,
  },
  {
    id: "waiting",
    label: "Waiting on them",
    hint: "Paid, but we still need something and they have gone quiet.",
    subject: (c) => `We're waiting on one item for your UP order — ${c.orderRef}`,
    body: (c) => `${hi(c)}

We have your paid ${c.product} order, but we're still waiting for:
[MISSING ITEM]

We can't complete the delivery until we have it.

If you no longer need the service, reply to this email so we can advise on next steps.

${close(c)}`,
  },
  {
    id: "delay",
    label: "Delayed",
    hint: "Give a real reason and a new date.",
    subject: (c) => `Update on your UP ${c.product} — ${c.orderRef}`,
    body: (c) => `${hi(c)}

A quick update on your ${c.product}: we need a little more time before delivery because [CLEAR REASON].

New expected delivery: [DATE]

Your order remains active and we'll keep you updated.

We're sorry for the delay and appreciate your patience.

${close(c)}`,
  },
  {
    id: "ended",
    label: "Placement ended",
    hint: "A time-bound placement reached its end date.",
    subject: (c) => `Your UP ${c.product} has ended`,
    body: (c) => `${hi(c)}

Your ${c.product} placement has now reached the end of its purchased period.

Product: ${c.product}
Start date: [DATE]
End date: [DATE]

Thanks for using UP to distribute ${c.title || "your opportunity"}.

If you have another opportunity to distribute, you can choose your next option here: [LINK]

${close(c)}`,
  },
  {
    id: "refund",
    label: "Refund initiated",
    hint: "Only after the refund has actually been initiated.",
    subject: (c) => `Refund initiated for your UP order — ${c.orderRef}`,
    body: (c) => `${hi(c)}

We've confirmed that your UP order cannot proceed, and a refund of ${naira(c.amountNg)} has been initiated.

Order ID: ${c.orderRef}
Amount: ${naira(c.amountNg)}
Reason: [APPROVED REASON]
Refund reference: [REFERENCE]

Refund timing after initiation depends on the payment provider and your bank.

We're sorry we couldn't deliver this particular request, and we appreciate your understanding.

${signOff}`,
  },
]

/**
 * A Gmail compose URL. `authuser=0` keeps it on the first signed-in account
 * rather than whichever Google profile the browser last used, which matters
 * when someone is signed into a personal account in the same browser.
 */
export function gmailComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  })
  return `https://mail.google.com/mail/u/0/?${params.toString()}`
}

/** Same message as a plain mailto:, for anyone not using Gmail in the browser. */
export function mailtoUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${to}?${params.toString()}`
}
