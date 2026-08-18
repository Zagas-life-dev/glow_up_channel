"use client"

/**
 * Locale for the React tree.
 *
 * Reads the cookie the middleware set, so the first client render already
 * agrees with what the server decided — no flash of English before switching.
 * A user's explicit choice is written back to both the cookie and localStorage
 * so it survives a session and reaches the server on the next request.
 */

import * as React from "react"

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  LOCALE_TAGS,
  LOCALES,
  normalizeLocale,
  resolveLocale,
  secondaryLocales,
  type Locale,
} from "@/lib/i18n/config"
import { translatorFor, type Translator } from "@/lib/i18n/translate"

type LocaleContextValue = {
  locale: Locale
  /** Other languages this user likely reads — feeds the ranking layer. */
  secondary: Locale[]
  setLocale: (locale: Locale) => void
  t: Translator
  /** BCP-47 tag for `Intl.DateTimeFormat` and friends. */
  intlTag: string
  available: readonly Locale[]
  labels: Record<Locale, string>
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null)

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return
  // A year, site-wide. Lax is enough — this is a display preference, not a token.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
}

export function LocaleProvider({
  children,
  initialLocale,
  countryCode,
  profileLocale,
}: {
  children: React.ReactNode
  /** From the server (cookie or Accept-Language), to avoid a first-render flash. */
  initialLocale?: Locale
  /** The user's country, used to guess a locale and infer secondary languages. */
  countryCode?: string | null
  /** A saved preference on the user's profile, if there is one. */
  profileLocale?: string | null
}) {
  const [locale, setLocaleState] = React.useState<Locale>(
    initialLocale ?? DEFAULT_LOCALE,
  )
  // Only an explicit pick should override a later profile or country signal.
  const [explicit, setExplicit] = React.useState<Locale | null>(null)

  React.useEffect(() => {
    const stored =
      normalizeLocale(readCookie(LOCALE_COOKIE)) ??
      normalizeLocale(
        typeof window === "undefined" ? null : localStorage.getItem(LOCALE_STORAGE_KEY),
      )
    if (stored) setExplicit(stored)
  }, [])

  React.useEffect(() => {
    setLocaleState(
      resolveLocale({
        explicit,
        profile: profileLocale,
        browserLanguages: typeof navigator === "undefined" ? [] : navigator.languages,
        countryCode,
      }),
    )
  }, [explicit, profileLocale, countryCode])

  const setLocale = React.useCallback((next: Locale) => {
    setExplicit(next)
    setLocaleState(next)
    writeCookie(LOCALE_COOKIE, next)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // Private browsing. The cookie still carries the choice.
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = next
    }
  }, [])

  React.useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale
  }, [locale])

  const value = React.useMemo<LocaleContextValue>(() => {
    const browserLanguages =
      typeof navigator === "undefined" ? [] : Array.from(navigator.languages)
    return {
      locale,
      secondary: secondaryLocales(locale, countryCode, browserLanguages),
      setLocale,
      t: translatorFor(locale),
      intlTag: LOCALE_TAGS[locale],
      available: LOCALES,
      labels: LOCALE_LABELS,
    }
  }, [locale, countryCode, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/**
 * Locale and translator.
 *
 * Falls back to a working English translator when no provider is mounted, so a
 * component that ends up outside the tree renders readable text instead of
 * throwing. Wrapping the app in `LocaleProvider` is still what you want.
 */
export function useLocale(): LocaleContextValue {
  const context = React.useContext(LocaleContext)
  if (context) return context

  return {
    locale: DEFAULT_LOCALE,
    secondary: [],
    setLocale: () => {},
    t: translatorFor(DEFAULT_LOCALE),
    intlTag: LOCALE_TAGS[DEFAULT_LOCALE],
    available: LOCALES,
    labels: LOCALE_LABELS,
  }
}

/** Just the translator, for components that do not need the rest. */
export function useTranslation(): Translator {
  return useLocale().t
}
