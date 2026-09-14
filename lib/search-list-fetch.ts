/**
 * Search uses the same public list APIs as the home page tabs:
 *   GET /api/opportunities|events|jobs|resources?limit=20&search=…&lastId=…
 * Optional narrowing filters (country, city, type, dates, remote, paid) ride
 * along as extra query params — see `SearchFilters`.
 */

import {
  fetchHomeListPage,
  type HomeListItem,
  type HomeListPageResult,
  type HomeListType,
  type SearchFilters,
} from "@/lib/fetch-home-list-page"
import { normalizeFeedListItem } from "@/lib/feed-content-type"
import { dateFilterExcludesResources } from "@/lib/search-date-filters"

export const SEARCH_CATEGORIES: HomeListType[] = [
  "opportunities",
  "events",
  "jobs",
  "resources",
]

export type SearchTab = "all" | HomeListType

export type { SearchFilters }

/**
 * True when at least one filter would actually narrow the results.
 *
 * `dateField` is excluded deliberately: it says what a date range measures, so
 * on its own it narrows nothing. Counting it would turn switching the basis
 * into a filters-only search that asks the backend for the entire platform.
 */
export function hasActiveFilters(filters?: SearchFilters): boolean {
  if (!filters) return false
  const { dateField: _basis, ...narrowing } = filters
  return Object.values(narrowing).some((value) =>
    typeof value === "string" ? value.trim().length > 0 : value !== undefined,
  )
}

export function searchTabToListType(tab: SearchTab): HomeListType | null {
  return tab === "all" ? null : tab
}

/**
 * False when this category cannot satisfy the filters at all, so there is no
 * point asking the backend. Today that is only resources under a closing-date
 * window — they have no closing date. The backend answers the same way; this
 * just saves the round trip, which on the "All" tab is one of four.
 */
export function categoryCanMatch(
  type: HomeListType,
  filters?: SearchFilters,
): boolean {
  if (type !== "resources") return true
  return !dateFilterExcludesResources(filters ?? {})
}

/** The filter params, in a fixed order so the same filters always serialize alike. */
const FILTER_KEYS = [
  "country",
  "city",
  "type",
  "dateField",
  "dateFrom",
  "dateTo",
  "isRemote",
  "isPaid",
] as const satisfies readonly (keyof SearchFilters)[]

/** Writes the filters into a query string — for the URL, and as a change key. */
export function searchFiltersToParams(
  filters: SearchFilters | undefined,
  into: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  if (!filters) return into
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value === undefined || value === null) continue
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed) into.set(key, trimmed)
    } else {
      into.set(key, String(value))
    }
  }
  return into
}

/** Reads filters back out of a query string, ignoring anything unrecognised. */
export function parseSearchFilters(
  source: URLSearchParams | string,
): SearchFilters {
  const params =
    typeof source === "string" ? new URLSearchParams(source) : source
  const filters: SearchFilters = {}

  for (const key of ["country", "city", "type"] as const) {
    const value = params.get(key)?.trim()
    if (value) filters[key] = value
  }

  const dateFrom = params.get("dateFrom")?.trim()
  if (dateFrom) filters.dateFrom = dateFrom
  const dateTo = params.get("dateTo")?.trim()
  if (dateTo) filters.dateTo = dateTo
  const dateField = params.get("dateField")?.trim()
  if (dateField === "deadline" || dateField === "posted") {
    filters.dateField = dateField
  }

  for (const key of ["isRemote", "isPaid"] as const) {
    const value = params.get(key)
    if (value === "true") filters[key] = true
    else if (value === "false") filters[key] = false
  }

  return filters
}

/**
 * A stable string for one set of filters, so effects can depend on what the
 * filters *say* rather than on the identity of the object holding them — every
 * keystroke in the panel builds a fresh object, and half of them change nothing.
 */
export function searchFiltersKey(filters?: SearchFilters): string {
  return searchFiltersToParams(filters).toString()
}

function tagItems(type: HomeListType, items: HomeListItem[]): HomeListItem[] {
  return items.map((item) =>
    normalizeFeedListItem(type, item as Record<string, unknown>),
  ) as HomeListItem[]
}

function mergeSearchResults(
  pages: { type: HomeListType; page: HomeListPageResult }[],
): HomeListItem[] {
  const seen = new Set<string>()
  const combined: HomeListItem[] = []

  for (const { type, page } of pages) {
    for (const item of tagItems(type, page.items)) {
      const id = String(item._id)
      if (seen.has(id)) continue
      seen.add(id)
      combined.push(item)
    }
  }

  combined.sort((a, b) => {
    const tA = a.createdAt ? new Date(String(a.createdAt)).getTime() : 0
    const tB = b.createdAt ? new Date(String(b.createdAt)).getTime() : 0
    return tB - tA
  })

  return combined
}

export type SearchCursors = Record<HomeListType, string | null>
export type SearchHasMoreByType = Record<HomeListType, boolean>

export function createInitialSearchCursors(): SearchCursors {
  return {
    opportunities: null,
    events: null,
    jobs: null,
    resources: null,
  }
}

export function createInitialSearchHasMore(): SearchHasMoreByType {
  return {
    opportunities: true,
    events: true,
    jobs: true,
    resources: true,
  }
}

/** Single category — same as home tab + `search` query param. */
export async function fetchSearchCategoryPage(params: {
  type: HomeListType
  cursorLastId: string | null
  backendUrl: string
  search: string
  filters?: SearchFilters
}): Promise<HomeListPageResult> {
  const term = params.search.trim()
  // Filters alone are a valid query — you can browse a country without a keyword.
  if (!term && !hasActiveFilters(params.filters)) {
    return { items: [], lastId: null, hasMore: false }
  }

  if (!categoryCanMatch(params.type, params.filters)) {
    return { items: [], lastId: null, hasMore: false }
  }

  const page = await fetchHomeListPage({
    type: params.type,
    cursorLastId: params.cursorLastId,
    backendUrl: params.backendUrl,
    query: { search: term, filters: params.filters },
  })

  return {
    items: tagItems(params.type, page.items),
    lastId: page.lastId,
    hasMore: page.hasMore,
  }
}

/**
 * All tab: one “page” loads the next slice from every category that still has results.
 */
export async function fetchSearchAllCategoriesPage(params: {
  backendUrl: string
  search: string
  cursors: SearchCursors
  hasMoreByType: SearchHasMoreByType
  reset: boolean
  filters?: SearchFilters
}): Promise<{
  items: HomeListItem[]
  cursors: SearchCursors
  hasMoreByType: SearchHasMoreByType
  hasMore: boolean
}> {
  const term = params.search.trim()
  if (!term && !hasActiveFilters(params.filters)) {
    return {
      items: [],
      cursors: createInitialSearchCursors(),
      hasMoreByType: createInitialSearchHasMore(),
      hasMore: false,
    }
  }

  const cursors = params.reset
    ? createInitialSearchCursors()
    : { ...params.cursors }
  const hasMoreByType = params.reset
    ? createInitialSearchHasMore()
    : { ...params.hasMoreByType }

  const pages = await Promise.all(
    SEARCH_CATEGORIES.map(async (type) => {
      if (!params.reset && !hasMoreByType[type]) {
        return { type, page: { items: [], lastId: cursors[type], hasMore: false } }
      }

      // Nothing this category holds could match, so do not ask.
      if (!categoryCanMatch(type, params.filters)) {
        cursors[type] = null
        hasMoreByType[type] = false
        return { type, page: { items: [], lastId: null, hasMore: false } }
      }

      const page = await fetchHomeListPage({
        type,
        cursorLastId: params.reset ? null : cursors[type],
        backendUrl: params.backendUrl,
        query: { search: term, filters: params.filters },
      })

      cursors[type] = page.lastId
      hasMoreByType[type] = page.hasMore

      return { type, page }
    }),
  )

  const items = mergeSearchResults(pages)
  const hasMore = SEARCH_CATEGORIES.some((type) => hasMoreByType[type])

  return { items, cursors, hasMoreByType, hasMore }
}
