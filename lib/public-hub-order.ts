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
 */

export type HubOrderItem = { _id: string; [key: string]: unknown }

const DAY_MS = 24 * 60 * 60 * 1000

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
 * How fast the pull toward "now" decays. At one half-life out, a listing is
 * half as likely to be plucked as one closing today, before the bias exponent
 * below sharpens it.
 *
 * Shorter than the For You feed's seven days: a hub page is where someone goes
 * specifically to find what is closing, so it should lean harder on the next
 * fortnight.
 */
const HALF_LIFE_DAYS = 5

/**
 * Sharpens the curve. 1 would be a plain half-life decay; above that makes the
 * page markedly more deadline-driven. At 1.5, something closing today is ~8x
 * likelier to lead than something due in two weeks.
 *
 * This is the knob to turn if the page feels too panicky or too flat.
 */
const TIME_BIAS = 1.5

/**
 * Weight for a listing with no date at all — most resources, evergreen guides.
 *
 * Roughly what something ten days out scores, so undated content neither owns
 * the page nor gets buried under anything that merely happens to carry a date.
 * On /resources, where nearly everything is undated, this puts every item on
 * the same weight and the lottery degrades to a plain shuffle, which is the
 * right behaviour there.
 */
const UNDATED_WEIGHT = 0.15

/**
 * Floor for a live listing, whatever its deadline. Reached at ~33 days out, so
 * the curve still discriminates across the window someone could plausibly act
 * in and flattens only past it. Everything beyond a month is therefore drawn
 * with equal likelihood, which is the intent — at that range the exact date is
 * not what should decide who gets seen.
 */
const MIN_WEIGHT = 0.001

/**
 * Weight for something already closed. An order of magnitude under the live
 * floor: still reachable rather than unpickable, but never ahead of something
 * that can still be acted on.
 *
 * Most of these never reach the page — the list APIs filter past deadlines out
 * — but search deliberately includes them, and a session-cached page can carry
 * one across midnight.
 */
const EXPIRED_WEIGHT = 0.0001

/**
 * Pluck likelihood from time remaining. Monotonic: sooner is always better.
 *
 * Deliberately unlike `urgencySignal` in `lib/ranking/signals`, which dips
 * under three days out on the grounds that there may not be time left to apply.
 * That caution belongs in personalized scoring, where a bad recommendation
 * wastes a slot someone was owed. Here the instruction is simply "closer means
 * higher" — a visitor browsing a public list is the one deciding whether they
 * can still make it.
 */
export function deadlineWeight(item: HubOrderItem, now: number): number {
  const target = actingDateOf(item)
  if (target === null) return UNDATED_WEIGHT

  const days = (target - now) / DAY_MS
  if (days <= 0) return EXPIRED_WEIGHT

  const decay = 2 ** (-days / HALF_LIFE_DAYS)
  return Math.max(MIN_WEIGHT, decay ** TIME_BIAS)
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

/**
 * Draw an order for one page of a public hub list.
 *
 * Every item comes out exactly once; only the order changes.
 */
export function orderByDeadlineLottery<T extends HubOrderItem>(
  items: T[],
  { seed, now = Date.now() }: HubOrderOptions,
): T[] {
  if (items.length <= 1) return items

  const weights = items.map((item) => deadlineWeight(item, now))
  const pool: Pool<T> = {
    items: items.slice(),
    weights,
    total: weights.reduce((sum, weight) => sum + weight, 0),
  }

  const random = mulberry32(seed)
  const ordered: T[] = []
  while (pool.items.length > 0) {
    const next = pluck(pool, random)
    if (!next) break
    ordered.push(next)
  }

  return ordered
}
