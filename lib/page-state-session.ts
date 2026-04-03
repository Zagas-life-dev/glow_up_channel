"use client"

/**
 * Session-scoped page state: scroll, UI state, and optional feed cache (items + lastId).
 * Stored in sessionStorage so it works for both signed-in and signed-out users.
 * Restored only when saved.boot === current boot id (same tab, no refresh).
 */

const BOOT_KEY = "glowup_spa_boot"
const PAGE_PREFIX = "glowup_page_"
/** Used by content-cache-session; cleared here on reload so no circular dependency */
export const CONTENT_CACHE_PREFIX = "glowup_content_"
const MAX_FEED_ITEMS = 100

let clearedThisBoot = false

export interface PageStateFeed {
  storageKey: string
  items: unknown[]
  lastId: string | null
}

export interface PageStateData {
  scrollY?: number
  state?: Record<string, unknown>
  feed?: PageStateFeed
}

interface StoredPageState {
  boot: string
  scrollY?: number
  state?: Record<string, unknown>
  feed?: PageStateFeed
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * Clear all page-state cache entries (and boot key) from sessionStorage.
 * Called on full page reload so the app starts fresh from the API/DB.
 */
export function clearPageStateCache(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k && (k.startsWith(PAGE_PREFIX) || k.startsWith(CONTENT_CACHE_PREFIX) || k === BOOT_KEY)) keys.push(k)
    }
    keys.forEach((k) => storage.removeItem(k))
  } catch {
    // ignore
  }
}

/**
 * Get or set the session boot id. Set once per document load (e.g. on first call).
 * After refresh or new tab, a new boot id is used so old saved state is ignored.
 * On full page reload, clears page-state cache once so we start fresh.
 */
export function getBootId(): string {
  const storage = getStorage()
  if (!storage) return ""
  if (!clearedThisBoot && typeof window !== "undefined") {
    try {
      const nav = (performance as any).getEntriesByType?.("navigation")?.[0] as { type?: string } | undefined
      if (nav?.type === "reload") clearPageStateCache()
    } catch {
      // ignore
    }
    clearedThisBoot = true
  }
  let boot = storage.getItem(BOOT_KEY)
  if (!boot) {
    boot = String(Date.now())
    storage.setItem(BOOT_KEY, boot)
  }
  return boot
}

function pageKey(pathname: string): string {
  return PAGE_PREFIX + pathname
}

/**
 * Save scroll, UI state, and optional feed cache for a pathname.
 * Works for both authenticated and unauthenticated users (stored locally in sessionStorage).
 */
export function savePageState(pathname: string, data: PageStateData): void {
  const storage = getStorage()
  if (!storage || !pathname) return
  try {
    const boot = getBootId()
    const feed = data.feed
      ? {
          storageKey: data.feed.storageKey,
          items: (data.feed.items || []).slice(-MAX_FEED_ITEMS),
          lastId: data.feed.lastId ?? null,
        }
      : undefined
    const stored: StoredPageState = {
      boot,
      scrollY: data.scrollY,
      state: data.state,
      feed,
    }
    storage.setItem(pageKey(pathname), JSON.stringify(stored))
  } catch {
    // ignore
  }
}

/**
 * Restore state for a pathname only if it was saved in the current session (same boot).
 * Returns null after refresh or in a new tab.
 */
export function getPageState(pathname: string): PageStateData | null {
  const storage = getStorage()
  if (!storage || !pathname) return null
  try {
    const raw = storage.getItem(pageKey(pathname))
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredPageState
    if (stored.boot !== getBootId()) return null
    return {
      scrollY: stored.scrollY,
      state: stored.state,
      feed: stored.feed,
    }
  } catch {
    return null
  }
}
