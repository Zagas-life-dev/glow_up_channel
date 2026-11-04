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
// The question flow — one question per screen
// ---------------------------------------------------------------------------

/**
 * Written so a child could answer it. Three rules on top of the ones above:
 *   1. The question is the heading, in the words someone would say out loud.
 *   2. Every error says what to do next, never what went wrong.
 *   3. No product words — "post", not "listing"; "1 week", not "Standard".
 */
export const FLOW = {
  start: "Takes about 2 minutes",
  step: (n: number, total: number) => `Step ${n} of ${total}`,
  askPerson: "Ask a person",
  next: "Next",
  saveAndBack: "Save and go back",
  back: "Back",

  goal: {
    title: "What do you want to do?",
    hint: "Tap one. You can go back any time.",
    post: { label: "Post something", sub: "A job, an event or an opportunity" },
    promote: { label: "Get more people to see it", sub: "Promote something you already have" },
    sell: { label: "Sell a course or guide", sub: "We only take 15% when it sells" },
    partner: "Posting a lot? Talk about partnership",
  },
  kind: {
    title: "What are you posting?",
    hint: "Pick the one that fits best. Posting is free.",
    job: { label: "A job", sub: "Someone gets paid to work for you" },
    event: { label: "An event", sub: "People come along, in person or online" },
    opp: { label: "An opportunity", sub: "Scholarship, grant, fellowship, programme, competition" },
  },
  size: {
    title: "How big a push?",
    hint: "Bigger means more places, for longer. VAT is added at checkout.",
    names: {
      "bundle-boost": "Small",
      "bundle-distribute": "Medium",
      "bundle-campaign": "Big",
    } as Record<string, string>,
    tailored: "Need something tailored? Reach out",
    includes: "What each package includes",
    reach: "Who you reach",
    measured: "Every package ends with a performance summary: what we delivered, clicks through to your link, and what happened next.",
    tailoredMessage: "Hi UP, I'd like a custom promotion, partnership or larger campaign.",
  },
  title: {
    question: {
      job: "What is the job called?",
      event: "What is the event called?",
      opp: "What is it called?",
      sell: "What is it called?",
      promote: "What is the opportunity called?",
    },
    hint: "Just the name. Keep it short.",
    placeholder: {
      job: "e.g. Product Designer",
      event: "e.g. Lagos Tech Meetup",
      opp: "e.g. Tech4Her Scholarship",
      sell: "e.g. Excel for Beginners",
      promote: "e.g. Tech4Her Scholarship",
    },
    error: "Type the name so people know what it is.",
  },
  link: {
    question: {
      job: "Where do people apply?",
      opp: "Where do people apply?",
      event: "Where do people register or get tickets?",
      promote: "Where do people apply or register?",
      other: "Is there a link?",
    },
    hint: "Paste the link. “mysite.com” is fine — we add the rest.",
    placeholder: "mysite.com/apply",
    skip: "I don't have a link",
    error: "Paste the link so people can get to it.",
    bad: "That doesn't look like a link yet. It should look like mysite.com.",
  },
  date: {
    title: "When is it?",
    hint: "The day it happens.",
    error: "Pick the day of the event.",
  },
  deadline: {
    title: "What's the last day to apply?",
    hint: "If there isn't one, tap “No deadline”.",
    skip: "No deadline",
  },
  startDate: {
    title: "When should it start?",
    hint: "Book at least 5 working days before your start date. We confirm your go-live date.",
    limited: "Distribute and Campaign start dates are limited, so we confirm them in the order payments arrive.",
    error: "Pick a start date at least 5 working days from today.",
  },
  where: {
    job: "Where is the job?",
    event: "Where is it happening?",
    hint: "Tap one, or type a place.",
    placeholder: "Or type a place",
    jobChips: ["Remote", "Lagos", "Abuja", "Port Harcourt"],
    eventChips: ["Online", "Lagos", "Abuja", "Port Harcourt"],
    error: "Tap one, or type where it is.",
  },
  rtype: {
    title: "What kind is it?",
    hint: "Tap one.",
    chips: ["Course", "Guide", "Template", "Toolkit", "Other"],
  },
  price: {
    title: "How much does it cost?",
    hint: "What a buyer pays, in naira.",
    placeholder: "e.g. 10000",
    error: "Type the price in naira, like 10000.",
  },
  about: {
    question: (thing: string) => `Tell people about the ${thing}`,
    promote: "Tell people about it",
    hint: "Two or three sentences is plenty. It doesn't need to be perfect.",
    placeholder: "Write it like you'd tell a friend…",
    example: {
      job: "We need a designer to make our app easy to use. You'll work with 3 people. 2 years' experience is good.",
      event: "A free evening of talks for young people starting in tech. Food and drinks included.",
      opp: "Full scholarship for African students to study in the UK. Open to anyone under 30.",
      sell: "Learn Excel from zero in one weekend. 12 short videos and practice sheets.",
      promote: "A 6-month paid fellowship for young African founders. Open to anyone under 30.",
    },
    error: "Write a sentence or two so people know what it is.",
  },
  name: {
    title: "What's your name?",
    hint: "So we know who to talk to.",
    name: "Your name",
    namePlaceholder: "e.g. Ada Okafor",
    org: "Company or group",
    orgHint: "(if you have one)",
    error: "Type your name.",
  },
  reach: {
    title: "How can we reach you?",
    hint: "We'll send your receipt here and tell you when it's live.",
    email: "Email",
    phone: "WhatsApp number",
    emailEmpty: "Type your email so we can send your receipt.",
    emailBad: "That email looks unfinished — check for the @ and the dot.",
    phoneBad: "Type a number we can WhatsApp.",
  },
  check: {
    title: "Check it looks right",
    hint: "Tap Change to fix anything.",
    change: "Change",
    toPay: "To pay",
    cost: "Cost",
    free: "Free",
    addAnother: (thing: string) => `Add another ${thing}`,
    also: "Also in this order",
    remove: "Remove",
  },
  /** What each kind is called in a sentence — "You didn't finish paying for a job". */
  kindName: {
    job: "a job",
    "paid-event": "an event",
    "free-event": "an event",
    "free-opportunity": "an opportunity",
    resource: "a course or guide",
    promotion: "a promotion",
  } as Record<string, string>,
}

/**
 * The bottom of every form. There is no separate "check it over" screen any
 * more — the total, the terms and the email sit right above the pay button, so
 * the review happens on the way past instead of as one more step.
 */
export const PAY = {
  terms:
    "By paying you confirm the details are correct. A booking is confirmed when payment is received. We review everything before it goes live and may decline or edit it. We deliver and report on your package but cannot guarantee applications, registrations or sales.",
  freeTerms: "We review everything before it goes live. Listings stay up until their deadline.",
  resourceTerms:
    "UP earns a 15% commission on successful sales. Commercial and payment terms are agreed with you before publication.",
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
    "We review the submission.",
    "If anything needs clarification, we'll contact you.",
    "Once approved, it goes live on UP.",
  ],
  /** Paid packages — rate card, "How to book" steps 3 and 4. */
  nextPaid: [
    "We review your opportunity.",
    "Email us your logo, quoting your order ID, if you'd like it on the promotion.",
    "We confirm your go-live date and publish.",
    "Your performance summary follows within 5 working days of your package ending.",
  ],
  support: "Need to update something? Get in touch and quote your order ID.",
  seePackages: "See packages",
  crossSell: {
    listing:
      "Want more people to see it? Boost, Distribute and Campaign put your listing in front of more of our audience.",
    promotion:
      "Need something more tailored? For custom promotions, partnerships and larger campaigns, get in touch.",
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
