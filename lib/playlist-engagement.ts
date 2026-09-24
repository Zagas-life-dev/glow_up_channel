"use client"

/**
 * Playlist engagement: the Discover feed, the counting beacons, and likes.
 *
 * Beacons follow `ApiClient`'s listing beacons: `credentials: 'include'` so the
 * backend's signed device cookie keys signed-out visitors, never throw, and
 * resolve to whether the event was newly counted. Dedup (one per viewer per day)
 * and "the owner's own visits don't count" are the server's job, so these are safe
 * to call on every open.
 */

import type { Playlist } from "@/contexts/playlist-context"
import { getOrCreateAnonId } from "@/lib/anon-id"
import { getContentCache, setContentCache } from "@/lib/content-cache-session"
import { getFeedSessionSeed } from "@/lib/feed-session-seed"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"

function headers(json = true): HeadersInit {
  const out: Record<string, string> = { "X-View-Source": "client" }
  if (json) out["Content-Type"] = "application/json"
  try {
    const token = localStorage.getItem("accessToken")
    if (token) out.Authorization = `Bearer ${token}`
  } catch {
    // Storage blocked — carry on signed out.
  }
  const anon = getOrCreateAnonId()
  if (anon) out["X-Anon-Id"] = anon
  return out
}

export type DiscoverPage = {
  playlists: Playlist[]
  lastId: string | null
  hasMore: boolean
}

/**
 * One page of the ranked Discover feed.
 *
 * Pass the same `seed` for every page of one visit — `getFeedSessionSeed()`, the
 * one For You uses — so the server looks the cursor up in the same shuffled order.
 */
export async function fetchDiscoverPage(opts: {
  seed: number | null
  lastId?: string | null
  limit?: number
}): Promise<DiscoverPage> {
  const url = new URL(`${API_BASE_URL}/api/playlists/discover`)
  url.searchParams.set("limit", String(opts.limit ?? 20))
  if (opts.seed !== null) url.searchParams.set("seed", String(opts.seed))
  if (opts.lastId) url.searchParams.set("lastId", opts.lastId)

  const response = await fetch(url.toString(), { headers: headers(false), credentials: "include" })
  if (!response.ok) throw new Error(`Discover failed: ${response.status}`)
  const result = await response.json()
  return {
    playlists: result?.data?.playlists ?? [],
    lastId: result?.data?.pagination?.lastId ?? null,
    hasMore: Boolean(result?.data?.pagination?.hasMore),
  }
}

/**
 * Discover's session cache: every page loaded so far plus the cursor after it,
 * owned by one reader. Same lifetime as the For You cache — dropped on refresh,
 * which is also when the seed changes, so a cached order is never replayed under
 * a different seed.
 */
export function getCachedDiscover(viewerKey: string): DiscoverPage | null {
  const cached = getContentCache<Playlist>("discover_playlists", { owner: viewerKey })
  if (!cached?.items?.length) return null
  return { playlists: cached.items, lastId: cached.lastId, hasMore: cached.hasMore ?? true }
}

export function cacheDiscover(viewerKey: string, page: DiscoverPage) {
  setContentCache("discover_playlists", {
    items: page.playlists,
    lastId: page.lastId,
    hasMore: page.hasMore,
    owner: viewerKey,
  })
}

/** Warm page one of Discover for this reader, unless it is already warm. */
export async function prefetchDiscover(viewerKey: string): Promise<void> {
  if (getCachedDiscover(viewerKey)) return
  const page = await fetchDiscoverPage({ seed: getFeedSessionSeed(), limit: 20 })
  // A reader who opened Discover while this was in flight has already cached
  // their own view of it; do not overwrite deeper pages with page one.
  if (page.playlists.length && !getCachedDiscover(viewerKey)) cacheDiscover(viewerKey, page)
}

async function beacon(path: string, body: unknown = {}): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/playlists/${path}`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: headers(),
      body: JSON.stringify(body),
    })
    if (!response.ok) return false
    const result = await response.json()
    return Boolean(result?.data?.counted)
  } catch {
    // A metric is never worth surfacing an error for.
    return false
  }
}

/** Opened the playlist page. */
export function recordPlaylistView(playlistId: string, source?: string) {
  return beacon(`${encodeURIComponent(playlistId)}/view`, { source: source ?? null })
}

/** Completed a share — native sheet or copied link. */
export function recordPlaylistShare(playlistId: string, source?: string) {
  return beacon(`${encodeURIComponent(playlistId)}/share`, { source: source ?? null })
}

/** Opened a listing from inside the playlist. */
export function recordPlaylistClick(playlistId: string) {
  return beacon(`${encodeURIComponent(playlistId)}/click`)
}

/**
 * Impressions are queued and sent in one request per burst of scrolling, not one
 * per card. The server dedups per viewer per day, so a card that scrolls in and out
 * repeatedly costs nothing extra; this set only avoids re-sending within the page.
 */
const pendingImpressions = new Set<string>()
const sentImpressions = new Set<string>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_DELAY_MS = 1500
const MAX_BATCH = 50

function flushImpressions() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (pendingImpressions.size === 0) return
  const ids = Array.from(pendingImpressions).slice(0, MAX_BATCH)
  ids.forEach((id) => {
    pendingImpressions.delete(id)
    sentImpressions.add(id)
  })
  void beacon("impressions", { ids })
  if (pendingImpressions.size > 0) flushImpressions()
}

if (typeof window !== "undefined") {
  // Send what is queued before the tab goes away; `keepalive` lets it outlive the page.
  window.addEventListener("pagehide", flushImpressions)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushImpressions()
  })
}

/** A Discover card was on screen. */
export function queuePlaylistImpression(playlistId: string) {
  if (!playlistId || sentImpressions.has(playlistId)) return
  pendingImpressions.add(playlistId)
  if (pendingImpressions.size >= MAX_BATCH) flushImpressions()
  else if (!flushTimer) flushTimer = setTimeout(flushImpressions, FLUSH_DELAY_MS)
}

/** Like or unlike. Resolves to the server's count, or throws so the caller can roll back. */
export async function setPlaylistLiked(
  playlistId: string,
  liked: boolean,
): Promise<{ isLiked: boolean; likeCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/playlists/${encodeURIComponent(playlistId)}/like`, {
    method: liked ? "POST" : "DELETE",
    credentials: "include",
    headers: headers(),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Could not update like")
  }
  return result.data
}

/** Compact counts for cards: 950, 1.2k, 34k, 1.1M. */
export function formatCount(n: number | undefined): string {
  const value = Math.max(0, Math.floor(n ?? 0))
  if (value < 1000) return String(value)
  if (value < 10_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`
  if (value < 1_000_000) return `${Math.round(value / 1000)}k`
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
}
