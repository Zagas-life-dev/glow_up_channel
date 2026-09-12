"use client"

/**
 * Ordering for the public hub pages (/opportunities, /jobs, /events,
 * /resources).
 *
 * These pages rank for nobody, so there is no personalization score to sort on
 * — every listing is equally "relevant". The only universally true signal left
 * is time: a listing closing on Friday matters more today than one closing in
 * four months. That is the whole algorithm here.
 *
 * Two things it has to do at once, which is why it is a weighted lottery rather
 * than a sort:
 *
 *   1. **Deadline first.** Whatever is closing soonest should be near the top,
 *      reliably enough that the page is useful for finding what is about to
 *      close.
 *   2. **A different order every refresh.** A plain sort by deadline is
 *      identical on every visit, so the same twenty listings own the top of the
 *      page until they expire, and nothing below them is ever seen. Drawing the
 *      order instead gives every listing its turn, weighted by urgency.
 *
 * A lottery gives both: pluck probability decays with time remaining, so the
 * soonest usually leads, but never always, and never in the same order twice.
 *
 * This is deliberately NOT `applyVarietyOrder` from `feed-variety-order`. That
 * one leads with score buckets, and public listings carry no score — every item
 * would land in the bottom bucket, so the bucket machinery would be an
 * expensive no-op wrapped around the one part that does the work. This is that
 * part, standalone, with knobs tuned for a single-type list.
 *
 * Note what it does *not* do: reorder across pages. The list APIs already
 * return these deadline-ascending with a cursor tied to that order, so page one
 * genuinely is the soonest twenty. The lottery redraws within the page it was
 * handed, which is why the global "soonest first" progression survives while
 * the page still looks different on every visit.
 *
 * **Paid placement.** The lottery above is the whole algorithm for organic
 * listings; promoted ones get a second pool on top of it, the same shape the
 * other two orderers use (`feed-variety-order` here, `scatterRankingService` on
 * the server). Until that existed these four pages were the one browsing
 * surface where buying a promotion changed nothing about the list: the hub
 * showed promoted cards only in the separate sponsored rail, and inside the
 * listing itself a promoted item was drawn on deadline alone like everything
 * else. Since `/resources` is mostly undated, and undated items all share one
 * weight, a promoted resource was in practice indistinguishable from a plain
 * shuffle.
 *
 * The pool does two things a plain weight bump could not:
 *
 *   - **A floor on frequency.** `PROMOTED_SHARE` of slots go to the promoted
 *     pool when it has stock, so paid listings appear at a predictable rate
 *     rather than at whatever rate their deadlines happen to earn.
 *   - **A pull toward the top.** A share says how *often* a promotion appears,
 *     not *where*. `promotedLeadBias` adds a decaying preference over the first
 *     `PROMOTED_LEAD_SLOTS`, so the page leads with paid placement and settles
 *     into the organic mix as the reader scrolls.
 *
 * All of it runs off the seeded PRNG, which is what makes the bias survive
 * caching: `fetch-public-hub-page` stores the *ordered* page in sessionStorage
 * and rebuilds it on back-navigation, and React re-runs effects in development.
 * Same seed in, same biased order out, every time — so a promoted listing that
 * won a top slot keeps it for the session instead of being reshuffled down by
 * the next rebuild.
 */

import { isPromoted, promotionWeight } from "@/lib/promotion-boost"
import { HUB_TIME_PRESSURE, timePressureFrom } from "@/lib/feed-time-pressure"

export type HubOrderItem = { _id: string; [key: string]: unknown }

function toTime(value: unknown): number | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * The moment this listing stops being actionable.
 *
 * Deliberately resolved here rather than through `actionableDateOf` in
 * `lib/ranking/signals`, which puts `dates.endDate` ahead of `dates.startDate`.
 * That precedence is wrong for a browse page and measurably mis-sorts events:
 * a four-day convention starting tomorrow with no registration deadline
 * resolves to its *end* date and is weighted as five days out, so it sorts
 * below a conference that starts later but finishes sooner. Someone scanning
 * this page for what to attend needs the one starting tomorrow at the top.
 *
 * The precedence that follows is what a reader actually races:
 *
 *   1. an explicit deadline — the date applications or registrations shut;
 *   2. failing that, the start date — after it begins, turning up is moot;
 *   3. failing that, the end date — all that is left to go on;
 *   4. nothing datable, which is most resources.
 *
 * The shared helper is left alone on purpose: `feed-variety-order` ranks the
 * signed-in feed through it, and changing it here would quietly re-order that
 * feed too.
 */
export function actingDateOf(item: HubOrderItem): number | null {
  const dates =
    item.dates && typeof item.dates === "object"
      ? (item.dates as Record<string, unknown>)
      : {}

  return (
    toTime(dates.deadline ?? dates.applicationDeadline ?? dates.registrationDeadline) ??
    toTime(item.deadline ?? item.applicationDeadline ?? item.registrationDeadline) ??
    toTime(dates.startDate ?? dates.start) ??
    toTime(item.startDate ?? item.date) ??
    toTime(dates.endDate) ??
    toTime(item.endDate)
  )
}

/**
 * Pluck likelihood from time remaining. Monotonic: sooner is always better.
 *
 * The curve, its constants and the reasoning behind them live in
 * `lib/feed-time-pressure`, shared with the For You feed so the surfaces cannot
 * drift apart again — they had, into three different curves, which is how the
 * same defect survived in all of them: a dated listing could be floored *below*
 * an undated one, so anything scheduled more than a month out was effectively
 * unreachable. The shared module pins that floor to the undated weight.
 *
 * Deliberately unlike `urgencySignal` in `lib/ranking/signals`, which dips under
 * three days out on the grounds that there may not be time left to apply. That
 * caution belongs in personalized scoring, where a bad recommendation wastes a
 * slot someone was owed. Here the instruction is simply "closer means higher" —
 * a visitor browsing a public list is the one deciding whether they can make it.
 */
export function deadlineWeight(item: HubOrderItem, now: number): number {
  return timePressureFrom(actingDateOf(item), now, HUB_TIME_PRESSURE)
}

/**
 * Share of slots reserved for the promoted pool while it has stock.
 *
 * Kept in step with `PROMOTED_SHARE` in `feed-variety-order` and the backend's
 * `scatterRankingService`, so a promoted listing is delivered at roughly one
 * slot in five wherever the reader meets it. Consistency across the three
 * surfaces is the point: a promoter buys a rate, not a page.
 */
const PROMOTED_SHARE = 0.2

/**
 * Minimum organic listings between two promoted ones.
 *
 * The share is an average, and averages clump — three promoted rows together
 * read as an ad break even when the overall rate is modest. Matches
 * `PROMOTED_MIN_GAP` in the other two orderers.
 */
const PROMOTED_MIN_GAP = 3

/**
 * Odds that the very first row of the page goes to a promotion.
 *
 * `PROMOTED_SHARE` alone cannot put paid placement at the top: it governs how
 * often, not how early, so with a 0.2 share the first promoted row lands around
 * slot five on average and plenty of readers would scroll past the fold without
 * seeing one. "Nine times in ten the page opens with a promotion" is a
 * statement about position, and it needs its own number.
 *
 * Kept in step with `PROMOTED_LEAD_BIAS` in the other two orderers.
 */
const PROMOTED_LEAD_BIAS = 0.9

/**
 * Where the lead preference has fully decayed.
 *
 * Falls linearly from `PROMOTED_LEAD_BIAS` at slot 0 to nothing here, after
 * which `PROMOTED_SHARE` governs alone. With `PROMOTED_MIN_GAP` holding
 * promotions three apart, the practical ceiling over the first twelve slots is
 * three or four promoted rows — clustered near the top, thinning out as the
 * reader scrolls.
 *
 * Kept in step with `PROMOTED_LEAD_SLOTS` in the other two orderers.
 */
const PROMOTED_LEAD_SLOTS = 12

/**
 * How much a promoted listing's own deadline is allowed to move it within the
 * promoted pool.
 *
 * `deadlineWeight` spans four orders of magnitude, which is right for organic
 * content and far too harsh for a slot someone paid for: an undated promoted
 * resource would sit 1500x below a listing closing tonight and never be drawn.
 * Compressed into [0.4, 1] the ordering still favours urgency without burying
 * anything. Matches `PROMOTED_DEADLINE_FLOOR` in `feed-variety-order` and
 * `DEADLINE_FLOOR` in the backend's promotionRankingService.
 */
const PROMOTED_DEADLINE_FLOOR = 0.4

/**
 * The lead preference at a given slot: `PROMOTED_LEAD_BIAS` at the top of the
 * page, decaying linearly to nothing at `PROMOTED_LEAD_SLOTS`.
 */
export function promotedLeadBias(position: number): number {
  if (!(position >= 0) || position >= PROMOTED_LEAD_SLOTS) return 0
  return PROMOTED_LEAD_BIAS * (1 - position / PROMOTED_LEAD_SLOTS)
}

/**
 * Mulberry32 — small, fast, and more than good enough for shuffling twenty
 * rows.
 *
 * Seeded rather than `Math.random()` so a page draws the same order every time
 * it is built from the same seed. That matters because one page gets ordered
 * more than once for the same visitor: React re-runs effects in development, a
 * failed request is retried, and a session-cached page is rebuilt on
 * back-navigation. An unseeded draw would reshuffle under the reader each time.
 * The seed changes on refresh, which is where a new order is wanted.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Fold arbitrary strings into the session seed so each (hub, page) draws its
 * own order, rather than every page of every hub replaying one sequence.
 * FNV-1a, 32-bit.
 */
export function deriveSeed(base: number, ...parts: string[]): number {
  let hash = (base >>> 0) ^ 0x811c9dc5
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      hash ^= part.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
  }
  return hash >>> 0
}

/** Candidates with their pluck weights and a running total. */
type Pool<T> = { items: T[]; weights: number[]; total: number }

/**
 * Weighted random removal.
 *
 * Swap-with-last-and-pop keeps removal O(1); only finding the target index is a
 * scan, and the running total is adjusted rather than recomputed. Over a page
 * of twenty that hardly matters, but the same routine runs over a 100-item
 * search result set.
 */
function pluck<T>(pool: Pool<T>, random: () => number): T | null {
  const count = pool.items.length
  if (count === 0) return null

  // Default to the last index so floating-point drift in `total` can never fall
  // through the loop without selecting anything.
  let index = count - 1
  let target = random() * pool.total
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

  // Re-anchor once the pool empties so drift cannot accumulate.
  if (pool.items.length === 0) pool.total = 0

  return item
}

export interface HubOrderOptions {
  /** Seed for this draw. Same seed in, same order out. */
  seed: number
  /** Reference time for the deadline weighting. Injectable for tests. */
  now?: number
}

/** Build a pool from items and a weight function. */
function buildPool<T>(items: T[], weightOf: (item: T) => number): Pool<T> {
  const weights = items.map(weightOf)
  return {
    items: items.slice(),
    weights,
    total: weights.reduce((sum, weight) => sum + weight, 0),
  }
}

/**
 * Draw an order for one page of a public hub list.
 *
 * Every item comes out exactly once; only the order changes.
 *
 * Promoted listings are drawn from their own pool, so they get a floor on how
 * often they appear and a pull toward the top of the page. The two pools are
 * disjoint — a promoted item is only ever in the promoted pool — which is what
 * guarantees the "exactly once" property without a seen-set.
 */
export function orderByDeadlineLottery<T extends HubOrderItem>(
  items: T[],
  { seed, now = Date.now() }: HubOrderOptions,
): T[] {
  if (items.length <= 1) return items

  const random = mulberry32(seed)

  const organicPool = buildPool(
    items.filter((item) => !isPromoted(item)),
    (item) => deadlineWeight(item, now),
  )

  // Within the promoted pool, what the promoter bought (campaign tier, opening
  // burst, closing ramp, delivery pacing — all folded into `promotionWeight` by
  // the server) times a compressed version of the listing's own urgency.
  const promotedPool = buildPool(
    items.filter(isPromoted),
    (item) =>
      promotionWeight(item) *
      (PROMOTED_DEADLINE_FLOOR +
        (1 - PROMOTED_DEADLINE_FLOOR) * Math.sqrt(deadlineWeight(item, now))),
  )

  const ordered: T[] = []
  // Starts satisfied so the very first row may be promoted.
  let sinceLastPromoted = PROMOTED_MIN_GAP

  while (organicPool.items.length > 0 || promotedPool.items.length > 0) {
    const organicLeft = organicPool.items.length > 0
    const promotedLeft = promotedPool.items.length > 0

    // Once one side is empty the other simply drains. Draining the promoted
    // remainder ignores the spacing gap on purpose: the alternative is dropping
    // paid listings off the page entirely, and the gap is a presentation
    // preference, not a promise.
    let takePromoted: boolean
    if (!organicLeft) takePromoted = true
    else if (!promotedLeft) takePromoted = false
    else if (sinceLastPromoted < PROMOTED_MIN_GAP) takePromoted = false
    else {
      // Near the top of the page the lead bias governs; below
      // PROMOTED_LEAD_SLOTS it has decayed to zero and the reserved share
      // governs alone. Taking the max rather than adding them keeps the floor
      // at exactly PROMOTED_SHARE once the lead-in is over.
      const odds = Math.max(promotedLeadBias(ordered.length), PROMOTED_SHARE)
      takePromoted = random() < odds
    }

    const next = takePromoted ? pluck(promotedPool, random) : pluck(organicPool, random)
    if (!next) break

    ordered.push(next)
    sinceLastPromoted = takePromoted ? 0 : sinceLastPromoted + 1
  }

  return ordered
}
