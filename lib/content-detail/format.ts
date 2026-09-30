/**
 * Formatting shared by the four content detail pages.
 *
 * Lifted out of the opportunity page when events, jobs and resources adopted
 * the same layout — three copies of `daysUntil` would have drifted apart the
 * first time someone fixed a rounding bug in one of them.
 */

import { cleanUrl } from "@/lib/url-utils"

/**
 * The zone listing dates are shown in when the listing names none.
 *
 * Detail pages render on the server first, so dates must not depend on the
 * machine's zone: a UTC server and a Lagos browser would print different days
 * for anything stored at local midnight. Lagos is the platform's home market.
 */
export const LISTING_TIME_ZONE = "Africa/Lagos"

/** A valid IANA zone, or the listing default. */
export function listingZone(timeZone?: string | null): string {
  if (!timeZone) return LISTING_TIME_ZONE
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return timeZone
  } catch {
    return LISTING_TIME_ZONE
  }
}

export const formatDate = (value: string, timeZone?: string | null) =>
  new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: listingZone(timeZone),
  })

export const formatShortDate = (value: string, timeZone?: string | null) =>
  new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: listingZone(timeZone),
  })

/**
 * Whether a stored date carries a real clock time.
 *
 * Date-only values arrive as midnight, either UTC or in the listing's zone;
 * printing "1:00 AM" for those would invent a start time nobody published.
 */
export function hasClockTime(value: string, timeZone?: string | null): boolean {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) return false
  const local = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: listingZone(timeZone),
  })
  return local !== "00:00"
}

/** "Oct 3, 2026, 8:30 AM GMT+1", or just the date when no time was published. */
export function formatDateTime(value: string, timeZone?: string | null): string {
  if (!hasClockTime(value, timeZone)) return formatDate(value, timeZone)
  return new Date(value).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: listingZone(timeZone),
    timeZoneName: "short",
  })
}

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

/** The other places a listing is offered in, by their most precise name. */
function extraPlaceNames(location: any): string[] {
  if (!location || !Array.isArray(location.places)) return []
  return location.places
    .map((place: any) => place?.city || place?.province)
    .filter((name: unknown): name is string => typeof name === "string" && name.trim() !== "")
}

/**
 * "Remote", "Lagos, Nigeria", or null — never the string "undefined".
 *
 * A listing offered in several states of one country adds them:
 * "Lagos, Nigeria · also Port Harcourt, Abuja +2".
 */
export function locationLine(location: any): string | null {
  if (!location) return null
  if (typeof location === "string") return location || null
  if (location.isRemote) return "Remote"
  const parts = [location.city || location.province, location.country].filter(Boolean)
  if (parts.length === 0) return null
  const others = extraPlaceNames(location)
  if (others.length === 0) return parts.join(", ")
  const shown = others.slice(0, 2).join(", ")
  const rest = others.length > 2 ? ` +${others.length - 2}` : ""
  return `${parts.join(", ")} · also ${shown}${rest}`
}

/**
 * A feed card's location: the place nearest the reader when the ranker picked
 * one (`nearestLocation`), else the main place, with a count of the others —
 * "Port Harcourt, Nigeria +2 more". A card has no room for the full list.
 */
export function cardLocationLine(item: any): string | null {
  const location = item?.location
  if (!location || typeof location === "string") return locationLine(location)
  if (location.isRemote) return "Remote"
  const shown = item.nearestLocation ?? location
  const parts = [shown.city || shown.province, shown.country ?? location.country].filter(Boolean)
  if (parts.length === 0) return null
  const others = extraPlaceNames(location).length
  return others > 0 ? `${parts.join(", ")} +${others} more` : parts.join(", ")
}
