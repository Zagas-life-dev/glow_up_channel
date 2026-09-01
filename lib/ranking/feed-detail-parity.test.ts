/**
 * The feed and the detail page must answer with the same number.
 *
 * They did not. The For You feed rendered the score the recommendation endpoint
 * sent, verbatim, as "N% match". The detail page threw that away and scored the
 * listing with `lib/ranking`. One listing sat in the feed at 100% and opened at
 * 61 — the panel headed "Why you're seeing this" was explaining a number the
 * feed had never used.
 *
 * Two things had to be true to close it, and both are asserted here:
 *
 *   1. The feed scores its rows with the shared ranker, without reordering a
 *      sequence the server decided (`preserveOrder`).
 *   2. The detail page scores against the *same inputs*. The detail endpoints
 *      send no server score, so `baseScore` went missing on exactly one of the
 *      two surfaces; `withFeedBaseScore` puts it back.
 */

import { beforeEach, describe, expect, it } from "vitest"

import { setContentCache } from "@/lib/content-cache-session"
import { profileUser } from "@/lib/nlp/profile-text"
import { withFeedBaseScore } from "@/lib/ranking/feed-base-score"
import { rankItems } from "@/lib/ranking/rank"
import type { RankingContext } from "@/lib/ranking/types"

const NOW = Date.UTC(2026, 7, 30)

/** A reader with interests and a known country — enough for most signals. */
const context: RankingContext = {
  location: {
    country: "Nigeria",
    countryCode: "NG",
    city: "Lagos",
    contributors: ["profile"],
  },
  language: "en",
  secondaryLanguages: [],
  interests: profileUser(
    { interests: ["design", "entrepreneurship"], skills: ["figma"] },
    "en",
  ),
  now: NOW,
}

/**
 * How the recommendation endpoint sends a row: with its own `score`.
 *
 * Country but no city, deliberately. `baseScore` carries 0.06 of the weight, so
 * on a listing that already scores near 100 its whole contribution rounds away
 * and "recovering the server score changes the number" stops being observable.
 * The fixture has to leave headroom for the signal under test to show up in.
 */
const feedRow = {
  _id: "opp-1",
  contentType: "opportunity",
  title: "Design fellowship for African founders",
  description: "A funded programme for entrepreneurship and product design.",
  tags: ["design", "entrepreneurship"],
  country: "Nigeria",
  createdAt: new Date(NOW - 3 * 86_400_000).toISOString(),
  dates: { applicationDeadline: new Date(NOW + 14 * 86_400_000).toISOString() },
  score: 100,
}

/** The same listing from `/api/opportunities/:id` — everything but the score. */
const { score: _score, ...detailRow } = feedRow

beforeEach(() => {
  sessionStorage.clear()
})

const scoreOf = (item: Record<string, unknown>) =>
  rankItems([item], context, { dropExpired: false })[0].score

describe("feed and detail parity", () => {
  it("gives the detail page the same score as the feed card", () => {
    setContentCache("unified_auth", { items: [feedRow], lastId: null })

    expect(scoreOf(withFeedBaseScore(detailRow))).toBe(scoreOf(feedRow))
  })

  it("is the server score that was missing, not a rounding wobble", () => {
    // Without the cache there is nothing to recover, and the two surfaces
    // disagree — this is the bug, still reproducible with the fix removed.
    const unrecovered = scoreOf(withFeedBaseScore(detailRow))

    setContentCache("unified_auth", { items: [feedRow], lastId: null })
    const recovered = scoreOf(withFeedBaseScore(detailRow))

    expect(recovered).toBeGreaterThan(unrecovered)
  })

  it("leaves a row that already carries a score untouched", () => {
    setContentCache("unified_auth", { items: [{ ...feedRow, score: 12 }], lastId: null })

    // A feed row is scored from its own value, never from a stale cache entry.
    expect(withFeedBaseScore(feedRow).score).toBe(100)
  })

  it("abstains for a listing this session never saw in a feed", () => {
    expect(withFeedBaseScore(detailRow)).not.toHaveProperty("score")
  })
})

describe("preserveOrder", () => {
  const rows = [
    { _id: "a", title: "Design grant", tags: ["design"], score: 10 },
    { _id: "b", title: "Unrelated welding course", tags: ["welding"], score: 90 },
    { _id: "c", title: "Entrepreneurship fellowship", tags: ["entrepreneurship"], score: 50 },
  ]

  it("keeps the server's sequence", () => {
    const ranked = rankItems(rows, context, { preserveOrder: true, dropExpired: false })

    expect(ranked.map((row) => row.item._id)).toEqual(["a", "b", "c"])
  })

  it("still scores every row", () => {
    const ranked = rankItems(rows, context, { preserveOrder: true, dropExpired: false })

    // And the scores are the ranker's, not the ones the server sent.
    expect(ranked.map((row) => row.score)).not.toEqual([10, 90, 50])
    for (const row of ranked) {
      expect(row.score).toBeGreaterThanOrEqual(0)
      expect(row.score).toBeLessThanOrEqual(100)
    }
  })

  it("still reorders when it is not asked to preserve", () => {
    const ranked = rankItems(rows, context, { dropExpired: false })

    // The welding course carries the highest server score and the lowest
    // relevance; the whole point of the re-rank is that it does not stay first.
    expect(ranked[0].item._id).not.toBe("b")
  })
})
