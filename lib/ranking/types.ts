/**
 * Shapes shared by the ranking layer.
 *
 * `RankedItem` deliberately mirrors what the backend's recommendation endpoints
 * already return — `score` plus `reasons` — so ranked output drops straight
 * into `applyVarietyOrder` and the existing feed cards without touching them.
 */

import type { ProximityTier } from "@/lib/geo/distance"
import type { ResolvedLocation } from "@/lib/geo/types"
import type { SupportedLanguage } from "@/lib/nlp/detect-language"
import type { TextProfile } from "@/lib/nlp/profile-text"

export type SignalName =
  | "semantic"
  | "location"
  | "language"
  | "urgency"
  | "freshness"
  | "engagement"
  | "baseScore"

/**
 * One signal's verdict.
 *
 * `null` means "cannot be judged" — no user location, no deadline on the item —
 * which is different from "judged and scored zero". Unavailable signals are
 * dropped and the remaining weights renormalized, so a user who never granted
 * location is not scored against a permanent zero.
 */
export type SignalValue = number | null

export type SignalBreakdown = Record<SignalName, SignalValue>

/** Everything the scorer knows about the person it is ranking for. */
export type RankingContext = {
  location: ResolvedLocation
  /** The locale they are reading the site in — the strongest language signal. */
  language: SupportedLanguage
  /** Other languages they can read, e.g. from their country's official set. */
  secondaryLanguages: SupportedLanguage[]
  /** Their interests and skills, as tags and keywords. */
  interests: TextProfile
  /** Reference point for freshness and deadlines. Injectable for testing. */
  now: number
}

export type RankReason = {
  /** i18n key under `reasons.` in the dictionaries. */
  key: string
  params?: Record<string, string | number>
}

export type RankedItem<T> = {
  item: T
  /** 0–100, the same scale the backend uses. */
  score: number
  reasons: RankReason[]
  breakdown: SignalBreakdown
  proximityTier: ProximityTier
  contentLanguage: SupportedLanguage | null
}
