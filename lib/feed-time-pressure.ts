/**
 * How much a listing's remaining time pulls it toward the top of a list.
 *
 * One curve, used by every surface that orders listings: the For You feed
 * (`feed-variety-order`), the public hub pages (`public-hub-order`) and — in its
 * own copy, because it is a separate runtime — the backend's
 * `scatterRankingService`. The three had drifted into three slightly different
 * curves with three sets of constants, which is how the defect below survived in
 * all of them at once.
 *
 * **The invariant this module exists to hold: a listing that tells you when it
 * happens must never be plucked less often than one that says nothing at all.**
 *
 * It used to be violated by more than two orders of magnitude. The floor for a
 * dated listing was 0.0005 while an undated one scored 0.12, so an event two
 * months out was drawn ~240x less often than an evergreen PDF — punished purely
 * for having named a date. Since events are scheduled months ahead as a matter
 * of course and application deadlines fall within weeks, this quietly removed
 * events from the feed: measured over an equal candidate pool they held 1.4% of
 * the first page. `minWeight` is now pinned to `undatedWeight` so the ordering
 * cannot express that again.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export type TimePressureTuning = {
  /**
   * How fast the pull toward "now" decays. At one half-life out a listing is
   * half as likely to be plucked as one closing today, before `bias` sharpens
   * it.
   */
  halfLifeDays: number
  /**
   * Sharpens the curve. 1 is a plain half-life decay; above that leans harder
   * on what is closing soonest. This is the knob to turn if a surface feels too
   * panicky or too flat.
   */
  bias: number
  /**
   * Weight for a listing with no date at all — resources, evergreen guides.
   * Doubles as the floor for dated listings, per the invariant above.
   */
  undatedWeight: number
  /**
   * Weight for something already closed. Deliberately an order of magnitude
   * under the live floor: still reachable rather than unpickable, but never
   * ahead of something a reader can still act on. Most of these are filtered
   * upstream; this is the backstop for one that slips through.
   */
  expiredWeight: number
}

/**
 * The For You feed.
 *
 * A 21-day half-life at bias 1.3 means something closing today is ~2.5x likelier
 * than something due in three weeks and ~7x likelier than something due in six,
 * and the curve reaches the floor around seven weeks out — roughly as far ahead
 * as a reader plausibly plans.
 *
 * It was 7 days at bias 1.6, an effective half-life of 4.4 days, which put those
 * same ratios at 9x and 115x. At that setting urgency had stopped being a
 * preference and become a filter: anything more than a month out was unreachable
 * whatever else it had going for it.
 */
export const FEED_TIME_PRESSURE: TimePressureTuning = {
  halfLifeDays: 21,
  bias: 1.3,
  undatedWeight: 0.12,
  expiredWeight: 0.00005,
}

/**
 * The public hub pages (/opportunities, /jobs, /events, /resources).
 *
 * Shorter half-life than the feed, because a hub page is where someone goes
 * specifically to find what is closing, so it should lean harder on the coming
 * month. Still long enough that a conference booked for next quarter appears at
 * all — which at the previous 5 days it did not.
 *
 * On /resources nearly everything is undated and therefore shares one weight,
 * so the lottery degrades to a plain shuffle. That is the right behaviour there.
 */
export const HUB_TIME_PRESSURE: TimePressureTuning = {
  halfLifeDays: 14,
  bias: 1.3,
  undatedWeight: 0.15,
  expiredWeight: 0.0001,
}

/**
 * Pluck likelihood from time remaining. Monotonic — sooner is always better.
 *
 * Deliberately unlike `urgencySignal` in `lib/ranking/signals`, which dips under
 * three days out on the grounds that there may not be time left to apply. That
 * caution belongs in personalized scoring, where a bad recommendation wastes a
 * slot someone was owed. Here the instruction is simply "closer means higher" —
 * the reader decides whether they can still make it.
 *
 * @param target epoch ms the reader has to act by, or null when undated.
 */
export function timePressureFrom(
  target: number | null,
  now: number,
  tuning: TimePressureTuning,
): number {
  if (target === null) return tuning.undatedWeight

  const days = (target - now) / DAY_MS
  if (days <= 0) return tuning.expiredWeight

  const decay = 2 ** (-days / tuning.halfLifeDays)

  // The floor is the undated weight, never lower — see the module note.
  return Math.max(tuning.undatedWeight, decay ** tuning.bias)
}
