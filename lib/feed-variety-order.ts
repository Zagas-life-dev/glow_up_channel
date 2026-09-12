"use client"

/**
 * Recommendation variety: weighted category selection, then a deadline-biased
 * pick inside the chosen category.
 *
 * Buckets: 100-91, 90-81, 80-71, 70-61, 60-51, 50-41, 40-31, 30-21, 20-11, 10-0.
 * Selection picks a category by weight, then plucks ONE item from it. Repeats
 * until all items are ordered.
 *
 * Three independent dials, and keeping them independent is the whole design:
 *
 *   1. **Which content type** — drawn at the odds in `TYPE_SHARE`, bounded by
 *      `MAX_CONSECUTIVE_SAME_TYPE`. This is the outer dial, and it is what stops
 *      a type that scores structurally higher from taking the whole list. It has
 *      to be outer: picking the category first hands the band to whichever type
 *      happens to fill it, and nothing inside that band can undo it.
 *   2. **Which category within that type** — fixed odds (56/26/18). Untouched by
 *      time. This is what guarantees the low-scoring categories keep their
 *      slice: a listing closing tonight cannot buy its way out of the bottom
 *      band just by being urgent. Score decides which bucket you are in.
 *   3. **Which item within it** — weighted toward the nearest deadline. This is
 *      where time bias lives, and it cannot leak into (1) or (2) because both
 *      are already chosen by the time it runs.
 *
 * So the feed leads with whatever is closing soonest *among the items that were
 * going to be shown anyway*, and the mix of strong and weak matches is
 * unchanged.
 *
 * **Promoted content gets a third dial: its own pool.**
 *
 * Score alone could not carry paid placement. `secondHighest` used to hold
 * bucket 0 — the 100-91 band — at 0.20, against 0.75 for the 90-61 band beneath
 * it, so a boost strong enough to reach the top band moved an item to *worse*
 * odds than it started with: promoting a listing could bury it.
 *
 * Bucket 0 has since moved into `highest`, which removes that trap but does not
 * make score a lever either — the category odds are fixed, so anywhere inside
 * 100-61 a higher score buys exactly nothing.
 *
 * So paid placement is not expressed as score here at all. Promoted items sit
 * in their score category like everything else AND in a `promoted` pool holding
 * a reserved share of the picks, first emission winning and later duplicates
 * skipped. That puts a floor under how often promotions are seen without
 * letting them displace the organic mix above that floor.
 *
 * **And the opening block is stated outright rather than approximated.**
 *
 * A reserved share says how *often* a promotion appears, not *where*, and the
 * two attempts to turn it into a position were both approximations: renormalised
 * against the stocked categories the promoted pool wins slot 0 about one time in
 * five, and `promotedLeadBias` only nudged that to "near-certain". Neither could
 * state the actual rule, which is a product decision about the ten cards a
 * reader sees before deciding whether to scroll:
 *
 *   - the first `TOP_SLOTS` cards are **four paid, six organic**;
 *   - the **first card is paid** whenever any campaign is live;
 *   - an **extreme-tier promotion takes that first card outright** when one is
 *     live, rather than merely being likelier to win it;
 *   - with no campaign live at all, the block is simply organic.
 *
 * That block supersedes `PROMOTED_SHARE`, `promotedLeadBias` and
 * `PROMOTED_MIN_GAP` alike — four paid cards in ten slots leaves gaps of one and
 * two, so a spacing rule of three cannot coexist with it. Past `TOP_SLOTS` every
 * one of them resumes untouched and the body of the list is the organic mix again.
 *
 * Synchronous and fast enough for a feed page: category choice is O(1), the
 * weighted pluck is O(pool) with an incrementally maintained total.
 */

import { actionableDateOf } from "@/lib/ranking/signals"
import { isExtremePromotion, isPromoted, promotionWeight } from "@/lib/promotion-boost"
import { FEED_TIME_PRESSURE, timePressureFrom } from "@/lib/feed-time-pressure"

export type VarietyFeedItem = { _id: string; score?: number; createdAt?: string; [key: string]: unknown }

/**
 * Score buckets grouped into the categories the draw picks between.
 * Indices are 0-based over 10-point bands: 0 = 100-91, 1 = 90-81, ... 9 = 10-0.
 *
 * Bucket 0 sat in `secondHighest` until the extreme tier needed to score above
 * 90. That pairing put the very best matches on 0.20 odds alongside the 60-51
 * band, while 90-61 drew 0.75 — so crossing 90 cost an item placement, and the
 * promotion ceiling had to stop at 90 to avoid it (see `PROMOTION_SCORE_CEILING`
 * in `lib/promotion-boost`).
 *
 * Moving it into `highest` makes 100-61 one flat range. The odds themselves are
 * untouched, so the shape of the feed is unchanged for everything that was
 * already scoring under 90 — which is nearly all organic content. Mirrors the
 * `GROUPS` merge in the backend's scatterRankingService.
 */
const CATEGORIES = {
  highest: [0, 1, 2],       // 100-71
  secondHighest: [3, 4],    // 70-51
  low: [5, 6, 7, 8, 9],     // 50-0
}

type CategoryName = keyof typeof CATEGORIES

/**
 * Share of picks each category should win when all have stock.
 *
 * **These now match `GROUPS` in the backend's `scatterRankingService` exactly**,
 * which the file header has always claimed and which was not true: the bands
 * were cut at different scores (100-61 here against 100-71 there) and drawn at
 * different odds (0.75/0.20/0.04/0.01 against 0.56/0.26/0.18). The frontend
 * curve was far steeper, so the same six-point score difference that cost a
 * listing 1.4x on the server cost it 5x here — and since the two run on the same
 * rows, a type sitting just under a band edge was penalised twice.
 */
const CATEGORY_ODDS: Record<CategoryName, number> = {
  highest: 0.56,
  secondHighest: 0.26,
  low: 0.18,
}

const CATEGORY_ORDER: CategoryName[] = ["highest", "secondHighest", "low"]

/**
 * The share of the list each content type should hold.
 *
 * Kept in step with `TYPE_SHARE` in the backend's `scatterRankingService`, and
 * with the mix `publicFeedService` builds the anonymous feed at.
 *
 * **This is what stops one type taking the list, and score bands cannot do it.**
 * The bands mix by score on the assumption that the four types score comparably;
 * they did not, so whichever type owned the top band owned the feed. It matters
 * most on the anonymous feed, which arrives here carrying no scores at all —
 * every row lands in one band, the band weighting is a no-op, and before this
 * the only remaining dial was deadline pressure. The server builds that feed
 * deliberately balanced (30 opportunities / 28 events / 27 jobs / 15 resources)
 * and the reorder here drove events from 28% of it to 3% of the first ten cards.
 */
const TYPE_SHARE: Record<string, number> = {
  opportunity: 0.30,
  event: 0.28,
  job: 0.27,
  resource: 0.15,
}

/** Share for a content type not named above, so an unknown kind is not erased. */
const DEFAULT_TYPE_SHARE = 0.25

/**
 * Floor on any type's draw weight, so a type stays reachable whatever its share.
 */
const TYPE_DEFICIT_FLOOR = 0.02

/**
 * The longest run of one content type the organic draw will produce.
 *
 * Randomness alone would occasionally deal five opportunities in a row, which
 * reads as the feed being broken even when the overall mix is right. This is the
 * backstop: a run of three is a cluster, a run of six is a wall.
 *
 * Enforced only on the organic draw. A promotion is never held back by it — paid
 * placement supersedes the arrangement — though a promoted card does count
 * toward the run the reader sees, so the organic draw will not extend a run a
 * promotion already started.
 *
 * Kept in step with `MAX_CONSECUTIVE_SAME_TYPE` in the backend's
 * `scatterRankingService`.
 */
const MAX_CONSECUTIVE_SAME_TYPE = 3

/**
 * The opening block of the list, which has its own arrangement rule.
 *
 * Inside it the promoted/organic split is fixed at `TOP_PROMOTED_SLOTS` paid to
 * the rest organic — four and six — rather than left to `PROMOTED_SHARE`, and
 * the very first slot goes to paid placement. The first card counts toward the
 * four; it is not an extra on top of them. Past it the
 * ordinary machinery resumes untouched: `PROMOTED_SHARE` governs the rate and
 * `PROMOTED_MIN_GAP` the spacing.
 *
 * This is a product rule, not a tuning: the top ten is what a reader actually
 * sees before deciding whether the feed is worth scrolling, so it is the part
 * worth stating exactly. Kept in step with `TOP_SLOTS` in the backend's
 * `scatterRankingService`.
 */
export const TOP_SLOTS = 10

/**
 * How many of `TOP_SLOTS` are paid, the opening card included.
 *
 * Four of ten. Moving this is the whole knob for how commercial the opening
 * reads — the placement arithmetic below derives from it rather than assuming
 * any particular ratio, so this and `TOP_SLOTS` are the only two numbers to
 * change.
 */
export const TOP_PROMOTED_SLOTS = 4

/**
 * `PROMOTED_MIN_GAP` does not apply inside the opening block, and cannot.
 *
 * Four promotions in ten slots with the first one paid leaves one or two organic
 * cards between each pair — a minimum gap of 1. The ordinary gap of 3 would make
 * the split arithmetically impossible, so inside `TOP_SLOTS` spacing is this
 * instead, and the spacing the counter produces (P O O P O P O O P O) is what
 * enforces it.
 */
export const TOP_PROMOTED_MIN_GAP = 1

/**
 * Why the type draw is a plain weighted coin toss and not a rota.
 *
 * The first version of this tracked a running deficit per type and drew whatever
 * was most behind. The mix it produced was exact, and reading it was awful: the
 * list rotated opportunity-event-job-resource with the regularity of a conveyor
 * belt. Two independent problems with that:
 *
 *   1. **It caps what a reader can be given.** Somebody whose whole profile
 *      points at opportunities can never be shown two opportunities in a row,
 *      however well both match, because the rota will not permit it. A quota
 *      meant to stop one type crowding out the others had quietly become a
 *      ceiling on relevance.
 *   2. **It is visibly mechanical**, and a feed that looks generated reads as
 *      less considered than one that looks chosen.
 *
 * Drawing each slot at the type's target odds fixes both, and measurement says
 * it is also *more* accurate than the rota was: the deficit correction only ever
 * pulled a type up, never down, and that one-sidedness biased the result. Over
 * 500 feeds, plain odds land within 0.7 percentage points of target against the
 * rota's 1.2, while producing a run of two about 19% of the time and a run of
 * three about 7% — the clustering that reads as a recommendation rather than a
 * rotation.
 *
 * Long runs are bounded by `MAX_CONSECUTIVE_SAME_TYPE` above, which is the only
 * thing this draw needs protecting from.
 */

/**
 * The content kind of a row, as the feed labels it.
 *
 * Anything unrecognised keeps its own identity rather than being folded into a
 * real type — silently defaulting an unknown kind to "opportunity" is the same
 * mistake `resolveFeedContentKind` used to make.
 */
function typeKeyOf(item: VarietyFeedItem): string {
  const raw = (item as { contentType?: unknown }).contentType ?? item.type
  return typeof raw === "string" && raw.trim() ? raw.trim() : "unknown"
}

/**
 * Target share per type, renormalised over the types actually present, so a
 * list with no resources in it does not hold 15% of its slots empty.
 */
function typeTargets(keys: string[]): Map<string, number> {
  const targets = new Map<string, number>()
  let total = 0
  for (const key of keys) {
    const share = TYPE_SHARE[key] ?? DEFAULT_TYPE_SHARE
    targets.set(key, share)
    total += share
  }
  if (total <= 0) {
    const even = keys.length > 0 ? 1 / keys.length : 0
    for (const key of keys) targets.set(key, even)
    return targets
  }
  for (const [key, share] of targets) targets.set(key, share / total)
  return targets
}

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

/**
 * Odds that the very first slot in the feed goes to a promotion.
 *
 * `PROMOTED_SHARE` alone cannot put paid placement at the top. It is a share of
 * a renormalised draw, so with every category in stock the promoted pool
 * wins the opening slot about one time in five — meaning most readers open the
 * feed and see no promotion until they have scrolled past several items.
 *
 * A direct probability rather than another share, because "lead with a
 * promotion" is a statement about position and reads far better as one number
 * than as a weight renormalised against whatever happens to be in stock.
 *
 * Deliberately short of 1: when the only live campaign is a poor match for this
 * reader, the feed should still be allowed to open on something relevant.
 *
 * Kept in step with `PROMOTED_LEAD_BIAS` in the backend's scatterRankingService.
 */
const PROMOTED_LEAD_BIAS = 0.9

/**
 * How many slots the lead preference decays across.
 *
 * Falls linearly from `PROMOTED_LEAD_BIAS` at slot 0 to nothing here, after
 * which `PROMOTED_SHARE` governs alone and the feed is exactly as it was. With
 * `PROMOTED_MIN_GAP` holding promotions three apart, the practical effect is
 * roughly slot 0 at 0.9, slot 4 at 0.6, slot 8 at 0.3, then the steady state —
 * so promotions cluster near the top and thin out as the reader scrolls.
 *
 * Kept in step with `PROMOTED_LEAD_SLOTS` in the backend service.
 */
const PROMOTED_LEAD_SLOTS = 12

/**
 * The lead preference at a given position in the finished order, 0-1.
 *
 * Zero past the lead window, which hands the rest of the feed back to the
 * ordinary category draw untouched.
 */
export function promotedLeadBias(position: number): number {
  if (!(position >= 0) || position >= PROMOTED_LEAD_SLOTS) return 0
  return PROMOTED_LEAD_BIAS * (1 - position / PROMOTED_LEAD_SLOTS)
}

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
 * Pluck likelihood from time remaining. Monotonic — sooner is always better.
 *
 * The curve, its constants and the reasoning behind them live in
 * `lib/feed-time-pressure`, shared with the hub pages so the three surfaces
 * cannot drift apart again.
 */
export function timePressure(item: VarietyFeedItem, now: number): number {
  return timePressureFrom(
    actionableDateOf(item as Record<string, unknown>),
    now,
    FEED_TIME_PRESSURE,
  )
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

/** One content type, split into a pool per score category. */
type TypeEntry<T> = { key: string; size: number; categories: Pool<T>[] }

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

  // 1a. Pools are keyed **type first, then category**, and the draw picks a type
  //     before it picks a category. That order is the whole fix.
  //
  //     Picking the category first — the original design — hands the band to
  //     whichever type happens to fill it. When one type scores structurally
  //     higher it owns the top band outright, and no amount of balancing
  //     *within* a band can help, because there is nothing else in there to
  //     balance against. Choosing the type first guarantees the mix and leaves
  //     the category odds to do what they are actually good at: preferring the
  //     stronger matches *within* a type. A weak event can now appear above a
  //     strong opportunity, which is what showing a mix means.
  const typeEntries: TypeEntry<T>[] = []
  const byKey = new Map<string, T[][]>()
  for (let bucket = 0; bucket < 10; bucket += 1) {
    const categoryIndex = CATEGORY_ORDER.findIndex((name) =>
      CATEGORIES[name].includes(bucket),
    )
    for (const item of buckets[bucket]) {
      const key = typeKeyOf(item)
      let lanes = byKey.get(key)
      if (!lanes) {
        lanes = CATEGORY_ORDER.map(() => [])
        byKey.set(key, lanes)
      }
      lanes[categoryIndex === -1 ? CATEGORY_ORDER.length - 1 : categoryIndex].push(item)
    }
  }
  for (const [key, lanes] of byKey) {
    typeEntries.push({
      key,
      size: lanes.reduce((sum, lane) => sum + lane.length, 0),
      categories: lanes.map((lane) => buildPool(lane, now)),
    })
  }

  // Targets renormalised over the types actually present, so a list missing a
  // type does not hold slots empty for it.
  const targets = typeTargets(typeEntries.map((entry) => entry.key))

  /** The content type of the current run, and how long it has gone on. */
  let runType: string | null = null
  let runLength = 0

  /**
   * Pick which content type to draw next, at that type's target odds.
   *
   * Renormalised over the types that still have stock, so a type running out
   * hands its share to the rest instead of leaving gaps. See the note on
   * `MAX_CONSECUTIVE_SAME_TYPE` for why this is a coin toss and not a rota.
   */
  const chooseType = (): TypeEntry<T> | null => {
    let stocked = typeEntries.filter((entry) => entry.size > 0)
    if (stocked.length === 0) return null

    // Break a run that has gone on long enough — unless this type is all that is
    // left, in which case the cap is moot and holding it back would stall.
    if (runType !== null && runLength >= MAX_CONSECUTIVE_SAME_TYPE) {
      const others = stocked.filter((entry) => entry.key !== runType)
      if (others.length > 0) stocked = others
    }

    if (stocked.length === 1) return stocked[0]

    const weights = stocked.map((entry) =>
      Math.max(targets.get(entry.key) ?? 0, TYPE_DEFICIT_FLOOR),
    )

    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let roll = Math.random() * total
    for (let i = 0; i < stocked.length; i += 1) {
      roll -= weights[i]
      if (roll <= 0) return stocked[i]
    }
    return stocked[stocked.length - 1]
  }

  /**
   * Pick a score category inside one type, at the category odds, renormalised
   * over the categories that type still has stock in.
   */
  const chooseCategory = (entry: TypeEntry<T>): Pool<T> | null => {
    const stocked: Pool<T>[] = []
    const odds: number[] = []
    entry.categories.forEach((pool, index) => {
      if (pool.items.length > 0) {
        stocked.push(pool)
        odds.push(CATEGORY_ODDS[CATEGORY_ORDER[index]])
      }
    })
    if (stocked.length === 0) return null
    if (stocked.length === 1) return stocked[0]

    const total = odds.reduce((sum, weight) => sum + weight, 0)
    let roll = Math.random() * total
    for (let i = 0; i < stocked.length; i += 1) {
      roll -= odds[i]
      if (roll <= 0) return stocked[i]
    }
    return stocked[stocked.length - 1]
  }

  // Every item sits in exactly one category pool, and promoted ones sit in the
  // promoted pool as well. `emitted` is what stops that double-placing them.
  const emitted = new Set<T>()

  /**
   * Draw one organic item: type, then category within it, then item.
   *
   * A promoted listing sits in its type lane as well as the promoted pool. When
   * the promoted pool emits it first, the lane still holds a stale copy — and
   * discarding that copy back in the main loop would re-roll the *type* too,
   * which silently costs that type the slot. The retry is therefore here, inside
   * the chosen type, so a type never forfeits a pick to a copy of something
   * already shown.
   *
   * Note this does not — and should not — stop a live campaign consuming part of
   * its own type's share. A promoted resource drawn from the resource lane is
   * still a resource the reader sees, and paid placement is additive on top: a
   * resource campaign takes resources from 15% of the list to ~23%, of which the
   * organic part is the remainder. That is the promotion superseding the
   * arrangement, which is the intent.
   *
   * Terminates because every pass pops an item from a lane.
   */
  const drawOrganic = (skipPromoted = false): T | null => {
    for (;;) {
      const entry = chooseType()
      if (!entry) return null

      const pool = chooseCategory(entry)
      if (!pool) return null

      const chosen = pluckWeighted(pool)
      if (chosen === null) return null
      entry.size -= 1

      if (emitted.has(chosen)) continue

      // `skipPromoted` is for the opening block, where the organic half of the
      // block has to be genuinely organic. Discarding the lane copy loses
      // nothing: the promoted pool still holds the item and will place it in one
      // of the paid slots. It is deliberately not marked emitted here.
      if (skipPromoted && isPromoted(chosen)) continue

      return chosen
    }
  }

  /**
   * Pull a specific item out of the promoted pool by predicate.
   *
   * The pool is normally drawn by weight; the extreme tier is the one case that
   * addresses a particular item instead — it has bought the first slot outright,
   * not a better chance at it.
   */
  const pluckPromotedWhere = (predicate: (item: T) => boolean): T | null => {
    if (!promotedPool) return null
    const index = promotedPool.items.findIndex(predicate)
    if (index === -1) return null

    const chosen = promotedPool.items[index]
    promotedPool.total -= promotedPool.weights[index]

    const last = promotedPool.items.length - 1
    promotedPool.items[index] = promotedPool.items[last]
    promotedPool.weights[index] = promotedPool.weights[last]
    promotedPool.items.pop()
    promotedPool.weights.pop()
    if (promotedPool.items.length === 0) promotedPool.total = 0

    return chosen
  }

  /** Anything organic left to draw at all? */
  const organicRemains = () => typeEntries.some((entry) => entry.size > 0)

  /**
   * The organic side's weight in the draw against the promoted pool.
   *
   * Deliberately the sum of the category odds that still have stock *somewhere*,
   * which is exactly what the promoted share used to be renormalised against
   * before the type dial existed. Hard-coding it to 1 would quietly cut promoted
   * delivery every time a category drained. Paid placement must not lose reach
   * to an organic rebalancing.
   */
  const organicDrawWeight = (): number => {
    let sum = 0
    CATEGORY_ORDER.forEach((name, index) => {
      if (typeEntries.some((entry) => entry.categories[index].items.length > 0)) {
        sum += CATEGORY_ODDS[name]
      }
    })
    return sum
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

  /**
   * Place an item, and extend or break the current same-type run.
   *
   * The run is what the reader sees, so a promoted card counts toward it — the
   * organic draw will not extend a run a promotion already started, even though
   * the promotion itself was never subject to the cap.
   */
  const place = (item: T): void => {
    finalOrder.push(item)
    const key = typeKeyOf(item)
    if (key === runType) runLength += 1
    else {
      runType = key
      runLength = 1
    }
  }

  // Starts satisfied so the very first slot may be promoted.
  let sinceLastPromoted = PROMOTED_MIN_GAP

  /** Paid cards placed so far inside the opening block. */
  let topPromotedPlaced = 0

  // Promoted items drawn before the spacing gap allows, waiting for a slot.
  const deferredPromoted: T[] = []

  // 2. The Picking Loop.
  //
  // Odds are renormalized over the categories that still have stock, rather
  // than tested down an if/else ladder. The ladder leaked badly: with the middle
  // category empty — a feed page where everything is either a strong or a weak
  // match, which is common — every roll past `highest` fell through to `low`,
  // handing it far more of the feed than its share. Renormalizing keeps the
  // *ratios* intact whatever is in stock.
  //
  // Inside a category the type deficit picks the content kind and only then the
  // deadline weighting picks the item, so neither dial can swallow the other.
  while (finalOrder.length < totalItems) {
    /**
     * The opening block: `TOP_PROMOTED_SLOTS` paid of `TOP_SLOTS`, paid first.
     *
     * Runs ahead of every other rule, including the spacing hold and the lead
     * bias, because it is the arrangement those were approximating.
     *
     * The test below places a paid card whenever the running paid ratio has
     * fallen to or below the target — cross-multiplied to keep it in integers.
     * At four of ten that fires on slots 0, 3, 5 and 8, giving P O O P O P O O P O:
     * exactly four paid cards, the first of them at the top, and never two
     * together. It is written as a ratio rather than a hardcoded stride so that
     * changing `TOP_PROMOTED_SLOTS` alone re-derives the spacing — at five of ten
     * the same line yields the P O P O P O P O P O it used to.
     *
     * It self-corrects rather than insisting: if the promoted pool runs dry the
     * organic side simply fills the rest, and if organic runs dry the paid side
     * does. Neither is padded with anything that does not exist.
     */
    if (finalOrder.length < TOP_SLOTS) {
      const slot = finalOrder.length
      const promotedStockedNow = promotedPool !== null && promotedPool.items.length > 0
      const wantPromoted =
        promotedStockedNow &&
        topPromotedPlaced < TOP_PROMOTED_SLOTS &&
        topPromotedPlaced * TOP_SLOTS <= slot * TOP_PROMOTED_SLOTS

      if (wantPromoted && promotedPool) {
        // The extreme tier takes the very first slot outright when one is live.
        // Everything else in the pool is drawn by weight as usual.
        const lead =
          slot === 0
            ? (pluckPromotedWhere(isExtremePromotion) ?? pluckWeighted(promotedPool))
            : pluckWeighted(promotedPool)

        if (lead === null) continue
        if (emitted.has(lead)) continue // already placed via its own category
        emitted.add(lead)
        place(lead)
        topPromotedPlaced += 1
        sinceLastPromoted = 0
        continue
      }

      if (organicRemains()) {
        const organicPick = drawOrganic(true)
        if (organicPick === null) continue
        emitted.add(organicPick)
        place(organicPick)
        sinceLastPromoted += 1
        continue
      }

      // Nothing organic left to alternate with: fall through to the ordinary
      // machinery, which will drain whatever remains.
    }

    // A promoted item drawn too soon after the last one waits here rather than
    // being placed. Holding the pool back is not enough on its own: promoted
    // items sit in their score category too, so one can arrive through the
    // organic draw and land right beside a paid slot. Spacing has to be
    // enforced where items are *emitted*, not only where they are drawn.
    if (deferredPromoted.length > 0 && sinceLastPromoted >= PROMOTED_MIN_GAP) {
      place(deferredPromoted.shift() as T)
      sinceLastPromoted = 0
      continue
    }

    // The promoted pool joins the draw only once the spacing gap is met.
    const promotedInPlay =
      promotedPool !== null &&
      promotedPool.items.length > 0 &&
      sinceLastPromoted >= PROMOTED_MIN_GAP

    // Lead preference: near the top of the feed, go to the promoted pool
    // directly instead of letting it take its chances in the renormalised
    // category draw. This is the only thing that actually puts paid placement
    // first — the pool's share is renormalised against every stocked category,
    // so on its own it wins the opening slot roughly one time in six.
    //
    // Sits behind `promotedInPlay`, so it can never stack promotions closer
    // than PROMOTED_MIN_GAP, and decays to nothing by PROMOTED_LEAD_SLOTS, so
    // the body of the feed keeps the organic mix.
    if (promotedInPlay && promotedPool) {
      const leadBias = promotedLeadBias(finalOrder.length)
      if (leadBias > 0 && Math.random() < leadBias) {
        const lead = pluckWeighted(promotedPool)
        // Already placed via its own score category: drop it and draw again.
        // Both pools shrank, so this still terminates.
        if (lead && !emitted.has(lead)) {
          emitted.add(lead)
          place(lead)
          sinceLastPromoted = 0
        }
        continue
      }
    }

    const hasOrganic = organicRemains()

    if (!hasOrganic) {
      // Nothing organic left, so there is nothing to space against any more:
      // release what is held and drain the promoted pool.
      if (deferredPromoted.length > 0) {
        place(deferredPromoted.shift() as T)
        sinceLastPromoted = 0
        continue
      }
      if (promotedPool !== null && promotedPool.items.length > 0) {
        const held = pluckWeighted(promotedPool)
        if (!held) break
        if (emitted.has(held)) continue
        emitted.add(held)
        place(held)
        sinceLastPromoted = 0
        continue
      }
      break // every pool drained
    }

    const organicWeight = organicDrawWeight()
    const promotedWeight = promotedInPlay && promotedPool ? PROMOTED_SHARE : 0
    const drawWeight = organicWeight + promotedWeight

    let chosenItem: T | null = null
    if (promotedPool && promotedWeight > 0 && Math.random() * drawWeight < promotedWeight) {
      chosenItem = pluckWeighted(promotedPool)
    } else if (organicWeight > 0) {
      chosenItem = drawOrganic()
    } else if (promotedPool && promotedInPlay) {
      chosenItem = pluckWeighted(promotedPool)
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

    place(chosenItem)
    sinceLastPromoted = isPromoted(chosenItem) ? 0 : sinceLastPromoted + 1
  }

  // Anything still held when the loop ran out of slots (it cannot run out of
  // items — `emitted` and `finalOrder` disagree by exactly what is held here).
  while (deferredPromoted.length > 0) {
    place(deferredPromoted.shift() as T)
  }

  return finalOrder
}
