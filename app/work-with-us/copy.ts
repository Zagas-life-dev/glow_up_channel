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
// The commercial landing — pipeline §3
// ---------------------------------------------------------------------------

export const HERO = {
  title: "Have something valuable to put in front of young Africans?",
  body:
    "UP helps organisations distribute jobs, opportunities, events and relevant initiatives to a young African audience through our platform, community and social channels.",
  promise: "Choose what you need. Pay online. Send us the details. We'll handle the distribution.",
  cta: "Choose a distribution option",
  secondary: "Not sure what you need? Talk to UP",
}

/**
 * Audience proof. The pipeline forbids hard-coding stale numbers, so there is
 * no figure here — the page counts the real users at request time through
 * `/work-with-us/api/stats` and renders nothing at all if that read fails.
 */
export const PROOF = {
  intro: "Built around an existing audience of young Africans.",
  /** Rounded down to the nearest hundred, so the claim is never an overstatement. */
  figure: (users: number) =>
    `${(Math.floor(users / 100) * 100).toLocaleString("en-NG")}+ people on UP`,
}

export const MODEL = {
  title: "You already have something our audience needs.",
  body:
    "Whether you're listing an opportunity, pushing it further on UP, reaching the community or creating social content, you choose the level of distribution that fits your goal.",
}

/** Why UP — pipeline §3.6. Five benefits, outcome-first. */
export const WHY_UP: { title: string; body: string }[] = [
  {
    title: "A relevant audience",
    body:
      "Young Africans actively looking for opportunities, growth, work, learning and useful information.",
  },
  {
    title: "Several surfaces",
    body: "The UP platform, the community and our social channels, depending on what you choose.",
  },
  {
    title: "No sales call",
    body: "Pick a product and pay online. Nothing here is priced behind a conversation.",
  },
  {
    title: "Useful-first, not an ad feed",
    body: "The audience is here for opportunities and resources, so that is what lands well.",
  },
  {
    title: "A defined scope",
    body: "Every product states exactly what you get, so you know what you are buying.",
  },
]

/** What happens, start to finish — pipeline §1.1, comms §02. */
export const HOW_IT_WORKS = [
  "Choose what you need.",
  "Tell us what you're promoting.",
  "Check it over and pay securely.",
  "We review the submission before anything goes live.",
  "We publish or distribute exactly what you bought.",
  "We confirm when it's done.",
]

// ---------------------------------------------------------------------------
// The selector — pipeline §4. Start with the outcome, not the line item.
// ---------------------------------------------------------------------------

export const SELECTOR = {
  title: "What are you trying to achieve?",
  microcopy:
    "Start with what you're trying to do — we'll show you the simplest option that fits.",
  submit: {
    label: "Get an opportunity, job or event onto UP",
    blurb:
      "Listed on the platform with its own page and application link. Opportunities and free events cost nothing.",
    cta: "List it on UP",
  },
  promote: {
    label: "Reach more people with something",
    blurb:
      "Feature it on the platform, push it to the community, or have us make social content for it.",
    cta: "Choose my distribution",
  },
  partner: {
    label: "Distribute with us regularly",
    blurb: "A longer arrangement instead of paying per listing.",
    cta: "Talk about partnership",
  },
  help: "Not sure which is right? Talk to UP",
}

// ---------------------------------------------------------------------------
// Intake and review — comms §04
// ---------------------------------------------------------------------------

export const INTAKE = {
  intro: "Give us the details we need to deliver this. You'll review everything before paying.",
  why:
    "We review paid distribution before it goes live. It's how we protect the quality of what we put in front of the UP audience.",
  reassurance:
    "You don't need to write a perfect brief. Accurate information, a working link and the assets we ask for is plenty.",
}

export const REVIEW = {
  title: "Check it over",
  notice:
    "Please check your details carefully. Once payment is completed, your order goes into UP's review and fulfilment process.",
  terms:
    "By continuing you confirm the information is accurate, and you understand that payment confirms your order but does not guarantee publication if the submission does not meet UP's review standards.",
  payCta: "Continue to secure payment",
  freeCta: "Send it in",
  paystackNote: "Payment is processed securely through Paystack, then you come straight back here.",
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
