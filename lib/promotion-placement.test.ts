/**
 * The extreme lead, the rail exemption, and the caps that keep paid placement
 * from eating the feed.
 *
 * Three properties carry the design, and all three are the kind that fail
 * silently in production rather than loudly in review:
 *
 *   1. **A live extreme campaign is always the first card.** This is the whole
 *      promise of the tier, and the version that shipped before was a pile of
 *      probabilities — a reserved share, a lead bias, a weighted pluck — that
 *      came out first *often*. Often is indistinguishable from broken when the
 *      provider refreshes twice and sees organic both times.
 *   2. **The rail may double the lead, and only the lead.** The dedupe between
 *      the two surfaces still holds for every other tier; `railCarries` is the
 *      one exemption, and if it widened, ordinary promotions would start
 *      appearing twice in a single scroll.
 *   3. **The caps reorder, never drop.** They run last, on the finished order,
 *      so a bug here silently removes listings from the feed — the failure mode
 *      nobody notices until a provider asks why their campaign served nothing.
 */

import { describe, expect, it } from "vitest"

import {
  MAX_EXTREME_IN_FEED_TOP,
  MAX_PROMOTED_IN_FEED_TOP,
  TOP_SLOTS,
  enforcePromotedCaps,
  extremeRoute,
  leadWithExtreme,
  railCarries,
} from "@/lib/promotion-placement"

const SEED = 0x5eed1234

/** Ids standing in for a realistic spread of listings. */
const ids = Array.from({ length: 400 }, (_, i) => `listing-${i}-abcdef`)

function extremeItem(id: string) {
  return { _id: id, isPromoted: true, promotion: { packageType: "extreme" } }
}

const isExtreme = (item: unknown): boolean =>
  (item as { promotion?: { packageType?: string } })?.promotion?.packageType === "extreme"

describe("extremeRoute — whether the rail doubles the listing", () => {
  it("is stable for the same listing and session", () => {
    for (const id of ids.slice(0, 20)) {
      expect(extremeRoute(id, SEED)).toBe(extremeRoute(id, SEED))
    }
  })

  it("splits roughly evenly across listings", () => {
    const feed = ids.filter((id) => extremeRoute(id, SEED) === "feed").length
    const share = feed / ids.length
    // A coin flip over 400 draws. Loose bounds, but far tighter than anything a
    // broken hash (all-heads, or keyed off nothing) could pass.
    expect(share).toBeGreaterThan(0.4)
    expect(share).toBeLessThan(0.6)
  })

  it("redraws when the session does", () => {
    // A refresh mints a new seed, which is what moves the listing on and off
    // the rail between loads. If the seed did not reach the draw, every session
    // would decide identically and the rail half of the tier would be
    // permanently on or permanently off.
    const moved = ids.filter((id) => extremeRoute(id, SEED) !== extremeRoute(id, SEED + 1))
    expect(moved.length).toBeGreaterThan(ids.length * 0.3)
  })

  it("still decides during SSR, when there is no seed yet", () => {
    expect(["feed", "sponsored"]).toContain(extremeRoute(ids[0], null))
    expect(extremeRoute(ids[0], null)).toBe(extremeRoute(ids[0], null))
  })
})

describe("railCarries — the one hole in the dedupe", () => {
  it("doubles an extreme listing on exactly the sessions its coin picks the rail", () => {
    for (const id of ids) {
      expect(railCarries(extremeItem(id), SEED, isExtreme)).toBe(
        extremeRoute(id, SEED) === "sponsored",
      )
    }
  })

  it("leaves roughly half the loads showing it once", () => {
    // The duplicate is deliberate, but it is still a cost to the reader, so it
    // has to stay a coin flip rather than creeping toward always.
    const doubled = ids.filter((id) => railCarries(extremeItem(id), SEED, isExtreme)).length
    const share = doubled / ids.length
    expect(share).toBeGreaterThan(0.4)
    expect(share).toBeLessThan(0.6)
  })

  it("never exempts anything that is not an extreme promotion", () => {
    // The whole point of the dedupe is that ordinary promotions are not shown
    // twice. If this widened, every wallet promotion would start doubling.
    const ordinary = { _id: "x1", isPromoted: true, promotion: { packageType: "wallet_daily" } }
    const organic = { _id: "x2" }
    expect(railCarries(ordinary, SEED, isExtreme)).toBe(false)
    expect(railCarries(organic, SEED, isExtreme)).toBe(false)
  })

  it("dedupes a listing with no usable id rather than doubling it", () => {
    // No id means no stable draw. Falling back to "carry it" would show the
    // card twice on every load, which is the worse of the two failures.
    const noId = { isPromoted: true, promotion: { packageType: "extreme" } }
    expect(railCarries(noId, SEED, isExtreme)).toBe(false)
    expect(railCarries({ ...noId, _id: "" }, SEED, isExtreme)).toBe(false)
  })
})

describe("leadWithExtreme — the first card", () => {
  const organicRow = (n: number) => ({ _id: `o${n}` })
  const paidRow = (n: number) => ({
    _id: `p${n}`,
    isPromoted: true,
    promotion: { packageType: "wallet_daily" },
  })

  it("puts the extreme listing first from anywhere in the list", () => {
    // Where it starts is whatever the orderer left it at, which on the
    // `preserveOrder` feed is wherever the server happened to put it. Every
    // one of these has to end up at slot 0.
    for (const at of [1, 2, 5, 9, 19, 40]) {
      const rows: Array<{ _id: string }> = Array.from({ length: 50 }, (_, i) => organicRow(i))
      rows[at] = extremeItem("the-campaign")
      expect(leadWithExtreme(rows, { isExtreme, sessionSeed: SEED })[0]._id).toBe("the-campaign")
    }
  })

  it("keeps every other item, exactly once, in its original order", () => {
    // It reorders; it must never drop or duplicate. A feed quietly shedding
    // rows is the failure nobody reports.
    const rows = Array.from({ length: 12 }, (_, i) => organicRow(i))
    rows.splice(7, 0, extremeItem("e1"))
    const out = leadWithExtreme(rows, { isExtreme, sessionSeed: SEED })

    expect(out).toHaveLength(rows.length)
    expect(new Set(out.map((r) => r._id)).size).toBe(rows.length)
    expect(out.slice(1).map((r) => r._id)).toEqual(
      rows.filter((r) => r._id !== "e1").map((r) => r._id),
    )
  })

  it("is a no-op when nothing extreme is live", () => {
    // The ordinary feed has to be untouched by this. Leading with a paid card
    // that did not buy the tier would be the obvious way to get it wrong.
    const rows = [...Array.from({ length: 8 }, (_, i) => organicRow(i)), paidRow(1)]
    expect(leadWithExtreme(rows, { isExtreme, sessionSeed: SEED })).toBe(rows)
  })

  it("is idempotent, so stacking it on an orderer that already led changes nothing", () => {
    // Both `applyVarietyOrder` and the backend's `scatterRank` hand slot 0 to
    // an extreme item themselves. This runs after them.
    const rows = [extremeItem("e1"), ...Array.from({ length: 9 }, (_, i) => organicRow(i))]
    const once = leadWithExtreme(rows, { isExtreme, sessionSeed: SEED })
    expect(leadWithExtreme(once, { isExtreme, sessionSeed: SEED })).toEqual(once)
    expect(once[0]._id).toBe("e1")
  })

  it("rotates which campaign leads as sessions turn over", () => {
    // With several live, taking the first in array order would hand one of them
    // every opening slot for its whole run and the others none.
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => organicRow(i)),
      extremeItem("e1"),
      extremeItem("e2"),
      extremeItem("e3"),
    ]
    const leaders = new Set<string>()
    for (let seed = 0; seed < 200; seed += 1) {
      leaders.add(leadWithExtreme(rows, { isExtreme, sessionSeed: seed })[0]._id)
    }
    expect(leaders).toEqual(new Set(["e1", "e2", "e3"]))
  })

  it("holds the lead steady while the reader scrolls", () => {
    // Same session seed, same answer — otherwise the top card would change
    // under a re-render or a back-navigation.
    const rows = [
      ...Array.from({ length: 4 }, (_, i) => organicRow(i)),
      extremeItem("e1"),
      extremeItem("e2"),
    ]
    const first = leadWithExtreme(rows, { isExtreme, sessionSeed: SEED })[0]._id
    for (let i = 0; i < 20; i += 1) {
      expect(leadWithExtreme(rows, { isExtreme, sessionSeed: SEED })[0]._id).toBe(first)
    }
  })

  it("still leads during SSR, when there is no seed yet", () => {
    const rows = [organicRow(0), extremeItem("e1"), organicRow(1)]
    expect(leadWithExtreme(rows, { isExtreme, sessionSeed: null })[0]._id).toBe("e1")
  })

  it("survives the caps that run after it", () => {
    // The lead is applied before `enforcePromotedCaps`, and what makes that
    // safe is that at slot 0 no cap has been met yet. If the order ever
    // flipped, the caps could defer the very card this exists to place.
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => paidRow(i)),
      extremeItem("e1"),
      ...Array.from({ length: 20 }, (_, i) => organicRow(i)),
    ]
    const capped = enforcePromotedCaps(
      leadWithExtreme(rows, { isExtreme, sessionSeed: SEED }),
      {
        isPromoted: (r) => Boolean((r as { isPromoted?: boolean }).isPromoted),
        isExtreme,
        maxExtreme: MAX_EXTREME_IN_FEED_TOP,
        maxPromoted: MAX_PROMOTED_IN_FEED_TOP,
      },
    )
    expect(capped[0]._id).toBe("e1")
  })
})

describe("enforcePromotedCaps", () => {
  type Row = { _id: string; promoted?: boolean; extreme?: boolean }

  const opts = {
    isPromoted: (r: Row) => Boolean(r.promoted || r.extreme),
    isExtreme: (r: Row) => Boolean(r.extreme),
    maxExtreme: MAX_EXTREME_IN_FEED_TOP,
    maxPromoted: MAX_PROMOTED_IN_FEED_TOP,
  }

  const organic = (n: number): Row => ({ _id: `o${n}` })
  const extreme = (n: number): Row => ({ _id: `e${n}`, extreme: true })
  const paid = (n: number): Row => ({ _id: `p${n}`, promoted: true })

  function countTop(rows: Row[], predicate: (r: Row) => boolean) {
    return rows.slice(0, TOP_SLOTS).filter(predicate).length
  }

  it("holds the extreme cap when a draw overshoots it", () => {
    // Ten extreme campaigns in a row, then organic. Nothing in the ordering
    // stops this; the cap is the only thing that does.
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => extreme(i)),
      ...Array.from({ length: 20 }, (_, i) => organic(i)),
    ]
    const out = enforcePromotedCaps(rows, opts)
    expect(countTop(out, opts.isExtreme)).toBe(MAX_EXTREME_IN_FEED_TOP)
  })

  it("holds the combined cap when extreme and ordinary promotions stack", () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => extreme(i)),
      ...Array.from({ length: 5 }, (_, i) => paid(i)),
      ...Array.from({ length: 20 }, (_, i) => organic(i)),
    ]
    const out = enforcePromotedCaps(rows, opts)
    expect(countTop(out, opts.isPromoted)).toBeLessThanOrEqual(MAX_PROMOTED_IN_FEED_TOP)
    // Extreme fills the shared budget first, because it was ordered first.
    expect(countTop(out, opts.isExtreme)).toBe(MAX_EXTREME_IN_FEED_TOP)
  })

  it("returns every item exactly once", () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => extreme(i)),
      ...Array.from({ length: 6 }, (_, i) => paid(i)),
      ...Array.from({ length: 10 }, (_, i) => organic(i)),
    ]
    const out = enforcePromotedCaps(rows, opts)
    expect(out).toHaveLength(rows.length)
    expect(new Set(out.map((r) => r._id)).size).toBe(rows.length)
  })

  it("puts what it moved immediately after the window, not at the end", () => {
    // A promoter who loses a top slot should get the next best one. Throwing
    // the overflow to the bottom of the feed would be a far harsher penalty
    // than the cap is meant to impose.
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => extreme(i)),
      ...Array.from({ length: 20 }, (_, i) => organic(i)),
    ]
    const out = enforcePromotedCaps(rows, opts)
    const moved = out.slice(TOP_SLOTS, TOP_SLOTS + 3)
    expect(moved.every(opts.isExtreme)).toBe(true)
  })

  it("leaves an order that already fits completely alone", () => {
    const rows = [extreme(1), organic(1), organic(2), paid(1), organic(3)]
    expect(enforcePromotedCaps(rows, opts)).toBe(rows)
  })

  it("keeps the relative order of everything it did not move", () => {
    const rows = [
      extreme(1),
      organic(1),
      extreme(2),
      organic(2),
      extreme(3),
      organic(3),
      extreme(4),
      organic(4),
      extreme(5),
      organic(5),
      extreme(6),
      organic(6),
    ]
    const out = enforcePromotedCaps(rows, opts)
    const organicOrder = out.filter((r) => !opts.isPromoted(r)).map((r) => r._id)
    expect(organicOrder).toEqual(["o1", "o2", "o3", "o4", "o5", "o6"])
  })

  it("shows what it has when there is nothing organic to share the top with", () => {
    // The caps say how the top should be *shared*. A list with nothing to share
    // it with has no better answer than showing the items it has.
    const rows = Array.from({ length: 6 }, (_, i) => extreme(i))
    const out = enforcePromotedCaps(rows, opts)
    expect(out).toHaveLength(6)
    expect(new Set(out.map((r) => r._id)).size).toBe(6)
  })

  it("applies the extreme cap alone when no combined cap is given", () => {
    // The sponsored rail: everything in it is paid, so only the tier mix is
    // capped.
    const rows = [
      ...Array.from({ length: 9 }, (_, i) => extreme(i)),
      ...Array.from({ length: 9 }, (_, i) => paid(i)),
    ]
    const out = enforcePromotedCaps(rows, { ...opts, maxExtreme: 7, maxPromoted: undefined })
    expect(countTop(out, opts.isExtreme)).toBe(7)
    expect(countTop(out, opts.isPromoted)).toBe(TOP_SLOTS)
  })

  it("handles trivial inputs", () => {
    expect(enforcePromotedCaps([], opts)).toEqual([])
    const one = [extreme(1)]
    expect(enforcePromotedCaps(one, opts)).toBe(one)
  })
})
