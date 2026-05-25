/**
 * Landing-page list tabs (Opportunities, Jobs, Events, Resources).
 * Same contract as the backend public list APIs:
 *   - First page: GET /api/{type}?limit=20
 *   - Load more: GET /api/{type}?limit=20&lastId={last item _id}
 */

import {
  getContentCache,
  setContentCache,
  type ContentCacheType,
} from "@/lib/content-cache-session"
import {
  normalizeFeedListItem,
  type FeedCardNormalizedItem,
} from "@/lib/feed-content-type"

export const HOME_LIST_PAGE_SIZE = 20

/** Tabs that use the home feed list APIs */
export type HomeListType = Extract<
  ContentCacheType,
  "opportunities" | "events" | "jobs" | "resources"
>

export type HomeListItem = FeedCardNormalizedItem

export type HomeListPageResult = {
  items: HomeListItem[]
  lastId: string | null
  hasMore: boolean
}

const SINGULAR_TYPE: Record<HomeListType, string> = {
  opportunities: "opportunity",
  events: "event",
  jobs: "job",
  resources: "resource",
}

type ApiListPayload = {
  success?: boolean
  data?: Record<string, unknown> & {
    pagination?: { lastId?: string | null; hasMore?: boolean }
  }
}

function parseApiListPage(type: HomeListType, payload: ApiListPayload): HomeListPageResult | null {
  if (!payload.success || !payload.data) return null

  const raw = (payload.data[type] as HomeListItem[] | undefined) ?? []
  const items = raw.map((item) =>
    normalizeFeedListItem(type, item as Record<string, unknown>),
  ) as HomeListItem[]

  const pagination = payload.data.pagination
  const lastId =
    (pagination?.lastId != null ? String(pagination.lastId) : null) ??
    (items.length > 0 ? String(items[items.length - 1]._id) : null)

  const hasMore =
    items.length > 0 &&
    Boolean(pagination?.hasMore ?? items.length >= HOME_LIST_PAGE_SIZE)

  return { items, lastId, hasMore }
}

/**
 * Fetch one page for a landing tab. Uses session cache only for the first page.
 * @param cursorLastId - null for first page; otherwise the last seen item _id (from useCursorPagination).
 */
export type HomeListFetchOptions = {
  /** Keyword search (title, description, tags, etc.) — `search` query param on list APIs */
  search?: string
}

export async function fetchHomeListPage(params: {
  type: HomeListType
  cursorLastId: string | null
  backendUrl: string
  headers?: HeadersInit
  query?: HomeListFetchOptions
}): Promise<HomeListPageResult> {
  const { type, cursorLastId, backendUrl, headers = {}, query } = params
  const isFirstPage = !cursorLastId
  const searchTerm = query?.search?.trim() ?? ""
  const hasListQuery = Boolean(searchTerm)

  if (isFirstPage && !hasListQuery) {
    const cached = getContentCache<HomeListItem>(type)
    if (cached?.items?.length) {
      const items = cached.items.map((item) =>
        normalizeFeedListItem(type, item as Record<string, unknown>),
      ) as HomeListItem[]
      const lastId =
        cached.lastId ??
        (items.length > 0 ? String(items[items.length - 1]._id) : null)
      return {
        items,
        lastId,
        hasMore: cached.hasMore ?? true,
      }
    }
  }

  const searchParams = new URLSearchParams({
    limit: String(HOME_LIST_PAGE_SIZE),
  })
  if (cursorLastId) {
    searchParams.set("lastId", cursorLastId)
  }
  if (searchTerm) {
    searchParams.set("search", searchTerm)
  }

  try {
    const response = await fetch(
      `${backendUrl}/api/${type}?${searchParams.toString()}`,
      { headers },
    )

    if (!response.ok) {
      return { items: [], lastId: null, hasMore: false }
    }

    const payload = (await response.json()) as ApiListPayload
    const parsed = parseApiListPage(type, payload)
    if (!parsed) {
      return { items: [], lastId: null, hasMore: false }
    }

    if (isFirstPage && !hasListQuery) {
      setContentCache(type, {
        items: parsed.items,
        lastId: parsed.lastId,
        hasMore: parsed.hasMore,
      })
    }

    return parsed
  } catch (error) {
    console.error(`Error fetching ${type}:`, error)
    return { items: [], lastId: null, hasMore: false }
  }
}
