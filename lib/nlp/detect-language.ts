/**
 * Which of our four languages is this text in?
 *
 * Scored on three kinds of evidence, because none is enough alone:
 *
 *   - stopword hits, which are reliable in long text and useless in a title
 *   - lexical markers — function words, suffixes and domain vocabulary — which
 *     work on short strings
 *   - accent evidence, which is decisive when present and absent from most
 *     scraped feeds
 *
 * Spanish and Portuguese are the hard pair — they share most stopwords — so the
 * markers below are chosen specifically to split them, and anything the two
 * spell identically (guia, empresa, modelo, curso, gratuito) is left out of
 * *both* lists: a word that fires for both adds noise to the total and nothing
 * to the decision.
 *
 * Deliberately conservative. A confident wrong guess would demote content for
 * the wrong audience, so ambiguous text resolves to `null` and the ranking
 * layer treats it as language-neutral rather than penalising it.
 *
 * Three rules exist to stop that promise being broken:
 *
 *   1. **Lexical markers run on accent-stripped text** and are spelled without
 *      accents. Half our corpus is scraped with the accents dropped, so a
 *      marker spelled with them only ever matched the tidy half of the data,
 *      and one spelled without them only ever matched the untidy half.
 *   2. **Domain words carry their plurals.** `\b`-anchoring meant "beca" never
 *      matched "becas" — the form listings actually use.
 *   3. **A winner needs absolute evidence, not just a share of the total.**
 *      Confidence is `winner / total`, so a lone 0.75 from the accent-free
 *      English bonus used to read as confidence 1.0 — which is how "becas",
 *      "bolsas" and "vagas" all came back as English.
 */

import { stripDiacritics, tokenizeForDetection } from "@/lib/nlp/normalize"
import { STOPWORDS } from "@/lib/nlp/stopwords"

export type SupportedLanguage = "en" | "fr" | "es" | "pt"

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "fr", "es", "pt"]

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)
}

type Marker = { pattern: RegExp; weight: number }

/**
 * Markers matched against the **accent-stripped** lowercase text, and therefore
 * written without accents.
 */
const LEXICAL_MARKERS: Record<SupportedLanguage, Marker[]> = {
  en: [
    { pattern: /\b(the|and|of|for|with|you|your|our|to|in|on|is|are)\b/g, weight: 1 },
    { pattern: /(tion|tions|ing|ings|ment|ments|ness|ship|ships|able|ible)\b/g, weight: 0.6 },
    // Spellings shared with another language are excluded on purpose: "guide",
    // "application" and "course" are also French words, and "resume" collides
    // with the accent-stripped form of the French "resume".
    {
      pattern:
        /\b(apply|deadline|opportunity|opportunities|available|training|scholarship|scholarships|internship|internships|template|templates|checklist|toolkit|workbook|worksheet|handbook|download|downloads|job|jobs|career|careers|hiring)\b/g,
      weight: 1.2,
    },
  ],
  fr: [
    { pattern: /\b(le|la|les|des|une|pour|avec|dans|vous|notre|du|aux|est|sont|cette)\b/g, weight: 1 },
    { pattern: /(eaux|ements|ement|ance|euse|ique|isation)\b/g, weight: 0.8 },
    {
      pattern:
        /\b(candidature|candidatures|bourse|bourses|stage|stages|formation|formations|emploi|emplois|entreprise|entreprises|gratuit|modele|modeles|guide|conseils|etudiant|etudiants)\b/g,
      weight: 1.5,
    },
  ],
  es: [
    { pattern: /\b(el|la|los|las|una|para|con|por|nuestro|usted|del|son|este|esta|y)\b/g, weight: 1 },
    { pattern: /(cion|ciones|dad|dades|mente|miento|mientos)\b/g, weight: 1 },
    {
      pattern:
        /\b(convocatoria|convocatorias|beca|becas|empleo|empleos|formacion|solicitud|solicitudes|plantilla|plantillas|estudiante|estudiantes|subvencion|emprendimiento|financiacion|capacitacion)\b/g,
      weight: 1.5,
    },
  ],
  pt: [
    { pattern: /\b(o|os|as|um|uma|nosso|nao|sao|voce|voces|do|da|dos|das|em|pelo|pela|mais)\b/g, weight: 1 },
    { pattern: /(cao|coes|ade|ades|mente|mento|mentos|agem)\b/g, weight: 1 },
    { pattern: /(nh|lh)[aeiou]/g, weight: 0.8 },
    {
      pattern:
        /\b(inscricao|inscricoes|bolsa|bolsas|emprego|empregos|formacao|formacoes|vaga|vagas|edital|editais|dicas|empreendedorismo|estudante|estudantes|curriculo)\b/g,
      weight: 1.5,
    },
  ],
}

/**
 * Markers matched against the **accented** lowercase text. Only characters that
 * genuinely belong to one language: c-cedilla, a-circumflex and e-circumflex are
 * French *and* Portuguese, so they are evidence for neither.
 */
const ACCENT_MARKERS: Record<SupportedLanguage, Marker[]> = {
  en: [],
  fr: [{ pattern: /[àèéêëîïôûù]/g, weight: 0.5 }],
  es: [{ pattern: /[ñ¿¡]/g, weight: 2 }],
  pt: [{ pattern: /[ãõ]/g, weight: 1.5 }],
}

/**
 * Weak positive evidence for English, since English shares almost no accented
 * characters with the others. Deliberately below `MIN_WINNER_SCORE`: on its own
 * it must never be enough to call a language, only to break a near-tie.
 */
const ACCENT_FREE_EN_BONUS = 0.5

/**
 * How much evidence the winner needs before we commit, in absolute score.
 * Guards the degenerate case where the total is tiny and *any* share of it
 * looks like certainty.
 */
const MIN_WINNER_SCORE = 1

/** Two languages this close are a tie, and a tie is an honest `null`. */
const TIE_EPSILON = 1e-9

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

  const accented = text.toLowerCase()
  const plain = stripDiacritics(accented)
  const tokens = tokenizeForDetection(text)
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

  for (const language of SUPPORTED_LANGUAGES) {
    // Diminishing returns throughout: ten accented endings are not ten times
    // the evidence of one.
    for (const { pattern, weight } of LEXICAL_MARKERS[language]) {
      const matches = plain.match(pattern)
      if (matches) scores[language] += Math.log2(1 + matches.length) * weight
    }
    for (const { pattern, weight } of ACCENT_MARKERS[language]) {
      const matches = accented.match(pattern)
      if (matches) scores[language] += Math.log2(1 + matches.length) * weight
    }
  }

  if (plain === accented) {
    scores.en += ACCENT_FREE_EN_BONUS
  }

  const total = SUPPORTED_LANGUAGES.reduce((sum, l) => sum + scores[l], 0)
  if (total <= 0) return { ...empty, scores }

  const ordered = [...SUPPORTED_LANGUAGES].sort((a, b) => scores[b] - scores[a])
  const winner = ordered[0]
  const runnerUp = ordered[1]
  const confidence = scores[winner] / total

  // A tie is not a winner. The old `reduce` kept the first language on an exact
  // tie, so Portuguese lost every es/pt draw to Spanish by list position alone.
  const tied = scores[runnerUp] >= scores[winner] - TIE_EPSILON

  const decided =
    !tied && scores[winner] >= MIN_WINNER_SCORE && confidence >= minConfidence

  return {
    language: decided ? winner : null,
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
