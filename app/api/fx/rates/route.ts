/**
 * Exchange rates for listing amounts.
 *
 * Proxies open.er-api.com rather than letting the browser call it directly:
 * it keeps the upstream host out of the CSP, lets one daily fetch serve every
 * visitor instead of one per posting form, and gives us a place to fall back
 * when it is down.
 *
 * open.er-api.com was chosen over the ECB-backed alternatives (Frankfurter and
 * friends) for one reason: the ECB publishes ~30 currencies and none of them
 * are African. This covers all 23 local currencies in the catalog. It is free
 * and needs no key, updates once a day, and that cadence is why the cache is a
 * flat 24 hours — polling harder returns the same numbers.
 *
 * Never 500s. A posting form that cannot reach this endpoint must still let
 * someone publish a salary, so the worst case is the committed fallback table
 * with `stale: true`, and the UI degrades to "rates unavailable" rather than
 * to a blank amount field.
 */

import { NextResponse } from "next/server"

import { CURRENCIES } from "@/lib/currency/catalog"
import fallback from "@/lib/currency/fallback-rates.json"
import type { RateTable } from "@/lib/currency/convert"

const UPSTREAM = "https://open.er-api.com/v6/latest/USD"

/** Rates move once a day upstream; anything shorter is wasted traffic. */
const REVALIDATE_SECONDS = 60 * 60 * 24

/** Give up early — a slow rate lookup must not hold up the posting form. */
const UPSTREAM_TIMEOUT_MS = 5_000

export const runtime = "edge"
export const revalidate = REVALIDATE_SECONDS

const WANTED = CURRENCIES.map((c) => c.code)

function fallbackTable(): RateTable {
  return {
    base: fallback.base,
    asOf: fallback.asOf,
    rates: fallback.rates as Record<string, number>,
    stale: true,
  }
}

/**
 * Keep only the currencies the catalog knows about.
 *
 * Upstream returns ~160. Shipping all of them would triple the payload for
 * every visitor to serve currencies no listing can be priced in, and it would
 * let a currency the picker does not offer leak into a stored listing.
 */
function pick(rates: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const code of WANTED) {
    const value = rates[code]
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      out[code] = value
    }
  }
  return out
}

export async function GET() {
  try {
    const response = await fetch(UPSTREAM, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    if (!response.ok) throw new Error(`upstream ${response.status}`)

    const body = (await response.json()) as {
      result?: string
      base_code?: string
      time_last_update_utc?: string
      rates?: Record<string, unknown>
    }

    if (body.result !== "success" || !body.rates) {
      throw new Error("upstream reported failure")
    }

    const rates = pick(body.rates)

    // USD is the base and must always be 1. Its absence means we parsed
    // something other than what we think we did, so prefer the known-good table
    // over a plausible-looking half-response.
    if (rates.USD !== 1) throw new Error("upstream base is not USD")

    // A response carrying only a handful of our currencies is a degraded
    // upstream, not a usable table — most listings would fail to convert.
    if (Object.keys(rates).length < WANTED.length / 2) {
      throw new Error("upstream missing most catalog currencies")
    }

    const asOf = body.time_last_update_utc
      ? new Date(body.time_last_update_utc).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)

    // Currencies upstream did not carry — ZWG is the usual one — are filled from
    // the committed table so a listing priced in them still converts, rather
    // than dropping out of every cross-currency sort.
    const missing = WANTED.filter((code) => !(code in rates))
    for (const code of missing) {
      const value = (fallback.rates as Record<string, number>)[code]
      if (typeof value === "number") rates[code] = value
    }

    const table: RateTable & { patched?: string[] } = {
      base: "USD",
      asOf,
      rates,
      ...(missing.length > 0 && { patched: missing }),
    }

    return NextResponse.json(table, {
      headers: {
        "Cache-Control": `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS * 7}`,
      },
    })
  } catch (error) {
    console.warn("[fx] falling back to committed rates:", error)

    // Cache the fallback briefly so a sustained upstream outage does not turn
    // into one upstream attempt per request, but short enough that recovery is
    // picked up within the hour.
    return NextResponse.json(fallbackTable(), {
      headers: { "Cache-Control": "public, s-maxage=3600" },
    })
  }
}
