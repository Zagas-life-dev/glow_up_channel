"use client"

/**
 * A listing's price, formatted for whoever is looking at it.
 *
 * Split from the pure formatter beside it because that one is also called from
 * module-level helpers in the detail pages, and pulling `useUserLocation` into
 * those would drag a client-only hook into code that has no component around it.
 */

import { useMemo } from "react"

import { currencyForCountry } from "@/lib/currency/catalog"
import {
  formatListingPrice,
  type ListingPriceDisplay,
  type PriceableListing,
} from "@/lib/currency/listing-price"
import { useRates } from "@/lib/currency/use-rates"
import { useUserLocation } from "@/hooks/use-user-location"

/**
 * The hook form, for cards and detail pages.
 *
 * The viewer's currency comes from `useUserLocation`, which already resolves
 * profile country ahead of IP — so a signed-in Ghanaian browsing from a
 * conference in Lagos still sees cedi, and a logged-out visitor still gets a
 * hint from their IP.
 */
export function useListingPrice(item: PriceableListing): ListingPriceDisplay {
  const { rates } = useRates()
  const { location } = useUserLocation()

  const viewerCurrency = location.countryCode ? currencyForCountry(location.countryCode) : null

  return useMemo(
    () => formatListingPrice(item, viewerCurrency, rates),
    [item, viewerCurrency, rates],
  )
}
