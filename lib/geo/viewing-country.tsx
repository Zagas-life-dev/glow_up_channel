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
 *   - `auto`      follow the detected/profile location (the default)
 *   - `anywhere`  ignore location entirely when ranking
 *   - a country   treat that country as the user's location
 */

import * as React from "react"

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

export function ViewingCountryProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelectionState] = React.useState<ViewingSelection>(AUTO)

  // Read in an effect, not during render — localStorage on the first render
  // would make the server and client markup disagree.
  React.useEffect(() => {
    try {
      setSelectionState(parse(localStorage.getItem(STORAGE_KEY)))
    } catch {
      // Private browsing; auto is a fine default.
    }
  }, [])

  const setSelection = React.useCallback((next: ViewingSelection) => {
    setSelectionState(next)
    try {
      const value = serialize(next)
      if (value === null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Choice still applies for this session.
    }
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
