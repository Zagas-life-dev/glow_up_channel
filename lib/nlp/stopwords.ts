/**
 * Words that carry no signal, per language.
 *
 * Used twice: dropped before similarity scoring, and counted as evidence during
 * language detection. Stored unaccented because everything is compared post-
 * `normalizeText` — "à" is "a", "où" is "ou".
 *
 * Kept to genuinely empty words. Anything that could plausibly appear in a tag
 * ("social", "public", "digital") stays out of these lists.
 */

import type { SupportedLanguage } from "@/lib/nlp/detect-language"

const EN = `a about above after again against all am an and any are as at be because been before being
below between both but by can cannot could did do does doing down during each few for from further had
has have having he her here hers herself him himself his how i if in into is it its itself just me more
most my myself no nor not of off on once only or other our ours out over own same she should so some
such than that the their theirs them themselves then there these they this those through to too under
until up very was we were what when where which while who whom why will with you your yours`

const FR = `a ai aux avec ce ces dans de des du elle en et eux il ils je la le les leur lui ma mais me
meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu
un une vos votre vous y etre avoir cela cette ceux comme donc dont ils lors mais ni plus quand sans si
sont soit tout tous toute toutes est ete etait sera seront aussi apres avant chez encore entre jusqu
meme peu tres deja alors ainsi`

const ES = `a al algo algunas algunos ante antes como con contra cual cuando de del desde donde dos el
ella ellas ellos en entre era erais eran eres es esa esas ese eso esos esta estas este esto estos ha
hasta hay la las le les lo los mas me mi mis mucho muy nada ni no nos nosotros o os otra otras otro
otros para pero poco por porque que quien se sea ser si sin sobre su sus tambien tanto te tener ti tu
tus un una uno unos vosotros y ya fue fueron son sido siendo entonces asi`

const PT = `a ao aos as ate com como da das de dela dele deles depois do dos e ela elas ele eles em
entre era eram essa essas esse esses esta estas este estes eu foi fomos for foram fosse isso isto ja la
lhe lhes mais mas me mesmo meu meus minha minhas muito na nao nas nem no nos nossa nossas nosso nossos
num numa o os ou para pela pelas pelo pelos por qual quando que quem se sem ser seu seus so sua suas
tambem te tem tinha ter teu teus tu tua tuas um uma umas uns voce voces assim entao`

function toSet(text: string): Set<string> {
  return new Set(text.split(/\s+/).filter(Boolean))
}

export const STOPWORDS: Record<SupportedLanguage, Set<string>> = {
  en: toSet(EN),
  fr: toSet(FR),
  es: toSet(ES),
  pt: toSet(PT),
}

/** Union of every list — for when the language is unknown or mixed. */
export const ALL_STOPWORDS: Set<string> = new Set(
  Object.values(STOPWORDS).flatMap((set) => Array.from(set)),
)

export function isStopword(token: string, language?: SupportedLanguage): boolean {
  return language ? STOPWORDS[language].has(token) : ALL_STOPWORDS.has(token)
}

/**
 * Drop stopwords.
 *
 * Without a known language it removes the union of all four lists, which is the
 * right trade for multilingual content: a stray French "sur" in an English
 * listing is noise either way.
 */
export function removeStopwords(
  tokens: string[],
  language?: SupportedLanguage,
): string[] {
  return tokens.filter((token) => !isStopword(token, language))
}
