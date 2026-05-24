"use client"

/**
 * Session-scoped shared content cache by type (opportunities, events, jobs, resources, posts).
 * Full item data + lastId stored per type for instant display across pages.
 * Cleared on refresh via clearPageStateCache() in page-state-session (same prefix).
 */

import { getBootId } from "@/lib/page-state-session"

export type ContentCacheType = "opportunities" | "events" | "jobs" | "resources" | "posts" | "unified" | "unified_auth"

/** Must match CONTENT_CACHE_PREFIX in page-state-session so clear on refresh removes these keys */
const PREFIX = "glowup_content_"
const MAX_ITEMS = 100

export interface ContentCacheEntry<T = unknown> {
  items: T[]
  lastId: string | null
  hasMore?: boolean
}

interface StoredContentCache {
  boot: string
  items: unknown[]
  lastId: string | null
  hasMore?: boolean
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function cacheKey(type: ContentCacheType): string {
  return PREFIX + type
}

/**
 * Write fetched items + lastId for a content type. Only used in current session (boot stored).
 */
export function setContentCache<T extends { _id: string }>(
  type: ContentCacheType,
  data: { items: T[]; lastId: string | null; hasMore?: boolean },
): void {
  const storage = getStorage()
  if (!storage) return
  try {
    const stored: StoredContentCache = {
      boot: getBootId(),
      items: (data.items || []).slice(-MAX_ITEMS),
      lastId: data.lastId ?? null,
      hasMore: data.hasMore,
    }
    storage.setItem(cacheKey(type), JSON.stringify(stored))
  } catch {
    // ignore
  }
}

/**
 * Read cached items + lastId for a content type. Returns null if missing or different session (e.g. after refresh).
 */
export function getContentCache<T = unknown>(type: ContentCacheType): ContentCacheEntry<T> | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(cacheKey(type))
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredContentCache
    if (stored.boot !== getBootId()) return null
    return {
      items: (stored.items || []) as T[],
      lastId: stored.lastId ?? null,
      hasMore: stored.hasMore,
    }
  } catch {
    return null
  }
}
