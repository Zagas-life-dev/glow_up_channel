"use client"

/**
 * Where an extreme promotion appears, and how much of the top of a list paid
 * placement is allowed to hold.
 *
 * **The feed slot is unconditional.**
 *
 * A live extreme campaign takes the first card of every feed and every hub
 * page, every load. Not "is likelier to", not "wins the opening draw" — it is
 * hoisted there by `leadWithExtreme` after whichever orderer ran, so the
 * guarantee does not depend on a pool, a weight or a coin coming up right.
 *
 * That is a change from what this file used to do, and the reason is worth
 * recording. The surface used to be *drawn*: heads it competed in the
 * algorithmic feed, tails it took a sponsored slot and was withheld from the
 * feed entirely. Exactly once per load, both surfaces over a campaign — tidy,
 * and wrong for what the tier is sold as. Half of all loads showed the feed
 * with no extreme placement in it at all, which is indistinguishable, from the
 * outside, from the tier being broken.
 *
 * **The rail is now additive rather than alternative.**
 *
 * The coin survives, with one side of its job removed: it no longer decides
 * whether the feed keeps the listing (the feed always does), only whether the
 * sponsored rail *also* carries it this load. So a reader meets the listing at
 * the top of the feed every time and a second time in the rail on about half
 * of loads, which is what "dual-surface placement" says on the package.
 *
 * Showing one listing twice in a scroll is a real cost and the dedupe between
 * the two surfaces still exists for every other tier. This tier is the
 * deliberate exception; `railCarries` is the only hole in it.
 *
 * The draw stays seeded on `(feed session, listing)` rather than random
 * because the rail and the feed are different components that never talk. It
 * also survives re-renders and back-navigation, so the rail does not gain and
 * lose the listing while the reader is looking at it.
 *
 * **The caps.**
 *
 * The tier pulls hard toward the top of every list it is on. With several
 * campaigns live at once that is enough to fill the first screen with paid
 * placement, which costs the reader far more than it gains the promoter. The
 * caps are a backstop on that: a ceiling on how many of the first ten slots
 * paid content may hold, applied after ordering. They are deliberately not part
 * of the ordering itself — expressed as odds they would only hold on average,
 * and it is the bad draws that need catching.
 */

/** How deep "the top" goes, for every cap below. */
export const TOP_SLOTS = 10

/**
 * Extreme promotions allowed in the top `TOP_SLOTS` of the recommendation feed.
 *
 * Five of ten is already heavy, and it is a ceiling rather than a target: with
 * the usual one or two live campaigns nothing here ever fires.
 */
export const MAX_EXTREME_IN_FEED_TOP = 5

/**
 * Extreme promotions allowed in the top `TOP_SLOTS` of the sponsored rail.
 *
 * Higher than the feed's, because the rail is understood to be paid placement
 * — a reader looking at it has not been promised organic results. The cap is
 * there so the rail still rotates through ordinary promotions rather than
 * being taken over by whichever tier shouts loudest.
 */
export const MAX_EXTREME_IN_SPONSORED_TOP = 7

/**
 * Paid placements of *any* tier allowed in the top `TOP_SLOTS` of the
 * recommendation feed.
 *
 * Without this the two budgets simply add: extreme fills its five, and ordinary
 * promotions keep drawing their reserved share on top, so the first ten slots
 * could run seven or eight paid. Six leaves at least four of the opening ten
 * organic, which is the floor that keeps the feed worth opening.
 *
 * Extreme fills this budget first, by virtue of being ordered higher; ordinary
 * promotions take whatever is left.
 */
export const MAX_PROMOTED_IN_FEED_TOP = 6

export type PromotionRoute = "feed" | "sponsored"

/**
 * FNV-1a, 32-bit. The twin of `deriveSeed` in `lib/public-hub-order` — kept
 * local rather than imported so this module does not depend on the hub
 * orderer, which is a consumer of it.
 */
function hashInto(base: number, text: string): number {
  let hash = (base >>> 0) ^ 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** One mulberry32 step — enough for a coin flip. */
function firstDraw(seed: number): number {
  let a = (seed + 0x6d2b79f5) >>> 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * The extra surface this extreme promotion takes for this feed session, on top
 * of the feed slot it always holds.
 *
 * `sessionSeed` is `getFeedSessionSeed()` — new on refresh, constant while
 * scrolling. Null during SSR, where it folds to a fixed seed so the server and
 * the first client render agree rather than flipping under hydration.
 */
export function extremeRoute(contentId: string, sessionSeed: number | null): PromotionRoute {
  const seed = hashInto(sessionSeed ?? 0, contentId)
  return firstDraw(seed) < 0.5 ? "feed" : "sponsored"
}

/**
 * True when the sponsored rail should carry this listing *as well as* the feed.
 *
 * The rail's ordinary dedupe drops anything already on screen. For an extreme
 * campaign whose coin came up "sponsored" this session, this is the exemption
 * from that rule: the listing leads the feed and takes a rail slot too. Every
 * other tier, and an extreme campaign on a "feed" session, is deduped as
 * before.
 *
 * Returns false for anything that is not extreme, and for an item with no
 * usable id — there is nothing to seed the draw with, and silently duplicating
 * on a missing field is the wrong way to fail.
 */
export function railCarries(
  item: unknown,
  sessionSeed: number | null,
  isExtreme: (item: unknown) => boolean,
): boolean {
  if (!isExtreme(item)) return false
  const id = (item as { _id?: unknown })?._id
  if (typeof id !== "string" || id.length === 0) return false
  return extremeRoute(id, sessionSeed) === "sponsored"
}

/**
 * Put a live extreme promotion at the very front of an ordered list.
 *
 * This is the whole of the "extreme is always first" guarantee, and it is one
 * function applied at the end of every surface rather than a rule inside each
 * orderer, for a reason the feed learned the hard way. The orderers *did* each
 * carry their own version of it — `applyVarietyOrder` and `scatterRank` both
 * hand slot 0 to an extreme item when one is in the promoted pool. But three
 * of the four surfaces never reach that code: the signed-in feed re-ranks with
 * `preserveOrder` and keeps the server's sequence, the hub pages order by
 * deadline lottery, and the per-type tabs do not order at all. A guarantee
 * that holds in one orderer out of three is not a guarantee.
 *
 * So it is stated once, last, over whatever order came out. Idempotent, so
 * applying it after an orderer that already led with the same item changes
 * nothing.
 *
 * **Only one item moves.** Hoisting every extreme campaign would fill the
 * opening screen with paid cards the moment two ran at once; the promise is
 * about the first card, and the rest keep the placement their score and the
 * promoted pool already earned them.
 *
 * **Which one leads rotates with the session.** With several campaigns live,
 * picking the first in array order would hand one of them every opening slot
 * for the length of its run and leave the others with none. The seed is the
 * feed session's, so the lead is stable while the reader scrolls and different
 * on the next load.
 *
 * Everything else keeps its relative order, and nothing is dropped or
 * duplicated — this is a rotation of one element to the front.
 */
export function leadWithExtreme<T>(
  ordered: T[],
  options: {
    isExtreme: (item: NoInfer<T>) => boolean
    /** `getFeedSessionSeed()`, or null during SSR. */
    sessionSeed: number | null
  },
): T[] {
  const { isExtreme, sessionSeed } = options
  if (ordered.length <= 1) return ordered

  const extremeIndices: number[] = []
  for (let i = 0; i < ordered.length; i += 1) {
    if (isExtreme(ordered[i])) extremeIndices.push(i)
  }

  if (extremeIndices.length === 0) return ordered
  // Already leading, whether by one campaign or by the orderer having done it.
  if (extremeIndices[0] === 0) return ordered

  // Rotate on the session seed rather than on anything about the listings, so
  // the choice does not follow whichever campaign happens to sort first.
  // `min` guards the draw returning exactly 1, which would index past the end.
  const draw = Math.floor(firstDraw(sessionSeed ?? 0) * extremeIndices.length)
  const pick = extremeIndices[Math.min(draw, extremeIndices.length - 1)]

  return [ordered[pick], ...ordered.slice(0, pick), ...ordered.slice(pick + 1)]
}

export interface PromotedCapOptions<T> {
  /**
   * True for any paid placement.
   *
   * `NoInfer` so the element type is taken from the list being capped and
   * nothing else. The predicates callers pass are the shared
   * `(item: unknown) => boolean` helpers from `lib/promotion-boost`, and
   * without this they win the inference — every call collapses to
   * `enforcePromotedCaps<unknown>` and hands back an `unknown[]` that no caller
   * can use.
   */
  isPromoted: (item: NoInfer<T>) => boolean
  /** True for extreme-tier placements specifically. */
  isExtreme: (item: NoInfer<T>) => boolean
  /** Extreme placements allowed in the window. */
  maxExtreme: number
  /**
   * Paid placements of any tier allowed in the window. Omit on a surface where
   * everything is paid anyway, such as the sponsored rail.
   */
  maxPromoted?: number
  /** How many leading slots the caps apply to. Defaults to `TOP_SLOTS`. */
  window?: number
}

/**
 * Push paid placements past the top of a list once the caps are met.
 *
 * Every item comes out exactly once and the relative order of everything that
 * was not moved is untouched — this reorders, it never drops. Items that break
 * a cap are collected in the order they were drawn and re-inserted immediately
 * after the window, so a promoter who loses a top slot keeps the next best one
 * rather than being thrown to the end of the feed.
 *
 * When there is not enough organic content to fill the window, the deferred
 * items land inside it anyway. That is intended: the caps say how the top of a
 * list should be *shared*, and a list with nothing to share it with has no
 * better answer than showing what it has.
 */
export function enforcePromotedCaps<T>(ordered: T[], options: PromotedCapOptions<T>): T[] {
  const { isPromoted, isExtreme, maxExtreme, maxPromoted, window = TOP_SLOTS } = options
  if (ordered.length <= 1 || window <= 0) return ordered

  const head: T[] = []
  const deferred: T[] = []
  const tail: T[] = []

  let extremeSeen = 0
  let promotedSeen = 0

  for (const item of ordered) {
    // Past the window the caps no longer apply, so everything else is taken as
    // it came.
    if (head.length >= window) {
      tail.push(item)
      continue
    }

    const extreme = isExtreme(item)
    const promoted = isPromoted(item)

    const breaksCap =
      (extreme && extremeSeen >= maxExtreme) ||
      (promoted && maxPromoted !== undefined && promotedSeen >= maxPromoted)

    if (breaksCap) {
      deferred.push(item)
      continue
    }

    if (extreme) extremeSeen += 1
    if (promoted) promotedSeen += 1
    head.push(item)
  }

  if (deferred.length === 0) return ordered
  return [...head, ...deferred, ...tail]
}
