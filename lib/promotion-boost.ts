/**
 * The client's half of the promotion model.
 *
 * The server decides *how much* a promotion is worth — tier, committed budget,
 * where the campaign is in its run, how much it has delivered — and ships the
 * answer on each item as `promotion.liftFraction` and `promotion.weight`. This
 * module is only the arithmetic that applies those two numbers.
 *
 * Splitting it that way matters because the browser re-ranks. `lib/ranking`
 * rescores every item against the reader's location, language and interests,
 * which silently threw away whatever boost the backend had applied — a
 * promoter's placement survived exactly as far as the first client-side sort.
 * Reading the lift off the item and reapplying it here is what makes the
 * promotion hold all the way to the screen, without the browser having to know
 * anything about packages or budgets.
 *
 * See `latest-glowup-channel/src/services/promotionRankingService.js`.
 */

/**
 * Where a promoted item's score is allowed to land. Must match `SCORE_CEILING`
 * in the backend service.
 *
 * This was 90, because `feed-variety-order` deliberately throttled the 100-91
 * band — 0.20 odds against 0.75 for 90-61 — so a boost that overshot into it
 * demoted the very item it was meant to raise. That is the bug this pair of
 * modules exists to fix, and 90 was the last safe point below it.
 *
 * The orderer no longer throttles that band: `CATEGORIES.highest` now covers
 * 100-61 at a single rate, so nothing is lost by scoring above 90 and the
 * ceiling is free to follow the extreme tier's up to 97.
 */
export const PROMOTION_SCORE_CEILING = 97

/**
 * The band the extreme tier maps onto, mirroring `TUNING.EXTREME` in
 * `promotionRankingService.js`. Kept in step by hand, the same way
 * `PROMOTED_SHARE` and friends are across the three orderers.
 *
 * The one part not mirrored is the per-promotion jitter: it is derived from the
 * promotion id on the server and shipped on the promotion block, so the browser
 * reads it rather than recomputing the hash. Reproducing it here would be a
 * second implementation of the same function, and the two drifting apart is
 * exactly the failure this module was written to prevent.
 */
export const EXTREME_SCORE_FLOOR = 85
export const EXTREME_SCORE_CEILING = 97
export const EXTREME_SCORE_CURVE = 1.0

/** Anything carrying a server-issued promotion block. */
export type PromotedLike = {
  isPromoted?: unknown
  promotionWeight?: unknown
  promotion?: {
    liftFraction?: unknown
    weight?: unknown
    packageType?: unknown
    scoreJitter?: unknown
  } | null
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/** True when the item is a live paid placement. */
export function isPromoted(item: unknown): boolean {
  if (!item || typeof item !== "object") return false
  return Boolean((item as PromotedLike).isPromoted)
}

/**
 * The fraction of the gap to the ceiling this item's promotion closes, 0-1.
 *
 * Zero for unpromoted items and for promoted ones that arrived without a lift —
 * an old cached payload, say. Zero is the safe default: it leaves the honest
 * score alone rather than inventing a boost the server did not grant.
 */
export function promotionLiftFraction(item: unknown): number {
  if (!isPromoted(item)) return 0
  const promotion = (item as PromotedLike).promotion
  if (!promotion || typeof promotion !== "object") return 0
  const lift = finiteNumber(promotion.liftFraction)
  if (lift === null) return 0
  return Math.max(0, Math.min(1, lift))
}

/** True when the item carries a live extreme-tier promotion. */
export function isExtremePromotion(item: unknown): boolean {
  if (!isPromoted(item)) return false
  const promotion = (item as PromotedLike).promotion
  if (!promotion || typeof promotion !== "object") return false
  return promotion.packageType === "extreme"
}

/**
 * The extreme tier's per-promotion wobble, in points, as computed by the server.
 *
 * Zero when absent, which covers every other tier and any cached payload
 * predating the field. Zero is the right default: it yields the clean mapped
 * value rather than inventing a different one from the one the server scored.
 */
function extremeJitter(item: unknown): number {
  const promotion = (item as PromotedLike).promotion
  if (!promotion || typeof promotion !== "object") return 0
  const jitter = finiteNumber(promotion.scoreJitter)
  return jitter === null ? 0 : jitter
}

/**
 * Map an honest score onto the extreme tier's band.
 *
 * The twin of `extremeScore` in `promotionRankingService.js` — same shape,
 * same constants, same floor at the honest score. It has to exist here for the
 * same reason `applyPromotionLift` does: this module runs after the browser has
 * rescored every item from scratch against the reader, so the server's number
 * is already gone by the time we get here. Only the mapping survives the trip.
 */
export function extremeScore(score: number, item: unknown): number {
  const base = Math.max(0, Math.min(100, score))
  const shaped = Math.pow(base / 100, EXTREME_SCORE_CURVE)
  const mapped =
    EXTREME_SCORE_FLOOR +
    (EXTREME_SCORE_CEILING - EXTREME_SCORE_FLOOR) * shaped +
    extremeJitter(item)

  const banded = Math.max(EXTREME_SCORE_FLOOR, Math.min(EXTREME_SCORE_CEILING, mapped))
  // Never below the honest score, so the tier keeps the invariant the rest of
  // the model keeps: promoting can raise an item, never lower it.
  return Math.max(base, banded)
}

/**
 * Apply the lift to a score, on the same 0-100 scale.
 *
 * Gap-closing, so it is monotonic and can never push an item below where it
 * honestly sat: a strong organic match still outranks a weak promoted one.
 * Scores already above the ceiling are left alone rather than dragged down.
 *
 * The extreme tier is the exception, and takes the branch above: it does not
 * close a gap toward the ceiling, it maps onto a band of its own.
 */
export function applyPromotionLift(score: number, item: unknown): number {
  if (isExtremePromotion(item)) return extremeScore(score, item)

  const lift = promotionLiftFraction(item)
  if (lift <= 0) return score
  if (score >= PROMOTION_SCORE_CEILING) return score
  return score + (PROMOTION_SCORE_CEILING - score) * lift
}

/**
 * How heavily this item should be drawn from the promoted pool, relative to
 * other promoted items.
 *
 * Server-computed: campaign tier, the opening burst, the closing ramp and
 * delivery pacing are all already folded in. A promoted item with no weight
 * reads as neutral (1) rather than unpickable, so a stale payload costs the
 * promoter their edge but never their place.
 */
export function promotionWeight(item: unknown): number {
  if (!isPromoted(item)) return 0
  const direct = finiteNumber((item as PromotedLike).promotionWeight)
  if (direct !== null && direct > 0) return direct

  const promotion = (item as PromotedLike).promotion
  if (promotion && typeof promotion === "object") {
    const nested = finiteNumber(promotion.weight)
    if (nested !== null && nested > 0) return nested
  }
  return 1
}
