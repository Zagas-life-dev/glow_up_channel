/**
 * The tag vocabulary, and every way six languages say each tag.
 *
 * Built from `lib/taxonomy/taxonomy.json`, the platform's one official tag
 * list. The backend holds a byte-identical copy and tags every listing with
 * it (`latest-glowup-channel/src/taxonomy`); `lib/taxonomy/parity.test.ts`
 * fails the build if the two drift, and holds the matcher below to the
 * backend's, text for text.
 *
 * This is what makes cross-language ranking work without translating anything.
 * A reader whose profile says "Entrepreneurship & Funding" and a Portuguese
 * listing that says "empreendedorismo" both resolve to `community:founders`,
 * so they match — no translation API, no embeddings.
 *
 * Two refinements over plain alias lookup, mirrored from the backend:
 *
 *   - Hint words. A single word marked weak anywhere ("design", "program") is
 *     weak everywhere, including when it is another language's alias or a
 *     tag's display name — the French label of `type:internship` is "Stage".
 *   - Senses. A few words take their meaning from their neighbours: education
 *     near "tuition" is a scholarship, near "bootcamp" it is training.
 */

import TAXONOMY_JSON from "@/lib/taxonomy/taxonomy.json"
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/nlp/detect-language"
import { normalizeText, ngrams } from "@/lib/nlp/normalize"
import { stem } from "@/lib/nlp/stem"

export type TagFacet = "type" | "format" | "work" | "level" | "community" | "industry" | "skill"

/** Kept for existing callers; a tag's category is its facet. */
export type TagCategory = TagFacet

export type TagDefinition = {
  id: string
  facet: TagFacet
  /** English display label. `tagLabel` gives the others. */
  label: string
  labels: Record<SupportedLanguage, string>
  aliases: Record<SupportedLanguage, string[]>
  /** Words that hint at this tag without settling it, matched at a fraction of the strength. */
  weakAliases?: Partial<Record<SupportedLanguage, string[]>>
  /** The industry a skill belongs to. */
  parent?: string
  /** Tags that partially satisfy this one, scored at `RELATED_WEIGHT`. */
  related?: string[]
}

type RawTag = {
  id: string
  facet: string
  labels: Record<string, string>
  aliases: Record<string, string[]>
  weakAliases?: Record<string, string[]>
  parent?: string
  related?: string[]
}

type RawSense = {
  terms: string[]
  window: number
  default: string | null
  weakDefault?: boolean
  suppress?: string[]
  rules?: { near: string[]; tag: string; keepDefault?: boolean }[]
}

const RAW = TAXONOMY_JSON as unknown as {
  facets: TagFacet[]
  limits: Record<TagFacet, number>
  tags: RawTag[]
  senses: RawSense[]
}

export const FACETS: TagFacet[] = RAW.facets
export const FACET_LIMITS: Record<TagFacet, number> = RAW.limits

export const TAXONOMY: TagDefinition[] = RAW.tags.map((tag) => ({
  id: tag.id,
  facet: tag.facet as TagFacet,
  label: tag.labels.en,
  labels: tag.labels as Record<SupportedLanguage, string>,
  aliases: tag.aliases as Record<SupportedLanguage, string[]>,
  weakAliases: tag.weakAliases as Partial<Record<SupportedLanguage, string[]>> | undefined,
  parent: tag.parent,
  related: tag.related,
}))

export const TAG_BY_ID = new Map(TAXONOMY.map((tag) => [tag.id, tag]))

/** How much of a tag's weight a `related` tag inherits. */
export const RELATED_WEIGHT = 0.4

/** How much a skill passes to its industry, and an industry to its skills. */
export const PARENT_WEIGHT = 0.6

/** Single words that are hints in some language — and therefore hints in all. */
const HINT_WORDS = new Set<string>()
for (const tag of TAXONOMY) {
  for (const list of Object.values(tag.weakAliases ?? {})) {
    for (const alias of list ?? []) {
      const normalized = normalizeText(alias)
      if (normalized && !normalized.includes(" ")) HINT_WORDS.add(normalized)
    }
  }
}

/**
 * Phrase → tag ids. Multi-word aliases only; matched against n-grams.
 * Single words go in `TOKEN_INDEX` instead, where stemming can help them.
 */
export const PHRASE_INDEX = new Map<string, string[]>()

/** Stemmed single word → tag ids. */
export const TOKEN_INDEX = new Map<string, string[]>()

/** The same two indexes for hint words, matched at a fraction of the strength. */
export const WEAK_PHRASE_INDEX = new Map<string, string[]>()
export const WEAK_TOKEN_INDEX = new Map<string, string[]>()

function addTo(index: Map<string, string[]>, key: string, tagId: string): void {
  if (!key) return
  const existing = index.get(key)
  if (existing) {
    if (!existing.includes(tagId)) existing.push(tagId)
  } else {
    index.set(key, [tagId])
  }
}

function indexAliases(
  aliases: string[] | undefined,
  language: SupportedLanguage,
  tagId: string,
  phrases: Map<string, string[]>,
  tokens: Map<string, string[]>,
  hintTokens?: Map<string, string[]>,
): void {
  if (!aliases) return
  for (const alias of aliases) {
    const normalized = normalizeText(alias)
    if (!normalized) continue
    const words = normalized.split(" ")
    if (words.length > 1) {
      addTo(phrases, normalized, tagId)
    } else {
      const word = words[0]
      const isHint = HINT_WORDS.has(word) || HINT_WORDS.has(stem(word, language)) || HINT_WORDS.has(stem(word))
      const into = hintTokens && isHint ? hintTokens : tokens
      addTo(into, stem(word, language), tagId)
      // Also index the unstemmed form — cheap, and covers stems that the
      // light ruleset leaves alone in one language but strips in another.
      addTo(into, word, tagId)
    }
  }
}

/** Longest alias in words — the n-gram window for phrase matching. */
export const MAX_PHRASE_WORDS = (() => {
  let max = 1
  for (const tag of TAXONOMY) {
    for (const language of SUPPORTED_LANGUAGES) {
      const lists = [[tag.labels[language]], tag.aliases[language] ?? [], tag.weakAliases?.[language] ?? []]
      for (const list of lists) {
        for (const alias of list) {
          const words = normalizeText(alias ?? "").split(" ").filter(Boolean).length
          if (words > max) max = words
        }
      }
    }
  }
  return max
})()

for (const tag of TAXONOMY) {
  for (const language of SUPPORTED_LANGUAGES) {
    // The label is itself an alias: "Scholarship" finds `type:scholarship`.
    const strong = [tag.labels[language], ...(tag.aliases[language] ?? [])].filter(Boolean)
    indexAliases(strong, language, tag.id, PHRASE_INDEX, TOKEN_INDEX, WEAK_TOKEN_INDEX)
    indexAliases(tag.weakAliases?.[language], language, tag.id, WEAK_PHRASE_INDEX, WEAK_TOKEN_INDEX)
  }
}

type Sense = {
  terms: Set<string>
  window: number
  default: string | null
  weakDefault: boolean
  suppress: string[]
  rules: { near: string[]; tag: string; keepDefault: boolean }[]
}

const SENSES: Sense[] = RAW.senses.map((sense) => ({
  terms: new Set(sense.terms.map(normalizeText)),
  window: sense.window,
  default: sense.default,
  weakDefault: Boolean(sense.weakDefault),
  suppress: (sense.suppress ?? []).map(normalizeText),
  rules: (sense.rules ?? []).map((rule) => ({
    near: rule.near.map(normalizeText),
    tag: rule.tag,
    keepDefault: Boolean(rule.keepDefault),
  })),
}))

/**
 * Evidence contributed by one match, before saturation.
 *
 * Phrases score higher than single words because "capital semente" is far more
 * specific than "capital", and a stemmed match scores below an exact one
 * because stemming can over-collapse.
 */
const PHRASE_HIT = 1.5
const TOKEN_HIT = 1
const STEMMED_HIT = 0.8
const WEAK_PHRASE_HIT = 0.5
const WEAK_TOKEN_HIT = 0.35
/** What a sense's winning cue contributes — the same as one exact word. */
const SENSE_HIT = 1

/**
 * How fast evidence saturates. Tuned so one exact single-word hit lands near
 * 0.75 and a matched phrase near 0.88.
 */
const SATURATION_TAU = 0.72

/** One tag's evidence in a piece of text. */
export type TagMatch = {
  /** 0..1 strength for this text alone, before any field weighting. */
  strength: number
  /**
   * True when nothing but hint words supported this tag.
   *
   * Callers must not let field weighting lift such a tag to full strength:
   * "funding" twice in a title weighted 3 would otherwise read as a certain
   * grant.
   */
  weakOnly: boolean
}

function bump(into: Map<string, number>, tagId: string, amount: number): void {
  into.set(tagId, (into.get(tagId) ?? 0) + amount)
}

/**
 * Resolve ambiguous words from their neighbours. Mirrors `applySenses` in the
 * backend's src/taxonomy/index.js; the parity test holds them together.
 */
function applySenses(words: string[], strong: Map<string, number>, weak: Map<string, number>): void {
  for (const sense of SENSES) {
    let occurrences = 0
    let displaced = 0
    for (let i = 0; i < words.length; i += 1) {
      if (!sense.terms.has(words[i])) continue
      occurrences += 1
      const from = Math.max(0, i - sense.window)
      const to = Math.min(words.length, i + sense.window + 1)
      const near = ` ${words.slice(from, to).join(" ")} `

      if (sense.suppress.some((phrase) => near.includes(` ${phrase} `))) {
        displaced += 1
        continue
      }

      let resolved = false
      let replaced = false
      let confirmed = false
      for (const rule of sense.rules) {
        if (rule.near.some((cue) => near.includes(` ${cue} `))) {
          bump(strong, rule.tag, SENSE_HIT)
          resolved = true
          if (rule.keepDefault && sense.default) bump(strong, sense.default, SENSE_HIT)
          if (rule.tag === sense.default || rule.keepDefault) confirmed = true
          else replaced = true
        }
      }
      if (replaced && !confirmed) {
        displaced += 1
      } else if (!resolved && sense.default) {
        bump(sense.weakDefault ? weak : strong, sense.default, sense.weakDefault ? WEAK_TOKEN_HIT : SENSE_HIT)
      }
    }
    if (sense.default && occurrences > 0 && displaced === occurrences) {
      strong.delete(sense.default)
      weak.delete(sense.default)
    }
  }
}

/**
 * Tag ids present in `text` with their evidence.
 *
 * Repeat mentions add sub-linearly — a listing that says "scholarship" nine
 * times is not nine times more about scholarships.
 */
export function matchTagsDetailed(
  text: string,
  language?: SupportedLanguage,
): Map<string, TagMatch> {
  const strong = new Map<string, number>()
  const weak = new Map<string, number>()
  const scored = new Map<string, TagMatch>()

  const normalized = normalizeText(text)
  if (!normalized) return scored

  const words = normalized.split(" ").filter(Boolean)
  if (words.length === 0) return scored

  if (MAX_PHRASE_WORDS > 1) {
    for (const gram of ngrams(words, MAX_PHRASE_WORDS)) {
      for (const tagId of PHRASE_INDEX.get(gram) ?? []) bump(strong, tagId, PHRASE_HIT)
      for (const tagId of WEAK_PHRASE_INDEX.get(gram) ?? []) bump(weak, tagId, WEAK_PHRASE_HIT)
    }
  }

  for (const word of words) {
    const stemmedWord = stem(word, language)

    const direct = TOKEN_INDEX.get(word)
    if (direct) {
      for (const tagId of direct) bump(strong, tagId, TOKEN_HIT)
    } else {
      for (const tagId of TOKEN_INDEX.get(stemmedWord) ?? []) bump(strong, tagId, STEMMED_HIT)
    }

    // Hints are scored independently of the strong ones: a word can be a firm
    // alias of one tag and a hint at another.
    const hinted = WEAK_TOKEN_INDEX.get(word) ?? WEAK_TOKEN_INDEX.get(stemmedWord)
    for (const tagId of hinted ?? []) bump(weak, tagId, WEAK_TOKEN_HIT)
  }

  applySenses(words, strong, weak)

  // Squash counts into 0..1 so a long description cannot outscore a precise one.
  for (const tagId of new Set([...strong.keys(), ...weak.keys()])) {
    const count = (strong.get(tagId) ?? 0) + (weak.get(tagId) ?? 0)
    if (count <= 0) continue
    scored.set(tagId, {
      strength: 1 - Math.exp(-count / SATURATION_TAU),
      weakOnly: !((strong.get(tagId) ?? 0) > 0),
    })
  }
  return scored
}

/** Tag ids present in `text`, each with a 0..1 strength. */
export function matchTags(
  text: string,
  language?: SupportedLanguage,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const [tagId, match] of matchTagsDetailed(text, language)) {
    out.set(tagId, match.strength)
  }
  return out
}

/**
 * Add related tags at reduced weight, so a "startup accelerator" listing still
 * surfaces for someone who only ticked "Business". A skill also lends weight to
 * its industry and an industry to nothing below it — "Accounting" says
 * "Finance", but "Finance" does not say which skill.
 */
export function expandRelated(tags: Map<string, number>): Map<string, number> {
  const expanded = new Map(tags)
  const raise = (id: string, weight: number) => {
    if ((expanded.get(id) ?? 0) < weight) expanded.set(id, weight)
  }
  for (const [tagId, weight] of tags) {
    const tag = TAG_BY_ID.get(tagId)
    if (!tag) continue
    for (const relatedId of tag.related ?? []) raise(relatedId, weight * RELATED_WEIGHT)
    if (tag.parent) raise(tag.parent, weight * PARENT_WEIGHT)
  }
  return expanded
}

/** Localised label for a tag, falling back to English, then to the id itself. */
export function tagLabel(tagId: string, language: SupportedLanguage): string {
  const tag = TAG_BY_ID.get(tagId)
  if (!tag) return tagId
  return tag.labels[language] || tag.label
}

/** Official tags from a list of ids, dropping anything not on the list. */
export function knownTagIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is string => typeof id === "string" && TAG_BY_ID.has(id))
}
