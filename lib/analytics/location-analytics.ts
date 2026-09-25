/**
 * Location analytics — where users are, and where each listing's audience is.
 *
 * Mirrors `latest-glowup-channel/src/services/locationAnalyticsService.js`.
 * Scope is decided by the backend from the caller's role: a provider sees
 * their own listings, a monitor its assigned listings, an admin everything.
 * Places with fewer than `minCell` people arrive already folded into "Other".
 */

import ApiClient from "@/lib/api-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

type Envelope<T> = { success: boolean; message?: string; data?: T }

async function unwrap<T>(response: Response): Promise<T> {
  const json = (await response.json()) as Envelope<T>
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || "Request failed")
  }
  return json.data as T
}

/** One place's counts. `key` is "other" for the folded small places. */
export interface PlaceRow {
  key: string
  name: string
  countryCode?: string
  country?: string
  state?: string | null
  city?: string | null
  /** How many small places were folded into this row (Other only). */
  places?: number
  total: number
  [metric: string]: string | number | null | undefined
}

export interface PlaceBreakdown {
  countries: PlaceRow[]
  states: PlaceRow[]
  cities: PlaceRow[]
}

export interface AudienceByLocation extends PlaceBreakdown {
  days: number
  minCell: number
  scope?: "provider" | "monitor" | "platform"
}

export interface SupplyDemandRow {
  countryCode: string
  country: string
  users: number
  listings: number
  listingsPer1000Users: number | null
}

export interface PlatformLocationOverview {
  days: number
  minCell: number
  usersWithoutLocation: number
  remoteListings: number
  /** users, activeUsers, visitors per place */
  people: PlaceBreakdown
  /** views, clicks, applications per place */
  audience: AudienceByLocation
  supplyVsDemand: SupplyDemandRow[]
}

/** Where views, clicks and applications come from, for the caller's listings (or one of them). */
export async function fetchAudienceByLocation(query: {
  days?: number
  contentType?: string
  contentId?: string
  /** Admin only: one provider's listings. */
  providerId?: string
  /** Admin only: one monitor's assigned listings. */
  monitorId?: string
} = {}): Promise<AudienceByLocation> {
  const params = new URLSearchParams()
  if (query.days) params.set("days", String(query.days))
  if (query.contentType && query.contentId) {
    params.set("contentType", query.contentType)
    params.set("contentId", query.contentId)
  }
  if (query.providerId) params.set("providerId", query.providerId)
  if (query.monitorId) params.set("monitorId", query.monitorId)
  const suffix = params.toString() ? `?${params.toString()}` : ""
  const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/analytics/locations${suffix}`)
  return unwrap(response)
}

/** Admin only: users, visitors, audience and supply vs demand. */
export async function fetchPlatformLocations(days = 30): Promise<PlatformLocationOverview> {
  const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/analytics/locations/platform?days=${days}`)
  return unwrap(response)
}
