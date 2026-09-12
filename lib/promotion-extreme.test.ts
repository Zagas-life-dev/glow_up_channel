/**
 * The extreme tier: a promotion that scores on its own band.
 *
 * Every other package closes a fraction of the gap between the listing's honest
 * score and the ceiling, which leaves a poor match still reading as a poor
 * match. The extreme tier instead maps the honest score onto [85, 97] — the
 * worst possible match presents at 85, the best at 97 — while keeping the order
 * between listings intact.
 *
 * Three things have to hold, and each has burned this codebase before:
 *
 *   1. **It can never demote.** The whole promotion model exists because the
 *      original multiply-and-cap could push an item into a throttled band and
 *      lower its placement. A tier with a *floor* of 85 is an obvious way to
 *      reintroduce exactly that for anything honestly scoring above it.
 *   2. **The browser must reproduce the server's number.** `lib/ranking`
 *      rescores every item from scratch, so a server score that is not
 *      re-derivable here is simply discarded. That is what
 *      `lib/promotion-boost` exists to prevent, and the parity block below is
 *      the guard that the two implementations have not drifted.
 *   3. **Scoring above 90 must be safe.** It was not: bucket 0 (100-91) sat in
 *      `secondHighest` at 0.20 odds against `highest`'s 0.75, so crossing 90
 *      *cost* an item placement. The tier cannot reach 97 until that is fixed,
 *      so the regroup is pinned here too.
 */

import { describe, expect, it } from "vitest"

import {
  EXTREME_SCORE_CEILING,
  EXTREME_SCORE_FLOOR,
  PROMOTION_SCORE_CEILING,
  applyPromotionLift,
  extremeScore,
  isExtremePromotion,
} from "@/lib/promotion-boost"
import { applyVarietyOrder, getBucketIndex, type VarietyFeedItem } from "@/lib/feed-variety-order"

// The server twin. Imported rather than reimplemented on purpose: this is the
// only thing that can catch the two files drifting apart.
import PromotionRanking from "../latest-glowup-channel/src/services/promotionRankingService.js"

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 8, 11)

/** An item carrying a live extreme promotion, as the server would ship it. */
function extremeItem(scoreJitter = 0) {
  return {
    _id: "c1",
    isPromoted: true,
    promotion: {
      packageType: "extreme",
      scoreJitter,
      // Present and large, so a test that accidentally takes the gap-closing
      // path produces a visibly different number rather than a near-miss.
      liftFraction: 0.9,
      weight: 1,
    },
  }
}

/** An ordinary promoted item, for contrast. */
const walletItem = {
  _id: "c2",
  isPromoted: true,
  promotion: { packageType: "wallet_daily", liftFraction: 0.35, weight: 1 },
}

describe("extremeScore — the band", () => {
  it("maps every honest score into 85-97", () => {
    const item = extremeItem()
    for (let base = 0; base <= 100; base += 1) {
      const scored = extremeScore(base, item)
      // Above the ceiling the honest score wins, which is the point of the
      // floor-at-honest rule below; everything else lands in the band.
      if (base <= EXTREME_SCORE_CEILING) {
        expect(scored).toBeGreaterThanOrEqual(EXTREME_SCORE_FLOOR)
        expect(scored).toBeLessThanOrEqual(EXTREME_SCORE_CEILING)
      }
    }
  })

  it("never returns less than the honest score, at any input", () => {
    // The invariant the whole promotion model rests on: promoting something
    // must not be able to cost it placement.
    const item = extremeItem()
    for (let base = 0; base <= 100; base += 1) {
      expect(extremeScore(base, item)).toBeGreaterThanOrEqual(base)
    }
  })

  it("leaves a listing already above the band exactly where it was", () => {
    expect(extremeScore(98, extremeItem())).toBe(98)
    expect(extremeScore(100, extremeItem())).toBe(100)
  })

  it("puts the worst match at the floor and climbs to the ceiling at the top", () => {
    expect(extremeScore(0, extremeItem())).toBe(EXTREME_SCORE_FLOOR)

    // The map spans the band linearly, so honest 96 lands at 85 + 12 * 0.96.
    // It approaches 97 rather than sitting on it, because past this point the
    // honest score overtakes the map and the floor-at-honest rule takes over.
    expect(extremeScore(96, extremeItem())).toBeCloseTo(96.52, 5)
    expect(extremeScore(96, extremeItem())).toBeLessThanOrEqual(EXTREME_SCORE_CEILING)

    // The ceiling is reachable, and clamps: with the jitter pushing up, the
    // band's top is where it stops.
    expect(extremeScore(96, extremeItem(1.5))).toBe(EXTREME_SCORE_CEILING)
  })

  it("keeps better matches ahead of worse ones", () => {
    // A flat 97 would satisfy every bound above and still be wrong: it would
    // rank a bad match level with a good one and make the percentage
    // meaningless. Monotonicity is what makes this a map rather than a badge.
    const item = extremeItem()
    for (let base = 0; base < 100; base += 1) {
      expect(extremeScore(base + 1, item)).toBeGreaterThanOrEqual(extremeScore(base, item))
    }
    expect(extremeScore(90, item)).toBeGreaterThan(extremeScore(20, item))
  })

  it("applies the server's jitter and still respects the band", () => {
    const plain = extremeScore(50, extremeItem(0))
    expect(extremeScore(50, extremeItem(1.5))).toBeCloseTo(plain + 1.5, 5)
    expect(extremeScore(50, extremeItem(-1.5))).toBeCloseTo(plain - 1.5, 5)

    // At the edges the clamp holds, so jitter can never leave the band.
    expect(extremeScore(0, extremeItem(-1.5))).toBe(EXTREME_SCORE_FLOOR)
    expect(extremeScore(96, extremeItem(1.5))).toBeLessThanOrEqual(EXTREME_SCORE_CEILING)
  })

  it("treats a payload with no jitter as the clean mapped value", () => {
    // An older cached row, or any other tier. Zero is the safe default: it
    // gives the value the server would have computed with JITTER off, rather
    // than inventing a different one.
    const noJitter = { _id: "c1", isPromoted: true, promotion: { packageType: "extreme" } }
    expect(extremeScore(50, noJitter)).toBe(extremeScore(50, extremeItem(0)))
  })
})

describe("applyPromotionLift — routing the tier", () => {
  it("sends extreme promotions to the band, not through the gap-close", () => {
    const item = extremeItem()
    // Gap-closing with liftFraction 0.9 from 50 would land at ~92.3; the band
    // lands at 91. Different enough that the wrong branch cannot pass.
    expect(applyPromotionLift(50, item)).toBe(extremeScore(50, item))
    expect(applyPromotionLift(50, item)).not.toBeCloseTo(
      50 + (PROMOTION_SCORE_CEILING - 50) * 0.9,
      3,
    )
  })

  it("leaves every other tier on the gap-closing path", () => {
    expect(applyPromotionLift(50, walletItem)).toBeCloseTo(
      50 + (PROMOTION_SCORE_CEILING - 50) * 0.35,
      5,
    )
  })

  it("leaves unpromoted items completely alone", () => {
    expect(applyPromotionLift(42, { _id: "c3" })).toBe(42)
  })

  it("does not treat a promotion block without the extreme type as extreme", () => {
    expect(isExtremePromotion(extremeItem())).toBe(true)
    expect(isExtremePromotion(walletItem)).toBe(false)
    expect(isExtremePromotion({ _id: "c4" })).toBe(false)
    // Flagged extreme but not actually promoted: the flag alone must not be
    // enough, or a stale content document could score itself 85+.
    expect(isExtremePromotion({ _id: "c5", promotion: { packageType: "extreme" } })).toBe(false)
  })
})

describe("server parity — the browser must reproduce the server's number", () => {
  const doc = {
    _id: "65f1a2b3c4d5e6f708192a3b",
    packageType: "extreme",
    status: "active",
    paymentStatus: "paid",
    startDate: new Date(NOW - 3 * DAY),
    endDate: new Date(NOW + 18 * DAY),
  }

  it("agrees with promotionRankingService across the whole range", () => {
    const meta = PromotionRanking.publicPromotionMeta(doc, { now: NOW })
    const item = { _id: "c1", isPromoted: true, promotion: meta }

    for (let base = 0; base <= 100; base += 1) {
      const server = PromotionRanking.boostScore(base, doc, NOW)
      const client = applyPromotionLift(base, item)
      // 3dp, because the jitter crosses the wire rounded to 4.
      expect(client).toBeCloseTo(server, 3)
    }
  })

  it("ships a non-zero jitter for extreme and none for anything else", () => {
    const meta = PromotionRanking.publicPromotionMeta(doc, { now: NOW })
    expect(meta.packageType).toBe("extreme")
    expect(meta.scoreJitter).not.toBe(0)

    const wallet = PromotionRanking.publicPromotionMeta(
      { ...doc, packageType: "wallet_daily", spendLimitNg: 25000, spentNg: 0 },
      { now: NOW },
    )
    expect(wallet.scoreJitter).toBe(0)
  })

  it("agrees that the ceilings are the same number", () => {
    // These are mirrored by hand across the two files. When one moves and the
    // other does not, the browser silently re-ranks against a different band.
    expect(PROMOTION_SCORE_CEILING).toBe(PromotionRanking.SCORE_CEILING)
    expect(EXTREME_SCORE_FLOOR).toBe(PromotionRanking.TUNING.EXTREME.FLOOR)
    expect(EXTREME_SCORE_CEILING).toBe(PromotionRanking.TUNING.EXTREME.CEILING)
  })

  it("stops scoring the moment the campaign is no longer deliverable", () => {
    const ended = { ...doc, endDate: new Date(NOW - DAY) }
    expect(PromotionRanking.boostScore(42, ended, NOW)).toBe(42)
  })
})

describe("the band regroup that makes scoring above 90 safe", () => {
  it("still buckets scores where the orderer expects", () => {
    expect(getBucketIndex(97)).toBe(0)
    expect(getBucketIndex(91)).toBe(0)
    expect(getBucketIndex(90)).toBe(1)
    expect(getBucketIndex(55)).toBe(4)
  })

  it("no longer costs an item placement to score above 90", () => {
    // Bucket 0 used to share `secondHighest` with bucket 4, so a 95 and a 55
    // drew from the same 0.20 pool and led the feed about equally often. Now
    // bucket 0 is in `highest` at 0.75 and the 95 should lead far more.
    const runs = 2000
    const top: VarietyFeedItem = { _id: "high", score: 95 }
    const mid: VarietyFeedItem = { _id: "mid", score: 55 }

    let topLeads = 0
    for (let i = 0; i < runs; i += 1) {
      if (applyVarietyOrder([top, mid], NOW)[0]._id === "high") topLeads += 1
    }

    const share = topLeads / runs
    // 0.75 against 0.20 renormalises to ~0.79. A loose floor, because this is a
    // random draw — but far enough above 0.5 that the old grouping could not
    // reach it.
    expect(share).toBeGreaterThan(0.65)
  })

  it("still returns every item exactly once", () => {
    const items: VarietyFeedItem[] = [
      { _id: "a", score: 95 },
      { _id: "b", score: 88 },
      { _id: "c", score: 55 },
      { _id: "d", score: 30 },
      { _id: "e", score: 5 },
    ]
    const ordered = applyVarietyOrder(items, NOW)
    expect(ordered).toHaveLength(items.length)
    expect(new Set(ordered.map((i) => i._id)).size).toBe(items.length)
  })
})
