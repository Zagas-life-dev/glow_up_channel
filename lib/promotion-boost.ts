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
 * 90 rather than 100 because the orderer below deliberately throttles the
 * 100-91 band (0.20 odds, against 0.75 for 90-61). A boost that overshot into
 * it demoted the very item it was meant to raise, which is the bug this whole
 * pair of modules exists to fix.
 */
export const PROMOTION_SCORE_CEILING = 90

/** Anything carrying a server-issued promotion block. */
export type PromotedLike = {
  isPromoted?: unknown
  promotionWeight?: unknown
  promotion?: { liftFraction?: unknown; weight?: unknown } | null
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

/**
 * Apply the lift to a score, on the same 0-100 scale.
 *
 * Gap-closing, so it is monotonic and can never push an item below where it
 * honestly sat: a strong organic match still outranks a weak promoted one.
 * Scores already above the ceiling are left alone rather than dragged down.
 */
export function applyPromotionLift(score: number, item: unknown): number {
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
