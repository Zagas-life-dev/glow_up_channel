/**
 * Which of our four languages is this text in?
 *
 * Scored on two kinds of evidence, because neither is enough alone:
 *
 *   - stopword hits, which are reliable in long text and useless in a title
 *   - orthographic markers ("ção", "ñ", "ment "), which work on short strings
 *     but misfire on loanwords
 *
 * Spanish and Portuguese are the hard pair — they share most stopwords — so the
 * markers below are chosen specifically to split them: -ção/-ões/nh/lh are
 * Portuguese, ñ/-ción/-dad are Spanish.
 *
 * Deliberately conservative. A confident wrong guess would demote content for
 * the wrong audience, so ambiguous text resolves to `null` and the ranking
 * layer treats it as language-neutral rather than penalising it.
 */

import { stripDiacritics, tokenize } from "@/lib/nlp/normalize"
import { STOPWORDS } from "@/lib/nlp/stopwords"

export type SupportedLanguage = "en" | "fr" | "es" | "pt"

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "fr", "es", "pt"]

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)
}

/**
 * Substrings that betray a language. Matched against the *accented* lowercase
 * text, since the accents are half the evidence.
 */
const MARKERS: Record<SupportedLanguage, { pattern: RegExp; weight: number }[]> = {
  en: [
    { pattern: /\b(the|and|of|for|with|you|your|our)\b/g, weight: 1 },
    { pattern: /(tion|ing|ment|ness|ship|able)\b/g, weight: 0.6 },
    { pattern: /\b(apply|deadline|opportunity|available|training)\b/g, weight: 1.2 },
  ],
  fr: [
    { pattern: /\b(le|la|les|des|une|pour|avec|dans|vous|notre)\b/g, weight: 1 },
    { pattern: /(eaux|ements?|ité|ance|euse|ique)\b/g, weight: 0.8 },
    { pattern: /[àâçèéêëîïôûù]/g, weight: 0.5 },
    { pattern: /\b(candidature|bourse|stage|formation|emploi|entreprise)\b/g, weight: 1.5 },
  ],
  es: [
    { pattern: /\b(el|la|los|las|una|para|con|por|nuestro|usted)\b/g, weight: 1 },
    { pattern: /(ción|ciones|dad|mente|miento)\b/g, weight: 1 },
    { pattern: /[ñ¿¡]/g, weight: 2 },
    { pattern: /\b(convocatoria|beca|empleo|formacion|empresa|solicitud)\b/g, weight: 1.5 },
  ],
  pt: [
    { pattern: /\b(o|os|as|uma|para|com|nosso|você|não|são)\b/g, weight: 1 },
    { pattern: /(ção|ções|ade|mente|mento)\b/g, weight: 1 },
    { pattern: /(nh|lh)[aeiou]/g, weight: 0.8 },
    { pattern: /[ãõâê]/g, weight: 1.5 },
    { pattern: /\b(inscrição|bolsa|emprego|formação|empresa|vaga)\b/g, weight: 1.5 },
  ],
}

export type LanguageGuess = {
  language: SupportedLanguage | null
  /** 0..1. Below `minConfidence` the language comes back null. */
  confidence: number
  scores: Record<SupportedLanguage, number>
}

/**
 * Best guess at the language of `text`.
 *
 * @param minConfidence how far ahead the winner must be, as a share of total
 *   score, before we commit. 0.34 means "clearly ahead of a four-way tie".
 */
export function detectLanguage(text: string, minConfidence = 0.34): LanguageGuess {
  const scores: Record<SupportedLanguage, number> = { en: 0, fr: 0, es: 0, pt: 0 }
  const empty: LanguageGuess = { language: null, confidence: 0, scores }

  if (!text || !text.trim()) return empty

  const lower = text.toLowerCase()
  const tokens = tokenize(text)
  if (tokens.length === 0) return empty

  // Stopword evidence, normalised by length so long text does not swamp the
  // markers. Tokens are unaccented; the stopword lists are too.
  for (const language of SUPPORTED_LANGUAGES) {
    const list = STOPWORDS[language]
    let hits = 0
    for (const token of tokens) {
      if (list.has(token)) hits += 1
    }
    scores[language] += (hits / tokens.length) * 10
  }

  // Orthographic evidence, on the accented original.
  for (const language of SUPPORTED_LANGUAGES) {
    for (const { pattern, weight } of MARKERS[language]) {
      const matches = lower.match(pattern)
      if (matches) {
        // Diminishing returns: ten "ção"s are not ten times the evidence.
        scores[language] += Math.log2(1 + matches.length) * weight
      }
    }
  }

  // English shares almost no accented characters with the others, so an
  // accent-free text is weak positive evidence for English.
  if (stripDiacritics(lower) === lower) {
    scores.en += 0.75
  }

  const total = SUPPORTED_LANGUAGES.reduce((sum, l) => sum + scores[l], 0)
  if (total <= 0) return { ...empty, scores }

  const winner = SUPPORTED_LANGUAGES.reduce((best, l) =>
    scores[l] > scores[best] ? l : best,
  )
  const confidence = scores[winner] / total

  return {
    language: confidence >= minConfidence ? winner : null,
    confidence,
    scores,
  }
}

/**
 * Language of a content item, preferring what the publisher declared over what
 * we can infer. Falls back to reading the title and description.
 */
export function contentLanguage(item: {
  language?: unknown
  locale?: unknown
  title?: unknown
  description?: unknown
}): SupportedLanguage | null {
  const declared = item.language ?? item.locale
  if (typeof declared === "string") {
    const base = declared.split(/[-_]/)[0].toLowerCase()
    if (isSupportedLanguage(base)) return base
  }

  const title = typeof item.title === "string" ? item.title : ""
  const description = typeof item.description === "string" ? item.description : ""
  const text = `${title} ${title} ${description}`.trim()
  if (!text) return null

  return detectLanguage(text).language
}
