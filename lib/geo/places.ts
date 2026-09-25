/**
 * States, regions and cities for the focus countries, from the shared places
 * table (`lib/geo/places.json`, identical to the backend's copy).
 *
 * Two jobs:
 *   - the location pickers (onboarding, the posting form) list real states and
 *     cities instead of taking free text, so new data is clean at the source;
 *   - a GPS fix, which is only coordinates, is turned into the nearest named
 *     state and city — the only form in which a place ever leaves the browser.
 */

import PLACES_JSON from "@/lib/geo/places.json"
import { haversineKm } from "@/lib/geo/distance"

type City = { name: string; lat: number; lng: number; aliases: string[] }
type Region = { name: string; lat: number; lng: number; aliases: string[]; cities: City[] }

const PLACES = PLACES_JSON as unknown as {
  regions: Record<string, { label: string; regions: Region[] }>
}

/** Countries with a state and city list. Everywhere else takes free text. */
export const COUNTRIES_WITH_REGIONS = Object.keys(PLACES.regions)

export function hasRegions(countryCode: string | null | undefined): boolean {
  return Boolean(countryCode && PLACES.regions[countryCode])
}

/** What a country calls its first-level division: State, Region, County. */
export function regionLabel(countryCode: string | null | undefined): string {
  return (countryCode && PLACES.regions[countryCode]?.label) || "State"
}

export function regionsOf(countryCode: string | null | undefined): string[] {
  if (!countryCode) return []
  return (PLACES.regions[countryCode]?.regions ?? []).map((region) => region.name)
}

export function citiesOf(countryCode: string | null | undefined, regionName: string | null | undefined): string[] {
  if (!countryCode || !regionName) return []
  const region = PLACES.regions[countryCode]?.regions.find((r) => r.name === regionName)
  return region ? region.cities.map((city) => city.name) : []
}

const simplify = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()

/**
 * Best reading of a typed state and city in a focus country, neighbourhoods
 * included ("ikeja" → Lagos, Lagos). The same roll-up the backend's
 * `resolvePlace` does, for pre-filling pickers from old free-text answers.
 */
export function resolveRegionCity(
  countryCode: string | null | undefined,
  province: string | null | undefined,
  city: string | null | undefined,
): { state: string | null; city: string | null } {
  const regions = countryCode ? PLACES.regions[countryCode]?.regions : undefined
  if (!regions) return { state: null, city: null }
  const stateKey = simplify(province ?? "").replace(/ (state|region|county)$/, "")
  const cityKey = simplify(city ?? "")
  let state = regions.find((r) => [r.name, ...r.aliases].some((name) => simplify(name) === stateKey)) ?? null
  let matchedCity: City | null = null
  for (const region of state ? [state, ...regions] : regions) {
    const hit = region.cities.find((c) => [c.name, ...c.aliases].some((name) => simplify(name) === cityKey || (!cityKey && !state && simplify(name) === stateKey)))
    if (hit && (!state || region === state)) {
      state = region
      matchedCity = hit
      break
    }
  }
  return { state: state?.name ?? null, city: matchedCity?.name ?? null }
}

/** A GPS fix further than this from any listed city is only placed in its state. */
const CITY_RADIUS_KM = 40
/** …and further than this from any state centre, only in its country. */
const REGION_RADIUS_KM = 250

export type NearestPlace = { countryCode: string; state: string | null; city: string | null }

/**
 * The named place nearest a coordinate, within the focus countries.
 * Null outside them — the country then comes from the IP reading instead.
 */
export function nearestPlace(lat: number, lng: number): NearestPlace | null {
  const point = { lat, lng }
  let best: { countryCode: string; region: Region; city: City | null; km: number } | null = null

  for (const [countryCode, { regions }] of Object.entries(PLACES.regions)) {
    for (const region of regions) {
      const regionKm = haversineKm(point, region)
      if (regionKm <= REGION_RADIUS_KM && (!best || regionKm < best.km)) {
        best = { countryCode, region, city: null, km: regionKm }
      }
      for (const city of region.cities) {
        const km = haversineKm(point, city)
        if (km <= CITY_RADIUS_KM && (!best || km < best.km || !best.city)) {
          best = { countryCode, region, city, km }
        }
      }
    }
  }
  if (!best) return null
  return { countryCode: best.countryCode, state: best.region.name, city: best.city?.name ?? null }
}
