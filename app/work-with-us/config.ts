/**
 * Everything the "Work with us" flow sells, in one place.
 * Prices live here only — the browser uses them to show a breakdown, the server
 * uses the same numbers to charge, so the two can never drift apart.
 *
 * The numbers follow UP's Official Pricing & Services Guide, sections 2–7.
 */

import {
  CONTACT_PHONE,
  CONTACT_PHONE_INTL,
  SUPPORT_EMAIL,
  WHATSAPP_NUMBER,
} from "@/lib/contact"

/**
 * Contact details come from NEXT_PUBLIC_* env vars, via `lib/contact`. This
 * flow answers on the support address rather than the general one.
 */
export const CONTACT = {
  email: SUPPORT_EMAIL,
  phone: CONTACT_PHONE,
  /** International format, for `tel:` links that dial from anywhere. */
  phoneIntl: CONTACT_PHONE_INTL,
  /** Same number in international format, for wa.me links. */
  whatsapp: WHATSAPP_NUMBER,
}

export type Track = "listing" | "resource" | "promotion"

export type Kind =
  | "free-opportunity"
  | "free-event"
  | "job"
  | "paid-event"
  | "resource"
  | "promotion"

/** What a listing becomes once it is live, and where that lives on the site. */
export type ContentType = "opportunity" | "event" | "job" | "resource"

/**
 * The plural used by both the backend list APIs (`/api/{path}`) and the public
 * page routes (`/{path}/{id}`). They are the same word, so one map serves the
 * admin publish call and the "View on site" link.
 */
export const LIST_PATH: Record<ContentType, string> = {
  opportunity: "opportunities",
  event: "events",
  job: "jobs",
  resource: "resources",
}

export function contentTypeForKind(kind: Kind): ContentType | null {
  switch (kind) {
    case "free-opportunity":
      return "opportunity"
    case "free-event":
    case "paid-event":
      return "event"
    case "job":
      return "job"
    case "resource":
      return "resource"
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export function naira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`
}

// ---------------------------------------------------------------------------
// Listings — guide section 2
// ---------------------------------------------------------------------------

/** A listing is sold by how long it stays up. */
export type Duration = "standard" | "extended"

export const LISTING_TIERS: Record<
  Duration,
  { label: string; days: number; price: number; blurb: string }
> = {
  standard: {
    label: "Standard",
    days: 7,
    price: 5000,
    blurb: "7 days on the platform, with its own page and an application link.",
  },
  extended: {
    label: "Extended",
    days: 30,
    price: 15000,
    blurb: "30 days on the platform, with priority placement in the database.",
  },
}

/**
 * Five or more standard listings drop to the pack rate, which makes a pack of
 * five the guide's ₦20,000 and keeps working past five — seven is ₦28,000.
 * Extended listings have no pack rate.
 */
export const LISTING_BULK = {
  price: 4000,
  from: 5,
}

/** How many listings can go in one submission, free or paid. */
export const MAX_LISTINGS = 50

export function listingUnitPrice(quantity: number, duration: Duration = "standard"): number {
  if (duration === "extended") return LISTING_TIERS.extended.price
  return quantity >= LISTING_BULK.from ? LISTING_BULK.price : LISTING_TIERS.standard.price
}

/**
 * The pipeline's product-card formula (§4.1): name, one-line outcome, price,
 * what's included, timing, one CTA. `blurb` is the outcome — what the buyer
 * gets done — and `includes` is the deliverable, in that order deliberately.
 */
export const SUBMIT_OPTIONS: {
  kind: Kind
  label: string
  /** What one of them is called, for "Add another ___". */
  noun: string
  blurb: string
  price: string
  includes: string[]
  timing: string
  cta: string
}[] = [
  {
    kind: "free-opportunity",
    label: "Opportunity",
    noun: "opportunity",
    blurb: "Get a scholarship, grant, fellowship or competition in front of people looking for one.",
    price: "Free",
    includes: ["Its own opportunity page", "Application link", "Indexed in the database"],
    timing: "Live once we have reviewed it",
    cta: "List it on UP",
  },
  {
    kind: "free-event",
    label: "Free event",
    noun: "event",
    blurb: "Fill a room, or a call, with people who want to be there.",
    price: "Free",
    includes: ["Event page", "Registration link", "Indexed in the database"],
    timing: "Live once we have reviewed it",
    cta: "List my event",
  },
  {
    kind: "job",
    label: "Job",
    noun: "job",
    blurb: "Put a role in front of young Africans who are actively looking for work.",
    price: `From ${naira(LISTING_BULK.price)} a listing`,
    includes: ["Role page", "Application link", "Indexed in the database"],
    timing: "7 or 30 days, your choice",
    cta: "List this role",
  },
  {
    kind: "paid-event",
    label: "Paid event",
    noun: "event",
    blurb: "Sell tickets to an audience that turns up for things worth attending.",
    price: `From ${naira(LISTING_BULK.price)} a listing`,
    includes: ["Event page", "Ticket link", "Indexed in the database"],
    timing: "7 or 30 days, your choice",
    cta: "List my event",
  },
  {
    kind: "resource",
    label: "Resource",
    noun: "resource",
    blurb: "Sell a course, guide, template or toolkit to people who need it.",
    price: "Revenue share — nothing up front",
    includes: ["Resource page", "Checkout through UP", "Payouts on what it earns"],
    timing: "Listed once we have reviewed it",
    cta: "Sell it on UP",
  },
]

// ---------------------------------------------------------------------------
// Resources — guide section 7
// ---------------------------------------------------------------------------

export const REVENUE_SHARE_OPTIONS: {
  value: number
  label: string
  blurb: string
  /** Needs a written deal, so it goes to the team instead of straight to a form. */
  contactOnly?: boolean
}[] = [
  {
    value: 20,
    label: "20% — you promote it",
    blurb: "We list your resource and it stays up. Getting people to it is on you.",
  },
  {
    value: 30,
    label: "30% — we promote it",
    blurb: "We list it and push it across the platform, the community and our socials.",
  },
  {
    value: 50,
    label: "50 / 50 — we build it with you",
    blurb:
      "We help develop the resource itself. Costs and responsibilities are agreed in writing, deal by deal.",
    contactOnly: true,
  },
]

/** Terms that hold for every resource deal, shown next to the choice. */
export const RESOURCE_TERMS = [
  `Once you pass ${naira(500000)} in sales through UP in a rolling three months, everything after that drops to 25%.`,
  "You are paid once the customer's payment has cleared and the refund window has closed.",
]

// ---------------------------------------------------------------------------
// Promotion — guide sections 3, 4 and 5
// ---------------------------------------------------------------------------

export type PromotionItem = {
  id: string
  group: string
  label: string
  blurb: string
  price: number
  /** Days of platform placement this buys, for the ones that run on the platform. */
  runDays?: number
}

export const PROMOTION_ITEMS: PromotionItem[] = [
  {
    id: "boost-7",
    group: "On the platform",
    label: "7-day boost",
    blurb: "Featured and pinned across the platform for a week.",
    price: 10000,
    runDays: 7,
  },
  {
    id: "boost-14",
    group: "On the platform",
    label: "14-day boost",
    blurb: "The same featured placement, for two weeks.",
    price: 17500,
    runDays: 14,
  },
  {
    id: "feature-30",
    group: "On the platform",
    label: "30-day feature",
    blurb: "Continuous featured placement for a month.",
    price: 30000,
    runDays: 30,
  },
  {
    id: "community-push",
    group: "In the community",
    label: "Community push",
    blurb: "One dedicated push to the UP community.",
    price: 10000,
  },
  {
    id: "community-monthly",
    group: "In the community",
    label: "Monthly community package",
    blurb: "Up to four scheduled pushes across one month.",
    price: 30000,
  },
  {
    id: "social-story",
    group: "On social media",
    label: "Story push",
    blurb: "A dedicated story, up to three slides.",
    price: 7500,
  },
  {
    id: "social-feed-story",
    group: "On social media",
    label: "Feed feature + story",
    blurb: "A feed feature — which is where a compilation mention now sits — plus a story.",
    price: 17500,
  },
  {
    id: "social-carousel",
    group: "On social media",
    label: "Dedicated carousel",
    blurb: "A multi-slide carousel made for you. Comes with a collaboration.",
    price: 30000,
  },
  {
    id: "social-video",
    group: "On social media",
    label: "Dedicated video",
    blurb: "A short-form video made for you. Comes with a collaboration.",
    price: 75000,
  },
]

export const MAX_PROMOTION_QUANTITY = 20

// ---------------------------------------------------------------------------
// Bundles — guide section 6
// ---------------------------------------------------------------------------

/**
 * The three signature bundles, which lead the flow: a bundle is one decision
 * where the menu above is nine. The price is fixed, so `contents` is only ever
 * read out on the card — nothing in it is added up.
 */
export type Bundle = {
  id: string
  label: string
  blurb: string
  price: number
  contents: string[]
  /** How long the platform placement inside it runs. */
  runDays: number
}

export const BUNDLES: Bundle[] = [
  {
    id: "bundle-boost",
    label: "BOOST",
    blurb: "Get one thing seen.",
    price: 40000,
    contents: ["Platform listing", "7-day platform boost", "One community push"],
    runDays: 7,
  },
  {
    id: "bundle-distribute",
    label: "DISTRIBUTE",
    blurb: "Reach the community everywhere it is.",
    price: 100000,
    contents: [
      "Platform listing",
      "14-day feature",
      "Two community pushes",
      "Story push",
      "Weekly roundup inclusion",
    ],
    runDays: 14,
  },
  {
    id: "bundle-campaign",
    label: "CAMPAIGN",
    blurb: "Drive applications, registrations or sales.",
    price: 250000,
    contents: [
      "Platform listing",
      "30-day featured placement",
      "Four community pushes",
      "Dedicated carousel",
      "Two story pushes",
      "Roundup inclusion",
    ],
    runDays: 30,
  },
]

/**
 * How many days of platform placement an order bought. Bundles and individual
 * boosts are looked up in one pass because a stored item lists both together.
 * Everything else on the menu is hand-delivered work, so it adds nothing here,
 * and `null` means there is no platform promotion to start automatically.
 */
export function promotionRunDays(promotions: { id: string; quantity: number }[]): number | null {
  let days = 0
  for (const chosen of promotions) {
    const item = PROMOTION_ITEMS.find((entry) => entry.id === chosen.id)
    if (item?.runDays) {
      days += item.runDays * chosen.quantity
      continue
    }
    const bundle = BUNDLES.find((entry) => entry.id === chosen.id)
    if (bundle) days += bundle.runDays * chosen.quantity
  }
  return days > 0 ? days : null
}

// ---------------------------------------------------------------------------
// Partnership — guide section 9
// ---------------------------------------------------------------------------

export const PARTNER = {
  price: 100000,
  seats: 50,
  href: "/founder-batch",
}

// ---------------------------------------------------------------------------
// Form fields, per kind
// ---------------------------------------------------------------------------

export type DetailField = {
  name: string
  label: string
  type: "text" | "textarea" | "date" | "url"
  placeholder?: string
  optional?: boolean
}

const LINK_FIELD: DetailField = {
  name: "link",
  label: "Link",
  type: "url",
  placeholder: "https://",
}

export const DETAIL_FIELDS: Record<Kind, DetailField[]> = {
  "free-opportunity": [
    { name: "title", label: "Title", type: "text", placeholder: "Name of the opportunity" },
    { name: "description", label: "Details", type: "textarea", placeholder: "What it is, who it is for, how to apply" },
    { ...LINK_FIELD, label: "Application link" },
    { name: "deadline", label: "Deadline", type: "date", optional: true },
  ],
  "free-event": [
    { name: "title", label: "Event name", type: "text" },
    { name: "description", label: "Details", type: "textarea", placeholder: "What is happening and who should come" },
    { name: "date", label: "Date", type: "date" },
    { name: "location", label: "Location", type: "text", placeholder: "Venue, or 'Online'" },
    { ...LINK_FIELD, label: "Registration link" },
  ],
  job: [
    { name: "title", label: "Role", type: "text", placeholder: "e.g. Product Designer" },
    { name: "description", label: "About the role", type: "textarea", placeholder: "What the job involves and what you need from candidates" },
    { name: "location", label: "Location", type: "text", placeholder: "City, or 'Remote'" },
    { ...LINK_FIELD, label: "Application link" },
    { name: "deadline", label: "Deadline", type: "date", optional: true },
  ],
  "paid-event": [
    { name: "title", label: "Event name", type: "text" },
    { name: "description", label: "Details", type: "textarea", placeholder: "What is happening and who should come" },
    { name: "date", label: "Date", type: "date" },
    { name: "location", label: "Location", type: "text", placeholder: "Venue, or 'Online'" },
    { ...LINK_FIELD, label: "Ticket link" },
  ],
  resource: [
    { name: "title", label: "Resource name", type: "text" },
    { name: "resourceType", label: "What is it?", type: "text", placeholder: "Course, guide, template, toolkit…" },
    { name: "description", label: "What people get", type: "textarea" },
    { name: "price", label: "What you sell it for", type: "text", placeholder: "e.g. ₦10,000" },
    { ...LINK_FIELD, label: "Link to the resource", optional: true },
  ],
  promotion: [
    { name: "title", label: "What are you promoting?", type: "text", placeholder: "Name of the brand, product or post" },
    { name: "description", label: "What should we say?", type: "textarea", placeholder: "The message you want out there" },
    { ...LINK_FIELD, optional: true },
    { name: "startDate", label: "Preferred start date", type: "date", optional: true },
  ],
}

// ---------------------------------------------------------------------------
// The order
// ---------------------------------------------------------------------------

export type Contact = {
  name: string
  email: string
  phone: string
  organisation: string
}

export function trackForKind(kind: Kind): Track {
  if (kind === "promotion") return "promotion"
  if (kind === "resource") return "resource"
  return "listing"
}

export type SubmissionPayload = {
  kind: Kind
  /**
   * One filled-in form per listing. Jobs and paid events can have several —
   * everything else has exactly one.
   */
  entries: Record<string, string>[]
  /** How long paid listings stay up. Every other kind ignores it. */
  duration: Duration
  /** A signature bundle, when one was picked instead of individual items. */
  bundleId: string | null
  /** Chosen promotion items. Empty for every other track. */
  promotions: { id: string; quantity: number }[]
  /** 20, 30 or 50, for resources only. */
  revenueShare: number | null
  contact: Contact
}

/** Listings can be sent in a batch — resources and promotions go one at a time. */
export function allowsMultiple(kind: Kind): boolean {
  return trackForKind(kind) === "listing"
}

export type OrderLine = {
  label: string
  quantity: number
  unitPrice: number
  total: number
}

export type Order = {
  lines: OrderLine[]
  total: number
}

/** Turns a payload into what it costs. Used by the page and by the server. */
export function buildOrder(payload: SubmissionPayload): Order {
  if (payload.kind === "job" || payload.kind === "paid-event") {
    const quantity = payload.entries.length
    const unitPrice = listingUnitPrice(quantity, payload.duration)
    const tier = LISTING_TIERS[payload.duration]
    const noun = payload.kind === "job" ? "job" : "paid event"
    return {
      lines: [
        {
          label: `${tier.label} ${noun} listing · ${tier.days} days`,
          quantity,
          unitPrice,
          total: unitPrice * quantity,
        },
      ],
      total: unitPrice * quantity,
    }
  }

  if (payload.kind === "promotion") {
    const lines: OrderLine[] = []

    const bundle = BUNDLES.find((entry) => entry.id === payload.bundleId)
    if (bundle) {
      lines.push({ label: bundle.label, quantity: 1, unitPrice: bundle.price, total: bundle.price })
    }

    for (const chosen of payload.promotions) {
      const item = PROMOTION_ITEMS.find((i) => i.id === chosen.id)
      if (!item) continue
      lines.push({
        label: item.label,
        quantity: chosen.quantity,
        unitPrice: item.price,
        total: item.price * chosen.quantity,
      })
    }
    return { lines, total: lines.reduce((sum, line) => sum + line.total, 0) }
  }

  // Free listings and resources cost nothing up front.
  return { lines: [], total: 0 }
}
