/**
 * Merging the three location readings into one answer.
 *
 * Each source is good at something different, so we take the best part of each
 * rather than picking a single winner:
 *   - GPS knows exactly where you are but cannot name it
 *   - the CDN's IP lookup names a country and city but is vague and wrong on VPNs
 *   - the profile is what the user actually told us, and outranks a guess
 *
 * Pure functions — no browser, no network. `use-user-location` supplies readings.
 */

import { countryByCode, lookupCountry } from "@/lib/geo/countries"
import type {
  LocationReading,
  LocationSource,
  PlaceLocation,
  ResolvedLocation,
} from "@/lib/geo/types"

/**
 * Trust order for the *named* part of a location.
 *
 * The profile wins because someone who typed "I live in Senegal" means it, even
 * when they are reading the site from an airport in Paris. IP beats the browser
 * guess because it reflects the live connection rather than an OS clock someone
 * may never have changed. `locale` is last but never absent, which is the point
 * of it — it is the only source that survives with no CDN and no permission.
 */
const PLACE_PRIORITY: LocationSource[] = ["manual", "profile", "ip", "locale", "gps"]

/** Trust order for coordinates. Only GPS and IP ever have any. */
const COORDINATE_PRIORITY: LocationSource[] = ["gps", "manual", "ip", "profile", "locale"]

function rank(order: LocationSource[], source: LocationSource): number {
  const index = order.indexOf(source)
  return index === -1 ? order.length : index
}

function hasPlace(reading: PlaceLocation): boolean {
  return Boolean(reading.countryCode || reading.country || reading.city || reading.region)
}

/** Fill in the ISO code / English name from whichever one we were given. */
export function normalizePlace(place: PlaceLocation): PlaceLocation {
  const country = countryByCode(place.countryCode) ?? lookupCountry(place.country)
  const clean = (value: string | undefined): string | undefined => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
  }

  return {
    countryCode: country?.code ?? clean(place.countryCode)?.toUpperCase(),
    country: country?.name ?? clean(place.country),
    region: clean(place.region),
    city: clean(place.city),
  }
}

/**
 * Best available location from whatever readings we have.
 *
 * Labels and coordinates are chosen independently, which is what lets a GPS fix
 * sharpen an IP-derived country instead of replacing it with nothing.
 */
export function resolveLocation(
  readings: (LocationReading | null | undefined)[],
): ResolvedLocation {
  const usable = readings.filter((r): r is LocationReading => Boolean(r))

  if (usable.length === 0) {
    return { contributors: [] }
  }

  const placeCandidates = usable
    .filter(hasPlace)
    .sort((a, b) => rank(PLACE_PRIORITY, a.source) - rank(PLACE_PRIORITY, b.source))

  const coordinateCandidates = usable
    .filter((r) => Boolean(r.coordinates))
    .sort(
      (a, b) => rank(COORDINATE_PRIORITY, a.source) - rank(COORDINATE_PRIORITY, b.source),
    )

  const bestPlace = placeCandidates[0]
  const bestCoordinates = coordinateCandidates[0]

  // A higher-priority reading can be missing a city that a lower one has —
  // an IP lookup often knows the city when the profile only recorded a country.
  const place = normalizePlace(bestPlace ?? {})
  for (const candidate of placeCandidates.slice(1)) {
    const filled = normalizePlace(candidate)
    if (!place.city && filled.city && filled.countryCode === place.countryCode) {
      place.city = filled.city
    }
    if (!place.region && filled.region && filled.countryCode === place.countryCode) {
      place.region = filled.region
    }
  }

  const contributors = Array.from(
    new Set(
      [bestPlace?.source, bestCoordinates?.source].filter(
        (s): s is LocationSource => Boolean(s),
      ),
    ),
  )

  const capturedAt = usable
    .map((r) => r.capturedAt)
    .filter(Boolean)
    .sort()
    .pop()

  return {
    ...place,
    coordinates: bestCoordinates?.coordinates,
    placeSource: bestPlace?.source,
    coordinatesSource: bestCoordinates?.source,
    contributors,
    capturedAt,
  }
}

/** Enough to personalise with? A bare continent guess is not. */
export function isUsableLocation(location: ResolvedLocation): boolean {
  return Boolean(location.countryCode || location.coordinates)
}
