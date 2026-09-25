/**
 * The reader's coarse place, as the backend's location analytics receive it.
 *
 * Two outputs from one value:
 *   - the `X-Viewer-Geo` header, sent on backend requests so a view, a click or
 *     an application is counted against a country / state / city;
 *   - one `POST /api/location` per session, which saves the place to a signed-in
 *     account and counts the visit anonymously for everyone else.
 *
 * Only names travel — country code, state, city. A GPS point is reduced to the
 * nearest named place here, in the browser; the backend additionally stores a
 * GPS point rounded to about a kilometre, never the exact fix.
 */

import { nearestPlace } from "@/lib/geo/places"
import type { ResolvedLocation } from "@/lib/geo/types"

export type ViewerPlace = {
  countryCode: string
  state: string | null
  city: string | null
  source: "gps" | "ip" | "profile" | "manual" | "locale"
  /** Only for GPS, and only sent to the location endpoint — never in the header. */
  lat?: number
  lng?: number
}

const STORAGE_KEY = "glowup-viewer-geo"
const REPORTED_KEY = "glowup-location-reported"

let current: ViewerPlace | null = null

/** The place to report for a resolved location, or null if there is no country. */
export function viewerPlaceFrom(location: ResolvedLocation): ViewerPlace | null {
  const fromGps = location.coordinatesSource === "gps" && location.coordinates
    ? nearestPlace(location.coordinates.lat, location.coordinates.lng)
    : null
  const countryCode = fromGps?.countryCode ?? location.countryCode
  if (!countryCode) return null
  if (fromGps) {
    return {
      countryCode,
      state: fromGps.state,
      city: fromGps.city,
      source: "gps",
      lat: location.coordinates!.lat,
      lng: location.coordinates!.lng,
    }
  }
  const source = location.placeSource
  return {
    countryCode,
    state: location.region ?? null,
    city: location.city ?? null,
    source: source === "gps" || source === "ip" || source === "profile" || source === "manual" || source === "locale" ? source : "ip",
  }
}

export function setViewerPlace(place: ViewerPlace | null): void {
  current = place
  if (typeof window === "undefined") return
  try {
    if (place) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(place))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked — the in-memory value still covers this page.
  }
}

function getViewerPlace(): ViewerPlace | null {
  if (current || typeof window === "undefined") return current
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    current = raw ? (JSON.parse(raw) as ViewerPlace) : null
  } catch {
    current = null
  }
  return current
}

/** `{ "X-Viewer-Geo": "NG|Lagos|Lagos|gps" }`, or nothing when the place is unknown. */
export function viewerGeoHeaders(): Record<string, string> {
  const place = getViewerPlace()
  if (!place) return {}
  const parts = [place.countryCode, place.state ?? "", place.city ?? "", place.source]
  return { "X-Viewer-Geo": parts.map((part) => encodeURIComponent(part)).join("|") }
}

/**
 * Report the place once per session (again only if it changes), so a busy page
 * does not post on every render.
 */
export function shouldReport(place: ViewerPlace): boolean {
  if (typeof window === "undefined") return false
  const key = [place.countryCode, place.state, place.city, place.source].join("|")
  try {
    if (sessionStorage.getItem(REPORTED_KEY) === key) return false
    sessionStorage.setItem(REPORTED_KEY, key)
  } catch {
    // Storage blocked: report once per page load instead.
  }
  return true
}
