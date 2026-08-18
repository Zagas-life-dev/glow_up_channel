import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site-url"
import {
  listEvents,
  listJobs,
  listOpportunities,
  listResources,
} from "@/lib/seo/fetch-content"
import type { SitemapItem } from "@/lib/seo/content-types"

/**
 * Sitemap covering both the static hubs and every individual listing.
 *
 * Enumerating detail URLs is what makes a single event, job, opportunity or
 * resource discoverable on its own. Without it a crawler only ever sees the
 * hub pages, whose feeds are client-rendered and therefore contain no links to
 * follow.
 *
 * Volume stays well inside the 50,000-URL sitemap limit: `fetch-content` caps
 * each content type at 5,000 entries.
 */

/** Regenerate hourly; listings change far slower than the feed does. */
export const revalidate = 3600

/** Public routes worth listing for crawlers (dashboard and auth flows excluded). */
const STATIC_PATHS = [
  "/",
  "/about",
  "/contact",
  "/community",
  "/search",
  "/channels",
  "/channels/create",
  "/jobs",
  "/events",
  "/opportunities",
  "/resources",
  "/playlists",
  "/privacy-policy",
  "/submit",
  "/post",
  "/locked-in",
] as const

/** Hubs are the crawl entry points, so they outrank ordinary detail pages. */
const HUB_PATHS = new Set([
  "/jobs",
  "/events",
  "/opportunities",
  "/resources",
  "/search",
])

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function toEntries(
  items: SitemapItem[],
  base: string,
  prefix: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  fallback: Date,
): MetadataRoute.Sitemap {
  return items.map((item) => ({
    url: `${base}${prefix}/${encodeURIComponent(item.id)}`,
    lastModified: parseDate(item.lastModified) ?? fallback,
    changeFrequency,
    priority,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()
  const now = new Date()

  // One slow content type must not cost us the whole sitemap.
  const [events, jobs, opportunities, resources] = await Promise.all([
    listEvents().catch(() => []),
    listJobs().catch(() => []),
    listOpportunities().catch(() => []),
    listResources().catch(() => []),
  ])

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" || HUB_PATHS.has(path) ? "daily" : "weekly",
    priority: path === "/" ? 1 : HUB_PATHS.has(path) ? 0.9 : 0.6,
  }))

  return [
    ...staticEntries,
    // Events and jobs expire, so they earn the most frequent recrawl.
    ...toEntries(events, base, "/events", 0.8, "daily", now),
    ...toEntries(jobs, base, "/jobs", 0.8, "daily", now),
    ...toEntries(opportunities, base, "/opportunities", 0.8, "daily", now),
    ...toEntries(resources, base, "/resources", 0.7, "weekly", now),
  ]
}
