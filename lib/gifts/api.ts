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
import type {
  Gift,
  GiftAnnouncement,
  GiftDraft,
  GiftListingRef,
  GiftListingType,
  GiftListPage,
} from "@/lib/gifts/types"

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
 * Always the PDF derivative, served `Content-Disposition: inline` and
 * `no-store`. Reading never depends on `allowDownload` — a view-only gift and a
 * downloadable one render through exactly the same path.
 */
export async function fetchGiftContentBlob(id: string): Promise<Blob> {
  const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/${id}/content`)
  if (!response.ok) throw new Error(`Failed to load gift content (HTTP ${response.status})`)
  return response.blob()
}

/** The filename the backend asked us to save under, if it named one. */
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  // filename*=UTF-8''… wins over the plain form: it is the one that survives
  // non-ASCII titles.
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1])
    } catch {
      // Fall through to the plain filename.
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1] : null
}

/**
 * Download a gift's original file — the .docx as uploaded, not the PDF the
 * reader shows.
 *
 * The backend answers 403 when the gift is view-only, so this throws with that
 * message rather than saving an error page. Returns the blob plus the name the
 * server chose; the caller owns the save.
 */
export async function fetchGiftDownload(id: string): Promise<{ blob: Blob; filename: string | null }> {
  const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/gifts/${id}/download`)
  if (!response.ok) {
    let message = `Failed to download gift (HTTP ${response.status})`
    try {
      const json = (await response.json()) as Envelope<never>
      if (json?.message) message = json.message
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new Error(message)
  }
  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get("Content-Disposition")),
  }
}

/**
 * Fetch a downloadable gift and hand it to the browser's save dialog.
 *
 * Goes through the authenticated proxy and an object URL rather than pointing
 * an anchor at the API: the endpoint needs a bearer token, and the Cloudinary
 * URL behind it is never exposed to the page.
 */
export async function downloadGift(id: string, fallbackName: string): Promise<void> {
  const { blob, filename } = await fetchGiftDownload(id)
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename || fallbackName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    // Revoking immediately can race the download in Safari; one tick is enough.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
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

/**
 * Live listings an admin can give away, for the picker.
 *
 * Empty on any failure rather than throwing: the picker degrades to "no
 * matches", which is what an admin can act on, and never takes the form down
 * with it.
 */
export async function searchGiftListings(
  query: string,
  type?: GiftListingType | "all",
): Promise<GiftListingRef[]> {
  const params = new URLSearchParams({ q: query })
  if (type && type !== "all") params.set("type", type)
  try {
    const response = await ApiClient.makeAuthenticatedRequest(
      `${API_BASE_URL}/api/gifts/admin/listings?${params}`,
    )
    const data = await unwrap<{ listings: GiftListingRef[] }>(response)
    return data?.listings ?? []
  } catch {
    return []
  }
}

function draftToFormData(draft: Partial<GiftDraft>): FormData {
  const form = new FormData()
  if (draft.title !== undefined) form.append("title", draft.title)
  if (draft.description !== undefined) form.append("description", draft.description)
  if (draft.category !== undefined) form.append("category", draft.category)
  if (draft.tags !== undefined) form.append("tags", JSON.stringify(draft.tags))
  if (draft.isActive !== undefined) form.append("isActive", String(draft.isActive))
  if (draft.allowDownload !== undefined) form.append("allowDownload", String(draft.allowDownload))
  if (draft.linkUrl) form.append("linkUrl", draft.linkUrl)
  // Sent as a pair — the backend reads a gift as a listing gift only when both
  // arrive, so a half-filled picker can never overwrite the current delivery.
  if (draft.listingType && draft.listingId) {
    form.append("listingType", draft.listingType)
    form.append("listingId", draft.listingId)
  }
  if (draft.file) form.append("file", draft.file)
  if (draft.coverImage) form.append("coverImage", draft.coverImage)
  // Only sent when true: the backend treats an absent flag as "keep the cover".
  if (draft.removeCoverImage) form.append("removeCoverImage", "true")
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

/**
 * Edit a published gift. Does not re-announce — the popup keys off createdAt,
 * which an edit leaves alone.
 */
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
