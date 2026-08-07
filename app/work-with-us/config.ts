/**
 * Everything the "Work with us" flow sells, in one place.
 * Prices live here only — the browser uses them to show a breakdown, the server
 * uses the same numbers to charge, so the two can never drift apart.
 */

export const CONTACT = {
  email: "support@mail.glowupchannel.com",
  phone: "08102539906",
  /** Same number in international format, for wa.me links. */
  whatsapp: "2348102539906",
}

export type Track = "listing" | "resource" | "promotion"

export type Kind =
  | "free-opportunity"
  | "free-event"
  | "job"
  | "paid-event"
  | "resource"
  | "promotion"

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export const LISTING_PRICING = {
  standard: 2500,
  bulk: 2000,
  /** From this many listings up, every listing costs the bulk price. */
  bulkFrom: 5,
}

/** How many listings can go in one submission, free or paid. */
export const MAX_LISTINGS = 50

export function listingUnitPrice(quantity: number): number {
  return quantity >= LISTING_PRICING.bulkFrom ? LISTING_PRICING.bulk : LISTING_PRICING.standard
}

export const SUBMIT_OPTIONS: {
  kind: Kind
  label: string
  /** What one of them is called, for "Add another ___". */
  noun: string
  blurb: string
  price: string
}[] = [
  {
    kind: "free-opportunity",
    label: "Opportunity",
    noun: "opportunity",
    blurb: "Scholarships, grants, fellowships, competitions, volunteering.",
    price: "Free",
  },
  {
    kind: "free-event",
    label: "Free event",
    noun: "event",
    blurb: "Anything the community can attend at no cost.",
    price: "Free",
  },
  {
    kind: "job",
    label: "Job",
    noun: "job",
    blurb: "Roles, internships and gigs you are hiring for.",
    price: "From ₦2,000 a listing",
  },
  {
    kind: "paid-event",
    label: "Paid event",
    noun: "event",
    blurb: "Ticketed events, paid workshops and bootcamps.",
    price: "From ₦2,000 a listing",
  },
  {
    kind: "resource",
    label: "Resource",
    noun: "resource",
    blurb: "Courses, guides, templates and toolkits you sell.",
    price: "Revenue share",
  },
]

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export const REVENUE_SHARE_OPTIONS = [
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
]

// ---------------------------------------------------------------------------
// Promotion
// ---------------------------------------------------------------------------

export type PromotionItem = {
  id: string
  group: string
  label: string
  blurb: string
  price: number
}

export const PROMOTION_ITEMS: PromotionItem[] = [
  {
    id: "platform-weekly",
    group: "On the platform",
    label: "Weekly promotion",
    blurb: "Your post promoted across the platform for a week.",
    price: 5000,
  },
  {
    id: "platform-monthly",
    group: "On the platform",
    label: "Monthly promotion",
    blurb: "Same thing, for a full month.",
    price: 17500,
  },
  {
    id: "community-mention-1",
    group: "In the community",
    label: "Community mention",
    blurb: "One mention in the community.",
    price: 5000,
  },
  {
    id: "community-mention-4",
    group: "In the community",
    label: "Community mentions ×4",
    blurb: "Four mentions, one a week.",
    price: 17500,
  },
  {
    id: "social-carousel",
    group: "On social media",
    label: "Dedicated carousel",
    blurb: "A carousel post made for you. Comes with a collaboration.",
    price: 25000,
  },
  {
    id: "social-video",
    group: "On social media",
    label: "Dedicated video",
    blurb: "A video made for you. Comes with a collaboration.",
    price: 50000,
  },
  {
    id: "compilation-mention",
    group: "In compilations",
    label: "Mention in a compilation",
    blurb: "One mention in an opportunity compilation.",
    price: 5000,
  },
  {
    id: "compilation-monthly",
    group: "In compilations",
    label: "Monthly compilation mentions",
    blurb: "Mentioned in the compilations all month.",
    price: 15000,
  },
]

export const MAX_PROMOTION_QUANTITY = 20

export const PARTNER = {
  price: 85000,
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
// Money
// ---------------------------------------------------------------------------

export function naira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`
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
  /** Chosen promotion items. Empty for every other track. */
  promotions: { id: string; quantity: number }[]
  /** 20 or 30, for resources only. */
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
    const unitPrice = listingUnitPrice(quantity)
    return {
      lines: [
        {
          label: payload.kind === "job" ? "Job listing" : "Paid event listing",
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
