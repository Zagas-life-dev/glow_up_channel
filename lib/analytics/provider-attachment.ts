/**
 * Admin-side provider attachment.
 *
 * Scraped and admin-entered listings have no owner, so they appear in no
 * provider dashboard. These calls point a listing at a provider account, which
 * is what makes it show up under that provider's content and analytics.
 *
 * Mirrors `latest-glowup-channel/src/services/providerAttachmentService.js`.
 */

import ApiClient from "@/lib/api-client"
import type { ListingContentType } from "@/lib/analytics/listing-analytics"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export interface AttachableProvider {
  _id: string
  email: string
  role: string
  status: string
  /** From provider onboarding, when they have completed it. */
  organizationName: string | null
  /** Organisation name if there is one, otherwise the account name. */
  displayName: string
  logoUrl: string | null
  onboardingCompleted: boolean
  onboardingPercentage: number
}

export interface AttachmentCounts {
  opportunity: number
  job: number
  event: number
  resource: number
  total: number
}

export interface AttachTarget {
  contentType: ListingContentType
  contentId: string
}

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

/** Accounts a listing can be attached to — publishers only. */
export async function fetchAttachableProviders(search?: string): Promise<AttachableProvider[]> {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : ""
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/admin/providers${suffix}`,
  )
  const data = await unwrap<{ providers: AttachableProvider[] }>(response)
  return data.providers || []
}

/** What one provider currently owns, by type. */
export async function fetchProviderAttachmentCounts(providerId: string): Promise<AttachmentCounts> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/admin/providers/${providerId}/attachments`,
  )
  const data = await unwrap<{ counts: AttachmentCounts }>(response)
  return data.counts
}

/**
 * Attach one listing to a provider.
 *
 * `displayName` overrides the organisation name shown on the listing. Leave it
 * unset to keep whatever name the listing already carries — for a scraped
 * posting that name is usually the correct public one.
 */
export async function attachListingToProvider(
  contentType: ListingContentType,
  contentId: string,
  providerId: string,
  displayName?: string,
): Promise<void> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/admin/content/${contentType}/${contentId}/provider`,
    {
      method: "POST",
      body: JSON.stringify({ providerId, displayName: displayName || undefined }),
    },
  )
  await unwrap(response)
}

/** Remove a listing's provider link. The organisation name is left in place. */
export async function detachListingFromProvider(
  contentType: ListingContentType,
  contentId: string,
): Promise<void> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/admin/content/${contentType}/${contentId}/provider`,
    { method: "DELETE" },
  )
  await unwrap(response)
}

/** Attach a batch. Reports per-item outcomes rather than failing the whole set. */
export async function attachListingsToProvider(
  items: AttachTarget[],
  providerId: string,
  displayName?: string,
): Promise<{ attached: number; failed: number; results: { contentId: string; ok: boolean; message: string | null }[] }> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/admin/content/attach-provider`,
    {
      method: "POST",
      body: JSON.stringify({ providerId, items, displayName: displayName || undefined }),
    },
  )
  return unwrap(response)
}
