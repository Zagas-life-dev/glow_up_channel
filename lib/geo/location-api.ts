/**
 * Saving the reader's place on the server.
 *
 * `reportLocation` runs once per session from `useUserLocation`: a signed-in
 * user's account gets the place, and every visit is counted anonymously for
 * the location analytics. `clearMyLocation` backs "clear my location" in
 * settings. Both are best-effort — a failure here must never break a page.
 */

import ApiClient from "@/lib/api-client"
import type { ViewerPlace } from "@/lib/geo/viewer-geo"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export async function reportLocation(place: ViewerPlace): Promise<void> {
  if (!API_BASE_URL) return
  try {
    await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/location`, {
      method: "POST",
      // The anonymous visitor count keys on the signed viewer cookie.
      credentials: "include",
      body: JSON.stringify({
        countryCode: place.countryCode,
        state: place.state,
        city: place.city,
        source: place.source,
        ...(place.source === "gps" && place.lat !== undefined ? { lat: place.lat, lng: place.lng } : {}),
      }),
    })
  } catch {
    // Offline, blocked, or the backend is down — the header still carries the
    // place on the requests that matter, and the next session tries again.
  }
}

export async function clearMyLocation(): Promise<void> {
  if (!API_BASE_URL) return
  await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/location/me`, { method: "DELETE" })
}
