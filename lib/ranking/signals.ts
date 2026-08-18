/**
 * The individual scorers. Each returns 0..1, or `null` when it has nothing to
 * go on — see `SignalValue` for why that distinction matters.
 *
 * Every function here is pure and synchronous. That is not incidental: ranking
 * runs on every feed page render for up to a few hundred items, so anything
 * that allocates heavily or awaits would show up immediately.
 */

import { countryByCode } from "@/lib/geo/countries"
import { proximity, type ProximityResult } from "@/lib/geo/distance"
import type { PlaceLocation, ResolvedLocation } from "@/lib/geo/types"
import {
  isSupportedLanguage,
  type SupportedLanguage,
} from "@/lib/nlp/detect-language"
import type { TextProfile } from "@/lib/nlp/profile-text"
import { semanticSimilarity } from "@/lib/nlp/similarity"
import type { SignalValue } from "@/lib/ranking/types"

const DAY_MS = 24 * 60 * 60 * 1000

function toTime(value: unknown): number | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

/**
 * Pull a place out of a listing.
 *
 * Listings are inconsistent — sometimes a nested `location` object, sometimes
 * flat `country`/`city` fields, sometimes a single "Lagos, Nigeria" string that
 * `lookupCountry` has to unpick. All three shapes appear in the scraped feeds.
 */
export function contentPlace(
  item: Record<string, unknown>,
): PlaceLocation & { isRemote?: boolean; coordinates?: { lat: number; lng: number } } {
  const nested =
    item.location && typeof item.location === "object"
      ? (item.location as Record<string, unknown>)
      : {}

  const lat = Number(nested.lat ?? nested.latitude ?? item.lat)
  const lng = Number(nested.lng ?? nested.longitude ?? item.lng)

  const remoteFlag = nested.isRemote ?? item.isRemote ?? item.remote
  const country = firstString(nested.country, item.country)
  const city = firstString(nested.city, item.city, nested.address)

  return {
    country,
    countryCode: firstString(nested.countryCode, item.countryCode),
    region: firstString(nested.region, nested.province, nested.state, item.province),
    city,
    isRemote:
      typeof remoteFlag === "boolean"
        ? remoteFlag
        : typeof remoteFlag === "string"
          ? /^(true|yes|remote)$/i.test(remoteFlag)
          : undefined,
    coordinates:
      Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
  }
}

/** Where the listing is versus where the user is. */
export function locationSignal(
  user: ResolvedLocation,
  item: Record<string, unknown>,
): { value: SignalValue; proximity: ProximityResult } {
  const place = contentPlace(item)
  const result = proximity(
    { ...user, coordinates: user.coordinates },
    { ...place },
  )

  // Nothing known about the user's location and the listing is not remote:
  // there is no comparison to make, so abstain rather than guess.
  const userKnown = Boolean(user.countryCode || user.coordinates)
  if (!userKnown && result.tier !== "remote") {
    return { value: null, proximity: result }
  }

  return { value: result.score, proximity: result }
}

/**
 * Can they read it?
 *
 * Unknown content language scores neutral-positive rather than null, because
 * "we could not tell" usually means a short title, and short titles are mostly
 * fine to show. Actively wrong-language content is what we want to push down.
 */
export function languageSignal(
  reading: SupportedLanguage,
  secondary: SupportedLanguage[],
  contentLanguage: SupportedLanguage | null,
): SignalValue {
  if (!contentLanguage) return 0.6
  if (contentLanguage === reading) return 1
  if (secondary.includes(contentLanguage)) return 0.8
  // English is the platform's lingua franca — most users cope with it even when
  // reading the UI in another language.
  if (contentLanguage === "en") return 0.5
  return 0.2
}

/** Languages spoken where the user is, as a secondary-language fallback. */
export function languagesForCountry(countryCode?: string): SupportedLanguage[] {
  const country = countryByCode(countryCode)
  if (!country) return []
  return country.languages.filter(isSupportedLanguage)
}

/** Tag and keyword overlap between the user and the listing. */
export function semanticSignal(
  user: TextProfile,
  content: TextProfile,
): SignalValue {
  if (user.tags.size === 0 && user.keywords.size === 0) return null
  if (content.tags.size === 0 && content.keywords.size === 0) return null
  return semanticSimilarity(user, content)
}

function datesOf(item: Record<string, unknown>): Record<string, unknown> {
  return item.dates && typeof item.dates === "object"
    ? (item.dates as Record<string, unknown>)
    : {}
}

/**
 * The application deadline, in ms, or null.
 *
 * Nested `dates` object first, then the flat fields — both shapes come out of
 * the scrapers depending on the source.
 *
 * `registrationDeadline` is the events model's name for this (opportunities and
 * jobs use `applicationDeadline`); without it every event read as undated and
 * was treated as having no time pressure at all.
 */
export function deadlineOf(item: Record<string, unknown>): number | null {
  const dates = datesOf(item)
  return (
    toTime(
      dates.deadline ??
        dates.applicationDeadline ??
        dates.registrationDeadline ??
        dates.endDate,
    ) ??
    toTime(
      item.deadline ??
        item.applicationDeadline ??
        item.registrationDeadline ??
        item.endDate,
    )
  )
}

/**
 * The date the user actually has to act by.
 *
 * For most content that is the deadline; for events there is no deadline and
 * the start date is what runs out. Callers that care about time pressure want
 * this, not `deadlineOf`.
 */
export function actionableDateOf(item: Record<string, unknown>): number | null {
  const deadline = deadlineOf(item)
  if (deadline !== null) return deadline
  const dates = datesOf(item)
  return toTime(dates.startDate ?? dates.start) ?? toTime(item.startDate ?? item.date)
}

/**
 * Deadline pressure, as a *score*.
 *
 * Peaks in the two-to-three-week band. Sooner than that and there may not be
 * time to apply; much later and there is no reason to act today. Already
 * expired scores 0 — `isExpired` exists so callers can drop those entirely.
 *
 * Note this curve is deliberately non-monotonic and is not what the feed's
 * variety ordering uses — that wants "sooner is always better", which is
 * `timePressure` in `lib/feed-variety-order.ts`.
 */
export function urgencySignal(
  item: Record<string, unknown>,
  now: number,
): SignalValue {
  const target = actionableDateOf(item)
  if (target === null) return null

  const days = (target - now) / DAY_MS
  if (days < 0) return 0
  if (days <= 3) return 0.7
  if (days <= 21) return 1
  if (days <= 60) return 0.75
  if (days <= 120) return 0.5
  return 0.35
}

/** Has this already closed? Expired listings should not be ranked at all. */
export function isExpired(item: Record<string, unknown>, now: number): boolean {
  const deadline = deadlineOf(item)
  return deadline !== null && deadline < now
}

/** Recency, on a two-week half-life. */
export function freshnessSignal(
  item: Record<string, unknown>,
  now: number,
  halfLifeDays = 14,
): SignalValue {
  const created = toTime(item.createdAt ?? item.publishedAt ?? item.updatedAt)
  if (created === null) return null
  const ageDays = Math.max(0, (now - created) / DAY_MS)
  return 2 ** (-ageDays / halfLifeDays)
}

/**
 * Popularity, log-scaled.
 *
 * Weighted by intent: saving something means far more than loading the page it
 * is on. Log scaling stops one viral listing from flattening everything else.
 */
export function engagementSignal(item: Record<string, unknown>): SignalValue {
  const metrics =
    item.metrics && typeof item.metrics === "object"
      ? (item.metrics as Record<string, unknown>)
      : item

  const count = (...keys: string[]): number => {
    for (const key of keys) {
      const value = (metrics as Record<string, unknown>)[key]
      if (typeof value === "number" && Number.isFinite(value)) return value
      if (Array.isArray(value)) return value.length
    }
    return 0
  }

  const views = count("views", "viewCount", "impressions")
  const likes = count("likes", "likeCount")
  const saves = count("saves", "saveCount", "bookmarks")
  const applications = count("applications", "applicationCount", "registrations")

  const weighted = views * 0.1 + likes * 1 + saves * 2.5 + applications * 4
  if (weighted <= 0) return null

  // Saturates around a few hundred weighted points.
  return Math.min(1, Math.log10(1 + weighted) / 2.7)
}

/**
 * The backend's own score, if it sent one.
 *
 * Worth keeping: the server sees engagement history and career-stage matching
 * that this layer has no access to. Blending it in means the re-rank refines
 * the backend rather than overriding it.
 */
export function baseScoreSignal(item: Record<string, unknown>): SignalValue {
  const score = item.score
  if (typeof score !== "number" || !Number.isFinite(score)) return null
  return Math.max(0, Math.min(1, score / 100))
}
