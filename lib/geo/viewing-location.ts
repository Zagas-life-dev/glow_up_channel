/**
 * Applying a browsing-country choice to the detected location.
 *
 * Pure and React-free so the rule can be tested directly — it decides what the
 * whole feed is ranked against, which makes it the last thing that should only
 * be reachable through a hook.
 */

import { countryByCode } from "@/lib/geo/countries"
import { isSupportedCountry } from "@/lib/geo/supported"
import type { ResolvedLocation } from "@/lib/geo/types"
import type { ViewingSelection } from "@/lib/geo/viewing-country"

/**
 * The location the algorithm should rank against.
 *
 * Choosing another country replaces the place wholesale rather than renaming
 * it. City, region and GPS coordinates all describe where the user physically
 * is; carrying them over would score Nairobi listings by their distance from
 * Lagos, which is worse than having no coordinates at all.
 *
 * Selecting the country they are already in is not an override, so it keeps the
 * full-precision reading — a Lagos user who picks "Nigeria" still gets
 * same-city ranking for Lagos listings.
 */
export function applyViewingSelection(
  detected: ResolvedLocation,
  selection: ViewingSelection,
): ResolvedLocation {
  if (selection.mode === "auto") {
    // Detected somewhere the platform does not cover — a visitor in London, or
    // anyone on a VPN. Ranking against it would spend the location weight on a
    // signal that says "equally far" about every listing, so abstain instead
    // and let interests, freshness and urgency use that weight. Their own
    // profile country still wins if they have one, because it outranks IP
    // before this function ever sees the result.
    if (detected.countryCode && !isSupportedCountry(detected.countryCode)) {
      return { contributors: [] }
    }
    return detected
  }

  // No place at all: the location signal abstains and its weight is
  // redistributed across interests, freshness and urgency.
  if (selection.mode === "anywhere") return { contributors: [] }

  const chosen = countryByCode(selection.countryCode)
  if (!chosen) return detected
  if (chosen.code === detected.countryCode) return detected

  return {
    country: chosen.name,
    countryCode: chosen.code,
    contributors: ["manual"],
    placeSource: "manual",
  }
}
