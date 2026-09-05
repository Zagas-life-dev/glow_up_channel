/**
 * Gifts: admin-published resources handed to every user at once.
 *
 * A gift is a resource in everything but reach — same file pipeline, same
 * in-app viewer — except it lives in its own backend collection and therefore
 * never appears in a feed, in search, in recommendations, or in rotation. The
 * only places a gift surfaces are the announcement popup and the shared gift
 * list on the profile page.
 *
 * Gifts read in the app by default. `allowDownload` is the per-gift opt-out of
 * that: with it on, members can also keep the original file.
 */

/** How a gift's content is delivered. */
export type GiftType = "file" | "link"

export interface Gift {
  _id: string
  title: string
  description: string
  category: string
  giftType: GiftType
  /** Present only on link gifts; file gifts stream through the content proxy. */
  linkUrl: string | null
  fileType: string | null
  fileSize: number | null
  pageCount: number | null
  /** The original upload's filename, used as the download's name. */
  fileName: string | null
  /**
   * The admin let members keep this file. A hint for the UI only — the backend
   * re-checks it, so hiding or showing the button changes nothing on its own.
   */
  allowDownload: boolean
  /** Cover art for the popup and the gift card. */
  image: string | null
  tags: string[]
  isActive: boolean
  metrics: GiftMetrics
  createdAt: string
  updatedAt: string

  // Per-viewer state, folded in by the backend.
  liked: boolean
  saved: boolean
  openedAt: string | null
  /** The viewer has never opened this gift — drives the NEW badge. */
  isNew: boolean
}

export interface GiftMetrics {
  viewCount: number
  openCount: number
  likeCount: number
  saveCount: number
  playlistAddCount: number
  downloadCount: number
}

/**
 * What the popup needs.
 *
 * `newCount` is the total number of unacknowledged gifts, so a user who was
 * away while several landed gets one popup for the newest plus a "+N more"
 * line rather than a stack of modals.
 */
export interface GiftAnnouncement {
  gift: Gift | null
  newCount: number
}

export interface GiftListPage {
  gifts: Gift[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

/**
 * Fields the admin form submits. `file` and `linkUrl` are mutually exclusive.
 *
 * On an edit, every field is optional and omitting one leaves it untouched —
 * which is why removing a cover image needs its own flag rather than sending an
 * empty `coverImage`.
 */
export interface GiftDraft {
  title: string
  description: string
  category: string
  tags: string[]
  linkUrl?: string
  file?: File | null
  coverImage?: File | null
  /** Explicitly clear the existing cover image. */
  removeCoverImage?: boolean
  isActive?: boolean
  /** Let members download the original file. Ignored on a link gift. */
  allowDownload?: boolean
}

/**
 * File types the browser renders from the original upload, with no server-side
 * PDF conversion in between.
 *
 * Must stay in step with the backend's CLIENT_RENDERED_TYPES: the content proxy
 * decides which asset to stream from the same list, so a mismatch would hand
 * one viewer the bytes meant for the other.
 */
const CLIENT_RENDERED_FILE_TYPES = new Set(["docx"])

/** True when this gift is painted by the client-side Word renderer. */
export function isClientRenderedGift(fileType: string | null): boolean {
  return fileType !== null && CLIENT_RENDERED_FILE_TYPES.has(fileType)
}

/** Human-readable file size for the gift card, e.g. "2.4 MB". */
export function formatGiftSize(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null
  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

/** Categories offered in the admin form. Free text is still accepted by the API. */
export const GIFT_CATEGORIES = [
  { value: "guide", label: "Guide" },
  { value: "template", label: "Template" },
  { value: "toolkit", label: "Toolkit" },
  { value: "ebook", label: "E-book" },
  { value: "worksheet", label: "Worksheet" },
  { value: "course", label: "Course" },
  { value: "other", label: "Other" },
] as const
