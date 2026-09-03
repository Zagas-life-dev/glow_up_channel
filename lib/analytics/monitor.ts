/**
 * Monitor assignments — the read-only portal and the admin screens that feed it.
 *
 * A monitor's scope is a list of listings an admin assigned to it. Everything
 * here goes through that list: there is no query parameter a monitor can send to
 * widen what it sees, and the backend resolves the scope from the token rather
 * than from anything this module passes.
 *
 * Mirrors `latest-glowup-channel/src/services/monitorAssignmentService.js`.
 */

import ApiClient from "@/lib/api-client"
import type {
  ListingAnalyticsRow,
  ListingAnalyticsTotals,
  ListingContentType,
} from "@/lib/analytics/listing-analytics"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

/** An assigned listing: the normal analytics row plus when it was handed over. */
export interface MonitoredListing extends ListingAnalyticsRow {
  assignedAt: string | null
}

export interface AssignmentCounts {
  opportunity: number
  job: number
  event: number
  resource: number
  total: number
}

/** Whose view an admin is currently looking at, absent when viewing their own. */
export interface ViewingAs {
  _id: string
  email: string
  role: string
  displayName: string
  logoUrl: string | null
}

export interface MonitorAssignmentsResult {
  counts: AssignmentCounts
  totals: ListingAnalyticsTotals
  listings: MonitoredListing[]
  truncated?: boolean
  matchedCount?: number
  scope?: string
  viewingAs?: ViewingAs | null
}

/**
 * Promotion performance on an assigned listing.
 *
 * There is no cost field here and there is none on the wire either — the
 * backend projects `investment` and the payment columns away before the
 * response is built. A monitor reads how a promotion did, not what it cost.
 */
export interface MonitoredPromotion {
  promotionId: string
  contentId: string
  contentType: ListingContentType
  packageType: string | null
  packageName: string | null
  status: string
  metrics: {
    views: number
    likes: number
    saves: number
    applications: number
    registrations: number
    engagementRate: number
    performanceScore: number
  }
  period: {
    startDate: string
    endDate: string
    daysActive: number
  }
}

export interface MonitorPromotionsResult {
  promotions: MonitoredPromotion[]
  summary: {
    totalViews: number
    totalEngagements: number
    averageEngagementRate: number
    averagePerformanceScore: number
    totalPromotions: number
  } | null
}

/** An account that can be assigned listings. */
export interface MonitorAccount {
  _id: string
  email: string
  role: string
  status: string
  displayName: string
  logoUrl: string | null
  assignmentCount: number
  /** When this account was last handed a listing; null if it holds none. */
  lastAssignedAt: string | null
}

export const EMPTY_COUNTS: AssignmentCounts = {
  opportunity: 0,
  job: 0,
  event: 0,
  resource: 0,
  total: 0,
}

/* ------------------------------------------------------------------ fetching */

interface Envelope<T> {
  success: boolean
  message?: string
  data?: T
}

async function unwrap<T>(response: Response): Promise<T> {
  const json = (await response.json()) as Envelope<T>
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || "Request failed")
  }
  return json.data as T
}

/* ---------------------------------------------------------------- monitor side */

/**
 * Assigned listings for the current view.
 *
 * `monitorId` is honoured only for admins — the backend ignores it from anyone
 * else and scopes to the token instead, so passing it is never a way for a
 * monitor to widen what it sees.
 */
export async function fetchMyAssignments(
  query: {
    contentType?: ListingContentType | "all"
    search?: string
    includeArchived?: boolean
    /** Admin only: open the portal as this monitor. */
    monitorId?: string
  } = {},
): Promise<MonitorAssignmentsResult> {
  const params = new URLSearchParams()
  if (query.contentType && query.contentType !== "all") params.set("contentType", query.contentType)
  if (query.search) params.set("search", query.search)
  if (query.includeArchived === false) params.set("includeArchived", "false")
  if (query.monitorId) params.set("monitorId", query.monitorId)

  const suffix = params.toString() ? `?${params.toString()}` : ""
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/monitor/assignments${suffix}`,
  )
  return unwrap(response)
}

/** How promotions on the current view's listings performed. Admin-only monitorId. */
export async function fetchMyPromotions(monitorId?: string): Promise<MonitorPromotionsResult> {
  const suffix = monitorId ? `?monitorId=${encodeURIComponent(monitorId)}` : ""
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/monitor/promotions${suffix}`,
  )
  return unwrap(response)
}

/* ------------------------------------------------------------------ admin side */

/** Admin: every account holding the monitor role. */
export async function fetchMonitors(
  query: { search?: string; limit?: number } = {},
): Promise<{ monitors: MonitorAccount[]; totalCount: number }> {
  const params = new URLSearchParams()
  if (query.search) params.set("search", query.search)
  if (query.limit) params.set("limit", String(query.limit))

  const suffix = params.toString() ? `?${params.toString()}` : ""
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/admin/monitors${suffix}`,
  )
  return unwrap(response)
}

/** Admin: what one monitor currently watches. */
export async function fetchMonitorAssignments(
  monitorId: string,
): Promise<{ counts: AssignmentCounts; totals: ListingAnalyticsTotals; listings: MonitoredListing[] }> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/admin/monitors/${monitorId}/assignments`,
  )
  return unwrap(response)
}

export interface AssignItem {
  contentType: ListingContentType
  contentId: string
}

/**
 * Admin: assign listings to a monitor.
 *
 * Sends the whole selection in one request rather than one call per listing —
 * the same reason the backend accepts an array. Assigning something already
 * assigned is not an error; it comes back counted as `alreadyAssigned`.
 */
export async function assignListings(
  monitorId: string,
  items: AssignItem[],
): Promise<{ assigned: number; alreadyAssigned: number; failed: number }> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/admin/monitors/${monitorId}/assignments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    },
  )
  return unwrap(response)
}

/** Admin: stop a monitor watching one listing. The listing itself is untouched. */
export async function unassignListing(
  monitorId: string,
  contentType: ListingContentType,
  contentId: string,
): Promise<{ removed: boolean }> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/admin/monitors/${monitorId}/assignments/${contentType}/${contentId}`,
    { method: "DELETE" },
  )
  return unwrap(response)
}

/** Admin: who is watching one listing. */
export async function fetchListingMonitors(
  contentType: ListingContentType,
  contentId: string,
): Promise<{ monitors: { _id: string; email: string; displayName: string; assignedAt: string }[] }> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/admin/content/${contentType}/${contentId}/monitors`,
  )
  return unwrap(response)
}
