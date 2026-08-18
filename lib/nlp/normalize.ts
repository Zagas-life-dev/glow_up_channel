/**
 * Turning free text into comparable tokens.
 *
 * Everything downstream — tag matching, language detection, similarity — runs
 * on the output of `tokenize`, so the rules here decide what the algorithm can
 * see. Two decisions matter:
 *
 *   1. Accents are stripped. "Formación" and "formacion" are the same word to a
 *      user typing on a phone keyboard, and scraped listings are inconsistent
 *      about them. We lose the ñ/n distinction; that costs less than missing
 *      half the Spanish matches.
 *   2. Romance elisions are split. "L'entrepreneuriat" has to yield
 *      "entrepreneuriat" or every French listing misses its own tag.
 */

/** Combining marks left by NFD decomposition (U+0300–U+036F). */
const DIACRITICS = /[̀-ͯ]/g

/** l' d' j' n' s' c' m' t' qu' — French and Italian-style elisions. */
const ELISION = /\b(l|d|j|n|s|c|m|t|qu)['’]/gi

export function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(DIACRITICS, "")
}

/**
 * Lowercased, unaccented, punctuation-free text with single spaces.
 * Phrase matching runs against this form.
 */
export function normalizeText(text: string): string {
  if (!text) return ""
  return stripDiacritics(text)
    .replace(ELISION, "$1 ")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Words, minus the noise.
 *
 * Single characters go — they are almost always leftovers from elision or
 * punctuation splitting. Pure numbers go too: a listing full of dates and
 * salary figures should not match another listing on "2024".
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text)
  if (!normalized) return []
  return normalized.split(" ").filter((token) => token.length > 1 && !/^\d+$/.test(token))
}

/** Contiguous word runs of length 1..maxLength, for phrase lookup. */
export function ngrams(tokens: string[], maxLength: number): string[] {
  const out: string[] = []
  for (let size = 1; size <= maxLength; size += 1) {
    for (let i = 0; i + size <= tokens.length; i += 1) {
      out.push(tokens.slice(i, i + size).join(" "))
    }
  }
  return out
}

/** Word → how many times it appeared. */
export function termFrequency(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }
  return counts
}
