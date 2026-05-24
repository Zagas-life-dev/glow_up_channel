import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site-url"

/** Public routes igworth listing for crawlers (dashboard and auth flows are excluded). */
const PATHS = [
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
  "/premium",
  "/privacy-policy",
  "/submit",
  "/post",
  "/locked-in",
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const lastModified = new Date()
  return PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }))
}
