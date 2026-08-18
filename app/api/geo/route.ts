/**
 * Where the request came from, according to the CDN.
 *
 * Vercel and Cloudflare both resolve the client IP to a country and city at the
 * edge and hand it over as request headers — free, instant, and with no
 * permission prompt. This just reads them. Nothing here touches the raw IP, so
 * there is nothing to store or log.
 *
 * Returns an empty payload rather than an error when running somewhere without
 * those headers (localhost, self-hosted Node), so callers can treat "no idea"
 * and "not deployed behind a CDN" the same way.
 */

import { NextResponse, type NextRequest } from "next/server"

import { normalizePlace } from "@/lib/geo/resolve"
import type { LocationReading } from "@/lib/geo/types"

export const runtime = "edge"
// Per-request by definition — caching this would hand one visitor's city to
// everyone behind the same cache key.
export const dynamic = "force-dynamic"

function header(request: NextRequest, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = request.headers.get(name)
    if (value && value.trim() && value.trim() !== "XX") return value.trim()
  }
  return undefined
}

function coordinate(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: NextRequest) {
  const countryCode = header(request, "x-vercel-ip-country", "cf-ipcountry", "x-geo-country")
  const city = header(request, "x-vercel-ip-city", "cf-ipcity", "x-geo-city")
  const region = header(
    request,
    "x-vercel-ip-country-region",
    "cf-region",
    "x-geo-region",
  )

  const lat = coordinate(header(request, "x-vercel-ip-latitude", "cf-iplatitude"))
  const lng = coordinate(header(request, "x-vercel-ip-longitude", "cf-iplongitude"))

  if (!countryCode && !city && lat === undefined) {
    return NextResponse.json({ available: false, reading: null })
  }

  const reading: LocationReading = {
    // Vercel percent-encodes city names with spaces ("Cape%20Town").
    ...normalizePlace({
      countryCode,
      city: city ? safeDecode(city) : undefined,
      region: region ? safeDecode(region) : undefined,
    }),
    coordinates: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    source: "ip",
    capturedAt: new Date().toISOString(),
  }

  return NextResponse.json({ available: true, reading })
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
