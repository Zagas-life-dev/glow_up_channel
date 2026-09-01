/**
 * What each signal is worth, and why.
 *
 * Weights are per content type because the same signal means different things
 * depending on what you are looking at:
 *
 *   - **events** are the most location-bound thing on the platform. You have to
 *     physically turn up, so a conference in another country is close to
 *     useless unless it is explicitly remote.
 *   - **resources** have no location at all — the search filters already say so
 *     — so their location weight is zero and the slack goes to meaning.
 *   - **jobs** care about deadlines and place roughly equally.
 *   - **opportunities** are the mixed bag, so they stay balanced.
 *
 * Weights need not sum to 1. `rank` renormalizes over whichever signals were
 * actually available, which is what lets an unavailable signal cost nothing.
 */

import type { SignalName } from "@/lib/ranking/types"

export type Weights = Record<SignalName, number>

export const DEFAULT_WEIGHTS: Weights = {
  semantic: 0.3,
  location: 0.22,
  language: 0.12,
  urgency: 0.12,
  freshness: 0.1,
  engagement: 0.08,
  // The only signal built from what this person actually did rather than what
  // a listing looks like. Weighted above engagement — which is everyone else's
  // behaviour — but below meaning and place, which still decide most of a feed.
  history: 0.16,
  baseScore: 0.06,
}

/**
 * Per-type overrides, merged over `DEFAULT_WEIGHTS`.
 * Keys match `FeedContentKind`.
 */
export const WEIGHTS_BY_TYPE: Record<string, Partial<Weights>> = {
  event: { location: 0.32, urgency: 0.16, semantic: 0.24, freshness: 0.06 },
  job: { location: 0.26, urgency: 0.14, semantic: 0.28 },
  opportunity: {},
  resource: {
    location: 0,
    urgency: 0.02,
    semantic: 0.42,
    language: 0.18,
    freshness: 0.14,
  },
}

export function weightsFor(contentType: string | undefined): Weights {
  const overrides = contentType ? WEIGHTS_BY_TYPE[contentType] : undefined
  return overrides ? { ...DEFAULT_WEIGHTS, ...overrides } : DEFAULT_WEIGHTS
}

/**
 * How strong a signal has to be before it is worth telling the user about.
 * Keeps "reasons" honest — a 0.3 tag match is not "matches your interests".
 *
 * 0.55 is a measured boundary, not a guess. Against a reader with five stated
 * interests, `semanticSimilarity` scores an ideal resource 0.70, a strong one
 * 0.74, one matching a single interest 0.62, a tangential one 0.27 and an
 * unrelated one 0.00 — so this sits in the gap and the reason fires for exactly
 * the items a person would call relevant.
 *
 * It used to be unreachable. The old scoring capped an ideal match at 0.46, so
 * the `matchesTag` and `matchesInterests` branches in `buildReasons` could never
 * run and the feed explained every recommendation by freshness or popularity —
 * never by the interests it had actually matched on. Re-measure this if the
 * weights in `semanticSimilarity` move again.
 */
export const REASON_THRESHOLD = 0.55
