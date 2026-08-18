/**
 * Reducing a listing or a user to the same shape, so they can be compared.
 *
 * Both sides come out as a `TextProfile`: a language, a set of weighted tags,
 * and a bag of stemmed keywords. Everything the ranking layer needs to know
 * about *meaning* is in here; everything it needs to know about *place* is in
 * `lib/geo`.
 */

import {
  contentLanguage,
  detectLanguage,
  type SupportedLanguage,
} from "@/lib/nlp/detect-language"
import { termFrequency, tokenize } from "@/lib/nlp/normalize"
import { stemAll } from "@/lib/nlp/stem"
import { removeStopwords } from "@/lib/nlp/stopwords"
import { expandRelated, matchTags } from "@/lib/nlp/taxonomy"

export type TextProfile = {
  language: SupportedLanguage | null
  /** Tag id → 0..1 strength, related tags included. */
  tags: Map<string, number>
  /** Stemmed keyword → frequency. */
  keywords: Map<string, number>
}

/** A chunk of text and how much it counts. Titles beat descriptions. */
export type WeightedField = {
  text: string
  weight: number
}

const EMPTY_PROFILE: TextProfile = {
  language: null,
  tags: new Map(),
  keywords: new Map(),
}

/**
 * Build a profile from weighted fields.
 *
 * Weighting is done by repetition rather than by scaling afterwards, which
 * keeps the frequency counts honest: a term in the title genuinely does appear
 * more often in the weighted document.
 */
export function buildTextProfile(
  fields: WeightedField[],
  knownLanguage?: SupportedLanguage | null,
): TextProfile {
  const usable = fields.filter((f) => f.text && f.text.trim() && f.weight > 0)
  if (usable.length === 0) return EMPTY_PROFILE

  const language =
    knownLanguage ?? detectLanguage(usable.map((f) => f.text).join(" ")).language

  const tags = new Map<string, number>()
  const keywords = new Map<string, number>()

  for (const field of usable) {
    for (const [tagId, strength] of matchTags(field.text, language ?? undefined)) {
      const weighted = strength * field.weight
      if ((tags.get(tagId) ?? 0) < weighted) tags.set(tagId, weighted)
    }

    const tokens = stemAll(
      removeStopwords(tokenize(field.text), language ?? undefined),
      language ?? undefined,
    )
    for (const [token, count] of termFrequency(tokens)) {
      keywords.set(token, (keywords.get(token) ?? 0) + count * field.weight)
    }
  }

  // Clamp: field weights above 1 would otherwise push tags past full strength.
  for (const [tagId, weight] of tags) {
    tags.set(tagId, Math.min(1, weight))
  }

  return { language, tags: expandRelated(tags), keywords }
}

function asString(value: unknown): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string").join(" ")
  return ""
}

/**
 * Profile a content item.
 *
 * Publisher-supplied `tags` are trusted above prose — someone deliberately
 * tagged the listing — but they are still run through the taxonomy rather than
 * used raw, so "Bourses" and "Scholarships" land on the same id.
 */
export function profileContent(item: Record<string, unknown>): TextProfile {
  const language = contentLanguage(item)

  return buildTextProfile(
    [
      { text: asString(item.title) || asString(item.name), weight: 3 },
      { text: asString(item.tags), weight: 2.5 },
      { text: asString(item.category) || asString(item.type), weight: 2 },
      { text: asString(item.company) || asString(item.organization) || asString(item.provider), weight: 1 },
      { text: asString(item.description), weight: 1 },
      { text: asString(item.requirements), weight: 0.8 },
    ],
    language,
  )
}

/**
 * Profile a user from their onboarding answers.
 *
 * Interests and skills are what they explicitly asked for, so they dominate.
 * Field of study and aspirations are softer context and weigh less.
 */
export function profileUser(
  profile: {
    interests?: unknown
    skills?: unknown
    industrySectors?: unknown
    industry?: unknown
    aspirations?: unknown
    fieldOfStudy?: unknown
    careerStage?: unknown
  } | null | undefined,
  language?: SupportedLanguage | null,
): TextProfile {
  if (!profile) return EMPTY_PROFILE

  return buildTextProfile(
    [
      { text: asString(profile.interests), weight: 3 },
      { text: asString(profile.skills), weight: 2 },
      { text: asString(profile.industrySectors) || asString(profile.industry), weight: 2 },
      { text: asString(profile.aspirations), weight: 1.5 },
      { text: asString(profile.fieldOfStudy), weight: 1 },
    ],
    language,
  )
}
