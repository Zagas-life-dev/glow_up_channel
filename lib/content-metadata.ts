import type { Metadata } from "next"

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

export async function buildPlaylistMetadata(id: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Playlist",
    description: "Curated playlists of opportunities, jobs, events, and resources.",
  }
  if (!base) return fallback
  const j = await fetchJson<{
    success?: boolean
    data?: { playlist?: { name?: string; description?: string } }
  }>(`${base}/api/playlists/${id}`)
  const p = j?.success && j?.data?.playlist ? j.data.playlist : null
  if (!p?.name) return fallback
  return {
    title: p.name,
    description: p.description
      ? truncateMeta(String(p.description))
      : `Playlist: ${p.name} on UP.`,
  }
}

export async function buildPostMetadata(id: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Post",
    description: "Community discussion on UP.",
  }
  if (!base) return fallback
  const j = await fetchJson<{
    success?: boolean
    data?: { post?: { content?: { text?: string }; author?: { firstName?: string } } }
  }>(`${base}/api/posts/${id}`)
  const post = j?.success && j?.data?.post ? j.data.post : null
  const text = post?.content?.text
  const author = post?.author?.firstName
  if (!text && !author) return fallback
  const snippet = text ? truncateMeta(text, 140) : "Community post on UP."
  return {
    title: author ? `Post by ${author}` : "Post",
    description: snippet,
  }
}

export async function buildChannelMetadata(slug: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Channel",
    description: "Community channels for focused conversation on UP.",
  }
  if (!base) return fallback
  const j = await fetchJson<{
    success?: boolean
    data?: { channel?: { name?: string; description?: string } }
  }>(`${base}/api/channels/${encodeURIComponent(slug)}`)
  const c = j?.success && j?.data?.channel ? j.data.channel : null
  if (!c?.name) return fallback
  return {
    title: c.name,
    description: c.description
      ? truncateMeta(String(c.description))
      : `Channel: ${c.name} on UP.`,
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
