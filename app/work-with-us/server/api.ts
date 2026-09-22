import type { Contact, ContentType, Duration, Kind, Order, Track } from "../config"

/**
 * The storefront's client for the order book, which lives in the backend at
 * `latest-glowup-channel/src/routes/workWithUs.js`.
 *
 * This file replaced a MongoDB connection. The sales page and the review queue
 * used to open their own client against the same Atlas cluster the backend
 * uses, which meant this host needed MONGODB_URI — and when it did not have it,
 * every read failed with a message about a database the reader has no access
 * to. Nothing on the web host holds database credentials now: it asks the API,
 * and the API owns the collections.
 *
 * What stayed here is what belongs to the storefront: the price list, the form
 * fields, the order maths, the Paystack conversation and the two automatic
 * emails. What moved is every read and write of an order or an item.
 */

// ---------------------------------------------------------------------------
// The documents, as JSON
// ---------------------------------------------------------------------------

/**
 * An order is one payment. An item is one thing we owe the customer for it —
 * a listing to publish, or a promotion to run.
 *
 * They are split because the two have different lifecycles: an order is paid
 * once and never changes again, while a five-listing batch is five separate
 * review decisions, and a bundle is a listing *and* a promotion that has to
 * wait for that listing to go live before it can point at anything.
 *
 * Dates are strings rather than `Date`: these arrive over JSON. The backend
 * stores them as real dates — `latest-glowup-channel/src/models/WorkWithUsOrder.js`
 * is the schema both sides are describing.
 */
export type OrderStatus = "awaiting_payment" | "paid" | "pending_review"

export type OrderDoc = {
  /** Short human reference, also used as the Paystack transaction reference. */
  ref: string
  track: Track
  kind: Kind
  /** How many listings were paid for. 1 for everything else. */
  quantity: number
  duration: Duration
  bundleId: string | null
  promotions: { id: string; quantity: number }[]
  revenueShare: number | null
  contact: Contact
  order: Order
  amountNg: number
  status: OrderStatus
  payment?: {
    reference: string
    channel?: string
    paidAt: string
    amountNg: number
  }
  createdAt: string
  updatedAt: string
}

export type ItemStatus =
  | "awaiting_payment"
  | "pending_review"
  /** Paid and open, but we asked the customer for a specific correction. */
  | "needs_clarification"
  | "published"
  | "running"
  | "delivered"
  | "rejected"

export type ItemDoc = {
  _id?: string
  /** The order's ref plus a position, e.g. GU-7K4M2X-2. */
  ref: string
  orderRef: string
  itemType: "listing" | "promotion"
  kind: Kind
  /** What this publishes as. Null on promotions, which publish nothing. */
  contentType: ContentType | null
  /** The filled-in form for this one item. */
  fields: Record<string, string>
  /**
   * Promotions only. Label and price are copied in at purchase time so the
   * queue still shows what was actually bought after a price change.
   */
  promotions?: { id: string; label: string; quantity: number; price: number }[]
  /** Promotions only — what the promotion runs against. */
  target?: {
    title: string
    contentId: string | null
    contentType?: ContentType | null
    /** Set when the thing being promoted is a listing on this same order. */
    listingRef: string | null
  }
  contact: Contact
  status: ItemStatus
  publishedId?: string | null
  publishedAt?: string
  adminNote?: string
  reviewedAt?: string
  reviewedBy?: string
  createdAt: string
  updatedAt: string
}

/**
 * What the storefront sends when something is submitted. No `ref` and no
 * `status`: the backend mints the reference, because it owns the collection and
 * is the only place that can retry a collision, and it derives the status from
 * the amount so a submission cannot arrive claiming to be paid.
 */
export type OrderDraft = Omit<OrderDoc, "ref" | "status" | "payment" | "createdAt" | "updatedAt">

export type ItemDraft = Omit<
  ItemDoc,
  "_id" | "ref" | "orderRef" | "status" | "contact" | "createdAt" | "updatedAt"
>

// ---------------------------------------------------------------------------
// Calling the API
// ---------------------------------------------------------------------------

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }

/**
 * The settings this storefront needs to reach the order book, by name, or an
 * empty list when it has them all.
 *
 * Reported together rather than one at a time: a host that is missing both
 * should be told both, or fixing the first only earns you the second. This is
 * also the whole of what `/work-with-us` requires to read and write orders —
 * there is no database URI in it, and there is not meant to be.
 */
export function missingSettings(): string[] {
  const missing: string[] = []
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL
  if (!url?.trim()) missing.push("NEXT_PUBLIC_BACKEND_URL")
  if (!process.env.WORK_WITH_US_SERVICE_KEY?.trim()) missing.push("WORK_WITH_US_SERVICE_KEY")
  return missing
}

export function backendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL
  if (!url) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set")
  return url.replace(/\/$/, "")
}

/**
 * One call to the order book.
 *
 * Failures are returned rather than thrown, with the three kinds kept apart,
 * because they send the reader somewhere completely different: a missing
 * variable is this host's configuration, an unreachable backend is an outage
 * that has lost nothing, and a 4xx is an answer. Collapsing them into one
 * "could not load" is what made an unset variable read as a broken database.
 */
async function call<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<ApiResult<T>> {
  const { token, ...rest } = init

  const missing = missingSettings()
  if (missing.length > 0) {
    return {
      ok: false,
      status: 503,
      error: `This server is missing ${
        missing.length === 1 ? "a setting" : "settings"
      } it needs: ${missing.join(" and ")}.`,
    }
  }

  const base = backendUrl()
  const key = process.env.WORK_WITH_US_SERVICE_KEY as string

  let response: Response
  try {
    response = await fetch(`${base}/api/work-with-us${path}`, {
      ...rest,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": key,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...rest.headers,
      },
    })
  } catch {
    return {
      ok: false,
      status: 503,
      error: "Could not reach the backend. Nothing is lost — try again once it is up.",
    }
  }

  const json = await response.json().catch(() => null)

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: json?.message || `The backend refused that (HTTP ${response.status})`,
    }
  }

  return { ok: true, data: (json?.data ?? json) as T }
}

// ---------------------------------------------------------------------------
// Intake and payment
// ---------------------------------------------------------------------------

export function createSubmission(payload: {
  order: OrderDraft
  items: ItemDraft[]
}): Promise<ApiResult<{ order: OrderDoc; items: ItemDoc[] }>> {
  return call("/orders", { method: "POST", body: JSON.stringify(payload) })
}

export function getOrder(ref: string): Promise<ApiResult<{ order: OrderDoc }>> {
  return call(`/orders/${encodeURIComponent(ref)}`)
}

/**
 * Records a payment Paystack has already confirmed. Safe to call twice — both
 * the customer's return trip and the webhook end up here, and `alreadyPaid`
 * says which call was the one that moved it.
 */
export function markOrderPaid(
  ref: string,
  payment: { reference: string; channel?: string; paidAt: Date; amountNg: number },
): Promise<ApiResult<{ alreadyPaid: boolean; order: OrderDoc; items: ItemDoc[] }>> {
  return call(`/orders/${encodeURIComponent(ref)}/paid`, {
    method: "POST",
    body: JSON.stringify({ payment: { ...payment, paidAt: payment.paidAt.toISOString() } }),
  })
}

export function audienceSize(): Promise<ApiResult<{ users: number | null }>> {
  return call("/audience")
}

// ---------------------------------------------------------------------------
// The review queue
// ---------------------------------------------------------------------------

export type QueuePage = {
  /** The status these rows were filtered to, or "all" when they were not. */
  scope: string
  items: ItemDoc[]
  counts: Record<string, number>
  total: number
  truncated: boolean
}

export function listItems(status: string, token: string): Promise<ApiResult<QueuePage>> {
  return call(`/items?status=${encodeURIComponent(status)}`, { token })
}

export type ItemView = {
  item: ItemDoc
  /** What a promotion would run against, resolved by the backend. */
  target: { contentId: string; contentType: ContentType } | null
  approval: { canApprove: boolean; alreadyDone?: boolean; status?: ItemStatus; reason?: string }
}

export function getItem(ref: string, token: string): Promise<ApiResult<ItemView>> {
  return call(`/items/${encodeURIComponent(ref)}`, { token })
}

export type ReviewResult = {
  ref: string
  status: ItemStatus
  alreadyDone?: boolean
  blockedPromotions?: string[]
  contentId?: string
  days?: number | null
}

/**
 * Records what a reviewer decided. Approving happens in two steps — publish or
 * grant first, then report the outcome here — because the side effect belongs
 * to the platform's own create endpoints, and only this call makes it true.
 */
export function reviewItem(
  ref: string,
  body: {
    action: "approve" | "reject" | "clarify" | "deliver"
    note?: string
    publishedId?: string | null
    target?: { contentId: string; contentType: ContentType } | null
    days?: number | null
  },
  token: string,
): Promise<ApiResult<ReviewResult>> {
  return call(`/items/${encodeURIComponent(ref)}/review`, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  })
}
