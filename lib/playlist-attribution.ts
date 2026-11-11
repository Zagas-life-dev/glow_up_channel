"use client"

/**
 * Creators Program helpers for the playlist page.
 *
 * - `playlistViewSource()` tells the view beacon how the visitor got here, for the
 *   creator dashboard's traffic sources: a shared link (`?src=share`), a direct
 *   link (the playlist was the first page of this visit), or in-app navigation.
 * - `rememberSignupPlaylist()` / `takeSignupPlaylist()` carry "which public playlist
 *   brought this visitor" to signup, so the backend can count the signup as a view.
 *   Last playlist seen while signed out wins, and it expires after 7 days.
 */

const KEY = "up_signup_playlist"
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export type PlaylistViewSource = "shared_link" | "direct_link" | "in_app"

export function playlistViewSource(): PlaylistViewSource {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get("src") === "share") return "shared_link"
    // The navigation entry belongs to the page this visit first loaded. If that was
    // this playlist, the visitor arrived straight here; otherwise they came in-app.
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
    if (nav?.name) {
      const first = new URL(nav.name)
      if (first.pathname === window.location.pathname) return "direct_link"
    }
  } catch {
    // Fall through: in-app is the safe default.
  }
  return "in_app"
}

/** Signed-out visitors only: a signed-in viewer has no signup left to attribute. */
export function rememberSignupPlaylist(playlistId: string) {
  try {
    if (localStorage.getItem("accessToken")) return
    localStorage.setItem(KEY, JSON.stringify({ id: playlistId, at: Date.now() }))
  } catch {
    // Storage blocked: the signup simply goes unattributed.
  }
}

/** The attributed playlist id, if fresh. Clears it either way. */
export function takeSignupPlaylist(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    localStorage.removeItem(KEY)
    if (!raw) return null
    const { id, at } = JSON.parse(raw) as { id?: string; at?: number }
    if (typeof id !== "string" || !/^[a-f0-9]{24}$/.test(id)) return null
    if (typeof at !== "number" || Date.now() - at > MAX_AGE_MS) return null
    return id
  } catch {
    return null
  }
}
