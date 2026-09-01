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
 *
 * Two properties the rules must hold, because keyword overlap depends on them:
 *
 *   1. **Singular and plural must converge.** If "course" and "courses" stem
 *      apart, a listing about courses shares no keyword with a reader who wrote
 *      "course", and the cosine term silently loses the match.
 *   2. **Stemming is idempotent.** `stem(stem(x))` must equal `stem(x)`, or the
 *      indexed form of an alias can differ from the form a query stems to.
 *
 * Both used to fail on the same family of words — anything ending in "ss".
 */

import type { SupportedLanguage } from "@/lib/nlp/detect-language"

/** Never strip below this many characters — the stem stops being a word. */
const MIN_STEM = 4

/** Safety bound on the fixpoint loop below; two passes settle every rule here. */
const MAX_PASSES = 3

type Rule = { suffix: string; replacement: string; minLength?: number }

/** Applied in order, first match wins. Longest suffixes must come first. */
const RULES: Record<SupportedLanguage, Rule[]> = {
  en: [
    { suffix: "ies", replacement: "y", minLength: 5 },
    // These four shorten by two, so six characters is enough to leave a stem of
    // MIN_STEM. The inherited default of `suffix.length + MIN_STEM` was too
    // strict and let the plain "s" rule take the word instead: "classes" became
    // "classe" and "coaches" became "coache", neither of which their own
    // singular stems to.
    { suffix: "sses", replacement: "ss", minLength: 6 },
    { suffix: "ches", replacement: "ch", minLength: 6 },
    { suffix: "shes", replacement: "sh", minLength: 6 },
    { suffix: "xes", replacement: "x", minLength: 6 },
    { suffix: "ships", replacement: "ship" },
    { suffix: "ments", replacement: "ment" },
    { suffix: "ings", replacement: "ing" },
    // No "ses" -> "s" rule. It was meant for "gases" -> "gas" but caught every
    // "-se" noun on the way: "courses" -> "cours", "cases" -> "cas". The plain
    // "s" rule below handles all of them correctly.
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
      const candidate = stemWith(token, RULES[key])
      if (candidate.length < shortest.length) shortest = candidate
    }
    return shortest
  }

  return stemWith(token, RULES[language])
}

/** Apply the ruleset until the token stops changing, so stemming is idempotent. */
function stemWith(token: string, rules: Rule[]): string {
  let current = token
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const next = applyRules(current, rules)
    if (next === current) return current
    current = next
  }
  return current
}

function applyRules(token: string, rules: Rule[]): string {
  // A word ending in "ss" is already singular — "business", "class", "process".
  // Without this the plain "s" rule shortens them to "busines"/"clas"/"proces",
  // which their own plurals ("businesses" -> "business") never stem to. Checked
  // for every language so the no-language path cannot strip it via another
  // ruleset's "s" rule either.
  if (token.endsWith("ss")) return token

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
