"use client"

/**
 * Recovering the backend's own score for a listing opened outside a feed.
 *
 * `baseScoreSignal` folds the server's score in as one signal among several —
 * it sees engagement history and career-stage matching this layer has no access
 * to. A feed row gets that number for free: the recommendation endpoint sends
 * it. A detail page does not. `/api/opportunities/:id` and its siblings return
 * the listing with no notion of who is reading it, so scoring the same listing
 * there silently dropped `baseScore` and answered with a different number than
 * the card the reader had just tapped.
 *
 * The feed already parks its rows in session storage for instant back
 * navigation, so the score is sitting there. Reading it back costs nothing,
 * where asking the server again would be another round trip for a number we
 * have already been told.
 *
 * Returns `undefined` for a listing this session never saw in a feed — a shared
 * link, a fresh tab, a page reloaded. That is the honest answer: the signal is
 * unavailable, `rank` renormalizes over the rest, and the score moves by a point
 * or two rather than inventing a server opinion we were never given.
 */

import { getContentCache, type ContentCacheType } from "@/lib/content-cache-session"

/** The feed caches whose rows can carry a server score, most personal first. */
const SCORED_CACHES: ContentCacheType[] = ["unified_auth", "unified"]

/** The score the feed held for this listing, or `undefined` if it never held one. */
export function feedBaseScore(id: string | null | undefined): number | undefined {
  if (!id) return undefined

  for (const cache of SCORED_CACHES) {
    const entry = getContentCache<Record<string, unknown>>(cache)
    if (!entry) continue

    const row = entry.items.find(
      (item) => item && typeof item === "object" && item._id === id,
    )
    const score = row?.score
    if (typeof score === "number" && Number.isFinite(score)) return score
  }

  return undefined
}

/**
 * The listing as the feed had it: its own fields, plus the server score when one
 * is known. Items that already carry a score are returned untouched, so this is
 * safe to call on a row that came from the feed in the first place.
 */
export function withFeedBaseScore<T extends Record<string, unknown>>(item: T): T {
  if (typeof item.score === "number" && Number.isFinite(item.score)) return item

  const score = feedBaseScore(typeof item._id === "string" ? item._id : undefined)
  return score === undefined ? item : { ...item, score }
}
