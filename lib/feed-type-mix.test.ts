/**
 * The feed has to show all four content types, whatever the scores do.
 *
 * `applyVarietyOrder` mixes by score band, on the assumption that the four types
 * score comparably. They did not — structural advantages in the backend scorer
 * put opportunities a band above everything else — and because a band is drawn
 * as a whole, whichever type owned the top band owned the feed. Measured over an
 * equal candidate pool, opportunities took 63% of the first fifteen slots and
 * events took 1.4%.
 *
 * Fixing the scores narrows the gap; it cannot close it for good, because
 * scoring drifts and the next imbalance would silently reproduce the same feed.
 * These tests pin the structural guarantee instead: the mix holds even when one
 * type is handed a score advantage far larger than any real one.
 */

import { describe, expect, it } from "vitest"

import { applyVarietyOrder, type VarietyFeedItem } from "@/lib/feed-variety-order"

const NOW = Date.UTC(2026, 8, 11)
const DAY = 24 * 60 * 60 * 1000
const iso = (days: number) => new Date(NOW + days * DAY).toISOString()

const KINDS = ["opportunity", "event", "job", "resource"] as const
type Kind = (typeof KINDS)[number]

type Options = { score?: number; deadlineDays?: number; startDays?: number }

function rows(type: Kind, count: number, options: Options = {}): VarietyFeedItem[] {
  return Array.from({ length: count }, (_, i) => {
    const item: VarietyFeedItem = { _id: `${type}-${i}`, type }
    if (options.score !== undefined) {
      // Spread around the centre so each type straddles its band edges rather
      // than sitting in one bucket.
      item.score = Math.max(0, Math.min(100, options.score + (i % 21) - 10))
    }
    if (options.deadlineDays !== undefined) {
      item.dates = { applicationDeadline: iso(options.deadlineDays + (i % 40)) }
    }
    if (options.startDays !== undefined) {
      item.dates = {
        startDate: iso(options.startDays + (i % 70)),
        endDate: iso(options.startDays + 1 + (i % 70)),
      }
    }
    return item
  })
}

/** Share of the first `page` slots each type wins, over many draws. */
function mix(items: VarietyFeedItem[], page: number, trials = 500): Record<Kind, number> {
  const counts: Record<string, number> = { opportunity: 0, event: 0, job: 0, resource: 0 }
  for (let t = 0; t < trials; t += 1) {
    for (const item of applyVarietyOrder(items, NOW).slice(0, page)) {
      counts[item.type as string] += 1
    }
  }
  const total = trials * page
  return Object.fromEntries(
    KINDS.map((kind) => [kind, (100 * counts[kind]) / total]),
  ) as Record<Kind, number>
}

describe("type mix — the anonymous feed", () => {
  /**
   * As `publicFeedService` builds it: 15 resources, 27 jobs, 28 events, 30
   * opportunities, and **no scores at all**. Every row lands in one band, so the
   * band weighting is a no-op and the type draw is the only thing holding the
   * mix together.
   */
  const feed = [
    ...rows("resource", 15),
    ...rows("job", 27, { deadlineDays: 5 }),
    ...rows("event", 28, { startDays: 20 }),
    ...rows("opportunity", 30, { deadlineDays: 5 }),
  ]

  it("keeps the balance the server deliberately built", () => {
    // Events used to fall from the 28% the server shipped to 3% of the first ten
    // cards, purely because their start dates sit further out than a deadline.
    const share = mix(feed, 10)

    expect(share.event).toBeGreaterThan(18)
    expect(share.resource).toBeGreaterThan(8)
    expect(share.opportunity).toBeLessThan(40)
  })

  it("does not let undated content sink either", () => {
    // Resources carry no date at all and were the other side of the same bug.
    expect(mix(feed, 10).resource).toBeGreaterThan(8)
  })
})

describe("type mix — a scored feed where one type scores higher", () => {
  /**
   * An equal pool, but opportunities are handed a 20-point advantage — far more
   * than the real structural gap ever was. The mix must still hold.
   */
  const feed = [
    ...rows("opportunity", 60, { score: 70, deadlineDays: 5 }),
    ...rows("event", 60, { score: 50, startDays: 20 }),
    ...rows("job", 60, { score: 50, deadlineDays: 5 }),
    ...rows("resource", 60, { score: 50 }),
  ]

  it("does not let the advantaged type take the page", () => {
    const share = mix(feed, 15)

    expect(share.opportunity).toBeLessThan(45)
    for (const kind of KINDS) {
      expect(share[kind]).toBeGreaterThan(8)
    }
  })

  it("still prefers the advantaged type, just not to the exclusion of others", () => {
    // The guarantee is a floor on the others, not a flat quota — score should
    // still buy something, or the band weighting would be pointless.
    const share = mix(feed, 15)
    expect(share.opportunity).toBeGreaterThan(share.resource)
  })
})

describe("type mix — invariants it must not break", () => {
  const feed = [
    ...rows("opportunity", 20, { score: 70, deadlineDays: 5 }),
    ...rows("event", 20, { score: 50, startDays: 20 }),
    ...rows("job", 20, { score: 40, deadlineDays: 5 }),
    ...rows("resource", 20, { score: 30 }),
  ]

  it("returns every item exactly once", () => {
    for (let t = 0; t < 100; t += 1) {
      const order = applyVarietyOrder(feed, NOW)
      expect(order).toHaveLength(feed.length)
      expect(new Set(order.map((i) => i._id)).size).toBe(feed.length)
    }
  })

  it("handles a feed holding only one type", () => {
    const single = rows("event", 12, { startDays: 30 })
    const order = applyVarietyOrder(single, NOW)
    expect(order).toHaveLength(12)
    expect(new Set(order.map((i) => i._id)).size).toBe(12)
  })

  it("does not erase a content type it has never heard of", () => {
    // An unrecognised kind keeps its own identity rather than being folded into
    // a real type, so a new content type cannot silently inflate another's share.
    const mixed = [
      ...rows("opportunity", 20, { score: 60, deadlineDays: 5 }),
      ...Array.from({ length: 20 }, (_, i) => ({
        _id: `x-${i}`,
        type: "podcast",
        score: 60,
      })),
    ]

    const seen = new Set<string>()
    for (let t = 0; t < 100; t += 1) {
      for (const item of applyVarietyOrder(mixed, NOW).slice(0, 6)) {
        seen.add(item.type as string)
      }
    }
    expect(seen.has("podcast")).toBe(true)
  })
})

describe("randomness and repetition", () => {
  /**
   * A strict rota balanced the mix exactly and read like a conveyor belt. Worse,
   * it capped relevance: a reader whose profile points squarely at one type
   * could never be shown two of that type in a row, however well both matched.
   * The draw is now a weighted coin toss at the target odds, bounded only by a
   * maximum run length.
   */
  const feed = [
    ...rows("opportunity", 60, { score: 55, deadlineDays: 5 }),
    ...rows("event", 60, { score: 50, startDays: 20 }),
    ...rows("job", 60, { score: 50, deadlineDays: 5 }),
    ...rows("resource", 60, { score: 45 }),
  ]

  /** Lengths of every same-type run in the first `depth` cards, over many draws. */
  function runLengths(depth = 40, trials = 400): number[] {
    const lengths: number[] = []
    for (let t = 0; t < trials; t += 1) {
      const order = applyVarietyOrder(feed, NOW).slice(0, depth)
      let current: string | null = null
      let length = 0
      for (const item of order) {
        if (item.type === current) length += 1
        else {
          if (current !== null) lengths.push(length)
          current = item.type as string
          length = 1
        }
      }
      if (current !== null) lengths.push(length)
    }
    return lengths
  }

  it("never runs the same type more than three in a row", () => {
    expect(Math.max(...runLengths())).toBeLessThanOrEqual(3)
  })

  it("does allow a run of two or three — the whole point of loosening it", () => {
    // Under the old rota this was flatly zero: every run was length one, so a
    // reader could never be given two of the thing they came for.
    const lengths = runLengths()
    const repeats = lengths.filter((n) => n >= 2).length / lengths.length

    expect(repeats).toBeGreaterThan(0.1)
    expect(lengths.some((n) => n === 3)).toBe(true)
  })

  it("does not produce the same opening twice in a row", () => {
    // A conveyor belt gives nearly every draw the same first few cards.
    const openings = new Set<string>()
    for (let t = 0; t < 200; t += 1) {
      openings.add(
        applyVarietyOrder(feed, NOW)
          .slice(0, 5)
          .map((i) => (i.type as string)[0])
          .join(""),
      )
    }
    expect(openings.size).toBeGreaterThan(60)
  })

  it("still lands the mix on target despite the randomness", () => {
    const share = mix(feed, 15)
    expect(Math.abs(share.opportunity - 30)).toBeLessThan(8)
    expect(Math.abs(share.event - 28)).toBeLessThan(8)
    expect(Math.abs(share.job - 27)).toBeLessThan(8)
    expect(Math.abs(share.resource - 15)).toBeLessThan(8)
  })
})
