/**
 * The one rule every ordering surface depends on.
 *
 * A listing that names a date must never be plucked less often than one that
 * names none. Breaking it is not a tuning mistake, it is a contradiction: the
 * feed would be saying it knows less about a listing that told it more.
 *
 * It was broken for a long time, by a factor of 240, and the damage was
 * type-shaped rather than item-shaped. Application deadlines fall days to weeks
 * out; events are scheduled months ahead. So a floor that sat far below the
 * undated weight did not penalise "far-off listings" evenly — it removed events
 * from the feed and left everything else alone. Measured over an equal candidate
 * pool, events held 1.4% of the first page.
 */

import { describe, expect, it } from "vitest"

import {
  FEED_TIME_PRESSURE,
  HUB_TIME_PRESSURE,
  timePressureFrom,
  type TimePressureTuning,
} from "@/lib/feed-time-pressure"

const NOW = Date.UTC(2026, 8, 11)
const DAY = 24 * 60 * 60 * 1000
const inDays = (n: number) => NOW + n * DAY

const TUNINGS: [string, TimePressureTuning][] = [
  ["feed", FEED_TIME_PRESSURE],
  ["hub", HUB_TIME_PRESSURE],
]

describe.each(TUNINGS)("timePressureFrom — %s tuning", (_name, tuning) => {
  const weight = (days: number) => timePressureFrom(inDays(days), NOW, tuning)

  it("never ranks a dated listing below an undated one", () => {
    const undated = timePressureFrom(null, NOW, tuning)

    // Out to two years: an event booked a long way ahead is still an event, and
    // must not be beaten by a PDF with no date on it at all.
    for (let days = 1; days <= 730; days += 1) {
      expect(weight(days)).toBeGreaterThanOrEqual(undated)
    }
  })

  it("is monotonic — sooner is never worse", () => {
    for (let days = 1; days <= 365; days += 1) {
      expect(weight(days)).toBeGreaterThanOrEqual(weight(days + 1))
    }
  })

  it("still discriminates across the window a reader plans in", () => {
    // Flattening immediately would be the other failure mode: the invariant
    // above is satisfiable by returning one constant, which would throw away
    // urgency altogether.
    expect(weight(1)).toBeGreaterThan(weight(14) * 1.3)
    expect(weight(14)).toBeGreaterThan(weight(28))
  })

  it("keeps urgency a preference rather than a filter", () => {
    // The old curve put "closing today" ~115x above "due in a month", which is
    // not a preference — anything a month out was unreachable whatever else it
    // had going for it.
    expect(weight(0.5) / weight(30)).toBeLessThan(12)
  })

  it("puts anything already closed below every live listing", () => {
    const expired = timePressureFrom(inDays(-1), NOW, tuning)

    expect(expired).toBe(tuning.expiredWeight)
    expect(expired).toBeLessThan(tuning.undatedWeight)
    // Clear of the live floor by a wide margin — when the two were one shared
    // constant, a closed listing was drawn as often as a live one five weeks out.
    expect(expired * 10).toBeLessThan(weight(3650))
  })

  it("treats an undated listing as exactly the floor", () => {
    expect(timePressureFrom(null, NOW, tuning)).toBe(tuning.undatedWeight)
    expect(weight(3650)).toBe(tuning.undatedWeight)
  })
})

describe("tuning shapes", () => {
  it("leans harder on the near term on hub pages than in the feed", () => {
    // A hub page is where someone goes to find what is closing.
    expect(HUB_TIME_PRESSURE.halfLifeDays).toBeLessThan(FEED_TIME_PRESSURE.halfLifeDays)
  })

  it("gives every tuning a floor that is reachable rather than nominal", () => {
    // The bug was a floor three orders of magnitude under the undated weight,
    // which made it a hole rather than a floor.
    for (const [, tuning] of TUNINGS) {
      expect(tuning.undatedWeight).toBeGreaterThan(0)
      expect(tuning.expiredWeight).toBeLessThan(tuning.undatedWeight)
    }
  })
})
