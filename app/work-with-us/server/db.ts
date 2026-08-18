import { MongoClient, type Collection } from "mongodb"

import type { Contact, ContentType, Duration, Kind, Order, Track } from "../config"

/**
 * An order is one payment. An item is one thing we owe the customer for it —
 * a listing to publish, or a promotion to run.
 *
 * They are split because the two have different lifecycles: an order is paid
 * once and never changes again, while a five-listing batch is five separate
 * review decisions, and a bundle is a listing *and* a promotion that has to
 * wait for that listing to go live before it can point at anything.
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
    paidAt: Date
    amountNg: number
  }
  createdAt: Date
  updatedAt: Date
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
    /** Set when the thing being promoted is a listing on this same order. */
    listingRef: string | null
  }
  contact: Contact
  status: ItemStatus
  publishedId?: string | null
  publishedAt?: Date
  adminNote?: string
  reviewedAt?: Date
  reviewedBy?: string
  createdAt: Date
  updatedAt: Date
}

const ORDERS = "work_with_us_orders"
const ITEMS = "work_with_us_items"

// Cached on globalThis so dev hot-reloads reuse one connection instead of
// opening a new client on every edit.
const globalForMongo = globalThis as unknown as { workWithUsMongo?: Promise<MongoClient> }

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error("MONGODB_URI is not set")
  if (!globalForMongo.workWithUsMongo) {
    globalForMongo.workWithUsMongo = new MongoClient(uri).connect()
  }
  return globalForMongo.workWithUsMongo
}

/** The database itself, for the few reads that are not orders or items. */
export async function db() {
  const client = await getClient()
  // No argument means the database named in MONGODB_URI.
  return client.db(process.env.MONGODB_DB || undefined)
}

export async function orders(): Promise<Collection<OrderDoc>> {
  return (await db()).collection<OrderDoc>(ORDERS)
}

export async function items(): Promise<Collection<ItemDoc>> {
  return (await db()).collection<ItemDoc>(ITEMS)
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** e.g. GU-7K4M2X — safe to read over the phone, and valid as a Paystack reference. */
export function newRef(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  let out = ""
  for (const byte of bytes) out += REF_ALPHABET[byte % REF_ALPHABET.length]
  return `GU-${out}`
}

/** Items are numbered inside their order, so GU-7K4M2X-3 is findable by eye. */
export function itemRef(orderRef: string, position: number): string {
  return `${orderRef}-${position}`
}
