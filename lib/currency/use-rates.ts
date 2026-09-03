"use client"

/**
 * Exchange rates, fetched once per page load and shared by every caller.
 *
 * Deliberately a module-level singleton rather than a context provider: rates
 * are needed by feed cards, the posting sheet, the admin editor and the moderation
 * table, which have no common ancestor short of the root layout. Wrapping the
 * whole app to share one daily-changing number is more wiring than the problem
 * deserves, and it would make every one of those components untestable in
 * isolation.
 *
 * The in-flight promise is cached too, so twenty cards mounting together issue
 * one request rather than twenty.
 */

import { useEffect, useState } from "react"

import fallback from "@/lib/currency/fallback-rates.json"
import type { RateTable } from "@/lib/currency/convert"

const STORAGE_KEY = "glowup-fx-rates"
/** Matches the route's own cache. Rates upstream change once a day. */
const TTL_MS = 24 * 60 * 60 * 1000

type Cached = { table: RateTable; fetchedAt: number }

let memory: Cached | null = null
let inflight: Promise<RateTable> | null = null

export const FALLBACK_TABLE: RateTable = {
  base: fallback.base,
  asOf: fallback.asOf,
  rates: fallback.rates as Record<string, number>,
  stale: true,
}

function readStorage(): Cached | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached
    if (!parsed?.table?.rates || typeof parsed.fetchedAt !== "number") return null
    if (Date.now() - parsed.fetchedAt > TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeStorage(entry: Cached): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry))
  } catch {
    // Private mode, or storage full. The memory cache still works for this page.
  }
}

/**
 * The current table, fetching it if nothing fresh is cached.
 *
 * Resolves to the committed fallback rather than rejecting — every caller of
 * this is rendering money, and none of them have a sensible error state beyond
 * "show the figure unconverted", which the fallback already produces.
 */
export function loadRates(): Promise<RateTable> {
  if (memory && Date.now() - memory.fetchedAt < TTL_MS) {
    return Promise.resolve(memory.table)
  }

  const stored = readStorage()
  if (stored) {
    memory = stored
    return Promise.resolve(stored.table)
  }

  if (inflight) return inflight

  inflight = fetch("/api/fx/rates")
    .then((response) => {
      if (!response.ok) throw new Error(`rates ${response.status}`)
      return response.json() as Promise<RateTable>
    })
    .then((table) => {
      if (!table?.rates || typeof table.rates.USD !== "number") {
        throw new Error("malformed rate table")
      }
      const entry: Cached = { table, fetchedAt: Date.now() }
      memory = entry
      // A stale table is worth keeping in memory for this page, but not worth
      // persisting — the next load should retry the live endpoint.
      if (!table.stale) writeStorage(entry)
      return table
    })
    .catch(() => FALLBACK_TABLE)
    .finally(() => {
      inflight = null
    })

  return inflight
}

export type UseRatesResult = {
  /** Null until the first load resolves. Callers render unconverted meanwhile. */
  rates: RateTable | null
  loading: boolean
  /** True when serving committed fallback rates — label conversions accordingly. */
  stale: boolean
}

export function useRates(): UseRatesResult {
  const [rates, setRates] = useState<RateTable | null>(
    () => (memory && Date.now() - memory.fetchedAt < TTL_MS ? memory.table : null),
  )
  const [loading, setLoading] = useState(rates === null)

  useEffect(() => {
    if (rates !== null) return
    let active = true
    loadRates().then((table) => {
      if (!active) return
      setRates(table)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [rates])

  return { rates, loading, stale: rates?.stale === true }
}
