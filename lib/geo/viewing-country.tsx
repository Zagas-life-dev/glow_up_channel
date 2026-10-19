"use client"

/**
 * Which country the user is *browsing*, as opposed to where they physically are.
 *
 * Deliberately stores only the override — it knows nothing about geolocation.
 * "Where are they" is `useUserLocation`'s job; this answers "did they ask to
 * look somewhere else". `usePersonalizedRanking` combines the two, which keeps
 * either one testable on its own.
 *
 * Three states:
 *   - `auto`      follow where the reader is (the default) — filters the feeds
 *                 to that country, see `autoCountryName`
 *   - `anywhere`  ignore location entirely: no filter
 *   - a country   treat that country as the user's location
 */

import * as React from "react"

import { countryByCode, lookupCountry } from "@/lib/geo/countries"
import { countryFromBrowser } from "@/lib/geo/timezone"
import { reloadWithFreshData } from "@/lib/offline/fresh-reload"

/** Sentinel stored for "anywhere" — not a real ISO code, so it cannot collide. */
const ANYWHERE = "*"
const STORAGE_KEY = "glowup-viewing-country"

export type ViewingSelection =
  | { mode: "auto" }
  | { mode: "anywhere" }
  | { mode: "country"; countryCode: string }

export const AUTO: ViewingSelection = { mode: "auto" }

type ViewingCountryValue = {
  selection: ViewingSelection
  setSelection: (selection: ViewingSelection) => void
  /** The chosen ISO code, or undefined for auto/anywhere. */
  overrideCountryCode: string | undefined
  /** True when the user has picked anything other than "follow my location". */
  isOverridden: boolean
  reset: () => void
}

const ViewingCountryContext = React.createContext<ViewingCountryValue | null>(null)

function parse(stored: string | null): ViewingSelection {
  if (!stored) return AUTO
  if (stored === ANYWHERE) return { mode: "anywhere" }
  if (/^[A-Z]{2}$/.test(stored)) return { mode: "country", countryCode: stored }
  return AUTO
}

function serialize(selection: ViewingSelection): string | null {
  if (selection.mode === "auto") return null
  if (selection.mode === "anywhere") return ANYWHERE
  return selection.countryCode
}

/**
 * A country switch changes what every feed on the page should contain, and the
 * session feed caches, the feed seed and the service worker's API cache were
 * all filled for the old country. Rather than invalidate each one in place,
 * drop them and reload so every page fetches fresh for the new country.
 */
function reloadForCountry(): Promise<void> {
  return reloadWithFreshData()
}

/**
 * The stores the choice is kept in, most durable first. sessionStorage is the
 * fallback for browsers that block localStorage: the switch reloads the page,
 * and a choice that lived only in memory would be gone when it came back.
 */
function stores(): Storage[] {
  if (typeof window === "undefined") return []
  const found: Storage[] = []
  for (const pick of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      const store = pick()
      if (store) found.push(store)
    } catch {
      // Access itself throws when storage is blocked.
    }
  }
  return found
}

function readStored(): string | null {
  for (const store of stores()) {
    try {
      const value = store.getItem(STORAGE_KEY)
      if (value !== null) return value
    } catch {
      // Try the next store.
    }
  }
  return null
}

/** Writes to the first store that accepts it and clears the others. */
function writeStored(value: string | null): void {
  let written = false
  for (const store of stores()) {
    try {
      if (value === null || written) store.removeItem(STORAGE_KEY)
      else {
        store.setItem(STORAGE_KEY, value)
        written = true
      }
    } catch {
      // Try the next store.
    }
  }
}

/**
 * The saved choice, readable outside React. The feed fetchers use this so every
 * caller — the page and the background prefetcher alike — asks the API for the
 * same country; the switch reloads the page, so it cannot go stale mid-session.
 */
export function readViewingSelection(): ViewingSelection {
  return parse(readStored())
}

/** Where `useUserLocation` caches its IP reading. Read-only here. */
const LOCATION_CACHE_KEY = "glowup-location"

/**
 * The country the reader is physically in, for Auto. Readable outside React,
 * like the rest of this module, so every feed fetch agrees on it.
 *
 * Auto used to re-rank only, so a reader in Lagos still got Nairobi listings
 * further down. The user decided Auto filters like a picked country does.
 *
 * Sources, best first: the IP reading `useUserLocation` cached (from CDN geo
 * headers in production), then the browser's timezone, which is always there —
 * and the only source on localhost. The profile country is not used: it says
 * where someone registered, not where they are browsing from. Null when
 * neither knows, and then nothing is filtered.
 */
export function autoCountryName(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(LOCATION_CACHE_KEY)
    const ip = raw ? (JSON.parse(raw) as { ip?: { country?: string; countryCode?: string } }).ip : null
    const fromIp = ip ? countryByCode(ip.countryCode) ?? lookupCountry(ip.country) : null
    if (fromIp) return fromIp.name
  } catch {
    // Blocked or corrupt storage: fall through to the timezone.
  }
  return countryFromBrowser()?.name ?? null
}

/**
 * The country name the feeds filter on, or null for anywhere (or an Auto that
 * cannot tell where the reader is). Listings store the country as a name
 * ("Nigeria"), not an ISO code.
 */
export function viewingCountryName(selection: ViewingSelection = readViewingSelection()): string | null {
  if (selection.mode === "anywhere") return null
  if (selection.mode === "auto") return autoCountryName()
  return countryByCode(selection.countryCode)?.name ?? null
}

/**
 * `url` with the picked country added as `?country=`, unchanged when none is
 * picked. For the promoted endpoints, which apply the same country-plus-Global
 * rule as the organic feed — without it a sponsored card from another country
 * lands in a feed that otherwise holds none.
 */
export function withViewingCountryParam(url: string): string {
  const country = viewingCountryName()
  if (!country) return url
  return `${url}${url.includes("?") ? "&" : "?"}country=${encodeURIComponent(country)}`
}

export function ViewingCountryProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelectionState] = React.useState<ViewingSelection>(AUTO)

  // Read in an effect, not during render — storage on the first render would
  // make the server and client markup disagree.
  React.useEffect(() => {
    setSelectionState(readViewingSelection())
  }, [])

  const setSelection = React.useCallback((next: ViewingSelection) => {
    const value = serialize(next)
    const previous = readStored()
    writeStored(value)
    setSelectionState(next)

    // Re-picking the current country is a no-op, not a reload.
    if (previous === value) return
    // Every feed on the page was filled for the old country: clear the caches
    // and reload so each one fetches fresh for the new one.
    void reloadForCountry()
  }, [])

  const value = React.useMemo<ViewingCountryValue>(
    () => ({
      selection,
      setSelection,
      overrideCountryCode:
        selection.mode === "country" ? selection.countryCode : undefined,
      isOverridden: selection.mode !== "auto",
      reset: () => setSelection(AUTO),
    }),
    [selection, setSelection],
  )

  return (
    <ViewingCountryContext.Provider value={value}>
      {children}
    </ViewingCountryContext.Provider>
  )
}

/**
 * Falls back to a no-op "auto" when no provider is mounted, so ranking outside
 * the provider behaves exactly as it did before this feature existed.
 */
export function useViewingCountry(): ViewingCountryValue {
  const context = React.useContext(ViewingCountryContext)
  if (context) return context

  return {
    selection: AUTO,
    setSelection: () => {},
    overrideCountryCode: undefined,
    isOverridden: false,
    reset: () => {},
  }
}
