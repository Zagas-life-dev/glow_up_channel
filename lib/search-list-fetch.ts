/**
 * Search uses the same public list APIs as the home page tabs:
 *   GET /api/opportunities|events|jobs|resources?limit=20&search=…&lastId=…
 * No extra query filters (location, industry, etc.) — only the keyword.
 */

import {
  fetchHomeListPage,
  type HomeListItem,
  type HomeListPageResult,
  type HomeListType,
} from "@/lib/fetch-home-list-page"

export const SEARCH_CATEGORIES: HomeListType[] = [
  "opportunities",
  "events",
  "jobs",
  "resources",
]

export type SearchTab = "all" | HomeListType

export function searchTabToListType(tab: SearchTab): HomeListType | null {
  return tab === "all" ? null : tab
}

const SINGULAR_TYPE: Record<HomeListType, string> = {
  opportunities: "opportunity",
  events: "event",
  jobs: "job",
  resources: "resource",
}

function tagItems(type: HomeListType, items: HomeListItem[]): HomeListItem[] {
  const singular = SINGULAR_TYPE[type]
  return items.map((item) => ({
    ...item,
    type: (item.type as string) || singular,
  }))
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
}): Promise<HomeListPageResult> {
  const term = params.search.trim()
  if (!term) {
    return { items: [], lastId: null, hasMore: false }
  }

  const page = await fetchHomeListPage({
    type: params.type,
    cursorLastId: params.cursorLastId,
    backendUrl: params.backendUrl,
    query: { search: term },
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
}): Promise<{
  items: HomeListItem[]
  cursors: SearchCursors
  hasMoreByType: SearchHasMoreByType
  hasMore: boolean
}> {
  const term = params.search.trim()
  if (!term) {
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
        query: { search: term },
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
