/**
 * Paid placement has to reach the top of the feed, and the reserved share alone
 * never got it there.
 *
 * `PROMOTED_SHARE` is 0.2 of a draw that is renormalised against every stocked
 * category, so with all four in play the promoted pool won the opening slot
 * about one time in six. A promoter buying placement got a listing somewhere in
 * the feed, rarely at the top of it — which is the thing they were buying.
 *
 * `promotedLeadBias` is the fix: a position-dependent preference that is
 * near-certain at slot 0 and gone by `PROMOTED_LEAD_SLOTS`. These tests pin the
 * two properties that matter and, just as importantly, the three that must not
 * have changed — spacing, completeness, and the untouched organic feed.
 */

import { afterEach, describe, expect, it, vi } from "vitest"

import { applyVarietyOrder, promotedLeadBias, type VarietyFeedItem } from "@/lib/feed-variety-order"

const NOW = Date.UTC(2026, 7, 31)
const DAY = 24 * 60 * 60 * 1000

/** Minimum organic items between promotions — mirrors PROMOTED_MIN_GAP. */
const MIN_GAP = 3

function organic(id: number, score: number, daysOut = 10): VarietyFeedItem {
  return {
    _id: `o${id}`,
    score,
    dates: { applicationDeadline: new Date(NOW + daysOut * DAY).toISOString() },
  }
}

function promoted(id: number, score = 55, daysOut = 10): VarietyFeedItem {
  return {
    _id: `p${id}`,
    score,
    isPromoted: true,
    promotionWeight: 1,
    dates: { applicationDeadline: new Date(NOW + daysOut * DAY).toISOString() },
  }
}

/** A feed with a spread of scores across all four category bands. */
function feed(organicCount: number, promotedCount: number): VarietyFeedItem[] {
  const items: VarietyFeedItem[] = []
  for (let i = 0; i < organicCount; i += 1) {
    // Cycle through the bands so every category pool has stock — the case where
    // renormalisation dilutes the promoted share the most.
    items.push(organic(i, [95, 85, 75, 65, 45, 25, 15][i % 7], 3 + (i % 30)))
  }
  for (let i = 0; i < promotedCount; i += 1) items.push(promoted(i, 55, 5 + i))
  return items
}

function run(items: VarietyFeedItem[], samples: number) {
  const results: VarietyFeedItem[][] = []
  for (let i = 0; i < samples; i += 1) results.push(applyVarietyOrder(items, NOW))
  return results
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("promotedLeadBias", () => {
  it("is highest at the first slot and decays to nothing", () => {
    expect(promotedLeadBias(0)).toBeCloseTo(0.9, 5)
    expect(promotedLeadBias(4)).toBeCloseTo(0.6, 5)
    expect(promotedLeadBias(8)).toBeCloseTo(0.3, 5)
    expect(promotedLeadBias(12)).toBe(0)
    expect(promotedLeadBias(50)).toBe(0)
  })

  it("never rises as position increases", () => {
    for (let p = 1; p < 20; p += 1) {
      expect(promotedLeadBias(p)).toBeLessThanOrEqual(promotedLeadBias(p - 1))
    }
  })

  it("treats a nonsense position as no preference rather than throwing", () => {
    expect(promotedLeadBias(-1)).toBe(0)
    expect(promotedLeadBias(Number.NaN)).toBe(0)
  })
})

describe("applyVarietyOrder — promoted placement", () => {
  it("leads with a promotion in the large majority of feeds", () => {
    const runs = run(feed(60, 6), 600)
    const leading = runs.filter((order) => order[0]?.isPromoted).length
    // The bias is 0.9 at slot 0, and the promoted pool can also win the
    // ordinary category draw, so this floor is comfortably below the truth.
    expect(leading / runs.length).toBeGreaterThan(0.85)
  })

  it("puts a promotion in the top three almost always", () => {
    const runs = run(feed(60, 6), 400)
    const early = runs.filter((order) => order.slice(0, 3).some((i) => i.isPromoted)).length
    expect(early / runs.length).toBeGreaterThan(0.95)
  })

  it("front-loads: promotions are denser at the top than deep in the feed", () => {
    const runs = run(feed(80, 8), 400)
    const density = (from: number, to: number) =>
      runs.reduce(
        (sum, order) => sum + order.slice(from, to).filter((i) => i.isPromoted).length,
        0,
      ) /
      (runs.length * (to - from))

    // The lead window should be markedly denser than the untouched steady state.
    expect(density(0, 12)).toBeGreaterThan(density(20, 60) * 1.5)
  })

  it("still leads with the promotion when only one campaign is live", () => {
    const runs = run(feed(40, 1), 400)
    const leading = runs.filter((order) => order[0]?.isPromoted).length
    expect(leading / runs.length).toBeGreaterThan(0.85)
  })
})

describe("applyVarietyOrder — invariants the lead bias must not break", () => {
  it("returns every item exactly once", () => {
    const items = feed(50, 5)
    for (const order of run(items, 200)) {
      expect(order).toHaveLength(items.length)
      expect(new Set(order.map((i) => i._id)).size).toBe(items.length)
    }
  })

  it("keeps promotions at least PROMOTED_MIN_GAP apart while organic stock lasts", () => {
    for (const order of run(feed(60, 8), 300)) {
      let previous = -Infinity
      order.forEach((item, index) => {
        if (!item.isPromoted) return
        const organicLeft = order.slice(index).some((i) => !i.isPromoted)
        // The tail drain is exempt: once nothing organic remains there is
        // nothing left to space against.
        if (organicLeft && previous >= 0) {
          expect(index - previous).toBeGreaterThan(MIN_GAP)
        }
        previous = index
      })
    }
  })

  it("leaves a feed with no promotions completely untouched", () => {
    // With no promoted pool the lead-bias branch is never entered and no random
    // value is drawn for it, so the organic sequence is exactly what it was.
    const spy = vi.spyOn(Math, "random")
    const items = feed(40, 0)
    const order = applyVarietyOrder(items, NOW)

    expect(order).toHaveLength(items.length)
    expect(new Set(order.map((i) => i._id)).size).toBe(items.length)
    // One draw per category choice plus one per weighted pluck — never three.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(items.length * 2)
  })

  it("handles a feed that is entirely promoted", () => {
    const items = Array.from({ length: 6 }, (_, i) => promoted(i))
    const order = applyVarietyOrder(items, NOW)
    expect(order).toHaveLength(6)
    expect(new Set(order.map((i) => i._id)).size).toBe(6)
  })

  it("handles trivial feeds", () => {
    expect(applyVarietyOrder([], NOW)).toHaveLength(0)
    expect(applyVarietyOrder([promoted(1)], NOW)).toHaveLength(1)
  })
})
