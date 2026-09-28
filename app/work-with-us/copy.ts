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
    sell: { label: "Sell a course or guide", sub: "We only take a share when it sells" },
    partner: "Posting a lot? Talk about partnership",
  },
  kind: {
    title: "What are you posting?",
    hint: "Pick the one that fits best.",
    job: { label: "A job", sub: "Someone gets paid to work for you" },
    event: { label: "An event", sub: "People come along, in person or online" },
    opp: { label: "An opportunity", sub: "Scholarship, grant, fellowship, competition" },
  },
  free: {
    title: "Do people pay to come?",
    hint: "Free events are posted for free.",
    no: "No, it's free",
    yes: "Yes, people buy tickets",
  },
  size: {
    title: "How big a push?",
    hint: "Bigger means more places, for longer.",
    names: {
      "bundle-boost": "Small",
      "bundle-distribute": "Medium",
      "bundle-campaign": "Big",
    } as Record<string, string>,
    custom: "Pick my own pieces instead",
  },
  pieces: {
    title: "Pick what you want",
    hint: "Tap as many as you like.",
    error: "Tap at least one thing.",
  },
  split: {
    title: "Who will tell people about it?",
    hint: "It's free to put it on UP. We take a share only when someone buys it.",
    me: { label: "I will", sub: "We list it — you bring the buyers", price: "We take 20%" },
    up: { label: "UP will", sub: "We push it on UP, the community and socials", price: "We take 30%" },
    together: { label: "Let's make it together", sub: "We help build it. Needs a chat first", price: "50 / 50" },
  },
  together: {
    title: "Let's have a chat first",
    body: "Making something together means agreeing the work and the costs in writing. A real person will reply.",
    cta: "Chat on WhatsApp",
    message: "Hi UP, I'd like to make a course or guide together with you.",
  },
  title: {
    question: {
      job: "What is the job called?",
      event: "What is the event called?",
      opp: "What is it called?",
      sell: "What is it called?",
      promote: "What are we promoting?",
    },
    hint: "Just the name. Keep it short.",
    placeholder: {
      job: "e.g. Product Designer",
      event: "e.g. Lagos Tech Meetup",
      opp: "e.g. Tech4Her Scholarship",
      sell: "e.g. Excel for Beginners",
      promote: "e.g. My bakery's new menu",
    },
    error: "Type the name so people know what it is.",
  },
  link: {
    question: {
      job: "Where do people apply?",
      opp: "Where do people apply?",
      freeEvent: "Where do people sign up?",
      paidEvent: "Where do people buy tickets?",
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
    promote: "What should we tell people?",
    hint: "Two or three sentences is plenty. It doesn't need to be perfect.",
    placeholder: "Write it like you'd tell a friend…",
    example: {
      job: "We need a designer to make our app easy to use. You'll work with 3 people. 2 years' experience is good.",
      event: "A free evening of talks for young people starting in tech. Food and drinks included.",
      opp: "Full scholarship for African students to study in the UK. Open to anyone under 30.",
      sell: "Learn Excel from zero in one weekend. 12 short videos and practice sheets.",
      promote: "Our new menu has 5 new cakes. 10% off for the first week.",
    },
    error: "Write a sentence or two so people know what it is.",
  },
  length: {
    title: "How long should it stay up?",
    hint: "You can boost it later if you want more.",
    week: { label: "1 week", sub: "Its own page and a link to apply" },
    month: { label: "1 month", sub: "Stays up longer, shown higher" },
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
    pack: (count: number, each: string) => `${count} or more and each one drops to ${each}.`,
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
