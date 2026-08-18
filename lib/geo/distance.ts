/**
 * How near is this listing?
 *
 * Two ways to answer, because content quality varies wildly. Scraped listings
 * usually carry nothing but a country string, so the tier ladder does the work:
 * same city beats same region beats same country beats same subregion. When
 * coordinates exist on both sides we can do better and measure actual km.
 */

import { countryByCode, lookupCountry, type Country } from "@/lib/geo/countries"
import type { Coordinates, PlaceLocation } from "@/lib/geo/types"

const EARTH_RADIUS_KM = 6371

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/** Great-circle distance in kilometres. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Distance → 0..1, where "next door" is 1 and "other side of the planet" is 0.
 *
 * Decays on a half-life rather than a hard cutoff, so a job 60km away does not
 * fall off the same cliff as one 6000km away. `halfLifeKm` is the distance at
 * which the score reaches 0.5 — 400km by default, roughly "same day's travel".
 */
export function distanceScore(km: number, halfLifeKm = 400): number {
  if (!Number.isFinite(km) || km < 0) return 0
  return 1 / (1 + km / halfLifeKm)
}

export type ProximityTier =
  | "same-city"
  | "same-region"
  | "same-country"
  | "same-subregion"
  | "same-continent"
  | "remote"
  | "elsewhere"
  | "unknown"

/** Score floor for each tier. Coordinates, when present, refine within a tier. */
const TIER_SCORE: Record<ProximityTier, number> = {
  "same-city": 1,
  "same-region": 0.85,
  "same-country": 0.7,
  "same-subregion": 0.45,
  "same-continent": 0.3,
  // Remote work has no geography, so it is never penalised — but it does not
  // beat something genuinely on the user's doorstep either.
  remote: 0.65,
  elsewhere: 0.1,
  unknown: 0.35,
}

export type ProximityResult = {
  tier: ProximityTier
  score: number
  /** Present only when both sides had usable coordinates. */
  km?: number
}

function sameText(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function resolveCountry(place: PlaceLocation): Country | null {
  return countryByCode(place.countryCode) ?? lookupCountry(place.country)
}

/**
 * Compare where the user is against where a listing is.
 *
 * `isRemote` short-circuits the geography entirely — that is the whole point of
 * remote listings. Everything else walks the ladder from city down to continent.
 */
export function proximity(
  user: PlaceLocation & { coordinates?: Coordinates },
  content: PlaceLocation & { coordinates?: Coordinates; isRemote?: boolean },
): ProximityResult {
  if (content.isRemote) {
    return { tier: "remote", score: TIER_SCORE.remote }
  }

  const userCountry = resolveCountry(user)
  const contentCountry = resolveCountry(content)

  // Coordinates on both sides beat every label comparison.
  if (user.coordinates && content.coordinates) {
    const km = haversineKm(user.coordinates, content.coordinates)
    const tier: ProximityTier =
      km < 40
        ? "same-city"
        : km < 300
          ? "same-region"
          : userCountry && contentCountry && userCountry.code === contentCountry.code
            ? "same-country"
            : "elsewhere"
    return { tier, score: Math.max(distanceScore(km), TIER_SCORE[tier] * 0.6), km }
  }

  if (!contentCountry && !content.city && !content.region) {
    return { tier: "unknown", score: TIER_SCORE.unknown }
  }

  const sameCountry =
    !!userCountry && !!contentCountry && userCountry.code === contentCountry.code

  if (sameCountry && sameText(user.city, content.city)) {
    return { tier: "same-city", score: TIER_SCORE["same-city"] }
  }
  if (sameCountry && sameText(user.region, content.region)) {
    return { tier: "same-region", score: TIER_SCORE["same-region"] }
  }
  if (sameCountry) {
    return { tier: "same-country", score: TIER_SCORE["same-country"] }
  }

  // Different countries — fall back to the user's own coordinates against the
  // listing country's centroid before giving up on the label ladder.
  if (userCountry && contentCountry) {
    if (userCountry.subregion === contentCountry.subregion) {
      return { tier: "same-subregion", score: TIER_SCORE["same-subregion"] }
    }
    if (userCountry.region === contentCountry.region) {
      return { tier: "same-continent", score: TIER_SCORE["same-continent"] }
    }
    const km = haversineKm(
      user.coordinates ?? { lat: userCountry.lat, lng: userCountry.lng },
      { lat: contentCountry.lat, lng: contentCountry.lng },
    )
    return {
      tier: "elsewhere",
      score: Math.max(TIER_SCORE.elsewhere, distanceScore(km, 2500)),
      km,
    }
  }

  return { tier: "unknown", score: TIER_SCORE.unknown }
}
