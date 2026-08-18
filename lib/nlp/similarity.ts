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
 */
export function semanticSimilarity(user: TextProfile, content: TextProfile): number {
  const tagCoverage = coverage(user.tags, content.tags)
  const tagCosine = cosineSimilarity(user.tags, content.tags)
  const keywordCosine = cosineSimilarity(user.keywords, content.keywords)

  return tagCoverage * 0.6 + tagCosine * 0.25 + keywordCosine * 0.15
}
