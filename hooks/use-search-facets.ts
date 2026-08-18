"use client"

import { useEffect, useState } from "react"

/**
 * The values the filters offer, built from what is actually in the database.
 * Comes from the backend so nobody can pick a country with nothing in it.
 *
 * "public" covers published content only; "admin" also includes what is still
 * unpublished, which is exactly what the moderation queue is full of.
 */
export type FacetScope = "public" | "admin"

export type SearchFacets = {
  countries: string[]
  cities: string[]
  types: Record<string, string[]>
}

const EMPTY: SearchFacets = { countries: [], cities: [], types: {} }

// One fetch per scope per page load, shared by every component that asks.
const cached: Partial<Record<FacetScope, SearchFacets>> = {}
const inFlight: Partial<Record<FacetScope, Promise<SearchFacets>>> = {}

function endpointFor(scope: FacetScope, backendUrl: string): string {
  return scope === "admin"
    ? `${backendUrl}/api/admin/content/facets`
    : `${backendUrl}/api/search/facets`
}

async function loadFacets(scope: FacetScope): Promise<SearchFacets> {
  const ready = cached[scope]
  if (ready) return ready
  const pending = inFlight[scope]
  if (pending) return pending

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backendUrl) return EMPTY

  const headers: Record<string, string> = {}
  if (scope === "admin" && typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken")
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const request = fetch(endpointFor(scope, backendUrl), { headers })
    .then(async (response) => {
      if (!response.ok) return EMPTY
      const json = await response.json()
      const data = json?.data
      if (!data) return EMPTY
      return {
        countries: Array.isArray(data.countries) ? data.countries : [],
        cities: Array.isArray(data.cities) ? data.cities : [],
        types: data.types && typeof data.types === "object" ? data.types : {},
      } as SearchFacets
    })
    .catch(() => EMPTY)
    .then((result) => {
      cached[scope] = result
      delete inFlight[scope]
      return result
    })

  inFlight[scope] = request
  return request
}

export function useSearchFacets(scope: FacetScope = "public"): {
  facets: SearchFacets
  loading: boolean
} {
  const [facets, setFacets] = useState<SearchFacets>(cached[scope] ?? EMPTY)
  const [loading, setLoading] = useState(!cached[scope])

  useEffect(() => {
    const ready = cached[scope]
    if (ready) {
      setFacets(ready)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    loadFacets(scope).then((result) => {
      if (!active) return
      setFacets(result)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [scope])

  return { facets, loading }
}
