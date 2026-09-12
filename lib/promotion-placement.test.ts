/**
 * The two-sided boost and the caps that keep it from eating the feed.
 *
 * Two properties carry the whole design, and both are the kind that fail
 * silently in production rather than loudly in review:
 *
 *   1. **Exactly one surface keeps each extreme listing.** The feed and the
 *      sponsored rail decide independently, in different components, with no
 *      shared state — they only agree because both derive the answer from
 *      `(session seed, listing id)`. If that derivation ever stopped being a
 *      clean split, a paid listing would either be shown twice in one scroll or
 *      vanish from both surfaces while still being billed as delivered.
 *   2. **The caps reorder, never drop.** They run last, on the finished order,
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
  withheldFrom,
} from "@/lib/promotion-placement"

const SEED = 0x5eed1234

/** Ids standing in for a realistic spread of listings. */
const ids = Array.from({ length: 400 }, (_, i) => `listing-${i}-abcdef`)

function extremeItem(id: string) {
  return { _id: id, isPromoted: true, promotion: { packageType: "extreme" } }
}

const isExtreme = (item: unknown): boolean =>
  (item as { promotion?: { packageType?: string } })?.promotion?.packageType === "extreme"

describe("extremeRoute — which surface takes the listing", () => {
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
    // A refresh mints a new seed, which is what makes the listing meet the
    // reader on the other surface next time. If the seed did not reach the
    // draw, every session would route identically and the tier would be
    // one-sided.
    const moved = ids.filter((id) => extremeRoute(id, SEED) !== extremeRoute(id, SEED + 1))
    expect(moved.length).toBeGreaterThan(ids.length * 0.3)
  })

  it("still decides during SSR, when there is no seed yet", () => {
    expect(["feed", "sponsored"]).toContain(extremeRoute(ids[0], null))
    expect(extremeRoute(ids[0], null)).toBe(extremeRoute(ids[0], null))
  })
})

describe("withheldFrom — the two surfaces must not disagree", () => {
  it("keeps each extreme listing on exactly one surface", () => {
    for (const id of ids) {
      const item = extremeItem(id)
      const outOfFeed = withheldFrom(item, "feed", SEED, isExtreme)
      const outOfRail = withheldFrom(item, "sponsored", SEED, isExtreme)
      // Never both (invisible despite being paid for) and never neither (the
      // same card twice in one scroll).
      expect(outOfFeed).not.toBe(outOfRail)
    }
  })

  it("never withholds anything that is not an extreme promotion", () => {
    const ordinary = { _id: "x1", isPromoted: true, promotion: { packageType: "wallet_daily" } }
    const organic = { _id: "x2" }
    for (const surface of ["feed", "sponsored"] as const) {
      expect(withheldFrom(ordinary, surface, SEED, isExtreme)).toBe(false)
      expect(withheldFrom(organic, surface, SEED, isExtreme)).toBe(false)
    }
  })

  it("keeps a listing with no usable id rather than routing it nowhere", () => {
    // No id means no stable draw, so the two surfaces could not agree. Showing
    // it is the safe failure: the dedupe downstream still prevents a double.
    const noId = { isPromoted: true, promotion: { packageType: "extreme" } }
    expect(withheldFrom(noId, "feed", SEED, isExtreme)).toBe(false)
    expect(withheldFrom({ ...noId, _id: "" }, "feed", SEED, isExtreme)).toBe(false)
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
