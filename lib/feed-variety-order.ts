"use client"

/**
 * Recommendation variety: weighted category selection, then a deadline-biased
 * pick inside the chosen category.
 *
 * Buckets: 100-91, 90-81, 80-71, 70-61, 60-51, 50-41, 40-31, 30-21, 20-11, 10-0.
 * Selection picks a category by weight, then plucks ONE item from it. Repeats
 * until all items are ordered.
 *
 * Two independent dials, and keeping them independent is the whole design:
 *
 *   1. **Which category** — fixed odds (75/20/4/1). Untouched by time. This is
 *      what guarantees the low-scoring categories keep their slice: a listing
 *      closing tonight cannot buy its way out of the 1% bucket just by being
 *      urgent. Score decides which bucket you are in; nothing else.
 *   2. **Which item within it** — was uniform random, now weighted hard toward
 *      the nearest deadline. This is where time bias lives, and it cannot leak
 *      into (1) because the category is already chosen by the time it runs.
 *
 * So the feed leads with whatever is closing soonest *among the items that were
 * going to be shown anyway*, and the mix of strong and weak matches is
 * unchanged.
 *
 * **Promoted content gets a third dial: its own pool.**
 *
 * Score alone could not carry paid placement, and the reason is right there in
 * the odds above. `secondHighest` holds bucket 0 — the 100-91 band — at 0.20,
 * against 0.75 for the 90-61 band beneath it. A boost strong enough to reach
 * the top band therefore moved an item to *worse* odds than it started with:
 * promoting a listing could bury it.
 *
 * So paid placement is not expressed as score here at all. Promoted items sit
 * in their score category like everything else AND in a `promoted` pool holding
 * a reserved share of the picks, first emission winning and later duplicates
 * skipped. That puts a floor under how often promotions are seen without
 * letting them displace the organic mix above that floor.
 *
 * Synchronous and fast enough for a feed page: category choice is O(1), the
 * weighted pluck is O(pool) with an incrementally maintained total.
 */

import { actionableDateOf } from "@/lib/ranking/signals"
import { isPromoted, promotionWeight } from "@/lib/promotion-boost"

export type VarietyFeedItem = { _id: string; score?: number; createdAt?: string; [key: string]: unknown }

const CATEGORIES = {
  highest: [1, 2, 3],       // 90-61 (using 0-indexed where 0=100-91, 1=90-81...)
  secondHighest: [0, 4],    // 100-91, 60-51
  mid: [5, 6, 7],           // 50-21
  low: [8, 9]               // 20-0
}

type CategoryName = keyof typeof CATEGORIES

/** Share of picks each category should win when all four have stock. */
const CATEGORY_ODDS: Record<CategoryName, number> = {
  highest: 0.75,
  secondHighest: 0.20,
  mid: 0.04,
  low: 0.01,
}

const CATEGORY_ORDER: CategoryName[] = ["highest", "secondHighest", "mid", "low"]

/**
 * Share of picks reserved for paid placements.
 *
 * Renormalised against whichever categories still have stock, so with
 * promotions in play roughly one item in five is promoted — and with none, the
 * category odds are exactly what they were before.
 *
 * Kept in step with `PROMOTED_SHARE` in the backend's scatterRankingService, so
 * a feed ordered on the server and one ordered here feel the same.
 */
const PROMOTED_SHARE = 0.2

/**
 * Minimum organic items between two promoted ones.
 *
 * The share above is an average, and averages clump: three promotions in a row
 * reads as an ad break even when the overall rate is modest. The promoted pool
 * sits out the draw until the gap is met, which spreads paid placements without
 * changing how many there are.
 */
const PROMOTED_MIN_GAP = 3

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * How fast the pull toward "now" decays. At one half-life out an item is half
 * as likely to be plucked as one closing today, before the bias exponent.
 */
const HALF_LIFE_DAYS = 7

/**
 * Sharpens the curve. 1 would be a plain half-life decay; above that makes the
 * feed markedly more deadline-driven. At 1.6, something closing today is ~9x
 * likelier than something due in three weeks, and ~115x likelier than something
 * due in a month — within the same category.
 *
 * This is the knob to turn if the feed feels too panicky or too relaxed.
 */
const TIME_BIAS = 1.6

/**
 * Weight for items with no date at all — resources, evergreen guides.
 *
 * Roughly equivalent to a fortnight out: they neither dominate the feed nor
 * get buried under anything with a date on it.
 */
const UNDATED_WEIGHT = 0.12

/**
 * How much a promoted item's own deadline is allowed to move it.
 *
 * Raw deadline pressure spans orders of magnitude, which is right for organic
 * content and far too harsh for a slot someone paid for: an undated promoted
 * resource would be effectively unpickable against anything with a date on it.
 * Compressing into [this, 1] keeps urgency meaningful without erasing the
 * placement. Mirrors `DEADLINE_FLOOR` in the backend service.
 */
const PROMOTED_DEADLINE_FLOOR = 0.4

/**
 * Floor for a live listing, whatever its deadline. Reached around 48 days out,
 * which keeps the curve discriminating across the whole window a reader could
 * plausibly act in and flattens only beyond it.
 *
 * Low enough that it stays clear of `EXPIRED_WEIGHT` below — when the two were
 * one shared constant, an already-closed listing was plucked exactly as often
 * as a live one five weeks out.
 */
const MIN_WEIGHT = 0.0005

/**
 * Weight for something already closed. Deliberately an order of magnitude under
 * the live floor: still reachable rather than unpickable, but never ahead of
 * content the reader can actually still act on.
 */
const EXPIRED_WEIGHT = 0.00005

/**
 * Pluck likelihood from time remaining. Monotonic — sooner is always better.
 *
 * Deliberately different from `urgencySignal`, which dips for deadlines under
 * three days because there may not be time left to apply. That caution belongs
 * in scoring; here the instruction is simply "closer means higher".
 */
export function timePressure(item: VarietyFeedItem, now: number): number {
  const target = actionableDateOf(item as Record<string, unknown>)
  if (target === null) return UNDATED_WEIGHT

  const days = (target - now) / DAY_MS
  if (days <= 0) return EXPIRED_WEIGHT

  const decay = 2 ** (-days / HALF_LIFE_DAYS)
  return Math.max(MIN_WEIGHT, decay ** TIME_BIAS)
}

/**
 * Map score 0-100 to bucket index 0-9. Bucket 0 = 100-91, 1 = 90-81, ... 9 = 10-0.
 * Invalid/missing score -> 9 (lowest bucket).
 */
export function getBucketIndex(score: number | undefined | null): number {
  if (typeof score !== 'number' || Number.isNaN(score)) return 9
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  if (clamped === 100) return 0
  const idx = Math.floor((100 - clamped) / 10)
  return Math.min(idx, 9)
}

/** A pool of candidates with their pluck weights and a running total. */
type Pool<T> = { items: T[]; weights: number[]; total: number }

function buildPool<T extends VarietyFeedItem>(items: T[], now: number): Pool<T> {
  const weights = items.map((item) => timePressure(item, now))
  return {
    items: items.slice(),
    weights,
    total: weights.reduce((sum, weight) => sum + weight, 0),
  }
}

/**
 * Weighted random removal.
 *
 * Same swap-with-last-and-pop trick the uniform version used, so removal stays
 * O(1); only finding the target index is a scan. The running total is adjusted
 * rather than recomputed.
 */
function pluckWeighted<T>(pool: Pool<T>): T | null {
  const count = pool.items.length
  if (count === 0) return null

  // Default to the last index so floating-point drift in `total` can never
  // fall through the loop without selecting anything.
  let index = count - 1
  let target = Math.random() * pool.total
  for (let i = 0; i < count; i += 1) {
    target -= pool.weights[i]
    if (target <= 0) {
      index = i
      break
    }
  }

  const item = pool.items[index]
  pool.total -= pool.weights[index]

  const last = count - 1
  pool.items[index] = pool.items[last]
  pool.weights[index] = pool.weights[last]
  pool.items.pop()
  pool.weights.pop()

  // Re-anchor the total once the pool empties, so drift cannot accumulate.
  if (pool.items.length === 0) pool.total = 0

  return item
}

/**
 * Apply variety ordering: weighted category choice, deadline-weighted item pick.
 *
 * @param now reference time for deadline weighting. Injectable so ordering is
 *   reproducible in tests; defaults to the wall clock.
 */
export function applyVarietyOrder<T extends VarietyFeedItem>(items: T[], now: number = Date.now()): T[] {
  if (items.length <= 1) return items

  // 1. Group into Buckets (0-9)
  const buckets: T[][] = Array.from({ length: 10 }, () => [])
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const idx = getBucketIndex(item.score)
    buckets[idx].push(item)
  }

  const catPools = {
    highest: buildPool(CATEGORIES.highest.flatMap(idx => buckets[idx]), now),
    secondHighest: buildPool(CATEGORIES.secondHighest.flatMap(idx => buckets[idx]), now),
    mid: buildPool(CATEGORIES.mid.flatMap(idx => buckets[idx]), now),
    low: buildPool(CATEGORIES.low.flatMap(idx => buckets[idx]), now),
  }

  // 1b. The promoted pool. Holds the *same item objects* as the category pools,
  //     not copies — whichever pool reaches an item first emits it, and the
  //     other's copy is discarded when drawn. That is what makes the reserved
  //     share a floor rather than a quota: a promoted item that genuinely
  //     scores well can still be picked early by its category.
  //
  //     Weight is the server's campaign weight (tier, opening burst, closing
  //     ramp, delivery pacing) times the listing's own deadline pressure,
  //     softened so a paid slot for an undated resource stays reachable.
  const promotedItems = items.filter(isPromoted)
  const promotedPool: Pool<T> | null = promotedItems.length
    ? (() => {
        const weights = promotedItems.map(
          (item) => promotionWeight(item) * (PROMOTED_DEADLINE_FLOOR +
            (1 - PROMOTED_DEADLINE_FLOOR) * Math.sqrt(timePressure(item, now))),
        )
        return {
          items: promotedItems.slice(),
          weights,
          total: weights.reduce((sum, weight) => sum + weight, 0),
        }
      })()
    : null

  const finalOrder: T[] = []
  const totalItems = items.length

  // Every item sits in exactly one category pool, and promoted ones sit in the
  // promoted pool as well. `emitted` is what stops that double-placing them.
  const emitted = new Set<T>()

  // Starts satisfied so the very first slot may be promoted.
  let sinceLastPromoted = PROMOTED_MIN_GAP

  // Promoted items drawn before the spacing gap allows, waiting for a slot.
  const deferredPromoted: T[] = []

  // 2. The Picking Loop.
  //
  // Odds are renormalized over the categories that still have stock, rather
  // than tested down an if/else ladder. The ladder leaked badly: with the two
  // middle categories empty — a feed page where everything is either a strong
  // or a weak match, which is common — every `rand >= 0.75` fell through to
  // `low`, handing it 25% of the feed instead of 1%. Renormalizing keeps the
  // *ratios* intact whatever is in stock, so `low` stays ~1 pick in 76 against
  // `highest` alone.
  while (finalOrder.length < totalItems) {
    // A promoted item drawn too soon after the last one waits here rather than
    // being placed. Holding the pool back is not enough on its own: promoted
    // items sit in their score category too, so one can arrive through the
    // organic draw and land right beside a paid slot. Spacing has to be
    // enforced where items are *emitted*, not only where they are drawn.
    if (deferredPromoted.length > 0 && sinceLastPromoted >= PROMOTED_MIN_GAP) {
      finalOrder.push(deferredPromoted.shift() as T)
      sinceLastPromoted = 0
      continue
    }

    // The promoted pool joins the draw only once the spacing gap is met.
    const promotedInPlay =
      promotedPool !== null &&
      promotedPool.items.length > 0 &&
      sinceLastPromoted >= PROMOTED_MIN_GAP

    let available = promotedInPlay ? PROMOTED_SHARE : 0
    for (const name of CATEGORY_ORDER) {
      if (catPools[name].items.length > 0) available += CATEGORY_ODDS[name]
    }

    if (available <= 0) {
      // Nothing organic left, so there is nothing to space against any more:
      // release what is held and drain the promoted pool.
      if (deferredPromoted.length > 0) {
        finalOrder.push(deferredPromoted.shift() as T)
        sinceLastPromoted = 0
        continue
      }
      if (promotedPool !== null && promotedPool.items.length > 0) {
        const held = pluckWeighted(promotedPool)
        if (!held) break
        if (emitted.has(held)) continue
        emitted.add(held)
        finalOrder.push(held)
        sinceLastPromoted = 0
        continue
      }
      break // every pool drained
    }

    let target = Math.random() * available
    let chosenItem: T | null = null

    if (promotedInPlay && promotedPool) {
      target -= PROMOTED_SHARE
      if (target <= 0) chosenItem = pluckWeighted(promotedPool)
    }

    if (!chosenItem) {
      for (const name of CATEGORY_ORDER) {
        const pool = catPools[name]
        if (pool.items.length === 0) continue
        target -= CATEGORY_ODDS[name]
        if (target <= 0) {
          chosenItem = pluckWeighted(pool)
          break
        }
      }
    }

    // Floating-point drift only: `target` can survive the loop by a hair.
    // Fall back to the best-stocked category by rank.
    if (!chosenItem) {
      for (const name of CATEGORY_ORDER) {
        if (catPools[name].items.length > 0) {
          chosenItem = pluckWeighted(catPools[name])
          break
        }
      }
    }

    if (!chosenItem) break

    // Second sighting of an item already placed — or already waiting — because
    // the other pool holds it too. Drop it and draw again; both pools shrink on
    // every pluck, so this terminates.
    if (emitted.has(chosenItem)) continue

    // Claim it now, whether it is placed or held, so the duplicate check above
    // catches the other pool's copy either way.
    emitted.add(chosenItem)

    if (isPromoted(chosenItem) && sinceLastPromoted < PROMOTED_MIN_GAP) {
      deferredPromoted.push(chosenItem)
      continue
    }

    finalOrder.push(chosenItem)
    sinceLastPromoted = isPromoted(chosenItem) ? 0 : sinceLastPromoted + 1
  }

  // Anything still held when the loop ran out of slots (it cannot run out of
  // items — `emitted` and `finalOrder` disagree by exactly what is held here).
  while (deferredPromoted.length > 0) {
    finalOrder.push(deferredPromoted.shift() as T)
  }

  return finalOrder
}
