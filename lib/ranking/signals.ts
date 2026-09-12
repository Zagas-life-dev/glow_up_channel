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
import type { TrackerHistory } from "@/lib/tracker/history"
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
 *
 * Note this reads the deadline fields directly rather than delegating to
 * `deadlineOf`, because the two want `endDate` in different places. For expiry,
 * an event is over when it ends. For *acting*, what runs out is the start — the
 * morning you had to be there — so `endDate` is only the last resort here, for
 * something that carries no start date at all. Delegating measured urgency to
 * the end of a three-day conference instead of to its first morning.
 */
export function actionableDateOf(item: Record<string, unknown>): number | null {
  const dates = datesOf(item)

  const deadline =
    toTime(dates.deadline ?? dates.applicationDeadline ?? dates.registrationDeadline) ??
    toTime(item.deadline ?? item.applicationDeadline ?? item.registrationDeadline)
  if (deadline !== null) return deadline

  const start =
    toTime(dates.startDate ?? dates.start) ?? toTime(item.startDate ?? item.date)
  if (start !== null) return start

  return toTime(dates.endDate) ?? toTime(item.endDate)
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
 *
 * The conversion event differs by content type, and every type's has to be
 * counted or that type is scored on its weakest evidence. Downloading a
 * resource is what applying is to a job — it was read as zero, so a workbook
 * with five thousand downloads and one nobody had ever opened scored
 * identically. Resources also carry `playlistAddCount`, `shareCount` and
 * `clickCount`, all of which were invisible.
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
  const clicks = count("clicks", "clickCount")
  const likes = count("likes", "likeCount")
  const shares = count("shares", "shareCount")
  const saves = count("saves", "saveCount", "bookmarks")
  const playlistAdds = count("playlistAdds", "playlistAddCount")
  const downloads = count("downloads", "downloadCount")
  // `registrationCount` is the events model's spelling. The list here read
  // "registrations", which nothing writes — so registering for an event, the
  // one thing an event asks of a reader, counted for exactly nothing.
  const applications = count(
    "applications",
    "applicationCount",
    "registrations",
    "registrationCount",
  )

  const weighted =
    views * 0.1 +
    clicks * 0.15 +
    likes * 1 +
    shares * 1.5 +
    saves * 2.5 +
    playlistAdds * 2.5 +
    downloads * 4 +
    applications * 4
  if (weighted <= 0) return null

  // Saturates around three thousand weighted points. The old divisor of 2.7
  // saturated at ~500, which every popular listing of every type already
  // cleared — so the whole top of the catalogue tied at 1.0 and the signal
  // stopped separating anything.
  return Math.min(1, Math.log10(1 + weighted) / 3.5)
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

/**
 * What this person actually did, last time they met something like this.
 *
 * The only signal here built from first-party outcome data rather than a guess.
 * Everything else scores what a listing *looks* like; this scores what the user
 * did about it when they last had the chance.
 *
 * Returns `null` — costing nothing, per the drop-don't-zero rule — whenever
 * there is no history bearing on the item. Most users start there and earn the
 * signal one answer at a time.
 */
export function historySignal(
  history: TrackerHistory | undefined,
  item: Record<string, unknown>,
): SignalValue {
  if (!history || history.size === 0) return null

  const id = firstString(item._id, item.id)
  const own = id ? history.byContentId.get(id) : undefined

  if (own) {
    switch (own) {
      // They meant to finish this and did not. Re-surfacing it is the single
      // most useful thing the feed can do with a tracker answer.
      case "started":
        return 0.95

      // They said no. Scored to the floor rather than filtered out — the user
      // asked for a preference, not a blocklist, and a hard filter would make
      // one tap permanently invisible in a way they never agreed to.
      case "not_for_me":
      case "not_useful":
        return 0

      // Already dealt with. Not a rejection, but there is no value in pushing
      // it back up a feed they have already acted on.
      case "submitted":
      case "accepted":
      case "declined":
      case "no_response":
      case "used":
        return 0.1

      // Asked and never answered. No verdict to apply, so fall through to the
      // category and provider affinities below.
      default:
        break
    }
  }

  const category = firstString(item.category, item.type)?.trim().toLowerCase()
  const provider = firstString(
    item.organization,
    item.provider,
    item.company,
  )?.trim().toLowerCase()

  const parts: number[] = []
  if (category) {
    const value = history.byCategory.get(category)
    if (value !== undefined) parts.push(value)
  }
  if (provider) {
    const value = history.byProvider.get(provider)
    if (value !== undefined) parts.push(value)
  }

  if (parts.length === 0) return null

  // Affinities run -1..1; the signal scale is 0..1, with 0.5 as "no opinion".
  const mean = parts.reduce((sum, value) => sum + value, 0) / parts.length
  return Math.max(0, Math.min(1, (mean + 1) / 2))
}
