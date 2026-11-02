/**
 * Stories: the rings above the home feed.
 *
 * Mirrors `latest-glowup-channel/src/routes/stories.js`. Signed-out visitors
 * get the closing-soon story for the country the app detected; held-out users
 * (10%, until the holdout ends) get none.
 */

import ApiClient from "@/lib/api-client"
import { readViewingSelection } from "@/lib/geo/viewing-country"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export type StoryKind = "digest" | "expiring" | "category"

export interface StoryItem {
  id: string
  type: "opportunity" | "job" | "event"
  title: string
  org: string | null
  place: string | null
  image: string | null
  blurb: string | null
  closes: number | null
  closesLabel: string | null
  url: string
  applyUrl: string | null
  /** Days this item has carried over unseen. */
  carry: number
}

export interface Story {
  id: string
  kind: StoryKind
  categoryId: string | null
  title: string
  subtitle: string | null
  /** "Why you're seeing this", for category stories. */
  reason: string | null
  /** Something in it closes within 24 hours. */
  urgent: boolean
  seen: boolean
  seenIds: string[]
  savedPlaylistId?: string | null
  items: StoryItem[]
}

export interface StoriesToday {
  /** The user's local day, YYYY-MM-DD; null for guests and the holdout. */
  day: string | null
  group: "stories" | "holdout" | "guest"
  tutorialDone: boolean
  /** Show the Monday digest pop-up now. */
  digestPopup: boolean
  stories: Story[]
}

export type StoryEventType =
  | "ring_impression"
  | "open"
  | "frame_view"
  | "tap_next"
  | "tap_back"
  | "swipe_next"
  | "swipe_prev"
  | "pause"
  | "exit"
  | "complete"
  | "save"
  | "apply"
  | "save_all"
  | "open_listing"
  | "tutorial_done"
  | "popup_shown"
  | "popup_view"
  | "popup_dismiss"
  | "feed_seen"

export interface StoryEvent {
  type: StoryEventType
  storyId?: string
  kind?: StoryKind
  listingId?: string
  frame?: number
  dwellMs?: number
  count?: number
  /** One id per open of a story, so a session's frames can be counted together. */
  session?: string
  source?: string
  at: number
}

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await ApiClient.makeAuthenticatedRequest(`${API_BASE_URL}/api/stories${path}`, init)
    if (!response.ok) return null
    const json = await response.json()
    return json?.success ? (json.data as T) : null
  } catch {
    return null
  }
}

export function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

/**
 * The country picked in Settings, as the backend reads it: an ISO code, "*"
 * for anywhere, or nothing for auto (the backend then uses the profile, then
 * the detected country). Same choice that filters every feed.
 */
function pickedCountry(): string | null {
  const selection = readViewingSelection()
  if (selection.mode === "anywhere") return "*"
  if (selection.mode === "country") return selection.countryCode
  return null
}

export function fetchStories(): Promise<StoriesToday | null> {
  const params = new URLSearchParams()
  const tz = browserTimezone()
  if (tz) params.set("tz", tz)
  const country = pickedCountry()
  if (country) params.set("country", country)
  const query = params.toString()
  return call<StoriesToday>(query ? `/?${query}` : "/")
}

/** Fire-and-forget; `keepalive` so a batch sent as the page hides still lands. */
export function sendStoryEvents(events: StoryEvent[], day: string | null): void {
  if (events.length === 0) return
  void call("/events", {
    method: "POST",
    body: JSON.stringify({ events, day, tz: browserTimezone() }),
    keepalive: true,
  })
}

export function saveStoryToPlaylist(storyId: string) {
  return call<{ ok: boolean; playlistId?: string; already?: boolean; reason?: string }>(
    `/${encodeURIComponent(storyId)}/save-all`,
    { method: "POST" },
  )
}

/* ------------------------------------------------------------------ settings */

export interface StorySettings {
  fixed: { id: string; title: string; locked: true }[]
  categories: { id: string; title: string; auto: boolean; on: boolean; reason: string | null }[]
}

export function fetchStorySettings() {
  return call<StorySettings>("/settings")
}

export function setStoryCategory(categoryId: string, on: boolean) {
  return call<{ ok: boolean }>(`/settings/${encodeURIComponent(categoryId)}`, {
    method: "PUT",
    body: JSON.stringify({ on }),
  })
}

/* ------------------------------------------------------------------ admin */

export interface SurfaceStats {
  seen: number
  save: number
  apply: number
  playlist_add: number
  content_view: number
  actionsPer100Seen: number | null
  opensPer100Seen: number | null
}

export interface StoryResults {
  experiment: string
  holdoutUntil: string
  windowDays: number
  groups: { stories: number; holdout: number }
  surfaces: Record<string, SurfaceStats>
  holdout: {
    perUser: Record<"stories" | "holdout", Record<string, number>>
    liftPct: Record<string, number | null>
  }
  funnel: {
    usersSawRing: number
    usersOpened: number
    usersEngaged: number
    sessions: number
    engagedSessions: number
    engagedRate: number
    completeRate: number
    framesPerSession: number
    byKind: Record<string, { sessions: number; engaged: number; complete: number; frames: number }>
    events: Record<string, number>
  }
}

export async function fetchStoryResults(days = 28): Promise<StoryResults> {
  const data = await call<StoryResults>(`/admin/results?days=${days}`)
  if (!data) throw new Error("Could not load story results")
  return data
}
