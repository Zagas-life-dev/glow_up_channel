/**
 * Category pages (events, jobs, etc.) — search via the same list API as home.
 */

import {
  fetchHomeListPage,
  HOME_LIST_PAGE_SIZE,
  type HomeListType,
} from "@/lib/fetch-home-list-page"

export async function fetchListBySearch(
  type: HomeListType,
  query: string,
  maxItems = 100,
): Promise<unknown[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  const term = query.trim()
  if (!backendUrl || !term) return []

  const collected: unknown[] = []
  let cursor: string | null = null

  while (collected.length < maxItems) {
    const page = await fetchHomeListPage({
      type,
      cursorLastId: cursor,
      backendUrl,
      query: { search: term },
    })

    collected.push(...page.items)
    if (!page.hasMore || !page.lastId) break
    cursor = page.lastId
    if (page.items.length < HOME_LIST_PAGE_SIZE) break
  }

  return collected.slice(0, maxItems)
}
