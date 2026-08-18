/**
 * Where a user is, and how confident we are about it.
 *
 * Three things can tell us: the browser's GPS (precise coordinates, needs a
 * permission prompt), the CDN's IP lookup (country and city labels, free and
 * silent), and the onboarding profile (whatever they typed). None of them alone
 * is enough — GPS gives no country name, IP gives no precision, and the profile
 * goes stale the moment someone moves. `resolveLocation` merges them.
 */

/**
 * `locale` is the browser's own timezone/language guess — the only source that
 * works with no network and no CDN, which makes it the floor everything else
 * builds on (see `lib/geo/timezone.ts`).
 */
export type LocationSource = "gps" | "ip" | "locale" | "profile" | "manual"

export type Coordinates = {
  lat: number
  lng: number
}

/** The named part of a location — what content listings are tagged with. */
export type PlaceLocation = {
  /** ISO-3166 alpha-2, uppercase. The only field worth matching on. */
  countryCode?: string
  /** English display name, normalized from whatever we were given. */
  country?: string
  /** Province or state. */
  region?: string
  city?: string
}

/** One source's answer, before merging. */
export type LocationReading = PlaceLocation & {
  coordinates?: Coordinates
  source: LocationSource
  /** ISO timestamp. Old readings lose to fresh ones from the same source. */
  capturedAt: string
}

/** The merged answer the ranking layer actually uses. */
export type ResolvedLocation = PlaceLocation & {
  coordinates?: Coordinates
  /** Which reading supplied the country/city labels. */
  placeSource?: LocationSource
  /** Which reading supplied the coordinates — usually "gps". */
  coordinatesSource?: LocationSource
  /** Every source that contributed something, most trusted first. */
  contributors: LocationSource[]
  /** Timestamp of the freshest contributing reading. */
  capturedAt?: string
}

export type GeolocationPermission =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported"
