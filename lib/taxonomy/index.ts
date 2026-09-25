/**
 * The official tag list, for pickers and chips.
 *
 * Matching lives in `lib/nlp/taxonomy.ts`; this module is the part the UI
 * needs: which groups a listing kind uses, what each group is limited to, what
 * is required, and suggestions from a draft's title and description. The
 * rules mirror the backend's `tagListing` (src/taxonomy/index.js) so the
 * picker suggests what the server would have chosen.
 */

import TAXONOMY_JSON from "@/lib/taxonomy/taxonomy.json"
import type { SupportedLanguage } from "@/lib/nlp/detect-language"
import {
  FACET_LIMITS,
  FACETS,
  TAG_BY_ID,
  TAXONOMY,
  matchTagsDetailed,
  tagLabel,
  type TagDefinition,
  type TagFacet,
} from "@/lib/nlp/taxonomy"

export type ListingKind = "job" | "event" | "opportunity" | "resource"

export { FACETS, FACET_LIMITS, tagLabel, type TagFacet, type TagDefinition }

/** Groups each kind of listing uses — mirrors FACETS_BY_KIND on the backend. */
export const FACETS_BY_KIND: Record<ListingKind, TagFacet[]> = {
  job: ["type", "work", "level", "community", "industry", "skill"],
  event: ["type", "format", "level", "community", "industry", "skill"],
  opportunity: ["type", "format", "work", "level", "community", "industry", "skill"],
  resource: ["type", "level", "community", "industry", "skill"],
}

/** Groups a listing must have, per kind. */
export const REQUIRED_BY_KIND = (TAXONOMY_JSON as unknown as { required: Record<ListingKind, TagFacet[]> }).required

/** i18n key for each group's heading. */
export const FACET_LABEL_KEYS = {
  type: "tags.facetType",
  format: "tags.facetFormat",
  work: "tags.facetWork",
  level: "tags.facetLevel",
  community: "tags.facetCommunity",
  industry: "tags.facetIndustry",
  skill: "tags.facetSkill",
} as const

export function facetOf(id: string): TagFacet | undefined {
  return TAG_BY_ID.get(id)?.facet
}

export function tagsInFacet(facet: TagFacet): TagDefinition[] {
  return TAXONOMY.filter((tag) => tag.facet === facet)
}

/** Types that only one kind of listing can be (a scholarship is never a "job"). */
const TYPES_ONLY_FOR_KIND: Record<string, ListingKind> = { "type:job": "job", "type:event": "event" }

/** Can a tag be put on this kind of listing at all? */
export function tagAllowedFor(id: string, kind: ListingKind): boolean {
  const facet = facetOf(id)
  if (!facet || !FACETS_BY_KIND[kind].includes(facet)) return false
  const only = TYPES_ONLY_FOR_KIND[id]
  return !only || only === kind
}

/** Would adding `id` break its group's limit? */
export function atFacetLimit(selected: string[], id: string): boolean {
  const facet = facetOf(id)
  if (!facet) return true
  const used = selected.filter((other) => facetOf(other) === facet).length
  return used >= FACET_LIMITS[facet]
}

export function missingRequired(selected: string[], kind: ListingKind): TagFacet[] {
  const present = new Set(selected.map(facetOf))
  return (REQUIRED_BY_KIND[kind] ?? []).filter((facet) => !present.has(facet))
}

/** Below this a match is not suggested — the same bar the backend stores at. */
const SUGGEST_THRESHOLD = 0.5

/**
 * Tags to suggest for a draft, strongest first.
 *
 * Title counts three times the description, and a single passing mention in
 * the description is not enough on its own — the backend's weighting, so a
 * provider sees the tags their listing would have been given anyway.
 */
export function suggestTags(
  draft: { title?: string; description?: string },
  kind: ListingKind,
  language?: SupportedLanguage,
): string[] {
  const scores = new Map<string, number>()
  const fields = [
    { text: draft.title ?? "", weight: 3 },
    { text: draft.description ?? "", weight: 0.6 },
  ]
  for (const field of fields) {
    if (!field.text.trim()) continue
    for (const [id, match] of matchTagsDetailed(field.text, language)) {
      const ceiling = match.weakOnly ? 0.45 : 1
      const score = Math.min(ceiling, match.strength * field.weight)
      if ((scores.get(id) ?? 0) < score) scores.set(id, score)
    }
  }
  // A strong skill suggests its industry too.
  for (const [id, score] of [...scores]) {
    const parent = TAG_BY_ID.get(id)?.parent
    if (parent && score >= SUGGEST_THRESHOLD && (scores.get(parent) ?? 0) < score * 0.8) {
      scores.set(parent, score * 0.8)
    }
  }
  return [...scores]
    .filter(([id, score]) => score >= SUGGEST_THRESHOLD && tagAllowedFor(id, kind))
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
}

/** Label for a tag in the reader's language. */
export function labelFor(id: string, language: SupportedLanguage): string {
  return tagLabel(id, language)
}
