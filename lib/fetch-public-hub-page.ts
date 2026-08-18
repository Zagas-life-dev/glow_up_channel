"use client"

/**
 * One page of a public hub list (/opportunities, /jobs, /events, /resources).
 *
 * Same public list APIs and same cursor contract the home tabs use — no auth
 * header, no recommendation endpoint, nothing personalized:
 *   - First page: GET /api/{type}?limit=20
 *   - Load more:  GET /api/{type}?limit=20&lastId={last item _id}
 *
 * What this adds on top of `fetchHomeListPage` is the hub ordering: each page
 * is redrawn by `orderByDeadlineLottery` as it arrives, so the soonest
 * deadlines lead and the order differs on every refresh.
 *
 * Reordering here is safe for pagination because the cursor never comes from
 * the displayed array — `lastId` is whatever the server called the last row of
 * the page in *its* ordering, and it is passed straight back on the next
 * request. Shuffling what we render cannot move it.
 */

import {
  getContentCache,
  setContentCache,
  type ContentCacheType,
} from "@/lib/content-cache-session"
import {
  fetchHomeListPage,
  HOME_LIST_PAGE_SIZE,
  type HomeListItem,
  type HomeListPageResult,
  type HomeListType,
} from "@/lib/fetch-home-list-page"
import { deriveSeed, orderByDeadlineLottery } from "@/lib/public-hub-order"

export { HOME_LIST_PAGE_SIZE as HUB_PAGE_SIZE }
export type { HomeListItem, HomeListPageResult, HomeListType }

const HUB_CACHE_KEY: Record<HomeListType, ContentCacheType> = {
  opportunities: "hub_opportunities",
  events: "hub_events",
  jobs: "hub_jobs",
  resources: "hub_resources",
}

export interface FetchPublicHubPageParams {
  type: HomeListType
  /** null for the first page; otherwise the `lastId` the API returned. */
  cursorLastId: string | null
  backendUrl: string
  /** Keyword search. When set, results are left in the API's own order. */
  search?: string
  /**
   * This browsing session's shuffle seed, from `getFeedSessionSeed()`. Null
   * during SSR, where nothing is rendered from this anyway.
   */
  sessionSeed: number | null
}

export async function fetchPublicHubPage({
  type,
  cursorLastId,
  backendUrl,
  search,
  sessionSeed,
}: FetchPublicHubPageParams): Promise<HomeListPageResult> {
  const searchTerm = search?.trim() ?? ""
  const isSearching = Boolean(searchTerm)
  const isFirstPage = !cursorLastId
  const cacheKey = HUB_CACHE_KEY[type]

  // Back-navigation and tab restores read the already-ordered page rather than
  // refetching it, so returning to a hub shows the list exactly as it was left.
  // A refresh mints a new boot id, which drops these entries and the seed with
  // them — that is what makes every refresh a new order.
  if (isFirstPage && !isSearching) {
    const cached = getContentCache<HomeListItem>(cacheKey)
    if (cached?.items?.length) {
      return {
        items: cached.items,
        lastId: cached.lastId,
        hasMore: cached.hasMore ?? true,
      }
    }
  }

  const page = await fetchHomeListPage({
    type,
    cursorLastId,
    backendUrl,
    query: isSearching ? { search: searchTerm } : undefined,
    cache: false,
    throwOnError: true,
  })

  // Search results keep the API's ordering. Someone who typed a query is
  // looking for specific listings, and reshuffling matches under them would
  // make the same search look broken twice in a row.
  const items = isSearching
    ? page.items
    : orderByDeadlineLottery(page.items, {
        seed: deriveSeed(sessionSeed ?? 0, type, cursorLastId ?? "first"),
      })

  const result: HomeListPageResult = { ...page, items }

  if (isFirstPage && !isSearching && items.length > 0) {
    setContentCache(cacheKey, {
      items,
      lastId: result.lastId,
      hasMore: result.hasMore,
    })
  }

  return result
}
