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

export const SEARCH_CATEGORIES: HomeListType[] = [
  "opportunities",
  "events",
  "jobs",
  "resources",
]

export type SearchTab = "all" | HomeListType

export type { SearchFilters }

/** True when at least one filter would actually narrow the results. */
export function hasActiveFilters(filters?: SearchFilters): boolean {
  if (!filters) return false
  return Object.values(filters).some((value) =>
    typeof value === "string" ? value.trim().length > 0 : value !== undefined,
  )
}

export function searchTabToListType(tab: SearchTab): HomeListType | null {
  return tab === "all" ? null : tab
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
