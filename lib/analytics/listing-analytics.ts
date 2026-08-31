/**
 * Per-listing analytics, shared by the admin and provider portals.
 *
 * Both dashboards read the same endpoint and render the same numbers — the only
 * difference is scope, which the backend enforces from the caller's role. Types
 * and labels live here rather than in either page so the two cannot drift into
 * describing the same figure differently.
 *
 * Mirrors `latest-glowup-channel/src/services/listingAnalyticsService.js`.
 */

import ApiClient from "@/lib/api-client"
import { REASON_LABELS, type TrackerReason } from "@/lib/tracker/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export type ListingContentType = "opportunity" | "job" | "event" | "resource"

/** Straight counts off the listing's stored metrics. */
export interface ListingEngagement {
  /** Every detail-page open, including repeats by the same person. */
  views: number
  /** People, not opens. Always ≤ views. */
  uniqueViewers: number
  likes: number
  saves: number
  /** Outbound clicks to the listing's own site. */
  clicks: number
  registrations: number
  /** likes + saves + clicks + registrations. */
  total: number
}

/**
 * Where everyone who left for the listing ended up.
 *
 * `tracked` is the base: one entry per person who clicked through. The rest
 * partition it. `applied` folds the outcome states back in, because a
 * submission that later got a decision is still a submission.
 */
export interface ListingFunnel {
  tracked: number
  pending: number
  started: number
  submitted: number
  notForMe: number
  used: number
  notUseful: number
  accepted: number
  declined: number
  noResponse: number
  unknown: number
  applied: number
  inProgress: number
  answered: number
}

export interface ListingRates {
  engagementRate: number
  saveRate: number
  likeRate: number
  clickThroughRate: number
  submitRate: number
  abandonRate: number
  notForMeRate: number
  answerRate: number
}

export interface ListingAnalyticsRow {
  _id: string
  contentType: ListingContentType
  title: string
  status: "active" | "inactive" | "draft"
  isApproved: boolean
  isArchived: boolean
  providerId: string | null
  providerName: string | null
  createdAt: string | null
  updatedAt: string | null
  deadline: string | null
  engagement: ListingEngagement
  funnel: ListingFunnel
  rejectionReasons: Partial<Record<TrackerReason, number>>
  rates: ListingRates
}

export interface ListingAnalyticsTotals {
  listings: number
  liveListings: number
  engagement: ListingEngagement
  funnel: ListingFunnel
  rejectionReasons: Partial<Record<TrackerReason, number>>
  rates: ListingRates
}

export interface ListingTimelinePoint {
  date: string
  clicks: number
  submitted: number
  started: number
  notForMe: number
}

export const EMPTY_FUNNEL: ListingFunnel = {
  tracked: 0,
  pending: 0,
  started: 0,
  submitted: 0,
  notForMe: 0,
  used: 0,
  notUseful: 0,
  accepted: 0,
  declined: 0,
  noResponse: 0,
  unknown: 0,
  applied: 0,
  inProgress: 0,
  answered: 0,
}

export const EMPTY_ENGAGEMENT: ListingEngagement = {
  views: 0,
  uniqueViewers: 0,
  likes: 0,
  saves: 0,
  clicks: 0,
  registrations: 0,
  total: 0,
}

export const EMPTY_TOTALS: ListingAnalyticsTotals = {
  listings: 0,
  liveListings: 0,
  engagement: EMPTY_ENGAGEMENT,
  funnel: EMPTY_FUNNEL,
  rejectionReasons: {},
  rates: {
    engagementRate: 0,
    saveRate: 0,
    likeRate: 0,
    clickThroughRate: 0,
    submitRate: 0,
    abandonRate: 0,
    notForMeRate: 0,
    answerRate: 0,
  },
}

/**
 * The apply funnel as a dashboard shows it: three outcomes plus the people who
 * have not said yet. Order is the story — started, applied, ruled out, silent.
 */
export const FUNNEL_STAGES: {
  key: keyof ListingFunnel
  label: string
  hint: string
  tone: "amber" | "emerald" | "rose" | "neutral"
}[] = [
  {
    key: "started",
    label: "Still applying",
    hint: "Opened the application and has not finished it",
    tone: "amber",
  },
  {
    key: "applied",
    label: "Applied",
    hint: "Confirmed they submitted, including those who already heard back",
    tone: "emerald",
  },
  {
    key: "notForMe",
    label: "Not for me",
    hint: "Looked, then ruled it out — see the reasons below",
    tone: "rose",
  },
  {
    key: "pending",
    label: "No answer yet",
    hint: "Clicked through but has not told us what happened",
    tone: "neutral",
  },
]

/** Outcomes that only exist once someone has submitted. */
export const OUTCOME_STAGES: { key: keyof ListingFunnel; label: string }[] = [
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "noResponse", label: "No response" },
  { key: "unknown", label: "Never answered" },
]

export const CONTENT_TYPE_LABELS: Record<ListingContentType, string> = {
  opportunity: "Opportunity",
  job: "Job",
  event: "Event",
  resource: "Resource",
}

export { REASON_LABELS }

/** Rejection reasons for one listing, biggest first. */
export function topRejectionReasons(
  reasons: Partial<Record<TrackerReason, number>>,
  limit = 5,
): { reason: TrackerReason; label: string; count: number }[] {
  return Object.entries(reasons || {})
    .map(([reason, count]) => ({
      reason: reason as TrackerReason,
      label: REASON_LABELS[reason as TrackerReason] ?? reason,
      count: count as number,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** A percentage the backend already rounded, rendered without trailing noise. */
export function formatRate(value: number | undefined): string {
  if (!value || !Number.isFinite(value)) return "0%"
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
}

export function formatCount(value: number | undefined): string {
  return (value ?? 0).toLocaleString()
}

/**
 * Status label matching the provider dashboard's existing six states, so a
 * listing does not read as "Live" on one screen and "Active" on another.
 */
export function listingStatusLabel(row: Pick<ListingAnalyticsRow, "status" | "isApproved">): string {
  if (row.status === "draft") return row.isApproved ? "Hidden" : "Draft"
  if (row.status === "inactive") return "Inactive"
  return row.isApproved ? "Live" : "Pending"
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

export interface ListingAnalyticsQuery {
  contentType?: ListingContentType | "all"
  search?: string
  /** Admin only. Scope the result to one provider's listings. */
  providerId?: string
  includeArchived?: boolean
  /** How many listings to analyse. The backend caps this at 1000. */
  limit?: number
}

export interface ListingAnalyticsResult {
  listings: ListingAnalyticsRow[]
  totals: ListingAnalyticsTotals
  /** True when more listings matched than were analysed — totals cover only these. */
  truncated?: boolean
  /** How many matched before the cap. */
  matchedCount?: number
  scope?: string
}

/**
 * Listing analytics for the current scope.
 *
 * A provider always gets their own listings regardless of what is passed —
 * `providerId` is honoured only for admins, and the backend is what enforces
 * that, not this function.
 */
export async function fetchListingAnalytics(
  query: ListingAnalyticsQuery = {},
): Promise<ListingAnalyticsResult> {
  const params = new URLSearchParams()
  if (query.contentType && query.contentType !== "all") params.set("contentType", query.contentType)
  if (query.search) params.set("search", query.search)
  if (query.providerId) params.set("providerId", query.providerId)
  if (query.includeArchived === false) params.set("includeArchived", "false")
  if (query.limit) params.set("limit", String(query.limit))

  const suffix = params.toString() ? `?${params.toString()}` : ""
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/analytics/listings${suffix}`,
  )
  return unwrap(response)
}

/** One listing in full, with its recent day-by-day activity. */
export async function fetchListingAnalyticsDetail(
  contentType: ListingContentType,
  contentId: string,
  days = 30,
): Promise<{ listing: ListingAnalyticsRow; timeline: ListingTimelinePoint[]; days: number }> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/analytics/listings/${contentType}/${contentId}?days=${days}`,
  )
  return unwrap(response)
}

/** Admin only: listings that no provider owns yet. */
export async function fetchUnattachedListings(
  query: { contentType?: ListingContentType | "all"; search?: string } = {},
): Promise<ListingAnalyticsResult> {
  const params = new URLSearchParams()
  if (query.contentType && query.contentType !== "all") params.set("contentType", query.contentType)
  if (query.search) params.set("search", query.search)

  const suffix = params.toString() ? `?${params.toString()}` : ""
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/analytics/listings/unattached${suffix}`,
  )
  return unwrap(response)
}
