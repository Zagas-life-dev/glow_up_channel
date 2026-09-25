/**
 * Admin tagging tools — the only client of the routes that reveal which tags
 * an AI chose. Mirrors `latest-glowup-channel/src/routes/adminTagging.js`.
 */

import ApiClient from "@/lib/api-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL
const BASE = `${API_BASE_URL}/api/admin/tagging`

type Envelope<T> = { success: boolean; message?: string; data?: T }

async function unwrap<T>(response: Response): Promise<T> {
  const json = (await response.json()) as Envelope<T>
  if (!response.ok || !json?.success) throw new Error(json?.message || "Request failed")
  return json.data as T
}

export type TagSource = "admin" | "provider" | "ai" | "rule" | "migration" | "unknown"
export type TaggingStatus = "ok" | "needs_ai" | "ai_failed" | "ai_gave_up" | "untagged"
export type ListingKind = "job" | "event" | "opportunity" | "resource"

export interface QueueRow {
  contentType: ListingKind
  contentId: string
  title: string
  status: TaggingStatus
  attempts: number
  lastError: string | null
  missing: string[]
  tagCount: number
  updatedAt: string
}

export interface ListingTags {
  canonicalTags: { id: string; label: string; source: TagSource }[]
  status: TaggingStatus
  missing: string[]
  aiProvider: string | null
  aiAt: string | null
  attempts: number
  lastError: string | null
  rawTags: string[]
}

export interface LocationMissingRow {
  contentType: ListingKind
  _id: string
  title: string
  status?: string
  location?: { country?: string | null; province?: string | null; city?: string | null }
}

export async function fetchTaggingStats(): Promise<Partial<Record<TaggingStatus, number>>> {
  return unwrap(await ApiClient.makeAuthenticatedRequest(`${BASE}/stats`))
}

export async function fetchTaggingQueue(status: Exclude<TaggingStatus, "untagged">): Promise<QueueRow[]> {
  const data = await unwrap<{ listings: QueueRow[] }>(
    await ApiClient.makeAuthenticatedRequest(`${BASE}/queue?status=${status}&limit=100`),
  )
  return data.listings
}

export async function runTaggingQueue(limit = 20): Promise<{ processed: number; ok: number; failed: number }> {
  return unwrap(await ApiClient.makeAuthenticatedRequest(`${BASE}/run-queue?limit=${limit}`, { method: "POST" }))
}

export async function fetchLocationMissing(): Promise<LocationMissingRow[]> {
  const data = await unwrap<{ listings: LocationMissingRow[] }>(
    await ApiClient.makeAuthenticatedRequest(`${BASE}/location-missing`),
  )
  return data.listings
}

export async function fetchListingTags(kind: ListingKind, id: string): Promise<ListingTags> {
  return unwrap(await ApiClient.makeAuthenticatedRequest(`${BASE}/${kind}/${id}`))
}

export async function saveListingTags(kind: ListingKind, id: string, canonicalTags: string[]): Promise<void> {
  await unwrap(
    await ApiClient.makeAuthenticatedRequest(`${BASE}/${kind}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ canonicalTags }),
    }),
  )
}

export async function saveListingLocation(
  kind: ListingKind,
  id: string,
  location: { country?: string; countryCode?: string; province?: string; city?: string; isRemote: boolean; remoteCountries?: string[] },
): Promise<void> {
  await unwrap(
    await ApiClient.makeAuthenticatedRequest(`${BASE}/${kind}/${id}/location`, {
      method: "PUT",
      body: JSON.stringify({ location }),
    }),
  )
}

export async function retagWithAi(kind: ListingKind, id: string): Promise<{ status: string; tags?: string[]; error?: string }> {
  const response = await ApiClient.makeAuthenticatedRequest(`${BASE}/${kind}/${id}/ai`, { method: "POST" })
  const json = (await response.json()) as Envelope<{ status: string; tags?: string[]; error?: string }>
  // A 200 with success:false is a normal outcome — both AI providers failed —
  // and its data says why; only a non-2xx is an error here.
  if (!response.ok) throw new Error(json?.message || "Request failed")
  return json.data ?? { status: "failed" }
}
