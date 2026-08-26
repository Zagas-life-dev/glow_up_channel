/**
 * Gift API calls.
 *
 * Kept beside the gift types rather than in ApiClient because the whole surface
 * is one feature's worth of endpoints, and because most of these are
 * best-effort: a failed announcement poll or a failed open-tracking call must
 * never surface an error to the user. They go through
 * ApiClient.makeAuthenticatedRequest so token refresh still applies.
 */

import ApiClient from "@/lib/api-client"
import type { Gift, GiftAnnouncement, GiftDraft, GiftListPage } from "@/lib/gifts/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

interface Envelope<T> {
  success: boolean
  message?: string
  data?: T
  errors?: unknown[]
}

async function unwrap<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null
  try {
    const json = (await response.json()) as Envelope<T>
    return json?.success ? (json.data ?? null) : null
  } catch {
    return null
  }
}

/** Throwing variant, for the admin screens where failures need a real message. */
async function unwrapOrThrow<T>(response: Response): Promise<T> {
  let json: Envelope<T> | null = null
  try {
    json = (await response.json()) as Envelope<T>
  } catch {
    throw new Error(`Request failed (HTTP ${response.status})`)
  }
  if (!response.ok || !json?.success) {
    const detail = Array.isArray(json?.errors) && json.errors.length > 0 ? `: ${json.errors.join(", ")}` : ""
    throw new Error(`${json?.message || `Request failed (HTTP ${response.status})`}${detail}`)
  }
  return (json.data ?? null) as T
}

// ------------------------------------------------------------------ reading

/** The shared gift list. Same gifts for everyone; per-viewer state folded in. */
export async function fetchGifts(page = 1, limit = 20): Promise<GiftListPage | null> {
  const response = await ApiClient.makeAuthenticatedRequest(
    `${API_BASE_URL}/api/gifts?page=${page}&limit=${limit}`,
  )
  return unwrap<GiftListPage>(response)
}

export async function fetchGift(id: string): Promise<Gift | null> {
  const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/${id}`)
  const data = await unwrap<{ gift: Gift }>(response)
  return data?.gift ?? null
}

/**
 * A file gift's bytes, for the in-app viewer.
 *
 * The response is `Content-Disposition: inline` and `no-store` — there is no
 * download URL to hand out, which is what keeps gifts render-only.
 */
export async function fetchGiftContentBlob(id: string): Promise<Blob> {
  const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/${id}/content`)
  if (!response.ok) throw new Error(`Failed to load gift content (HTTP ${response.status})`)
  return response.blob()
}

// ------------------------------------------------------------- announcement

/** Poll for the newest unacknowledged gift. Null on any failure — never throws. */
export async function fetchAnnouncement(): Promise<GiftAnnouncement | null> {
  try {
    const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/announcement`)
    return await unwrap<GiftAnnouncement>(response)
  } catch {
    return null
  }
}

/**
 * Retire the popup. Closing, viewing, and opening the list all call this.
 *
 * `upTo` is the announced gift's own createdAt rather than "now", so a gift
 * published while the popup was on screen still gets its own popup.
 */
export async function acknowledgeAnnouncement(upTo?: string): Promise<void> {
  try {
    await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/announcement/ack`, {
      method: "POST",
      body: JSON.stringify(upTo ? { upTo } : {}),
    })
  } catch {
    // Best effort: a missed ack only means the popup reappears next poll.
  }
}

// -------------------------------------------------------------- engagement

/** Record an open: clears the gift's NEW badge and counts a view. */
export async function markGiftOpened(id: string): Promise<void> {
  try {
    await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/${id}/open`, { method: "POST" })
  } catch {
    // Best effort — view counts are not worth an error toast.
  }
}

export async function setGiftLiked(id: string, liked: boolean): Promise<void> {
  const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/${id}/like`, {
    method: liked ? "POST" : "DELETE",
  })
  await unwrapOrThrow(response)
}

export async function setGiftSaved(id: string, saved: boolean): Promise<void> {
  const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/${id}/save`, {
    method: saved ? "POST" : "DELETE",
  })
  await unwrapOrThrow(response)
}

// ------------------------------------------------------------------- admin

export async function fetchGiftsAdmin(): Promise<Gift[]> {
  const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/admin`)
  const data = await unwrapOrThrow<{ gifts: Gift[] }>(response)
  return data?.gifts ?? []
}

function draftToFormData(draft: Partial<GiftDraft>): FormData {
  const form = new FormData()
  if (draft.title !== undefined) form.append("title", draft.title)
  if (draft.description !== undefined) form.append("description", draft.description)
  if (draft.category !== undefined) form.append("category", draft.category)
  if (draft.tags !== undefined) form.append("tags", JSON.stringify(draft.tags))
  if (draft.isActive !== undefined) form.append("isActive", String(draft.isActive))
  if (draft.linkUrl) form.append("linkUrl", draft.linkUrl)
  if (draft.file) form.append("file", draft.file)
  if (draft.coverImage) form.append("coverImage", draft.coverImage)
  return form
}

/**
 * Publish a gift. This single write is the notification: every user's popup is
 * driven by comparing this gift's createdAt against their own last-seen stamp.
 *
 * Goes through makeAuthenticatedFormRequest so the browser sets the multipart
 * boundary itself — the JSON content type the normal client attaches would
 * corrupt the upload.
 */
export async function createGift(draft: GiftDraft): Promise<Gift> {
  const response = await ApiClient.makeAuthenticatedFormRequest(
    `${API_BASE_URL}/api/gifts`,
    "POST",
    draftToFormData(draft),
  )
  const data = await unwrapOrThrow<{ gift: Gift }>(response)
  return data.gift
}

export async function updateGift(id: string, draft: Partial<GiftDraft>): Promise<Gift> {
  const response = await ApiClient.makeAuthenticatedFormRequest(
    `${API_BASE_URL}/api/gifts/${id}`,
    "PATCH",
    draftToFormData(draft),
  )
  const data = await unwrapOrThrow<{ gift: Gift }>(response)
  return data.gift
}

export async function deleteGift(id: string): Promise<void> {
  const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/${id}`, {
    method: "DELETE",
  })
  await unwrapOrThrow(response)
}
