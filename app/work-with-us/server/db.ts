import { MongoClient, type Collection } from "mongodb"

import type { Contact, Kind, Order, Track } from "../config"

export type SubmissionStatus = "awaiting_payment" | "paid" | "pending_review"

export type SubmissionDoc = {
  /** Short human reference, also used as the Paystack transaction reference. */
  ref: string
  track: Track
  kind: Kind
  /** How many listings were paid for. 1 for everything else. */
  quantity: number
  /** One filled-in form per listing. */
  entries: Record<string, string>[]
  promotions: { id: string; quantity: number }[]
  revenueShare: number | null
  contact: Contact
  order: Order
  amountNg: number
  status: SubmissionStatus
  payment?: {
    reference: string
    channel?: string
    paidAt: Date
    amountNg: number
  }
  createdAt: Date
  updatedAt: Date
}

const COLLECTION = "work_with_us_submissions"

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

export async function submissions(): Promise<Collection<SubmissionDoc>> {
  const client = await getClient()
  // No argument means the database named in MONGODB_URI.
  return client.db(process.env.MONGODB_DB || undefined).collection<SubmissionDoc>(COLLECTION)
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** e.g. GU-7K4M2X — safe to read over the phone, and valid as a Paystack reference. */
export function newRef(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  let out = ""
  for (const byte of bytes) out += REF_ALPHABET[byte % REF_ALPHABET.length]
  return `GU-${out}`
}
