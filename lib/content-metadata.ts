import type { Metadata } from "next"
import { cache } from "react"
import { getSiteUrl } from "@/lib/site-url"
import type { JsonLdObject } from "@/lib/seo/structured-data"

/**
 * Metadata for content types without a richer builder.
 *
 * Events, jobs, opportunities and resources are handled by `lib/seo/metadata.ts`
 * instead, which also emits canonical URLs, Open Graph cards and the JSON-LD
 * that answer engines read. Add new listing types there, not here.
 */

const REVALIDATE_SEC = 300

export function truncateMeta(s: string, max = 160): string {
  const t = s.replace(/\s+/g, " ").trim()
  if (!t) return ""
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

function backendBase(): string | null {
  const b = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "")
  return b || null
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { next: { revalidate: REVALIDATE_SEC } })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

interface SeoPlaylist {
  _id?: string
  name?: string
  description?: string
  coverImage?: string | null
  isPublic?: boolean
  itemCount?: number
  updatedAt?: string
  items?: { contentId?: string; contentType?: string; title?: string }[]
}

const ITEM_PATH: Record<string, string> = {
  job: "jobs",
  opportunity: "opportunities",
  event: "events",
  resource: "resources",
}

/** One fetch per request: metadata and the JSON-LD share it (React cache). */
export const getSeoPlaylist = cache(async (id: string): Promise<SeoPlaylist | null> => {
  const base = backendBase()
  if (!base) return null
  const j = await fetchJson<{ success?: boolean; data?: { playlist?: SeoPlaylist } }>(
    `${base}/api/playlists/${encodeURIComponent(id)}`,
  )
  const p = j?.success && j?.data?.playlist ? j.data.playlist : null
  return p?.name && p.isPublic !== false ? p : null
})

/**
 * Playlist pages are 6 of the 15 most-viewed pages (9 Nov) and are shared on
 * WhatsApp, but carried only a title and description: no canonical URL and no
 * share image, so links unfurled as the generic site card. The list's cover
 * becomes the Open Graph / Twitter image.
 */
export async function buildPlaylistMetadata(id: string): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Playlist",
    description: "Curated playlists of opportunities, jobs, events, and resources.",
  }
  const p = await getSeoPlaylist(id)
  if (!p?.name) return fallback
  const description = p.description
    ? truncateMeta(String(p.description))
    : `${p.itemCount ?? p.items?.length ?? 0} hand-picked listings: ${p.name}. Curated on UP.`
  const url = `${getSiteUrl()}/playlists/${encodeURIComponent(id)}`
  const images = p.coverImage ? [{ url: p.coverImage, alt: p.name }] : undefined
  return {
    title: p.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title: p.name, description, ...(images && { images }) },
    twitter: { card: images ? "summary_large_image" : "summary", title: p.name, description, ...(images && { images: images.map((im) => im.url) }) },
  }
}

/** schema.org ItemList of the playlist's listings, for rich results and answer engines. */
export async function buildPlaylistJsonLd(id: string): Promise<JsonLdObject | null> {
  const p = await getSeoPlaylist(id)
  if (!p?.name) return null
  const site = getSiteUrl()
  const items = (p.items ?? []).filter((it) => it.contentId && it.contentType && ITEM_PATH[it.contentType])
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: p.name,
    ...(p.description && { description: truncateMeta(String(p.description), 300) }),
    url: `${site}/playlists/${encodeURIComponent(id)}`,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 50).map((it, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${site}/${ITEM_PATH[it.contentType as string]}/${it.contentId}`,
      ...(it.title && { name: it.title }),
    })),
  }
}

export async function buildProfileMetadata(userId: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Profile",
    description: "Member profile on UP.",
  }
  if (!base) return fallback
  const j = await fetchJson<{
    success?: boolean
    data?: {
      profile?: {
        firstName?: string
        lastName?: string
        headline?: string
        bio?: string
      }
    }
  }>(`${base}/api/profile/${userId}`)
  const p = j?.success && j?.data?.profile ? j.data.profile : null
  if (!p) return fallback
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Member"
  const desc = p.headline
    ? truncateMeta(String(p.headline))
    : p.bio
      ? truncateMeta(String(p.bio))
      : `Profile: ${name} on UP.`
  return {
    title: name,
    description: desc,
  }
}
