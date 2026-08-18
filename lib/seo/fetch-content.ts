import { cache } from "react"
import type {
  SeoEvent,
  SeoJob,
  SeoOpportunity,
  SeoResource,
  SitemapItem,
} from "./content-types"

/**
 * Server-side reads of published content for crawler-facing output
 * (metadata, JSON-LD, sitemaps).
 *
 * Each single-item getter is wrapped in React `cache`, so a page's
 * `generateMetadata` and its layout's JSON-LD share one network round trip
 * instead of two.
 */

/** Detail fetches revalidate often enough to stay fresh for rich results. */
const ITEM_REVALIDATE_SEC = 300
/** Sitemaps change slowly and are crawled rarely; cache them harder. */
const SITEMAP_REVALIDATE_SEC = 3600

/** Page size used when walking list endpoints to build sitemaps. */
const SITEMAP_PAGE_SIZE = 100
/** Ceiling per content type, well under the 50k-URL sitemap limit. */
const SITEMAP_MAX_ITEMS = 5000

function backendBase(): string | null {
  return process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || null
}

async function fetchJson<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Single item                                                                */
/* -------------------------------------------------------------------------- */

interface ItemEnvelope<K extends string, T> {
  success?: boolean
  data?: Partial<Record<K, T>>
}

function makeItemGetter<K extends string, T>(path: string, key: K) {
  return cache(async (id: string): Promise<T | null> => {
    const base = backendBase()
    if (!base || !id) return null
    const json = await fetchJson<ItemEnvelope<K, T>>(
      `${base}/api/${path}/${encodeURIComponent(id)}`,
      ITEM_REVALIDATE_SEC,
    )
    if (!json?.success) return null
    return (json.data?.[key] as T | undefined) ?? null
  })
}

export const getEvent = makeItemGetter<"event", SeoEvent>("events", "event")
export const getJob = makeItemGetter<"job", SeoJob>("jobs", "job")
export const getOpportunity = makeItemGetter<"opportunity", SeoOpportunity>(
  "opportunities",
  "opportunity",
)
export const getResource = makeItemGetter<"resource", SeoResource>(
  "resources",
  "resource",
)

/* -------------------------------------------------------------------------- */
/* Lists, for sitemaps                                                        */
/* -------------------------------------------------------------------------- */

interface ListDoc {
  _id?: string
  id?: string
  updatedAt?: string
  publishedAt?: string
  createdAt?: string
}

interface ListEnvelope {
  success?: boolean
  data?: Record<string, unknown>
}

/**
 * Walk a paginated list endpoint and collect ids + last-modified stamps.
 *
 * The backend list routes expose `{ data: { <key>: [...], pagination: { hasMore, lastId } } }`
 * and support cursor paging via `lastId`, which stays stable while items are
 * inserted mid-crawl.
 */
async function crawlList(path: string, key: string): Promise<SitemapItem[]> {
  const base = backendBase()
  if (!base) return []

  const items: SitemapItem[] = []
  let lastId: string | null = null

  while (items.length < SITEMAP_MAX_ITEMS) {
    const params = new URLSearchParams({ limit: String(SITEMAP_PAGE_SIZE) })
    if (lastId) params.set("lastId", lastId)

    const json: ListEnvelope | null = await fetchJson<ListEnvelope>(
      `${base}/api/${path}?${params.toString()}`,
      SITEMAP_REVALIDATE_SEC,
    )
    if (!json?.success) break

    const docs = json.data?.[key]
    if (!Array.isArray(docs) || docs.length === 0) break

    for (const raw of docs as ListDoc[]) {
      const id = raw?._id ?? raw?.id
      if (!id) continue
      items.push({
        id: String(id),
        lastModified: raw.updatedAt ?? raw.publishedAt ?? raw.createdAt,
      })
    }

    const pagination = json.data?.pagination as
      | { hasMore?: boolean; lastId?: string | null }
      | undefined
    if (!pagination?.hasMore || !pagination.lastId) break
    if (pagination.lastId === lastId) break // defensive: never loop forever
    lastId = pagination.lastId
  }

  return items.slice(0, SITEMAP_MAX_ITEMS)
}

export const listEvents = cache(() => crawlList("events", "events"))
export const listJobs = cache(() => crawlList("jobs", "jobs"))
export const listOpportunities = cache(() =>
  crawlList("opportunities", "opportunities"),
)
export const listResources = cache(() => crawlList("resources", "resources"))

/* -------------------------------------------------------------------------- */
/* Hub previews                                                               */
/* -------------------------------------------------------------------------- */

export interface PreviewItem {
  id: string
  title?: string
}

/**
 * First page of a listing with titles, for the `ItemList` JSON-LD on hub pages.
 *
 * The hub feeds render client-side, so this is the only representation of
 * "what is currently listed here" that a crawler can see.
 */
const previewList = cache(
  async (path: string, key: string, limit = 50): Promise<PreviewItem[]> => {
    const base = backendBase()
    if (!base) return []

    const json = await fetchJson<ListEnvelope>(
      `${base}/api/${path}?limit=${limit}`,
      ITEM_REVALIDATE_SEC,
    )
    if (!json?.success) return []

    const docs = json.data?.[key]
    if (!Array.isArray(docs)) return []

    return (docs as (ListDoc & { title?: string })[]).flatMap<PreviewItem>(
      (raw) => {
        const id = raw?._id ?? raw?.id
        return id ? [{ id: String(id), title: raw.title }] : []
      },
    )
  },
)

export const previewEvents = () => previewList("events", "events")
export const previewJobs = () => previewList("jobs", "jobs")
export const previewOpportunities = () =>
  previewList("opportunities", "opportunities")
export const previewResources = () => previewList("resources", "resources")
