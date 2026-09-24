/**
 * Every customer-facing line in the Work with us flow.
 *
 * Taken from UP's Low-Ticket Self-Serve Sales Pipeline (§3, §4, §13, §14) and
 * the Flow & Customer Communications doc (§04, §05, §27). Kept apart from
 * `config.ts` because that file is the price list and this one is the sales
 * language — they change for different reasons and by different people.
 *
 * Three rules from those documents govern anything added here:
 *   1. Sell the outcome before the deliverable.
 *   2. Never promise applications, registrations, sales or reach.
 *   3. No fake scarcity, no pressure, no hidden prices.
 */

// ---------------------------------------------------------------------------
// The selector — pipeline §4. Start with the outcome, not the line item.
// ---------------------------------------------------------------------------

export const SELECTOR = {
  title: "What would you like to do?",
  microcopy: "Put it in front of young Africans on UP. Tap one to start.",
  /**
   * One flat menu instead of "submit or promote?" followed by "which kind?" —
   * every extra screen before the form is a place to give up. Plain verbs,
   * no product names, so nobody has to know what a "listing" is.
   */
  options: {
    job: { label: "Post a job", blurb: "Advertise a role to young Africans looking for work." },
    "paid-event": { label: "Post a paid event", blurb: "Sell tickets to your event." },
    "free-opportunity": {
      label: "Share a free opportunity",
      blurb: "Scholarships, grants, fellowships, competitions.",
    },
    "free-event": { label: "Post a free event", blurb: "Anything people can attend for free." },
    resource: {
      label: "Sell a course, guide or template",
      blurb: "We list it and take a share only when it sells.",
    },
    promotion: {
      label: "Promote something",
      blurb: "Get more people to see it — on UP, in our community and on social media.",
    },
  },
  partner: {
    label: "Distribute with us regularly",
    blurb: "A longer arrangement instead of paying per listing.",
    cta: "Talk about partnership",
  },
  help: "Not sure which one? Ask us",
}

// ---------------------------------------------------------------------------
// Intake and review — comms §04
// ---------------------------------------------------------------------------

export const INTAKE = {
  reassurance:
    "You don't need to write a perfect brief. Accurate details and a working link are plenty.",
}

/**
 * The bottom of every form. There is no separate "check it over" screen any
 * more — the total, the terms and the email sit right above the pay button, so
 * the review happens on the way past instead of as one more step.
 */
export const PAY = {
  terms:
    "By paying you confirm the details are correct. We review everything before it goes live, so payment does not guarantee publication.",
  freeTerms: "We review everything before it goes live.",
  payCta: (amount: string) => `Pay ${amount}`,
  freeCta: "Send it in",
  paystackNote: "You'll pay on Paystack's secure page, then come straight back here.",
}

/** When someone comes back from Paystack without having paid. */
export const UNPAID = {
  title: "Your payment wasn't finished",
  body: "No money was taken. Your details are saved, so you don't need to type anything again.",
  retry: "Try paying again",
  edit: "Change my details",
  help: "Stuck? Message us on WhatsApp",
  resume: "You didn't finish paying for",
  resumeCta: "Finish paying",
  discard: "Start fresh instead",
}

// ---------------------------------------------------------------------------
// After payment — comms §05
// ---------------------------------------------------------------------------

export const SUCCESS = {
  paidTitle: "Payment received. Your order is in.",
  freeTitle: "That's in.",
  paidBody:
    "Thanks — we have your payment and the details you submitted. Your order is now with UP for review.",
  freeBody: "Thanks — we have your submission. It's now with UP for review.",
  next: [
    "We review the submission and assets.",
    "If anything needs clarification, we'll contact you.",
    "Once approved, we move it into delivery.",
    "We confirm when the purchased deliverable is complete.",
  ],
  support: "Need to update something? Get in touch and quote your order ID.",
  crossSell: {
    listing:
      "Your listing is sorted. If you want to push it further before the deadline, a platform boost is the usual next step.",
    promotion:
      "Your distribution is sorted. If you're going to be doing this regularly, there are better ways to buy it — just ask.",
  },
}

/**
 * What each order state means to the customer — comms §03 and §08. Kept here
 * so the site, the emails and the admin queue all describe a state the same way.
 */
export const STATUS_COPY: Record<string, { label: string; customer: string }> = {
  awaiting_payment: {
    label: "Awaiting payment",
    customer: "We're holding your order. It starts once the payment goes through.",
  },
  pending_review: {
    label: "Paid — awaiting review",
    customer: "We've received your submission and are reviewing it.",
  },
  needs_clarification: {
    label: "Needs clarification",
    customer: "Almost there — we need one thing from you before we can publish.",
  },
  published: {
    label: "Live",
    customer: "Your listing is live on UP.",
  },
  running: {
    label: "Delivering",
    customer: "Your distribution has started.",
  },
  delivered: {
    label: "Delivered",
    customer: "Your order is complete.",
  },
  rejected: {
    label: "Not proceeding",
    customer: "We're unable to publish this as submitted. We'll be in touch about next steps.",
  },
}
