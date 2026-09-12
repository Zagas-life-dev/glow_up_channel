/**
 * The announcement calendar.
 *
 * A count scaled to the length of the run, drawn per reader, derived rather
 * than stored. The properties worth pinning are the ones that would make the
 * tier quietly fail to deliver what it sold:
 *
 *   - **The count follows the run.** A year-long campaign announcing itself
 *     twice, like a three-week one, is the failure the ladder exists to stop.
 *   - **Always distinct, never more than the run has days.** A draw that can
 *     return the same day twice silently loses announcements, and one that can
 *     ask for four days out of a three-day run cannot terminate.
 *   - **Spread across the whole run.** If the draw clustered, the promise of
 *     days scattered through the run would collapse back into the broadcast
 *     the per-reader design exists to avoid.
 *   - **Unchanged for campaigns already running.** Every extreme campaign
 *     issued before the ladder ran 21 days and drew two; if `announcementCount`
 *     or `pickDays` answered differently at 21, every live campaign would
 *     re-announce to readers the ledger thinks are finished.
 *   - **Stable per reader.** The days are recomputed on every evaluation, on
 *     every device. If they moved, a reader could be shown the same campaign
 *     far more often than it bought, or never.
 *   - **One interruption a day, whatever is running.** The cap is checked
 *     against the ledger before any campaign is considered, so three campaigns
 *     landing on one reader's day still produce one popup.
 */

import { beforeEach, describe, expect, it } from "vitest"

import {
  ANNOUNCEMENT_BANDS,
  announcementCount,
  announcementDays,
  isAnnouncementDay,
  localDateKey,
  markAnnounced,
  pickDays,
  runDayIndex,
  runLengthDays,
  selectAnnouncement,
  type ExtremeCampaign,
} from "@/lib/promotions/announcement"

// The cron's twin. Imported rather than reimplemented in the assertions: a test
// that restated the arithmetic would drift alongside whichever side broke.
import PromotionAnnouncementService from "../../latest-glowup-channel/src/services/promotionAnnouncementService.js"

const DAY = 24 * 60 * 60 * 1000
const START = Date.UTC(2026, 8, 1)
const USER = "user-abc123"

function campaign(overrides: Partial<ExtremeCampaign> = {}): ExtremeCampaign {
  return {
    _id: "promo-1",
    contentId: "content-1",
    contentType: "opportunity",
    title: "A promoted listing",
    startDate: new Date(START).toISOString(),
    endDate: new Date(START + 21 * DAY).toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe("announcementCount — the ladder", () => {
  it("matches the bands the product asked for", () => {
    // Stated as ranges rather than a formula on purpose: these four are the
    // product decision, and everything past them is the continuation of it.
    for (const span of [1, 3, 4, 7]) expect(announcementCount(span)).toBeLessThanOrEqual(1)
    for (const span of [8, 14, 21]) expect(announcementCount(span)).toBe(2)
    for (const span of [22, 30, 45]) expect(announcementCount(span)).toBe(3)
    for (const span of [46, 52, 60]) expect(announcementCount(span)).toBe(4)
  })

  it("adds one per further thirty days, up to fourteen at a year", () => {
    expect(announcementCount(90)).toBe(5)
    expect(announcementCount(120)).toBe(6)
    expect(announcementCount(180)).toBe(8)
    expect(announcementCount(365)).toBe(14)
  })

  it("never buys more announcements than the run has days for", () => {
    // Otherwise `pickDays` would be asked for four distinct days out of three.
    for (let span = 1; span <= 10; span += 1) {
      expect(announcementCount(span)).toBeLessThanOrEqual(span)
      expect(announcementCount(span)).toBeGreaterThanOrEqual(1)
    }
  })

  it("holds the last band rather than growing without bound", () => {
    expect(announcementCount(400)).toBe(ANNOUNCEMENT_BANDS.length)
    expect(announcementCount(10_000)).toBe(ANNOUNCEMENT_BANDS.length)
  })

  it("rises with the run and never falls", () => {
    let previous = 0
    for (let span = 1; span <= 400; span += 1) {
      const count = announcementCount(span)
      expect(count).toBeGreaterThanOrEqual(previous)
      previous = count
    }
  })
})

describe("pickDays", () => {
  it("returns the asked-for number of distinct days, in order, inside the span", () => {
    for (const [span, count] of [
      [21, 2],
      [45, 3],
      [60, 4],
      [365, 14],
    ] as const) {
      for (let seed = 0; seed < 200; seed += 1) {
        const days = pickDays(seed, span, count)
        expect(days).toHaveLength(count)
        expect(new Set(days).size).toBe(count)
        expect([...days].sort((a, b) => a - b)).toEqual(days)
        for (const day of days) {
          expect(day).toBeGreaterThanOrEqual(0)
          expect(day).toBeLessThan(span)
        }
      }
    }
  })

  it("reproduces the old two-day draw exactly", () => {
    // The guard on every campaign already mid-run. This is the algorithm the
    // replaced `pickTwoDays` ran, restated so a rewrite of `pickDays` that
    // consumed its randoms in a different order cannot pass.
    for (let seed = 0; seed < 500; seed += 1) {
      let a = seed >>> 0
      const rand = () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
      const first = Math.floor(rand() * 21)
      const offset = Math.floor(rand() * 20)
      const second = offset >= first ? offset + 1 : offset

      expect(pickDays(seed, 21, 2)).toEqual([first, second].sort((x, y) => x - y))
    }
  })

  it("degrades rather than looping on a span it cannot fill", () => {
    expect(pickDays(1, 1, 2)).toEqual([0])
    expect(pickDays(1, 0, 4)).toEqual([0])
    expect(pickDays(1, 3, 9)).toHaveLength(3)
    expect(pickDays(1, 5, 0)).toHaveLength(1)
  })

  it("reaches every day of the run across readers", () => {
    // Clustering here would put the whole campaign's delivery into a few days
    // and undo the reason the draw is per reader at all.
    const hit = new Set<number>()
    for (let seed = 0; seed < 2000; seed += 1) {
      for (const day of pickDays(seed, 21, 2)) hit.add(day)
    }
    expect(hit.size).toBe(21)
  })

  it("spreads a long run's days rather than bunching them at one end", () => {
    // A year's fourteen announcements landing in January would deliver the
    // same campaign as a broadcast and leave eleven months silent.
    const perMonth = new Array(12).fill(0)
    for (let seed = 0; seed < 1000; seed += 1) {
      for (const day of pickDays(seed, 365, 14)) {
        perMonth[Math.min(11, Math.floor(day / 30.5))] += 1
      }
    }
    const total = perMonth.reduce((sum, n) => sum + n, 0)
    for (const month of perMonth) {
      expect(month / total).toBeGreaterThan(0.04)
      expect(month / total).toBeLessThan(0.13)
    }
  })
})

describe("announcementDays — per reader, derived", () => {
  it("gives the same reader the same two days every time", () => {
    const c = campaign()
    const first = announcementDays(USER, c)
    for (let i = 0; i < 20; i += 1) {
      expect(announcementDays(USER, c)).toEqual(first)
    }
  })

  it("gives different readers different days", () => {
    const c = campaign()
    const perUser = Array.from({ length: 200 }, (_, i) => announcementDays(`user-${i}`, c).join(","))
    // Not all identical — a hash that ignored the user id would collapse to one
    // pair and make this a broadcast again.
    expect(new Set(perUser).size).toBeGreaterThan(50)
  })

  it("gives one reader different days for different campaigns", () => {
    const a = announcementDays(USER, campaign({ _id: "promo-1" }))
    const b = announcementDays(USER, campaign({ _id: "promo-2" }))
    const c = announcementDays(USER, campaign({ _id: "promo-3" }))
    expect(new Set([a.join(), b.join(), c.join()]).size).toBeGreaterThan(1)
  })

  it("does not collide when id boundaries shift", () => {
    // ("ab","c") and ("a","bc") must not fold to the same seed, which is what
    // the separator in `deriveSeed` is for.
    const one = announcementDays("ab", campaign({ _id: "c" }))
    const two = announcementDays("a", campaign({ _id: "bc" }))
    // Not a guarantee for every such pair, but this specific one is the
    // canonical demonstration and must differ.
    expect(one.join()).not.toBe(two.join())
  })
})

describe("runDayIndex and runLengthDays", () => {
  it("counts elapsed days from the start", () => {
    const c = campaign()
    expect(runDayIndex(c, START)).toBe(0)
    expect(runDayIndex(c, START + DAY + 1000)).toBe(1)
    expect(runDayIndex(c, START + 20 * DAY)).toBe(20)
  })

  it("returns null outside the run", () => {
    const c = campaign()
    expect(runDayIndex(c, START - 1)).toBeNull()
    expect(runDayIndex(c, START + 22 * DAY)).toBeNull()
  })

  it("reads a 21-day campaign as 21 days", () => {
    expect(runLengthDays(campaign())).toBe(21)
  })

  it("never reports a run shorter than a day", () => {
    expect(runLengthDays(campaign({ endDate: new Date(START).toISOString() }))).toBe(1)
    expect(runLengthDays(campaign({ endDate: "not a date" }))).toBe(1)
  })

  it("prefers the pinned span over the start/end distance", () => {
    const extended = campaign({
      endDate: new Date(START + 40 * DAY).toISOString(),
      announcementSpanDays: 21,
    })
    expect(runLengthDays(extended)).toBe(21)
  })

  it("ignores a nonsensical pinned span", () => {
    for (const bad of [0, -5, Number.NaN, null, undefined]) {
      const c = campaign({ announcementSpanDays: bad as number | null })
      expect(runLengthDays(c)).toBe(21)
    }
  })
})

describe("editing the duration must not move the announcement days", () => {
  /**
   * The reason `announcementSpanDays` exists.
   *
   * Duration is editable, so if the draw followed `endDate`, extending a run
   * would re-draw every reader's two days. Someone already announced to on day
   * 5 could be announced again on the *new* day 5 — and the ledger could not
   * catch it, because its key is the day index, which would have moved
   * underneath it.
   */
  it("keeps the same two days when the campaign is extended", () => {
    const original = campaign({ announcementSpanDays: 21 })
    const extended = campaign({
      endDate: new Date(START + 40 * DAY).toISOString(),
      announcementSpanDays: 21,
    })

    for (let i = 0; i < 100; i += 1) {
      const user = `reader-${i}`
      expect(announcementDays(user, extended)).toEqual(announcementDays(user, original))
    }
  })

  it("keeps the same two days when the campaign is trimmed", () => {
    const original = campaign({ announcementSpanDays: 21 })
    const trimmed = campaign({
      endDate: new Date(START + 10 * DAY).toISOString(),
      announcementSpanDays: 21,
    })

    for (let i = 0; i < 100; i += 1) {
      const user = `reader-${i}`
      expect(announcementDays(user, trimmed)).toEqual(announcementDays(user, original))
    }
  })

  it("still stops announcing once the trimmed run is over", () => {
    // The days do not move, but a day past the new end is no longer *in* the
    // run — trimming has to actually stop delivery, not just leave the
    // schedule intact.
    const trimmed = campaign({
      endDate: new Date(START + 5 * DAY).toISOString(),
      announcementSpanDays: 21,
    })
    expect(runDayIndex(trimmed, START + 12 * DAY)).toBeNull()
    expect(isAnnouncementDay(USER, trimmed, START + 12 * DAY)).toBe(false)
  })

  it("would have moved them without the pin — which is what it prevents", () => {
    // Guards the guard: if this ever stops differing, the span field has
    // silently stopped doing anything and the tests above would pass vacuously.
    const twentyOne = campaign()
    const forty = campaign({ endDate: new Date(START + 40 * DAY).toISOString() })

    const moved = Array.from({ length: 100 }, (_, i) => `reader-${i}`).filter(
      (user) => announcementDays(user, twentyOne).join() !== announcementDays(user, forty).join(),
    )
    expect(moved.length).toBeGreaterThan(50)
  })
})

describe("isAnnouncementDay", () => {
  it("is true on exactly the two drawn days of the run", () => {
    const c = campaign()
    const drawn = announcementDays(USER, c)
    const hits: number[] = []
    for (let day = 0; day < 21; day += 1) {
      if (isAnnouncementDay(USER, c, START + day * DAY)) hits.push(day)
    }
    expect(hits).toEqual(drawn)
  })

  it("is false before and after the run", () => {
    const c = campaign()
    expect(isAnnouncementDay(USER, c, START - DAY)).toBe(false)
    expect(isAnnouncementDay(USER, c, START + 30 * DAY)).toBe(false)
  })
})

describe("selectAnnouncement", () => {
  /** A moment that is one of this reader's announcement days for `c`. */
  function onAnnouncementDay(c: ExtremeCampaign): number {
    return START + announcementDays(USER, c)[0] * DAY
  }

  it("offers a campaign on the reader's day", () => {
    const c = campaign()
    const selected = selectAnnouncement([c], USER, onAnnouncementDay(c))
    expect(selected?.campaign._id).toBe("promo-1")
    expect(selected?.dayIndex).toBe(announcementDays(USER, c)[0])
  })

  it("offers nothing on any other day", () => {
    const c = campaign()
    const drawn = announcementDays(USER, c)
    for (let day = 0; day < 21; day += 1) {
      if (drawn.includes(day)) continue
      expect(selectAnnouncement([c], USER, START + day * DAY)).toBeNull()
    }
  })

  it("does not offer the same announcement twice", () => {
    const c = campaign()
    const when = onAnnouncementDay(c)

    const first = selectAnnouncement([c], USER, when)
    expect(first).not.toBeNull()

    markAnnounced(USER, c, first!.dayIndex, when)
    expect(selectAnnouncement([c], USER, when)).toBeNull()
  })

  it("interrupts a reader at most once a day, however many campaigns are live", () => {
    // Build three campaigns and find a day this reader is due at least two of.
    const many = [
      campaign({ _id: "promo-1" }),
      campaign({ _id: "promo-2" }),
      campaign({ _id: "promo-3" }),
      campaign({ _id: "promo-4" }),
      campaign({ _id: "promo-5" }),
    ]
    const busyDay = Array.from({ length: 21 }, (_, day) => day).find(
      (day) => many.filter((c) => announcementDays(USER, c).includes(day)).length >= 2,
    )
    expect(busyDay).toBeDefined()

    const when = START + busyDay! * DAY
    const first = selectAnnouncement(many, USER, when)
    expect(first).not.toBeNull()

    markAnnounced(USER, first!.campaign, first!.dayIndex, when)
    // Second campaign is still due today, and must still be refused.
    expect(selectAnnouncement(many, USER, when)).toBeNull()
  })

  it("comes back the next day the reader is due", () => {
    // The one-a-day cap is keyed on the calendar date, so it must not silence
    // a later day. Dismissing today is not dismissing the campaign.
    const c1 = campaign({ _id: "promo-1" })
    const c2 = campaign({ _id: "promo-2" })

    // Not every reader's draw exercises this — one whose promo-2 days both fall
    // before their first promo-1 day would prove nothing. Find one it does: a
    // promo-2 day later than a promo-1 day, and not itself a promo-1 day, so
    // the campaign that comes back is unambiguous.
    let found: { user: string; first: number; next: number } | null = null
    for (let i = 0; i < 200 && !found; i += 1) {
      const user = `reader-${i}`
      const c1Days = announcementDays(user, c1)
      const next = announcementDays(user, c2).find(
        (d) => d > c1Days[0] && !c1Days.includes(d),
      )
      if (next !== undefined) found = { user, first: c1Days[0], next }
    }
    expect(found).not.toBeNull()

    const { user, first, next } = found!
    markAnnounced(user, c1, first, START + first * DAY)

    const selected = selectAnnouncement([c1, c2], user, START + next * DAY)
    expect(selected?.campaign._id).toBe("promo-2")
  })

  it("offers nothing to a signed-out reader or an empty list", () => {
    expect(selectAnnouncement([campaign()], "", onAnnouncementDay(campaign()))).toBeNull()
    expect(selectAnnouncement([], USER, START)).toBeNull()
  })

  it("keeps one reader's ledger out of another's", () => {
    const c = campaign()
    const when = onAnnouncementDay(c)
    const first = selectAnnouncement([c], USER, when)
    markAnnounced(USER, c, first!.dayIndex, when)

    // A different account on the same device has its own schedule and its own
    // ledger; the mark above must not silence it.
    const other = "user-zzz999"
    const otherDay = announcementDays(other, c)[0]
    expect(selectAnnouncement([c], other, START + otherDay * DAY)).not.toBeNull()
  })
})

describe("localDateKey", () => {
  it("formats the reader's own calendar date", () => {
    const d = new Date(2026, 0, 5, 13, 30)
    expect(localDateKey(d.getTime())).toBe("2026-01-05")
  })
})

describe("server parity — the push must land on the popup's days", () => {
  /**
   * The popup is scheduled in the browser and the push for the same two days is
   * sent from a cron job, with no shared runtime between them. They agree only
   * because `promotionAnnouncementService.js` reimplements this module's
   * arithmetic exactly — the FNV offset and prime, the 0x2f separator,
   * mulberry32's mixing, and the draw-then-shift pair.
   *
   * Nothing about a drift here would throw. The campaign would simply deliver a
   * popup on one day and an unrelated push on another, which is not the product
   * that was sold and which no error log would ever mention.
   */
  it("derives identical days for the same reader and campaign", () => {
    const c = campaign()
    for (let i = 0; i < 300; i += 1) {
      const user = `reader-${i}`
      expect(announcementDays(user, c)).toEqual(
        PromotionAnnouncementService.announcementDays(user, c),
      )
    }
  })

  it("derives identical days across different campaigns", () => {
    for (let i = 0; i < 100; i += 1) {
      const c = campaign({ _id: `promo-${i}` })
      expect(announcementDays(USER, c)).toEqual(
        PromotionAnnouncementService.announcementDays(USER, c),
      )
    }
  })

  it("agrees on the raw draw, seed for seed, at every count on the ladder", () => {
    for (const span of ANNOUNCEMENT_BANDS) {
      const count = announcementCount(span)
      for (let seed = 0; seed < 120; seed += 1) {
        expect(pickDays(seed, span, count)).toEqual(
          PromotionAnnouncementService.pickDays(seed, span, count),
        )
      }
    }
  })

  it("agrees on how many announcements a run buys", () => {
    // The ladder is duplicated by hand across the boundary, so a band edge
    // moved on one side only is exactly the drift this catches: the popup and
    // the push would then disagree about how many days there even are.
    for (let span = 1; span <= 400; span += 1) {
      expect(announcementCount(span)).toBe(PromotionAnnouncementService.announcementCount(span))
    }
    expect(ANNOUNCEMENT_BANDS).toEqual(PromotionAnnouncementService.ANNOUNCEMENT_BANDS)
  })

  it("agrees on the days of a long run, where the counts differ most", () => {
    // The 21-day campaign above exercises two days on both sides. A year-long
    // one exercises fourteen, which is where a mismatched loop shows up.
    const yearLong = campaign({
      endDate: new Date(START + 365 * DAY).toISOString(),
      announcementSpanDays: 365,
    })
    for (let i = 0; i < 100; i += 1) {
      const user = `reader-${i}`
      const days = announcementDays(user, yearLong)
      expect(days).toHaveLength(14)
      expect(days).toEqual(PromotionAnnouncementService.announcementDays(user, yearLong))
    }
  })

  it("agrees which day of the run it is", () => {
    const c = campaign()
    for (let day = -1; day <= 22; day += 1) {
      const at = START + day * DAY
      expect(runDayIndex(c, at)).toBe(PromotionAnnouncementService.runDayIndex(c, at))
    }
  })

  it("agrees on the run length", () => {
    expect(runLengthDays(campaign())).toBe(PromotionAnnouncementService.runLengthDays(campaign()))
  })

  it("agrees on whether today is an announcement day, every day of a run", () => {
    // The end-to-end property, and the one that actually matters: on each of
    // the 21 days, both sides answer the same question the same way.
    const c = campaign()
    for (let i = 0; i < 40; i += 1) {
      const user = `reader-${i}`
      for (let day = 0; day < 21; day += 1) {
        const at = START + day * DAY
        expect(isAnnouncementDay(user, c, at)).toBe(
          PromotionAnnouncementService.isAnnouncementDay(user, c, at),
        )
      }
    }
  })

  it("agrees on a pinned span, so an edited campaign stays in step", () => {
    // Both sides must read `announcementSpanDays`. If only one did, editing a
    // duration would put the popup and the push on different days.
    const extended = campaign({
      endDate: new Date(START + 40 * DAY).toISOString(),
      announcementSpanDays: 21,
    })
    expect(runLengthDays(extended)).toBe(
      PromotionAnnouncementService.runLengthDays(extended),
    )
    for (let i = 0; i < 100; i += 1) {
      const user = `reader-${i}`
      expect(announcementDays(user, extended)).toEqual(
        PromotionAnnouncementService.announcementDays(user, extended),
      )
    }
  })

  it("tolerates an ObjectId-shaped id on the server side", () => {
    // The browser sees `_id` as the hex string JSON gave it; the cron holds a
    // real ObjectId. The service stringifies, so both must land on one answer.
    const hex = "65f1a2b3c4d5e6f708192a3b"
    const c = campaign({ _id: hex })
    const asObjectId = { ...c, _id: { toString: () => hex } }
    expect(PromotionAnnouncementService.announcementDays(USER, asObjectId)).toEqual(
      announcementDays(USER, c),
    )
  })
})
