import type { Metadata } from "next"

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

export async function buildJobMetadata(id: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Job",
    description: "Browse job listings and career opportunities on GlowUp.",
  }
  if (!base) return fallback
  const j = await fetchJson<{
    success?: boolean
    data?: { job?: { title?: string; description?: string } }
  }>(`${base}/api/jobs/${id}`)
  const job = j?.success && j?.data?.job ? j.data.job : null
  if (!job?.title) return fallback
  return {
    title: job.title,
    description: job.description
      ? truncateMeta(String(job.description))
      : `Job: ${job.title} on GlowUp.`,
  }
}

export async function buildOpportunityMetadata(id: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Opportunity",
    description: "Discover opportunities for growth on GlowUp.",
  }
  if (!base) return fallback
  const j = await fetchJson<{
    success?: boolean
    data?: { opportunity?: { title?: string; description?: string } }
  }>(`${base}/api/opportunities/${id}`)
  const o = j?.success && j?.data?.opportunity ? j.data.opportunity : null
  if (!o?.title) return fallback
  return {
    title: o.title,
    description: o.description
      ? truncateMeta(String(o.description))
      : `Opportunity: ${o.title} on GlowUp.`,
  }
}

export async function buildEventMetadata(id: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Event",
    description: "Events and programs on GlowUp.",
  }
  if (!base) return fallback
  const j = await fetchJson<{
    success?: boolean
    data?: { event?: { title?: string; description?: string } }
  }>(`${base}/api/events/${id}`)
  const e = j?.success && j?.data?.event ? j.data.event : null
  if (!e?.title) return fallback
  return {
    title: e.title,
    description: e.description
      ? truncateMeta(String(e.description))
      : `Event: ${e.title} on GlowUp.`,
  }
}

export async function buildResourceMetadata(id: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Resource",
    description: "Learning resources and tools on GlowUp.",
  }
  if (!base) return fallback
  const j = await fetchJson<{
    success?: boolean
    data?: { resource?: { title?: string; description?: string } }
  }>(`${base}/api/resources/${id}`)
  const r = j?.success && j?.data?.resource ? j.data.resource : null
  if (!r?.title) return fallback
  return {
    title: r.title,
    description: r.description
      ? truncateMeta(String(r.description))
      : `Resource: ${r.title} on GlowUp.`,
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
      : `Playlist: ${p.name} on GlowUp.`,
  }
}

export async function buildPostMetadata(id: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Post",
    description: "Community discussion on GlowUp.",
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
  const snippet = text ? truncateMeta(text, 140) : "Community post on GlowUp."
  return {
    title: author ? `Post by ${author}` : "Post",
    description: snippet,
  }
}

export async function buildChannelMetadata(slug: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Channel",
    description: "Community channels for focused conversation on GlowUp.",
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
      : `Channel: ${c.name} on GlowUp.`,
  }
}

export async function buildProfileMetadata(userId: string): Promise<Metadata> {
  const base = backendBase()
  const fallback: Metadata = {
    title: "Profile",
    description: "Member profile on GlowUp.",
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
      : `Profile: ${name} on GlowUp.`
  return {
    title: name,
    description: desc,
  }
}
