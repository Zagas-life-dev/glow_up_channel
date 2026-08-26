/**
 * Formatting shared by the four content detail pages.
 *
 * Lifted out of the opportunity page when events, jobs and resources adopted
 * the same layout — three copies of `daysUntil` would have drifted apart the
 * first time someone fixed a rounding bug in one of them.
 */

import { cleanUrl } from "@/lib/url-utils"

export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })

export const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short" })

/** Whole days until `value`. `null` when there is no date, or it has passed. */
export function daysUntil(value?: string): number | null {
  if (!value) return null
  const target = new Date(value).getTime()
  if (Number.isNaN(target)) return null
  const diff = target - Date.now()
  if (diff <= 0) return null
  return Math.ceil(diff / 86_400_000)
}

/** The host the outbound button actually sends them to, e.g. "vitalimpacts.org". */
export function applyHost(url?: string): string | null {
  if (!url) return null
  try {
    return new URL(cleanUrl(url)).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

export function money(financial: any): string | null {
  if (!financial?.amount) return null
  return `${financial.currency ? `${financial.currency} ` : ""}${financial.amount}`
}

/** One of the three numbers in the hero. `urgent` turns it orange. */
export type StatTile = { label: string; value: string; urgent?: boolean }

/**
 * Assemble the hero's tiles.
 *
 * A tile is never shown with a guessed value, so a sparse scraped record simply
 * renders fewer of them. The countdown, being the most perishable number on the
 * page, keeps its slot and pushes an optional tile out rather than the reverse.
 */
export function composeTiles(optional: StatTile[], deadlineTile: StatTile | null): StatTile[] {
  const trailing = deadlineTile ? [deadlineTile] : []
  return [...optional.slice(0, trailing.length ? 2 : 3), ...trailing]
}

/** The "Left: 6d" tile, or nothing when the date is missing or already gone. */
export function deadlineTile(value?: string, urgentWithin = 7): StatTile | null {
  const left = daysUntil(value)
  if (left === null) return null
  return { label: "Left", value: `${left}d`, urgent: left <= urgentWithin }
}

/** "Remote", "Lagos, Nigeria", or null — never the string "undefined". */
export function locationLine(location: any): string | null {
  if (!location) return null
  if (typeof location === "string") return location || null
  if (location.isRemote) return "Remote"
  const parts = [location.city, location.country].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}
