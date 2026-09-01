/**
 * How alike are two profiles?
 *
 * Two measures, used for different things. Tag overlap is the one that decides
 * ranking — it is language-independent by construction, since the taxonomy
 * already collapsed four languages onto shared ids. Keyword overlap is a weaker
 * tiebreaker that catches vocabulary the taxonomy does not cover (a specific
 * company, a niche technology), and only works within a language.
 */

import type { TextProfile } from "@/lib/nlp/profile-text"

/** Cosine similarity over two sparse weight maps. 0..1 for non-negative input. */
export function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  if (a.size === 0 || b.size === 0) return 0

  // Iterate the smaller map; the dot product only needs shared keys.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]

  let dot = 0
  for (const [key, weight] of small) {
    const other = large.get(key)
    if (other !== undefined) dot += weight * other
  }
  if (dot === 0) return 0

  let normA = 0
  for (const weight of a.values()) normA += weight * weight
  let normB = 0
  for (const weight of b.values()) normB += weight * weight

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dot / denominator
}

/**
 * Share of the user's tag weight that the content covers.
 *
 * Asymmetric on purpose. Cosine punishes a broad listing that happens to match
 * a narrow interest, but from the user's point of view that listing is a hit.
 * What matters is "how much of what I care about does this cover", not "are we
 * the same shape".
 */
export function coverage(
  userTags: Map<string, number>,
  contentTags: Map<string, number>,
): number {
  if (userTags.size === 0 || contentTags.size === 0) return 0

  let matched = 0
  let total = 0
  for (const [tagId, weight] of userTags) {
    total += weight
    const contentWeight = contentTags.get(tagId)
    if (contentWeight !== undefined) {
      matched += weight * Math.min(1, contentWeight)
    }
  }
  return total === 0 ? 0 : matched / total
}

/**
 * The single best tag match, as a share of the user's strongest interest.
 *
 * Coverage answers "how much of my list does this cover", which is the right
 * question for a search result and the wrong one for a feed. Someone who ticked
 * five interests can never have more than a fifth of their list covered by one
 * resource, so coverage alone capped an ideal match near 0.5 and left the
 * signal carrying 42% of the weight with less swing than freshness.
 *
 * This asks the other question — "does this nail something I care about" — and
 * a CV workbook for a reader who asked about careers scores 1 on it, as it
 * should. Coverage still breaks the tie between two items that both do.
 */
export function peakMatch(
  userTags: Map<string, number>,
  contentTags: Map<string, number>,
): number {
  if (userTags.size === 0 || contentTags.size === 0) return 0

  let best = 0
  let strongest = 0
  for (const [tagId, weight] of userTags) {
    if (weight > strongest) strongest = weight
    const contentWeight = contentTags.get(tagId)
    if (contentWeight !== undefined) {
      best = Math.max(best, Math.min(weight, contentWeight))
    }
  }
  return strongest === 0 ? 0 : best / strongest
}

/** Tag ids the two profiles share, strongest first — this is what `reasons` cites. */
export function sharedTags(
  userTags: Map<string, number>,
  contentTags: Map<string, number>,
): { tagId: string; strength: number }[] {
  const shared: { tagId: string; strength: number }[] = []
  for (const [tagId, weight] of userTags) {
    const contentWeight = contentTags.get(tagId)
    if (contentWeight !== undefined) {
      shared.push({ tagId, strength: weight * contentWeight })
    }
  }
  return shared.sort((a, b) => b.strength - a.strength)
}

/**
 * Overall semantic match, 0..1.
 *
 * Coverage leads because it answers the user's actual question; cosine and
 * keyword overlap refine the ordering among items that cover the same ground.
 *
 * Coverage is measured over the user's `coreTags` — what they actually chose —
 * against the content's expanded `tags`. Both sides expanded was the wrong
 * pairing: the user's inferred tags padded the denominator, so covering
 * everything they asked for still read as a partial match.
 */
export function semanticSimilarity(user: TextProfile, content: TextProfile): number {
  const peak = peakMatch(user.coreTags, content.tags)
  const tagCoverage = coverage(user.coreTags, content.tags)
  const tagCosine = cosineSimilarity(user.tags, content.tags)
  const keywordCosine = cosineSimilarity(user.keywords, content.keywords)

  return peak * 0.45 + tagCoverage * 0.25 + tagCosine * 0.15 + keywordCosine * 0.15
}
