/**
 * Everything the "Work with us" flow sells, in one place.
 * Prices live here only — the browser uses them to show a breakdown, the server
 * uses the same numbers to charge, so the two can never drift apart.
 *
 * The numbers follow the UP Rate Card: Launch Copy (3 Nov 2026). Launch prices
 * are in naira and exclude VAT, which is added at checkout.
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

/** VAT is added on top of every launch price at checkout. */
export const VAT_RATE = 0.075

// ---------------------------------------------------------------------------
// Listings — rate card, "01. List: FREE"
// ---------------------------------------------------------------------------

/**
 * Listings are free and stay up until their deadline. `Duration` survives only
 * because older orders stored one; nothing is priced by it any more.
 */
export type Duration = "standard" | "extended"
export const DURATIONS: Duration[] = ["standard", "extended"]

/** How many listings can go in one submission. */
export const MAX_LISTINGS = 50

// ---------------------------------------------------------------------------
// Resources — rate card, "Submit your resource"
// ---------------------------------------------------------------------------

/** UP's commission on each successful sale. Terms are agreed before publication. */
export const RESOURCE_COMMISSION = 15

// ---------------------------------------------------------------------------
// Promotion — no longer sold one piece at a time
// ---------------------------------------------------------------------------

/**
 * The old à-la-carte menu. Nothing here can be bought any more — the rate card
 * sells three packages and sends anything tailored to the team. It stays so
 * orders placed before the rate card still resolve their run length and labels
 * in the review queue.
 */
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
// Packages — rate card, "Our distribution packages" 02–04
// ---------------------------------------------------------------------------

/**
 * The three paid packages. The price is fixed, so `contents` is only ever read
 * out on the card — nothing in it is added up. Ids are unchanged from the old
 * bundles so earlier orders still resolve.
 */
export type Bundle = {
  id: string
  label: string
  /** The one-line promise under the name. */
  blurb: string
  /** Who it is for. */
  forWho: string
  price: number
  /** The short version, on the tile. */
  contents: string[]
  /** Everything in it, word for word from the rate card, listed under the tiles. */
  details: string[]
  /** How long the platform placement inside it runs. */
  runDays: number
  /** Distribute and Campaign start dates are limited and go in payment order. */
  limitedDates?: boolean
}

export const BUNDLES: Bundle[] = [
  {
    id: "bundle-boost",
    label: "Boost",
    blurb: "Give your opportunity an extra push.",
    forWho: "More visibility and a targeted push.",
    price: 20000,
    contents: ["14 days featured", "Email to 2,000 matched subscribers", "One community push", "Stories + roundup"],
    details: [
      "14 days featured on the UP platform",
      "One email to a targeted group of up to 2,000 subscribers matched to your opportunity",
      "Inclusion in one opportunity roundup",
      "One community push",
      "Social media stories",
      "A performance summary",
    ],
    runDays: 14,
  },
  {
    id: "bundle-distribute",
    label: "Distribute",
    blurb: "Reach more people. Stay visible for a month.",
    forWho: "Broader reach and repeated exposure across UP's channels.",
    price: 50000,
    contents: ["30 days featured", "Top of the midweek email (10,000)", "Two community pushes", "A dedicated carousel"],
    details: [
      "30 days featured on the UP platform",
      "Top placement in the midweek email to our full list of 10,000 subscribers",
      "Inclusion in two opportunity roundups",
      "Two community pushes",
      "One dedicated social media carousel",
      "Social media stories",
      "A performance summary",
    ],
    runDays: 30,
    limitedDates: true,
  },
  {
    id: "bundle-campaign",
    label: "Campaign",
    blurb: "Make your opportunity hard to miss.",
    forWho: "A coordinated 30-day campaign with content made for your opportunity.",
    price: 125000,
    contents: ["30 days featured", "Its own email to all 10,000", "Two carousels + a video", "Four community pushes"],
    details: [
      "30 days featured on the UP platform",
      "A dedicated email about your opportunity only, sent to all 10,000 subscribers",
      "Two dedicated social media carousels",
      "One dedicated promotional video",
      "Inclusion in four opportunity roundups",
      "Four community pushes",
      "Social media stories",
      "A performance summary with recommendations for what to do next",
    ],
    runDays: 30,
    limitedDates: true,
  },
]

/** Who a package reaches — rate card, "The UP audience". */
export const AUDIENCE: { figure: string; label: string }[] = [
  { figure: "11,500+", label: "registered platform users" },
  { figure: "10,000+", label: "email subscribers" },
  { figure: "7,500+", label: "social media followers" },
  { figure: "5,200+", label: "community members" },
]

/** Bookings need this many working days' notice before the start date. */
export const BOOKING_NOTICE_DAYS = 5

/** The earliest start date that leaves `BOOKING_NOTICE_DAYS` working days, as YYYY-MM-DD. */
export function earliestStart(from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let left = BOOKING_NOTICE_DAYS
  while (left > 0) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) left -= 1
  }
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

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
    { ...LINK_FIELD, label: "Link to apply or register" },
    { name: "deadline", label: "Deadline", type: "date", optional: true },
    { name: "startDate", label: "Preferred start date", type: "date" },
  ],
}

/**
 * Anyone who types "mysite.com" or "www.mysite.com" means https://mysite.com.
 * The server does the same, so a link is never rejected for a missing prefix.
 */
export function normaliseLink(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || /^([a-z][a-z0-9+.-]*:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/+/, "")}`
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
  /** UP's commission, for resources only. Always `RESOURCE_COMMISSION` now. */
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
  /** What is charged, VAT included. */
  total: number
}

export const VAT_LABEL = `VAT (${VAT_RATE * 100}%)`

/**
 * Turns a payload into what it costs. Used by the page and by the server.
 * VAT goes in as its own line because the backend stores only lines and a
 * total — so the receipt and the queue add up without knowing about VAT.
 */
export function buildOrder(payload: SubmissionPayload): Order {
  const bundle =
    payload.kind === "promotion" ? BUNDLES.find((entry) => entry.id === payload.bundleId) : undefined

  // Listings are free and resources pay by commission, so only a package costs anything.
  if (!bundle) return { lines: [], total: 0 }

  const vat = Math.round(bundle.price * VAT_RATE)
  return {
    lines: [
      { label: `${bundle.label} package`, quantity: 1, unitPrice: bundle.price, total: bundle.price },
      { label: VAT_LABEL, quantity: 1, unitPrice: vat, total: vat },
    ],
    total: bundle.price + vat,
  }
}
