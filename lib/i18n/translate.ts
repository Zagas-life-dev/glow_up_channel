/**
 * Key lookup and placeholder substitution.
 *
 * `TranslationKey` is derived from the English dictionary, so `t("reasons.foo")`
 * is a compile error if `foo` does not exist. That is the whole reason the
 * dictionaries are typed objects rather than JSON — a mistyped key should fail
 * the build, not render blank in production.
 */

import { type Dictionary, en } from "@/lib/i18n/dictionaries/en"
import { es } from "@/lib/i18n/dictionaries/es"
import { fr } from "@/lib/i18n/dictionaries/fr"
import { pt } from "@/lib/i18n/dictionaries/pt"
import type { Locale } from "@/lib/i18n/config"

export const DICTIONARIES: Record<Locale, Dictionary> = { en, fr, es, pt }

/** Dot-separated paths to every string in the dictionary. */
export type TranslationKey = {
  [Section in keyof Dictionary]: `${Section & string}.${keyof Dictionary[Section] & string}`
}[keyof Dictionary]

export type TranslationParams = Record<string, string | number>

function lookup(dictionary: Dictionary, key: string): string | undefined {
  const [section, entry] = key.split(".")
  if (!section || !entry) return undefined
  const group = (dictionary as Record<string, Record<string, string>>)[section]
  return group?.[entry]
}

/** Replaces `{name}` with `params.name`; unknown placeholders are left alone. */
export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

/**
 * Translate a key.
 *
 * Falls back to English when a key is missing from a translation, and to the
 * key itself if it is missing everywhere — a visible `reasons.closingSoon` in
 * the UI is a bug report; an empty string is a silent one.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const template = lookup(DICTIONARIES[locale] ?? en, key) ?? lookup(en, key) ?? key
  return interpolate(template, params)
}

export type Translator = (key: TranslationKey, params?: TranslationParams) => string

export function translatorFor(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params)
}
