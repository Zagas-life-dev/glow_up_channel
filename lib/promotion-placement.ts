"use client"

/**
 * Where an extreme promotion appears, and how much of the top of a list paid
 * placement is allowed to hold.
 *
 * **The two-sided boost.**
 *
 * An ordinary promotion lives on one surface. It is boosted inside the
 * recommendation feed by the orderers' promoted pool, *or* it is shown in the
 * sponsored rail — never both, because both feeds dedupe against each other.
 * That dedupe exists for a good reason: the same listing drawn twice in one
 * scroll, labelled "Sponsored" both times, is worse for the reader than either
 * placement alone and wastes an impression.
 *
 * The extreme tier is sold on reaching the reader through both. Rather than
 * removing the dedupe — which would put the listing on screen twice — the
 * surface is drawn per load: heads it competes in the algorithmic feed, tails
 * it takes a sponsored slot. Still exactly once per load, but a reader who
 * refreshes meets it in the feed one time and in the rail the next, and over a
 * 21-day campaign the listing is present on both surfaces.
 *
 * The draw is seeded on `(feed session, listing)` rather than random, and that
 * is load-bearing rather than tidy. The two consumers of this decision are
 * different components — the feed and the rail — and they run it
 * independently. If they disagreed, a listing would either be dropped from both
 * (invisible, though paid for) or kept by both (the duplicate the dedupe
 * exists to prevent). Deriving the answer from inputs both of them already
 * hold is what makes them agree without having to talk to each other. It also
 * survives re-renders and back-navigation, so the listing does not hop between
 * surfaces while the reader is looking at it.
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
 * Which surface this extreme promotion takes for this feed session.
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
 * True when an extreme promotion should be withheld from the surface asking.
 *
 * The two call sites are mirror images, which is the whole point: the feed asks
 * about "feed" and the rail asks about "sponsored", both get their answer from
 * the same draw, and exactly one of them keeps the listing.
 */
export function withheldFrom(
  item: unknown,
  surface: PromotionRoute,
  sessionSeed: number | null,
  isExtreme: (item: unknown) => boolean,
): boolean {
  if (!isExtreme(item)) return false
  const id = (item as { _id?: unknown })?._id
  if (typeof id !== "string" || id.length === 0) return false
  return extremeRoute(id, sessionSeed) !== surface
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
