/**
 * Listings offered in several states of one country.
 *
 * The backend stores the extra states in `location.places`, each with its own
 * map point. The ranker scores the listing by its nearest place, and the card
 * shows that place rather than whichever one was entered first.
 */

import { describe, expect, it } from "vitest"

import { cardLocationLine, locationLine } from "@/lib/content-detail/format"
import { contentPlace, contentPlaces, locationSignal } from "@/lib/ranking/signals"
import type { ResolvedLocation } from "@/lib/geo/types"

const LAGOS = { lat: 6.52, lng: 3.38 }
const PORT_HARCOURT = { lat: 4.82, lng: 7.03 }
const ABUJA = { lat: 9.06, lng: 7.5 }

const listing = {
  _id: "x",
  location: {
    country: "Nigeria",
    countryCode: "NG",
    province: "Lagos",
    city: "Lagos",
    coordinates: LAGOS,
    isRemote: false,
    places: [
      { province: "Rivers", city: "Port Harcourt", coordinates: PORT_HARCOURT },
      { province: "FCT", city: "Abuja", coordinates: ABUJA },
    ],
  },
}

const readerIn = (coordinates: { lat: number; lng: number }, city: string): ResolvedLocation => ({
  country: "Nigeria",
  countryCode: "NG",
  city,
  coordinates,
  contributors: ["gps"],
})

describe("contentPlace", () => {
  it("reads the map point the backend stores under location.coordinates", () => {
    expect(contentPlace(listing).coordinates).toEqual(LAGOS)
  })

  it("ignores a country-centre point, so a country-only listing matches by country", () => {
    const nationwide = {
      location: { country: "Nigeria", countryCode: "NG", coordinates: { lat: 9.08, lng: 8.68 }, precision: "country" },
    }
    expect(contentPlace(nationwide).coordinates).toBeUndefined()
    // Abuja sits beside Nigeria's centre; it must not read as "same city".
    const result = locationSignal(readerIn(ABUJA, "Abuja"), nationwide)
    expect(result.proximity.tier).toBe("same-country")
  })
})

describe("contentPlaces", () => {
  it("lists the main place, then the extras with the main country", () => {
    const places = contentPlaces(listing)
    expect(places.map((p) => p.city)).toEqual(["Lagos", "Port Harcourt", "Abuja"])
    expect(places.every((p) => p.countryCode === "NG")).toBe(true)
  })

  it("is just the main place for a single-place listing", () => {
    const { places: _places, ...location } = listing.location
    expect(contentPlaces({ location })).toHaveLength(1)
  })
})

describe("locationSignal picks the nearest place", () => {
  it("for a reader in Port Harcourt", () => {
    const result = locationSignal(readerIn(PORT_HARCOURT, "Port Harcourt"), listing)
    expect(result.place.city).toBe("Port Harcourt")
  })

  it("for a reader in Abuja", () => {
    const result = locationSignal(readerIn(ABUJA, "Abuja"), listing)
    expect(result.place.city).toBe("Abuja")
  })

  it("scores at least as well as the main place alone", () => {
    const { places: _places, ...single } = listing.location
    const reader = readerIn(PORT_HARCOURT, "Port Harcourt")
    const multi = locationSignal(reader, listing).value ?? 0
    const only = locationSignal(reader, { location: single }).value ?? 0
    expect(multi).toBeGreaterThan(only)
  })
})

describe("location lines", () => {
  it("detail: main place plus the others", () => {
    expect(locationLine(listing.location)).toBe("Lagos, Nigeria · also Port Harcourt, Abuja")
  })

  it("card: the nearest place plus a count", () => {
    const item = { ...listing, nearestLocation: { country: "Nigeria", province: "Rivers", city: "Port Harcourt" } }
    expect(cardLocationLine(item)).toBe("Port Harcourt, Nigeria +2 more")
  })

  it("card: unchanged for a single-place listing", () => {
    expect(cardLocationLine({ location: { country: "Ghana", city: "Accra" } })).toBe("Accra, Ghana")
    expect(cardLocationLine({ location: { isRemote: true } })).toBe("Remote")
  })
})
