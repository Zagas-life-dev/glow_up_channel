"use client"

/**
 * The user's location, from all three sources, with the GPS prompt under the
 * caller's control.
 *
 * Deliberately does *not* ask for GPS on mount. A cold `navigator.geolocation`
 * call fires the browser's permission dialog with no explanation, and a denial
 * is permanent per-origin — one bad prompt costs that user's precise location
 * forever. `requestPrecise()` exists so a UI can explain first and ask second.
 *
 * IP and profile readings need no permission and load immediately.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { isUsableLocation, resolveLocation } from "@/lib/geo/resolve"
import { countryFromBrowser } from "@/lib/geo/timezone"
import type {
  GeolocationPermission,
  LocationReading,
  ResolvedLocation,
} from "@/lib/geo/types"

const CACHE_KEY = "glowup-location"
/** A GPS fix is good for a day; people do not move continents hourly. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type CachedReadings = {
  gps?: LocationReading
  ip?: LocationReading
  /** Derived locally each load, never cached — it costs nothing to recompute. */
  locale?: LocationReading
}

/**
 * The browser's own guess at the country, from its timezone.
 *
 * Synchronous and always available, so it gives the feed something to rank with
 * on the very first render — and it is the only thing that works at all on
 * localhost or any host without CDN geo headers, where `/api/geo` correctly
 * reports nothing.
 */
function localeReading(): LocationReading | null {
  const country = countryFromBrowser()
  if (!country) return null
  return {
    country: country.name,
    countryCode: country.code,
    source: "locale",
    capturedAt: new Date().toISOString(),
  }
}

function readCache(): CachedReadings {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CachedReadings
    const fresh = (reading?: LocationReading): LocationReading | undefined => {
      if (!reading?.capturedAt) return undefined
      const age = Date.now() - new Date(reading.capturedAt).getTime()
      return age >= 0 && age < CACHE_TTL_MS ? reading : undefined
    }
    return { gps: fresh(parsed.gps), ip: fresh(parsed.ip) }
  } catch {
    return {}
  }
}

function writeCache(readings: CachedReadings): void {
  if (typeof window === "undefined") return
  try {
    // Only the readings that cost something to obtain. `locale` is derived from
    // the timezone on every load, so persisting it would just risk serving a
    // stale country to someone who has since travelled.
    const { gps, ip } = readings
    localStorage.setItem(CACHE_KEY, JSON.stringify({ gps, ip }))
  } catch {
    // Private browsing / quota. Losing the cache only costs a refetch.
  }
}

/**
 * One `/api/geo` call per page load, shared by every hook instance.
 *
 * Several components legitimately want the location at once (the feed, the
 * country picker, the onboarding step). Without this they would each fire their
 * own request before any of them had written the cache — the same pattern
 * `use-search-facets` uses for the same reason.
 */
let geoRequest: Promise<LocationReading | null> | null = null

function fetchIpReading(): Promise<LocationReading | null> {
  if (geoRequest) return geoRequest

  geoRequest = fetch("/api/geo")
    .then((response) => (response.ok ? response.json() : null))
    .then((json: { available?: boolean; reading?: LocationReading } | null) =>
      json?.available && json.reading ? json.reading : null,
    )
    .catch(() => null)

  return geoRequest
}

/** Clears the stored readings — for a "stop using my location" control. */
export function forgetCachedLocation(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}

/** What the onboarding profile recorded, in reading shape. */
export function profileLocationReading(profile: {
  country?: string
  province?: string
  city?: string
  updatedAt?: string
} | null | undefined): LocationReading | null {
  if (!profile) return null
  if (!profile.country && !profile.city) return null
  return {
    country: profile.country,
    region: profile.province,
    city: profile.city,
    source: "profile",
    capturedAt: profile.updatedAt ?? new Date().toISOString(),
  }
}

export type UseUserLocation = {
  location: ResolvedLocation
  /** True until the silent (IP) lookup has settled. */
  loading: boolean
  /** Whether we have enough to personalise with. */
  usable: boolean
  permission: GeolocationPermission
  /** Fires the browser prompt. Resolves to the fix, or null if refused. */
  requestPrecise: () => Promise<LocationReading | null>
  /** Drops stored readings and falls back to the profile alone. */
  clearPrecise: () => void
}

export function useUserLocation(
  profileReading?: LocationReading | null,
): UseUserLocation {
  const [readings, setReadings] = useState<CachedReadings>({})
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState<GeolocationPermission>("unknown")
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Cached readings first so the feed has something to rank with on first paint.
  useEffect(() => {
    const cached = readCache()
    // Derived in an effect rather than during render: the timezone is a client
    // fact, and reading it while rendering would desync server and client HTML.
    const fromLocale = localeReading()
    if (cached.gps || cached.ip || fromLocale) {
      setReadings({ ...cached, ...(fromLocale ? { locale: fromLocale } : {}) })
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported")
    } else if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          if (!mounted.current) return
          setPermission(status.state as GeolocationPermission)
          status.onchange = () => {
            if (mounted.current) setPermission(status.state as GeolocationPermission)
          }
        })
        .catch(() => mounted.current && setPermission("prompt"))
    } else {
      setPermission("prompt")
    }

    if (cached.ip) {
      setLoading(false)
      return
    }

    fetchIpReading()
      .then((reading) => {
        if (!mounted.current || !reading) return
        setReadings((current) => {
          const next = { ...current, ip: reading }
          writeCache(next)
          return next
        })
      })
      .finally(() => {
        if (mounted.current) setLoading(false)
      })
  }, [])

  const requestPrecise = useCallback(async (): Promise<LocationReading | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported")
      return null
    }

    return new Promise<LocationReading | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const reading: LocationReading = {
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            source: "gps",
            capturedAt: new Date().toISOString(),
          }
          if (mounted.current) {
            setPermission("granted")
            setReadings((current) => {
              const next = { ...current, gps: reading }
              writeCache(next)
              return next
            })
          }
          resolve(reading)
        },
        (error) => {
          if (mounted.current) {
            setPermission(error.code === error.PERMISSION_DENIED ? "denied" : "prompt")
          }
          resolve(null)
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: CACHE_TTL_MS },
      )
    })
  }, [])

  const clearPrecise = useCallback(() => {
    forgetCachedLocation()
    setReadings({})
  }, [])

  const location = useMemo(
    () =>
      resolveLocation([profileReading, readings.gps, readings.ip, readings.locale]),
    [profileReading, readings.gps, readings.ip, readings.locale],
  )

  return {
    location,
    loading,
    usable: isUsableLocation(location),
    permission,
    requestPrecise,
    clearPrecise,
  }
}
