/**
 * Results of the Monday digest A/B test, cancelled on 3 Nov 2026 when Stories
 * replaced the digest (see lib/stories). Mirrors the one route left in
 * `latest-glowup-channel/src/routes/digest.js`.
 */

import ApiClient from "@/lib/api-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

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
