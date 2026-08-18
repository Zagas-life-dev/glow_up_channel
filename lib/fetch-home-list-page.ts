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
import { normalizeFeedListItem } from "@/lib/feed-content-type"

export const HOME_LIST_PAGE_SIZE = 20

/**
 * The filters the search UI offers, on top of the keyword. Every field is
 * optional — an absent field means "do not narrow on this".
 *
 * These are sent to the list APIs verbatim as query params, so the names here
 * are the backend's names.
 */
export type SearchFilters = {
  country?: string
  city?: string
  /** Opportunity/event/job category, whichever applies to the list being fetched. */
  type?: string
  /** ISO dates, inclusive. */
  dateFrom?: string
  dateTo?: string
  isRemote?: boolean
  isPaid?: boolean
}

/** Drops empty values so a blank filter never reaches the query string. */
function filterQueryParams(filters?: SearchFilters): [string, string][] {
  if (!filters) return []
  const out: [string, string][] = []
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed) out.push([key, trimmed])
    } else {
      out.push([key, String(value)])
    }
  }
  return out
}

/** Tabs that use the home feed list APIs */
export type HomeListType = Extract<
  ContentCacheType,
  "opportunities" | "events" | "jobs" | "resources"
>

export type HomeListItem = {
  _id: string
  type: string
  [key: string]: unknown
}

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
  /**
   * Narrowing filters, passed straight through as query params. Anything left
   * undefined is simply not sent, so an empty object is the same as no filter.
   */
  filters?: SearchFilters
}

export async function fetchHomeListPage(params: {
  type: HomeListType
  cursorLastId: string | null
  backendUrl: string
  headers?: HeadersInit
  query?: HomeListFetchOptions
  /**
   * Read and write the shared session cache for this type. Default true.
   *
   * The public hub pages pass false: they reorder every page through
   * `public-hub-order` before display, so they cache the ordered result under
   * their own `hub_*` key instead. Sharing this one would mean the home tab and
   * the hub page each serving the other's ordering.
   */
  cache?: boolean
  /**
   * Throw when the request fails instead of resolving to an empty page.
   * Default false, so existing callers keep degrading quietly.
   *
   * The hub pages pass true: an empty page and a failed request look identical
   * once the error is swallowed, and they need to tell them apart to offer a
   * retry rather than claim there is nothing listed.
   */
  throwOnError?: boolean
}): Promise<HomeListPageResult> {
  const {
    type,
    cursorLastId,
    backendUrl,
    headers = {},
    query,
    cache = true,
    throwOnError = false,
  } = params
  const isFirstPage = !cursorLastId
  const searchTerm = query?.search?.trim() ?? ""
  const filterParams = filterQueryParams(query?.filters)
  // A filtered page is a different result set from the cached unfiltered one,
  // so any active filter has to bypass the cache the same way a search does.
  const hasListQuery = Boolean(searchTerm) || filterParams.length > 0
  const useCache = cache && !hasListQuery

  if (isFirstPage && useCache) {
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
  for (const [key, value] of filterParams) {
    searchParams.set(key, value)
  }

  try {
    const response = await fetch(
      `${backendUrl}/api/${type}?${searchParams.toString()}`,
      { headers },
    )

    if (!response.ok) {
      if (throwOnError) {
        throw new Error(`Failed to load ${type} (${response.status})`)
      }
      return { items: [], lastId: null, hasMore: false }
    }

    const payload = (await response.json()) as ApiListPayload
    const parsed = parseApiListPage(type, payload)
    if (!parsed) {
      if (throwOnError) {
        throw new Error(`Unexpected ${type} response`)
      }
      return { items: [], lastId: null, hasMore: false }
    }

    if (isFirstPage && useCache) {
      setContentCache(type, {
        items: parsed.items,
        lastId: parsed.lastId,
        hasMore: parsed.hasMore,
      })
    }

    return parsed
  } catch (error) {
    if (throwOnError) throw error
    console.error(`Error fetching ${type}:`, error)
    return { items: [], lastId: null, hasMore: false }
  }
}
