/**
 * The Monday digest A/B test.
 *
 * Mirrors `latest-glowup-channel/src/routes/digest.js`. Only group A in a test
 * week gets a digest back; for everyone else `fetchDigest` resolves to null.
 */

import ApiClient from "@/lib/api-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export type DigestSection = "recommended" | "expiring"

export interface DigestItem {
  id: string
  type: "opportunity" | "job" | "event"
  section: DigestSection
  title: string
  org: string | null
  closes: number | null
  closesLabel: string | null
  url: string
}

export interface Digest {
  /** Monday of the digest's week, YYYY-MM-DD. */
  week: string
  seen: boolean
  savedPlaylistId: string | null
  trackedAll: boolean
  items: DigestItem[]
}

export type DigestEvent = "shown" | "dismissed" | "item_click" | "push_open"

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/digest${path}`, init)
    if (!response.ok) return null
    const json = await response.json()
    return json?.success ? (json.data as T) : null
  } catch {
    return null
  }
}

export async function fetchDigest(): Promise<Digest | null> {
  const data = await call<{ digest: Digest | null }>("/current")
  return data?.digest ?? null
}

/** Fire-and-forget; `keepalive` so an item click survives the navigation. */
export function logDigestEvent(event: DigestEvent, listingId?: string): void {
  void call("/events", { method: "POST", body: JSON.stringify({ event, listingId }), keepalive: true })
}

export function saveDigest() {
  return call<{ ok: boolean; playlistId?: string; already?: boolean }>("/save", { method: "POST" })
}

export function trackAllDigest() {
  return call<{ ok: boolean; added?: number }>("/track-all", { method: "POST" })
}

/* ------------------------------------------------------------------ admin */

export interface DigestWeekResult {
  week: string
  partial: boolean
  trackerAddsPerUser: { A: number; B: number }
  trackerAdds: { A: number; B: number }
  trackerAddsFromDigest: number
  activeRate: { A: number; B: number }
  savesPerUser: { A: number; B: number }
  funnel: {
    pushSent: number
    pushOpened: number
    shown: number
    clicked: number
    saved: number
    trackedAll: number
    itemClicks: number
    engagementRate: number
    shownPushOn: number
    shownPushOff: number
  }
}

export interface DigestResults {
  experiment: string
  assigned: boolean
  weeks: string[]
  groups?: { A: { users: number; pushOn: number }; B: { users: number; pushOn: number } }
  overall?: { trackerAddsPerUserWeek: { A: number; B: number }; liftPct: number | null }
  byWeek?: DigestWeekResult[]
}

export async function fetchDigestResults(): Promise<DigestResults> {
  const data = await call<DigestResults>("/admin/results")
  if (!data) throw new Error("Could not load digest results")
  return data
}

export async function assignDigestGroups() {
  const data = await call<{ assigned: boolean; reason?: string; count: number; A?: number; B?: number }>("/admin/assign", {
    method: "POST",
  })
  if (!data) throw new Error("Could not assign groups")
  return data
}
