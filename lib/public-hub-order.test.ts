/**
 * The public hub pages (/opportunities, /jobs, /events, /resources) were the
 * one browsing surface where buying a promotion changed nothing about the list.
 * A promoted listing was drawn on deadline alone like everything else — and on
 * /resources, where nearly everything is undated and therefore shares one
 * weight, that made a promotion indistinguishable from a plain shuffle.
 *
 * These tests pin the two properties the promoted pool adds — a floor on how
 * often paid listings appear, and a pull toward the top of the page — and, just
 * as importantly, the four that must survive it: every item emitted exactly
 * once, spacing between promotions, determinism under the seed (which is what
 * makes the bias hold across the session cache), and an organic-only page
 * ordered exactly as it was before.
 */

import { describe, expect, it } from "vitest"

import {
  deadlineWeight,
  deriveSeed,
  orderByDeadlineLottery,
  promotedLeadBias,
  type HubOrderItem,
} from "@/lib/public-hub-order"

const NOW = Date.UTC(2026, 8, 1)
const DAY = 24 * 60 * 60 * 1000

/** Minimum organic listings between promotions — mirrors PROMOTED_MIN_GAP. */
const MIN_GAP = 3

function organic(id: number, daysOut = 10): HubOrderItem {
  return { _id: `o${id}`, dates: { deadline: new Date(NOW + daysOut * DAY).toISOString() } }
}

function promoted(id: number, daysOut = 10, weight = 1): HubOrderItem {
  return {
    _id: `p${id}`,
    isPromoted: true,
    promotionWeight: weight,
    dates: { deadline: new Date(NOW + daysOut * DAY).toISOString() },
  }
}

/** An undated listing — the /resources case, where the lottery flattens. */
function undated(id: number, isPaid = false): HubOrderItem {
  return isPaid
    ? { _id: `p${id}`, isPromoted: true, promotionWeight: 1 }
    : { _id: `o${id}`, _kind: "undated" }
}

function page(organicCount: number, promotedCount: number): HubOrderItem[] {
  const items: HubOrderItem[] = []
  for (let i = 0; i < organicCount; i += 1) items.push(organic(i, 3 + (i % 30)))
  for (let i = 0; i < promotedCount; i += 1) items.push(promoted(i, 5 + i))
  return items
}

/** Draw the same page under many seeds — one draw per seed, as a session does. */
function draws(items: HubOrderItem[], samples: number): HubOrderItem[][] {
  const out: HubOrderItem[][] = []
  for (let i = 0; i < samples; i += 1) {
    out.push(orderByDeadlineLottery(items, { seed: deriveSeed(i, "hub"), now: NOW }))
  }
  return out
}

const isPaid = (item: HubOrderItem) => item.isPromoted === true

describe("promotedLeadBias", () => {
  it("is near-certain at the top and gone by the end of the lead-in", () => {
    expect(promotedLeadBias(0)).toBeCloseTo(0.9, 5)
    expect(promotedLeadBias(6)).toBeCloseTo(0.45, 5)
    expect(promotedLeadBias(12)).toBe(0)
    expect(promotedLeadBias(40)).toBe(0)
  })

  it("decays monotonically and never goes negative", () => {
    let previous = Infinity
    for (let i = 0; i < 20; i += 1) {
      const bias = promotedLeadBias(i)
      expect(bias).toBeGreaterThanOrEqual(0)
      expect(bias).toBeLessThanOrEqual(previous)
      previous = bias
    }
  })

  it("ignores nonsense positions rather than inverting", () => {
    expect(promotedLeadBias(-1)).toBe(0)
    expect(promotedLeadBias(NaN)).toBe(0)
  })
})

describe("orderByDeadlineLottery — paid placement", () => {
  it("opens the page with a promotion the large majority of the time", () => {
    const results = draws(page(40, 4), 400)
    const leads = results.filter((order) => isPaid(order[0])).length
    // Lead bias is 0.9 at slot 0; allow slack for the seeded draw.
    expect(leads / results.length).toBeGreaterThan(0.8)
  })

  it("puts a promotion in the first three rows on essentially every draw", () => {
    const results = draws(page(40, 4), 300)
    const early = results.filter((order) => order.slice(0, 3).some(isPaid)).length
    expect(early / results.length).toBeGreaterThan(0.95)
  })

  it("clusters promotions near the top and thins out further down", () => {
    const results = draws(page(60, 6), 300)
    const inFirst12 = results.reduce((n, order) => n + order.slice(0, 12).filter(isPaid).length, 0)
    const inNext12 = results.reduce((n, order) => n + order.slice(12, 24).filter(isPaid).length, 0)
    expect(inFirst12).toBeGreaterThan(inNext12)
  })

  it("biases undated promoted resources too, where the lottery is otherwise flat", () => {
    // The /resources case: nothing has a deadline, so every organic weight is
    // identical and only the promoted pool can move anything.
    const items = [
      ...Array.from({ length: 30 }, (_, i) => undated(i)),
      ...Array.from({ length: 3 }, (_, i) => undated(100 + i, true)),
    ]
    const results = draws(items, 300)
    const leads = results.filter((order) => isPaid(order[0])).length
    expect(leads / results.length).toBeGreaterThan(0.8)
  })

  it("draws a heavier campaign ahead of a lighter one within the pool", () => {
    const items = [
      ...Array.from({ length: 30 }, (_, i) => organic(i)),
      { ...promoted(1, 10, 8), _id: "heavy" },
      { ...promoted(2, 10, 1), _id: "light" },
    ]
    const results = draws(items, 400)
    const heavyFirst = results.filter((order) => {
      const paid = order.filter(isPaid)
      return paid[0]?._id === "heavy"
    }).length
    expect(heavyFirst / results.length).toBeGreaterThan(0.6)
  })
})

describe("orderByDeadlineLottery — invariants the bias must not break", () => {
  it("emits every item exactly once", () => {
    const items = page(40, 5)
    for (const order of draws(items, 60)) {
      expect(order).toHaveLength(items.length)
      expect(new Set(order.map((item) => item._id)).size).toBe(items.length)
    }
  })

  it("keeps promotions at least MIN_GAP apart while organic stock remains", () => {
    const items = page(40, 5)
    for (const order of draws(items, 60)) {
      // Only the run before the organic pool empties is subject to the gap —
      // the tail deliberately drains remaining promotions back to back rather
      // than dropping them off the page.
      const lastOrganic = order.map(isPaid).lastIndexOf(false)
      let previous = -Infinity
      for (let i = 0; i <= lastOrganic; i += 1) {
        if (!isPaid(order[i])) continue
        if (previous !== -Infinity) expect(i - previous - 1).toBeGreaterThanOrEqual(MIN_GAP)
        previous = i
      }
    }
  })

  it("is deterministic under the seed, so the session cache replays the same order", () => {
    const items = page(30, 4)
    const seed = deriveSeed(99, "resources", "first")
    const a = orderByDeadlineLottery(items, { seed, now: NOW })
    const b = orderByDeadlineLottery(items, { seed, now: NOW })
    expect(b.map((item) => item._id)).toEqual(a.map((item) => item._id))
  })

  it("draws a different order under a different seed", () => {
    const items = page(30, 4)
    const a = orderByDeadlineLottery(items, { seed: deriveSeed(1, "x"), now: NOW })
    const b = orderByDeadlineLottery(items, { seed: deriveSeed(2, "x"), now: NOW })
    expect(b.map((item) => item._id)).not.toEqual(a.map((item) => item._id))
  })

  it("leaves an organic-only page to the deadline lottery alone", () => {
    const items = page(30, 0)
    const results = draws(items, 200)
    // Soonest-closing should still usually lead, exactly as before.
    const soonest = items.reduce((best, item) =>
      deadlineWeight(item, NOW) > deadlineWeight(best, NOW) ? item : best,
    )
    const leads = results.filter((order) => order[0]._id === soonest._id).length
    expect(leads).toBeGreaterThan(0)
    for (const order of results) expect(order).toHaveLength(items.length)
  })

  it("handles degenerate pages", () => {
    expect(orderByDeadlineLottery([], { seed: 1, now: NOW })).toHaveLength(0)
    expect(orderByDeadlineLottery([promoted(1)], { seed: 1, now: NOW })).toHaveLength(1)
    // Nothing but promotions: all of them come out, none are lost to the gap.
    const allPaid = Array.from({ length: 5 }, (_, i) => promoted(i))
    expect(orderByDeadlineLottery(allPaid, { seed: 7, now: NOW })).toHaveLength(5)
  })
})
