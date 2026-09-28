/**
 * Demographics — who the users are and how each group behaves.
 *
 * Mirrors `latest-glowup-channel/src/services/demographicsService.js`. Admin
 * only. Groups with fewer than `minCell` users arrive already folded into
 * "Other"; a country filter too small to show comes back `suppressed`.
 */

import ApiClient from "@/lib/api-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export type DemographicMetric = "users" | "active" | "newUsers" | "applicants"

export interface DemographicRow {
  /** "other" for the folded small groups. */
  key: string
  name: string
  /** How many small groups were folded into this row (Other only). */
  groups?: number
  users: number
  active: number
  newUsers: number
  applicants: number
}

export interface DemographicBreakdown {
  /** People who gave any answer for this dimension. */
  answered: number
  rows: DemographicRow[]
}

export interface DemographicsOverview {
  days: number
  minCell: number
  countryCode: string | null
  countries: { countryCode: string; country: string; users: number }[]
  suppressed: boolean
  totals: {
    users: number
    active: number
    newUsers: number
    applicants: number
    onboarded: number
    emailVerified: number
    withAge: number
    medianAge: number | null
  }
  age: DemographicBreakdown
  roles: DemographicBreakdown
  careerStage: DemographicBreakdown
  education: DemographicBreakdown
  sectors: DemographicBreakdown
  interests: DemographicBreakdown
  communities: DemographicBreakdown
}

export async function fetchPlatformDemographics(query: { days?: number; country?: string | null } = {}): Promise<DemographicsOverview> {
  const params = new URLSearchParams({ days: String(query.days ?? 30) })
  if (query.country) params.set("country", query.country)
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/analytics/demographics/platform?${params.toString()}`,
  )
  const json = await response.json()
  if (!response.ok || !json?.success) throw new Error(json?.message || "Request failed")
  return json.data as DemographicsOverview
}
