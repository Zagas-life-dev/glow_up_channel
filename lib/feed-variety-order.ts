"use client"

/**
 * Recommendation variety: true random item selection within weighted categories.
 * Buckets: 100-91, 90-81, 80-71, 70-61, 60-51, 50-41, 40-31, 30-21, 20-11, 10-0.
 * Selection picks a category by weight, flattens available items in that category,
 * and randomly plucks ONE item. Repeats until all items are ordered.
 * Synchronous and O(N) optimized for <2000ms response.
 */

export type VarietyFeedItem = { _id: string; score?: number; createdAt?: string; [key: string]: unknown }

const CATEGORIES = {
  highest: [1, 2, 3],       // 90-61 (using 0-indexed where 0=100-91, 1=90-81...)
  secondHighest: [0, 4],    // 100-91, 60-51
  mid: [5, 6, 7],           // 50-21
  low: [8, 9]               // 20-0
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

/**
 * Apply variety ordering: item-by-item weighted random pick from categories.
 */
export function applyVarietyOrder<T extends VarietyFeedItem>(items: T[]): T[] {
  if (items.length <= 1) return items

  // 1. Group into Buckets (0-9)
  const buckets: T[][] = Array.from({ length: 10 }, () => [])
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const idx = getBucketIndex(item.score)
    buckets[idx].push(item)
  }

  // To keep it fast (O(N) instead of O(N^2) from flatMap+filter on every iteration),
  // we'll manage an array of available items per category.
  const catPools = {
    highest: CATEGORIES.highest.flatMap(idx => buckets[idx]),
    secondHighest: CATEGORIES.secondHighest.flatMap(idx => buckets[idx]),
    mid: CATEGORIES.mid.flatMap(idx => buckets[idx]),
    low: CATEGORIES.low.flatMap(idx => buckets[idx]),
  }

  const finalOrder: T[] = []
  const totalItems = items.length

  // Fast random pluck from an array (O(1) removal by swapping with last element)
  const pluckRandom = (pool: T[]): T | null => {
    if (pool.length === 0) return null
    const randIdx = Math.floor(Math.random() * pool.length)
    const item = pool[randIdx]
    // Swap with last element and pop to avoid O(N) array shift
    pool[randIdx] = pool[pool.length - 1]
    pool.pop()
    return item
  }

  // 2. The Picking Loop
  while (finalOrder.length < totalItems) {
    const rand = Math.random()
    
    // Check which pools have items left
    const hasHigh = catPools.highest.length > 0
    const hasSecond = catPools.secondHighest.length > 0
    const hasMid = catPools.mid.length > 0
    const hasLow = catPools.low.length > 0

    let chosenItem: T | null = null

    // Determine target pool by weight
    if (hasHigh && rand < 0.75) {
      chosenItem = pluckRandom(catPools.highest)
    } else if (hasSecond && rand < 0.95) {
      chosenItem = pluckRandom(catPools.secondHighest)
    } else if (hasMid && rand < 0.99) { // Give mid a small chance even if high/second exist
      chosenItem = pluckRandom(catPools.mid)
    } else if (hasLow) {
      chosenItem = pluckRandom(catPools.low)
    }

    // Fallbacks if the chosen pool was empty or random fell through gaps
    if (!chosenItem) {
      if (hasHigh) chosenItem = pluckRandom(catPools.highest)
      else if (hasSecond) chosenItem = pluckRandom(catPools.secondHighest)
      else if (hasMid) chosenItem = pluckRandom(catPools.mid)
      else if (hasLow) chosenItem = pluckRandom(catPools.low)
    }

    if (chosenItem) {
      finalOrder.push(chosenItem)
    } else {
      // Safety break if all pools are empty but finalOrder < totalItems
      break
    }
  }

  return finalOrder
}
