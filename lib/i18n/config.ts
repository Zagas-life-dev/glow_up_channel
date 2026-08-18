/**
 * Locale selection.
 *
 * No `/fr/...` route segments. Adding them would mean rewriting every link and
 * `router.push` in the app and re-keying the sitemap, for a payoff this feature
 * does not need — the language affects what the algorithm ranks and what labels
 * render, not what URL you are on. A cookie plus a context provider does that,
 * and leaves the door open to route-based locales later.
 *
 * Precedence, most to least trusted:
 *   1. explicit choice (cookie / stored preference) — they picked it
 *   2. the saved profile preference
 *   3. the browser's Accept-Language
 *   4. the country they are in
 *   5. English
 */

import { countryByCode } from "@/lib/geo/countries"
import {
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/nlp/detect-language"

export type Locale = SupportedLanguage

export const LOCALES = SUPPORTED_LANGUAGES
export const DEFAULT_LOCALE: Locale = "en"

export const LOCALE_COOKIE = "glowup-locale"
export const LOCALE_STORAGE_KEY = "glowup-locale"

/** Names written in their own language — never translate a language menu. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  pt: "Português",
}

/** BCP-47 tags for `Intl` — dates and numbers, not content. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-GB",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
}

export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== "string") return null
  const base = value.trim().split(/[-_]/)[0].toLowerCase()
  return isSupportedLanguage(base) ? base : null
}

/**
 * Parse an `Accept-Language` header, honouring the q-values.
 * Returns the first supported language, or null.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null

  const entries = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";")
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2)
      const quality = q === undefined ? 1 : Number(q)
      return { tag, quality: Number.isFinite(quality) ? quality : 0 }
    })
    .filter((entry) => entry.tag && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality)

  for (const entry of entries) {
    const locale = normalizeLocale(entry.tag)
    if (locale) return locale
  }
  return null
}

/** The language most likely to be read in a given country. */
export function localeFromCountry(countryCode: string | null | undefined): Locale | null {
  const country = countryByCode(countryCode)
  if (!country) return null
  for (const language of country.languages) {
    if (isSupportedLanguage(language)) return language
  }
  return null
}

/** Apply the precedence chain. First non-null wins. */
export function resolveLocale(sources: {
  explicit?: unknown
  profile?: unknown
  acceptLanguage?: string | null
  browserLanguages?: readonly string[]
  countryCode?: string | null
}): Locale {
  const explicit = normalizeLocale(sources.explicit)
  if (explicit) return explicit

  const profile = normalizeLocale(sources.profile)
  if (profile) return profile

  const accept = localeFromAcceptLanguage(sources.acceptLanguage)
  if (accept) return accept

  for (const tag of sources.browserLanguages ?? []) {
    const locale = normalizeLocale(tag)
    if (locale) return locale
  }

  return localeFromCountry(sources.countryCode) ?? DEFAULT_LOCALE
}

/**
 * Languages the user probably reads beyond their chosen one.
 *
 * Used by the ranking layer so a Cameroonian reading the site in French is not
 * shown English listings as if they were foreign.
 */
export function secondaryLocales(
  primary: Locale,
  countryCode: string | null | undefined,
  browserLanguages: readonly string[] = [],
): Locale[] {
  const found = new Set<Locale>()

  const country = countryByCode(countryCode)
  for (const language of country?.languages ?? []) {
    if (isSupportedLanguage(language) && language !== primary) found.add(language)
  }

  for (const tag of browserLanguages) {
    const locale = normalizeLocale(tag)
    if (locale && locale !== primary) found.add(locale)
  }

  return Array.from(found)
}
