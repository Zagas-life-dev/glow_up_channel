/**
 * Light suffix stripping, so "formations" and "formation" count as one word.
 *
 * Not a Snowball port and not trying to be. A full stemmer buys accuracy we
 * cannot use — the taxonomy already carries explicit aliases for the terms that
 * matter — while adding failure modes that are miserable to debug across four
 * languages. This only collapses inflection: plurals, and the handful of
 * derivational endings that show up constantly in listings.
 *
 * Short words are left alone. Over-stemming "arts" to "art" is fine;
 * over-stemming "les" to "le" would collide with real vocabulary.
 */

import type { SupportedLanguage } from "@/lib/nlp/detect-language"

/** Never strip below this many characters — the stem stops being a word. */
const MIN_STEM = 4

type Rule = { suffix: string; replacement: string; minLength?: number }

/** Applied in order, first match wins. Longest suffixes must come first. */
const RULES: Record<SupportedLanguage, Rule[]> = {
  en: [
    { suffix: "ies", replacement: "y", minLength: 5 },
    { suffix: "sses", replacement: "ss" },
    { suffix: "ships", replacement: "ship" },
    { suffix: "ments", replacement: "ment" },
    { suffix: "ings", replacement: "ing" },
    { suffix: "ches", replacement: "ch" },
    { suffix: "shes", replacement: "sh" },
    { suffix: "xes", replacement: "x" },
    { suffix: "ses", replacement: "s" },
    { suffix: "s", replacement: "", minLength: 4 },
  ],
  fr: [
    { suffix: "eaux", replacement: "eau" },
    { suffix: "ements", replacement: "ement" },
    { suffix: "ations", replacement: "ation" },
    { suffix: "ances", replacement: "ance" },
    { suffix: "ences", replacement: "ence" },
    { suffix: "elles", replacement: "el" },
    { suffix: "ives", replacement: "if" },
    { suffix: "aux", replacement: "al" },
    { suffix: "eux", replacement: "eux" },
    { suffix: "es", replacement: "e", minLength: 5 },
    { suffix: "s", replacement: "", minLength: 4 },
    { suffix: "x", replacement: "", minLength: 4 },
  ],
  es: [
    { suffix: "ciones", replacement: "cion" },
    { suffix: "mientos", replacement: "miento" },
    { suffix: "dades", replacement: "dad" },
    { suffix: "ismos", replacement: "ismo" },
    { suffix: "adores", replacement: "ador" },
    { suffix: "ces", replacement: "z" },
    { suffix: "es", replacement: "", minLength: 5 },
    { suffix: "s", replacement: "", minLength: 4 },
  ],
  pt: [
    { suffix: "coes", replacement: "cao" },
    { suffix: "oes", replacement: "ao" },
    { suffix: "aes", replacement: "ao" },
    { suffix: "mentos", replacement: "mento" },
    { suffix: "dades", replacement: "dade" },
    { suffix: "adores", replacement: "ador" },
    { suffix: "ais", replacement: "al" },
    { suffix: "eis", replacement: "el" },
    { suffix: "veis", replacement: "vel" },
    { suffix: "ns", replacement: "m" },
    { suffix: "es", replacement: "", minLength: 5 },
    { suffix: "s", replacement: "", minLength: 4 },
  ],
}

/**
 * Stem one token. With no language, every ruleset is tried and the shortest
 * result wins — the right behaviour for mixed-language corpora, where a French
 * word can appear in an English listing.
 */
export function stem(token: string, language?: SupportedLanguage): string {
  if (!token || token.length <= MIN_STEM) return token

  if (!language) {
    let shortest = token
    for (const key of Object.keys(RULES) as SupportedLanguage[]) {
      const candidate = applyRules(token, RULES[key])
      if (candidate.length < shortest.length) shortest = candidate
    }
    return shortest
  }

  return applyRules(token, RULES[language])
}

function applyRules(token: string, rules: Rule[]): string {
  for (const rule of rules) {
    if (!token.endsWith(rule.suffix)) continue
    if (token.length < (rule.minLength ?? rule.suffix.length + MIN_STEM)) continue
    const stemmed = token.slice(0, token.length - rule.suffix.length) + rule.replacement
    return stemmed.length >= MIN_STEM ? stemmed : token
  }
  return token
}

export function stemAll(tokens: string[], language?: SupportedLanguage): string[] {
  return tokens.map((token) => stem(token, language))
}
