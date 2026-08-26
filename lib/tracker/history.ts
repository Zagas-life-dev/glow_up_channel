/**
 * Turning tracker answers into something the re-ranker can use.
 *
 * This is the payoff for asking the question at all: outcome data is the only
 * first-party evidence the platform has about whether a listing was any good
 * for a particular person. Everything else it ranks on — tags, distance,
 * recency — is a guess about what they might want. This is a record of what
 * they actually did.
 *
 * The index is built once per signals fetch and read on every scored item, so
 * everything here is plain Maps and O(1) lookups.
 */

import type { TrackerSignal, TrackerStatus } from "@/lib/tracker/types"

export type TrackerHistory = {
  /** Verdicts on specific listings, keyed by content id. */
  byContentId: Map<string, TrackerStatus>
  /** Affinity per category, -1 (avoid) to 1 (pursue). */
  byCategory: Map<string, number>
  /** Affinity per provider, same scale. */
  byProvider: Map<string, number>
  /** How many answers went into this. Zero means the signal stays unavailable. */
  size: number
}

export const EMPTY_HISTORY: TrackerHistory = {
  byContentId: new Map(),
  byCategory: new Map(),
  byProvider: new Map(),
  size: 0,
}

/**
 * What each outcome says about the *category*, not about the listing.
 *
 * Note that `declined` and `no_response` are mildly positive, not negative.
 * Being turned down is evidence the person wanted the thing, and a ranker that
 * reads rejection as disinterest would quietly narrow someone's feed every time
 * they aimed high and missed — which is precisely backwards. Only the answers
 * where the user themselves said "not this" push a category down.
 */
const OUTCOME_AFFINITY: Partial<Record<TrackerStatus, number>> = {
  submitted: 1,
  accepted: 1,
  started: 0.5,
  used: 0.6,
  declined: 0.4,
  no_response: 0.3,
  not_useful: -0.6,
  not_for_me: -1,
  // `pending` and `unknown` are the absence of an answer, not an answer.
}

function accumulate(target: Map<string, { sum: number; count: number }>, key: string | null, value: number) {
  if (!key) return
  const normalized = key.trim().toLowerCase()
  if (!normalized) return
  const existing = target.get(normalized)
  if (existing) {
    existing.sum += value
    existing.count += 1
  } else {
    target.set(normalized, { sum: value, count: 1 })
  }
}

function averages(source: Map<string, { sum: number; count: number }>): Map<string, number> {
  const result = new Map<string, number>()
  source.forEach((entry, key) => result.set(key, entry.sum / entry.count))
  return result
}

/** Fold a signals payload into the lookup index the ranker reads. */
export function buildTrackerHistory(signals: TrackerSignal[]): TrackerHistory {
  if (!Array.isArray(signals) || signals.length === 0) return EMPTY_HISTORY

  const byContentId = new Map<string, TrackerStatus>()
  const categoryTotals = new Map<string, { sum: number; count: number }>()
  const providerTotals = new Map<string, { sum: number; count: number }>()
  let size = 0

  for (const signal of signals) {
    if (!signal) continue

    if (signal.contentId) byContentId.set(String(signal.contentId), signal.status)

    const affinity = OUTCOME_AFFINITY[signal.status]
    if (affinity === undefined) continue

    accumulate(categoryTotals, signal.category, affinity)
    accumulate(providerTotals, signal.provider, affinity)
    size += 1
  }

  return {
    byContentId,
    byCategory: averages(categoryTotals),
    byProvider: averages(providerTotals),
    size,
  }
}
