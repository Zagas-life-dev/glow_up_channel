/**
 * What this browser remembers between visits, so nobody types the same thing
 * twice: their contact details, and an order they left for Paystack and did
 * not finish paying for.
 *
 * Browser storage only — a convenience, never the record. It can be empty or
 * throw (private windows, blocked site data), so every read and write is
 * guarded and the flow works the same without it. The order itself is always
 * stored server-side before anyone is sent to pay.
 */

import type { Contact, SubmissionPayload } from "./config"

const CONTACT_KEY = "up-wwu-contact"
const PENDING_KEY = "up-wwu-pending"

/** Pending orders older than this are stale enough not to offer back. */
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const EMPTY_CONTACT: Contact = { name: "", email: "", phone: "", organisation: "" }

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable — the flow carries on without it.
  }
}

export function loadContact(): Contact {
  const saved = read<Partial<Contact>>(CONTACT_KEY)
  return { ...EMPTY_CONTACT, ...(saved ?? {}) }
}

export function saveContact(contact: Contact) {
  write(CONTACT_KEY, contact)
}

export type PendingOrder = { payload: SubmissionPayload; savedAt: number }

export function loadPending(): PendingOrder | null {
  const pending = read<PendingOrder>(PENDING_KEY)
  if (!pending?.payload?.kind || Date.now() - (pending.savedAt ?? 0) > PENDING_TTL_MS) return null
  return pending
}

export function savePending(payload: SubmissionPayload) {
  write(PENDING_KEY, { payload, savedAt: Date.now() } satisfies PendingOrder)
}

export function clearPending() {
  write(PENDING_KEY, null)
}
