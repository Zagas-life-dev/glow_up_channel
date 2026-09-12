/**
 * Paid placement outranks every organic arrangement, including the type mix.
 *
 * The type dial added to `applyVarietyOrder` balances the *organic* list. It
 * must not touch promotions in any direction — not their share of the draw, not
 * their position, not which campaign is drawn, and not the extreme tier's score
 * boost. A promoter buys a rate and a position; neither is the platform's to
 * spend on editorial balance.
 *
 * Mirrors `promotionSupersedes.test.js` in the backend, which pins the same two
 * leaks on `scatterRank`: diluting the promoted share when a category drains,
 * and charging a paid slot to its content type's quota.
 */

import { describe, expect, it } from "vitest"

import {
  applyVarietyOrder,
  TOP_PROMOTED_SLOTS,
  TOP_SLOTS,
  type VarietyFeedItem,
} from "@/lib/feed-variety-order"
import {
  EXTREME_SCORE_FLOOR,
  EXTREME_SCORE_CEILING,
  isExtremePromotion,
} from "@/lib/promotion-boost"

const NOW = Date.UTC(2026, 8, 11)
const DAY = 24 * 60 * 60 * 1000
const iso = (days: number) => new Date(NOW + days * DAY).toISOString()

/** Minimum organic items between promotions — mirrors PROMOTED_MIN_GAP. */
const MIN_GAP = 3

function organic(id: number, type: string, score: number, dated = true): VarietyFeedItem {
  const item: VarietyFeedItem = { _id: `${type}-${id}`, type, score }
  if (dated) item.dates = { applicationDeadline: iso(5 + (id % 40)) }
  return item
}

function promoted(id: number, type: string, score = 90): VarietyFeedItem {
  return {
    _id: `promo-${type}-${id}`,
    type,
    score,
    isPromoted: true,
    promotionWeight: 1,
    dates: { applicationDeadline: iso(5 + id) },
  }
}

function draws(items: VarietyFeedItem[], trials: number): VarietyFeedItem[][] {
  const out: VarietyFeedItem[][] = []
  for (let i = 0; i < trials; i += 1) out.push(applyVarietyOrder(items, NOW))
  return out
}

describe("promotions are not rationed by the type mix", () => {
  it("leads the list even when its type is already over quota", () => {
    // Every promotion is an opportunity, the type most likely to be at or past
    // its share. If the quota could reach promotions, this is where it shows.
    const items = [
      ...Array.from({ length: 60 }, (_, i) => organic(i, "opportunity", 60)),
      ...Array.from({ length: 20 }, (_, i) => organic(i, "event", 60)),
      ...Array.from({ length: 20 }, (_, i) => organic(i, "job", 60)),
      ...Array.from({ length: 20 }, (_, i) => organic(i, "resource", 60, false)),
      ...Array.from({ length: 6 }, (_, i) => promoted(i, "opportunity")),
    ]

    const leading = draws(items, 400).filter((order) => order[0]?.isPromoted).length
    expect(leading / 400).toBeGreaterThan(0.85)
  })

  it("puts a promotion in the top three almost always, whatever its type", () => {
    const items = [
      ...Array.from({ length: 60 }, (_, i) => organic(i, "opportunity", 75)),
      ...Array.from({ length: 60 }, (_, i) => organic(i, "event", 45)),
      // A resource campaign: the type with the smallest organic share and no
      // deadline of its own, so the weakest position the draw can offer.
      ...Array.from({ length: 6 }, (_, i) => ({
        ...promoted(i, "resource"),
        dates: undefined,
      })),
    ]

    const early = draws(items, 400).filter((order) =>
      order.slice(0, 3).some((item) => item.isPromoted),
    ).length
    expect(early / 400).toBeGreaterThan(0.9)
  })

  it("only ever increases the visibility of the type it promotes", () => {
    // A campaign buys reach, so the type it runs on must end up *more* visible,
    // never less. Promoted listings draw from their own type lane as well as
    // from the reserved promoted share, so part of the increase displaces that
    // type's organic listings — which is the promotion superseding the
    // arrangement, and is why this measures total visibility rather than the
    // organic remainder.
    const base = [
      ...Array.from({ length: 40 }, (_, i) => organic(i, "opportunity", 60)),
      ...Array.from({ length: 40 }, (_, i) => organic(i, "event", 60)),
      ...Array.from({ length: 40 }, (_, i) => organic(i, "job", 60)),
      ...Array.from({ length: 40 }, (_, i) => organic(i, "resource", 60, false)),
    ]
    const withCampaign = [
      ...base,
      ...Array.from({ length: 10 }, (_, i) => promoted(i, "resource")),
    ]

    const typeShare = (items: VarietyFeedItem[], kind: string) => {
      let matching = 0
      let total = 0
      for (const order of draws(items, 200)) {
        for (const item of order.slice(0, 40)) {
          total += 1
          if (item.type === kind) matching += 1
        }
      }
      return matching / total
    }

    const without = typeShare(base, "resource")
    const withIt = typeShare(withCampaign, "resource")

    expect(without).toBeGreaterThan(0.1)
    expect(withIt).toBeGreaterThan(without)
  })

  it("leaves the other types roughly where they were", () => {
    // A campaign on one type must not redraw the whole list around it.
    const base = [
      ...Array.from({ length: 40 }, (_, i) => organic(i, "opportunity", 60)),
      ...Array.from({ length: 40 }, (_, i) => organic(i, "event", 60)),
      ...Array.from({ length: 40 }, (_, i) => organic(i, "job", 60)),
      ...Array.from({ length: 40 }, (_, i) => organic(i, "resource", 60, false)),
    ]
    const withCampaign = [
      ...base,
      ...Array.from({ length: 10 }, (_, i) => promoted(i, "resource")),
    ]

    const organicShare = (items: VarietyFeedItem[], kind: string) => {
      let matching = 0
      let total = 0
      for (const order of draws(items, 200)) {
        for (const item of order.slice(0, 40)) {
          if (item.isPromoted) continue
          total += 1
          if (item.type === kind) matching += 1
        }
      }
      return matching / total
    }

    for (const kind of ["opportunity", "event", "job"]) {
      expect(
        Math.abs(organicShare(withCampaign, kind) - organicShare(base, kind)),
      ).toBeLessThan(0.06)
    }
  })

  it("keeps promoted delivery up when the organic categories drain", () => {
    // Only the low category has stock. The promoted pool is renormalised against
    // the stocked category odds, not against a flat 1, so its share rises the way
    // it always did rather than being pinned at the all-categories rate.
    const items = [
      ...Array.from({ length: 30 }, (_, i) => organic(i, "event", 20)),
      ...Array.from({ length: 10 }, (_, i) => promoted(i, "event", 20)),
    ]

    let promotedSeen = 0
    let total = 0
    for (const order of draws(items, 300)) {
      for (const item of order.slice(12)) {
        total += 1
        if (item.isPromoted) promotedSeen += 1
      }
    }

    expect(promotedSeen / total).toBeGreaterThan(0.1)
  })
})

describe("the extreme tier still supersedes everything", () => {
  it("keeps an extreme promotion inside its score band regardless of type", () => {
    // The band is absolute, so the organic rebalancing cannot move it.
    for (const type of ["opportunity", "event", "job", "resource"]) {
      const item = {
        _id: `x-${type}`,
        type,
        isPromoted: true,
        promotion: { packageType: "extreme" },
      }
      expect(isExtremePromotion(item)).toBe(true)
    }
  })

  it("puts the extreme band in the top score category", () => {
    // `CATEGORIES.highest` covers 100-71 after being aligned with the backend's
    // GROUPS. Both ends of the extreme band have to sit inside it, or crossing
    // into the band would cost an item placement — the inversion the band merge
    // was done to remove.
    const bucketOf = (score: number) =>
      score === 100 ? 0 : Math.min(Math.floor((100 - score) / 10), 9)

    expect(bucketOf(EXTREME_SCORE_FLOOR)).toBeLessThanOrEqual(2)
    expect(bucketOf(EXTREME_SCORE_CEILING)).toBeLessThanOrEqual(2)
  })
})

describe("promotion invariants the type mix must not break", () => {
  const items = [
    ...Array.from({ length: 40 }, (_, i) => organic(i, "opportunity", 60)),
    ...Array.from({ length: 40 }, (_, i) => organic(i, "event", 60)),
    ...Array.from({ length: 8 }, (_, i) => promoted(i, "job")),
  ]

  it("still spaces promotions at least MIN_GAP apart past the opening block", () => {
    // The opening block runs a fixed four-of-ten and therefore a minimum gap of
    // one; the ordinary spacing resumes once it ends.
    for (const order of draws(items, 200)) {
      let previous = -Infinity
      order.forEach((item, index) => {
        if (!item.isPromoted) return
        const organicLeft = order.slice(index).some((other) => !other.isPromoted)
        if (index > TOP_SLOTS && organicLeft && previous >= TOP_SLOTS) {
          expect(index - previous).toBeGreaterThan(MIN_GAP)
        }
        previous = index
      })
    }
  })

  it("still returns every item exactly once", () => {
    for (const order of draws(items, 100)) {
      expect(order).toHaveLength(items.length)
      expect(new Set(order.map((i) => i._id)).size).toBe(items.length)
    }
  })

  it("handles a list that is entirely promoted", () => {
    const allPaid = Array.from({ length: 8 }, (_, i) => promoted(i, "event"))
    const order = applyVarietyOrder(allPaid, NOW)

    expect(order).toHaveLength(8)
    expect(new Set(order.map((i) => i._id)).size).toBe(8)
  })
})

/**
 * The opening block: four paid of ten, paid first, extreme tier on top.
 *
 * Mirrors `the top-ten arrangement` in the backend's promotionSupersedes test.
 * This is a product rule about the ten cards a reader sees before deciding
 * whether to scroll, so it is stated exactly rather than approximated by
 * `PROMOTED_SHARE` and `promotedLeadBias`. It supersedes both, and it supersedes
 * `PROMOTED_MIN_GAP` too — four paid cards in ten slots leaves gaps of one and two.
 */
describe("the top-ten arrangement", () => {
  const organicPool = () => {
    const out: VarietyFeedItem[] = []
    for (const kind of ["opportunity", "event", "job", "resource"]) {
      for (let i = 0; i < 40; i += 1) out.push(organic(i, kind, 55, kind !== "resource"))
    }
    return out
  }

  const extreme = (id: number, type: string): VarietyFeedItem => ({
    ...promoted(id, type, 92),
    _id: `extreme-${type}-${id}`,
    promotion: { packageType: "extreme" },
  })

  const regular = (id: number, type: string): VarietyFeedItem => ({
    ...promoted(id, type, 75),
    promotion: { packageType: "boost" },
  })

  const packageOf = (item: VarietyFeedItem) =>
    (item.promotion as { packageType?: string } | undefined)?.packageType

  it("gives the first slot to a promotion whenever one is live", () => {
    const items = [...organicPool(), ...Array.from({ length: 8 }, (_, i) => regular(i, "opportunity"))]
    for (const order of draws(items, 200)) expect(order[0].isPromoted).toBe(true)
  })

  it("gives the first slot to the extreme tier when one is live", () => {
    // Extreme outranks every other promotion for slot 0 — it bought the position
    // outright, not a better chance at it.
    const items = [
      ...organicPool(),
      ...Array.from({ length: 8 }, (_, i) => regular(i, "opportunity")),
      ...Array.from({ length: 2 }, (_, i) => extreme(i, "event")),
    ]
    for (const order of draws(items, 200)) expect(packageOf(order[0])).toBe("extreme")
  })

  it("splits the opening block exactly four paid to six organic", () => {
    const items = [...organicPool(), ...Array.from({ length: 8 }, (_, i) => regular(i, "opportunity"))]
    for (const order of draws(items, 200)) {
      expect(order.slice(0, TOP_SLOTS).filter((i) => i.isPromoted)).toHaveLength(
        TOP_PROMOTED_SLOTS,
      )
    }
  })

  it("never puts two promotions side by side in the opening block", () => {
    const items = [...organicPool(), ...Array.from({ length: 8 }, (_, i) => regular(i, "opportunity"))]
    for (const order of draws(items, 200)) {
      for (let i = 1; i < TOP_SLOTS; i += 1) {
        expect(Boolean(order[i].isPromoted && order[i - 1].isPromoted)).toBe(false)
      }
    }
  })

  it("falls back to organic when no promotion is live at all", () => {
    // "First slot is paid" is a rule about promotions, not a demand for one.
    for (const order of draws(organicPool(), 50)) {
      expect(order[0].isPromoted).toBeUndefined()
    }
  })

  it("uses every promotion it has when there are fewer than five", () => {
    // Under-filling the paid half is right; padding it, or holding a campaign
    // back to preserve a ratio, would not be.
    const items = [...organicPool(), ...Array.from({ length: 3 }, (_, i) => regular(i, "job"))]
    for (const order of draws(items, 100)) {
      expect(order[0].isPromoted).toBe(true)
      expect(order.slice(0, TOP_SLOTS).filter((i) => i.isPromoted)).toHaveLength(3)
    }
  })

  it("still emits every item exactly once", () => {
    const items = [
      ...organicPool(),
      ...Array.from({ length: 8 }, (_, i) => regular(i, "opportunity")),
      ...Array.from({ length: 2 }, (_, i) => extreme(i, "event")),
    ]
    for (const order of draws(items, 100)) {
      expect(order).toHaveLength(items.length)
      expect(new Set(order.map((i) => i._id)).size).toBe(items.length)
    }
  })

  it("hands the list back to the ordinary rate past the block", () => {
    const items = [...organicPool(), ...Array.from({ length: 30 }, (_, i) => regular(i, "opportunity"))]
    let top = 0
    let body = 0
    let bodySlots = 0
    const orders = draws(items, 200)
    for (const order of orders) {
      top += order.slice(0, TOP_SLOTS).filter((i) => i.isPromoted).length
      for (const item of order.slice(TOP_SLOTS, 60)) {
        bodySlots += 1
        if (item.isPromoted) body += 1
      }
    }
    expect(top / (orders.length * TOP_SLOTS)).toBeCloseTo(TOP_PROMOTED_SLOTS / TOP_SLOTS, 1)
    expect(body / bodySlots).toBeLessThan(0.35)
  })
})
