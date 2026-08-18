/**
 * Putting the signals together.
 *
 * The output is a 0–100 score and a list of reasons, matching what the backend
 * recommendation endpoints already return, so ranked items flow into
 * `applyVarietyOrder` and the existing cards unchanged.
 *
 * The one rule worth stating: **unavailable signals are dropped, not zeroed**.
 * Weights are renormalized over whatever could actually be judged. A logged-out
 * visitor with no location and no interests still gets a sensible ordering from
 * freshness and urgency alone, instead of every item scoring near zero.
 */

import { resolveFeedContentKind } from "@/lib/feed-content-type"
import { applyPromotionLift, isPromoted } from "@/lib/promotion-boost"
import { sharedTags } from "@/lib/nlp/similarity"
import { profileContent, type TextProfile } from "@/lib/nlp/profile-text"
import { contentLanguage } from "@/lib/nlp/detect-language"
import {
  baseScoreSignal,
  engagementSignal,
  freshnessSignal,
  isExpired,
  languageSignal,
  locationSignal,
  semanticSignal,
  urgencySignal,
} from "@/lib/ranking/signals"
import type {
  RankReason,
  RankedItem,
  RankingContext,
  SignalBreakdown,
  SignalName,
} from "@/lib/ranking/types"
import { REASON_THRESHOLD, weightsFor } from "@/lib/ranking/weights"

/** Cache of content profiles, keyed by item id — text does not change per render. */
const profileCache = new Map<string, TextProfile>()
const PROFILE_CACHE_LIMIT = 2000

function cachedProfile(item: Record<string, unknown>): TextProfile {
  const id = typeof item._id === "string" ? item._id : String(item._id ?? "")
  if (!id) return profileContent(item)

  const hit = profileCache.get(id)
  if (hit) return hit

  const built = profileContent(item)
  if (profileCache.size >= PROFILE_CACHE_LIMIT) {
    // Cheap eviction: drop the oldest insertion. Map preserves insertion order.
    const oldest = profileCache.keys().next().value
    if (oldest !== undefined) profileCache.delete(oldest)
  }
  profileCache.set(id, built)
  return built
}

/** Drops cached content profiles — call after a language or taxonomy change. */
export function clearRankingCache(): void {
  profileCache.clear()
}

function buildReasons(
  breakdown: SignalBreakdown,
  userTags: Map<string, number>,
  contentTags: Map<string, number>,
  proximityTier: string,
  place: { city?: string; country?: string },
): RankReason[] {
  const reasons: RankReason[] = []

  if ((breakdown.semantic ?? 0) >= REASON_THRESHOLD) {
    const top = sharedTags(userTags, contentTags)[0]
    if (top) reasons.push({ key: "matchesTag", params: { tag: top.tagId } })
    else reasons.push({ key: "matchesInterests" })
  }

  if ((breakdown.location ?? 0) >= REASON_THRESHOLD) {
    if (proximityTier === "remote") {
      reasons.push({ key: "remote" })
    } else if (proximityTier === "same-city" && place.city) {
      reasons.push({ key: "inYourCity", params: { city: place.city } })
    } else if (place.country) {
      reasons.push({ key: "inYourCountry", params: { country: place.country } })
    } else {
      reasons.push({ key: "nearYou" })
    }
  }

  if (breakdown.urgency !== null && breakdown.urgency >= 0.9) {
    reasons.push({ key: "closingSoon" })
  }

  if ((breakdown.freshness ?? 0) >= 0.8) {
    reasons.push({ key: "justPosted" })
  }

  if ((breakdown.engagement ?? 0) >= 0.7) {
    reasons.push({ key: "popular" })
  }

  if (breakdown.language === 1) {
    reasons.push({ key: "inYourLanguage" })
  }

  return reasons.slice(0, 3)
}

/** Score a single item against the ranking context. */
export function scoreItem<T extends Record<string, unknown>>(
  item: T,
  context: RankingContext,
): RankedItem<T> {
  const content = cachedProfile(item)
  const itemLanguage = content.language ?? contentLanguage(item)
  const location = locationSignal(context.location, item)
  // List endpoints put the kind in `type`; the unified recommendation endpoint
  // puts it in `contentType` and uses `type` for the opportunity subtype. Read
  // `contentType` first or resources would be scored with a location weight.
  const contentType = resolveFeedContentKind(
    (typeof item.contentType === "string" ? item.contentType : undefined) ??
      (typeof item.type === "string" ? item.type : undefined),
  )

  const breakdown: SignalBreakdown = {
    semantic: semanticSignal(context.interests, content),
    location: location.value,
    language: languageSignal(context.language, context.secondaryLanguages, itemLanguage),
    urgency: urgencySignal(item, context.now),
    freshness: freshnessSignal(item, context.now),
    engagement: engagementSignal(item),
    baseScore: baseScoreSignal(item),
  }

  const weights = weightsFor(contentType)

  let weighted = 0
  let totalWeight = 0
  for (const name of Object.keys(weights) as SignalName[]) {
    const value = breakdown[name]
    const weight = weights[name]
    if (value === null || weight <= 0) continue
    weighted += value * weight
    totalWeight += weight
  }

  // No signal at all could be judged — neutral rather than zero, so these items
  // interleave with scored ones instead of sinking to the bottom as a block.
  const normalized = totalWeight > 0 ? weighted / totalWeight : 0.5

  // Paid placement is applied *after* the honest signals, never as one of them.
  //
  // It has to happen here rather than being inherited from the backend, because
  // this function recomputes `score` from scratch — so before this line, every
  // client-side re-rank quietly discarded the boost the promoter had paid for
  // and the promotion survived only as a badge on the card.
  //
  // Keeping it outside the weighted sum also keeps `breakdown` honest: it still
  // reports what the item genuinely matched on, so a promoted listing cannot
  // manufacture a "matches your interests" reason it did not earn.
  const promoted = applyPromotionLift(normalized * 100, item)

  const place = {
    city: typeof item.city === "string" ? item.city : undefined,
    country: typeof item.country === "string" ? item.country : undefined,
  }

  return {
    item,
    score: Math.round(promoted),
    reasons: buildReasons(
      breakdown,
      context.interests.tags,
      content.tags,
      location.proximity.tier,
      place,
    ),
    breakdown,
    proximityTier: location.proximity.tier,
    contentLanguage: itemLanguage,
  }
}

export type RankOptions = {
  /** Drop listings whose deadline has passed. On by default. */
  dropExpired?: boolean
  /** Discard anything scoring below this, 0–100. */
  minScore?: number
  limit?: number
}

/**
 * Rank a page of items.
 *
 * Ties break on the backend's original order, which keeps pagination stable —
 * items already on screen do not reshuffle when the next page arrives, the same
 * property `rankByMatch` preserves for search.
 */
export function rankItems<T extends Record<string, unknown>>(
  items: T[],
  context: RankingContext,
  options: RankOptions = {},
): RankedItem<T>[] {
  const { dropExpired = true, minScore = 0, limit } = options

  const ranked: (RankedItem<T> & { order: number })[] = []
  items.forEach((item, order) => {
    if (dropExpired && isExpired(item, context.now)) return
    const scored = scoreItem(item, context)
    if (scored.score < minScore) return
    ranked.push({ ...scored, order })
  })

  // Ties break to the paid item, then to the backend's original order. Rounding
  // to whole points makes ties common enough for this to matter: without it a
  // promotion could be beaten by an unpromoted item it had genuinely outscored
  // before the round.
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      Number(isPromoted(b.item)) - Number(isPromoted(a.item)) ||
      a.order - b.order,
  )

  const trimmed = limit ? ranked.slice(0, limit) : ranked
  return trimmed.map(({ order: _order, ...rest }) => rest)
}

/**
 * Rank, then write the score back onto the items themselves.
 *
 * This is the drop-in path: the result is the same array of content objects the
 * feed already renders, with `score` and `reasons` refreshed, ready for
 * `applyVarietyOrder`.
 */
export function rankAndAnnotate<T extends Record<string, unknown>>(
  items: T[],
  context: RankingContext,
  options: RankOptions = {},
): (T & { score: number; reasons: RankReason[] })[] {
  return rankItems(items, context, options).map((ranked) => ({
    ...ranked.item,
    score: ranked.score,
    reasons: ranked.reasons,
  }))
}
