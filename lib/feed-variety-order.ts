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
 * Synchronous and fast enough for a feed page: category choice is O(1), the
 * weighted pluck is O(pool) with an incrementally maintained total.
 */

import { actionableDateOf } from "@/lib/ranking/signals"

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

  const finalOrder: T[] = []
  const totalItems = items.length

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
    let available = 0
    for (const name of CATEGORY_ORDER) {
      if (catPools[name].items.length > 0) available += CATEGORY_ODDS[name]
    }
    if (available <= 0) break // every pool drained

    let target = Math.random() * available
    let chosenItem: T | null = null

    for (const name of CATEGORY_ORDER) {
      const pool = catPools[name]
      if (pool.items.length === 0) continue
      target -= CATEGORY_ODDS[name]
      if (target <= 0) {
        chosenItem = pluckWeighted(pool)
        break
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
    finalOrder.push(chosenItem)
  }

  return finalOrder
}
