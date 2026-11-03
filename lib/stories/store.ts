"use client"

/**
 * One copy of today's stories for the whole page, plus the event queue.
 *
 * The rail and the digest pop-up both read today's stories; fetching per
 * component would double the request on every load. Events are queued here and
 * sent in one batch when a story closes or the page hides, not one request per
 * tap: three backend instances cannot take a request per slide from every phone.
 */

import { useEffect, useState, useSyncExternalStore } from "react"
import {
  fetchStories,
  sendStoryEvents,
  type StoriesToday,
  type StoryEvent,
} from "@/lib/stories/api"

type State = { key: string | null; data: StoriesToday | null; loading: boolean }

let state: State = { key: null, data: null, loading: false }
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit(next: Partial<State>) {
  state = { ...state, ...next }
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/* ------------------------------------------------------------------ guest seen */

const GUEST_SEEN_KEY = "up-stories-seen"

/** Signed-out visitors keep what they saw in this browser, by local day. */
function guestSeen(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_SEEN_KEY) || "{}") as { day?: string; ids?: string[] }
    return raw.day === localDay() ? new Set(raw.ids || []) : new Set()
  } catch {
    return new Set()
  }
}

function saveGuestSeen(ids: Set<string>) {
  try {
    localStorage.setItem(GUEST_SEEN_KEY, JSON.stringify({ day: localDay(), ids: [...ids] }))
  } catch {
    // Storage blocked: the ring just shows unseen again next visit.
  }
}

function localDay(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function withGuestSeen(data: StoriesToday): StoriesToday {
  if (data.group !== "guest") return data
  const seen = guestSeen()
  return {
    ...data,
    tutorialDone: (() => {
      try {
        return localStorage.getItem("up-stories-tutorial") === "1"
      } catch {
        return false
      }
    })(),
    stories: data.stories.map((s) => {
      const seenIds = s.items.filter((i) => seen.has(i.id)).map((i) => i.id)
      return { ...s, seenIds, seen: seenIds.length === s.items.length }
    }),
  }
}

/* ------------------------------------------------------------------ loading */

/* ------------------------------------------------------------------ browser cache */

/**
 * The last stories this browser loaded, for the same viewer and local day.
 * Shown the instant the page loads, so the rings never wait on the network;
 * the fresh copy replaces them when it lands. A new day never shows
 * yesterday's: the cache is keyed on the local date.
 */
const CACHE_KEY = "up-stories-cache"

function readCache(key: string): StoriesToday | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "null") as { key?: string; day?: string; data?: StoriesToday } | null
    return raw && raw.key === key && raw.day === localDay() && raw.data ? raw.data : null
  } catch {
    return null
  }
}

function writeCache(key: string, data: StoriesToday) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ key, day: localDay(), data }))
  } catch {
    // Full or blocked storage: the next load just waits on the network.
  }
}

/** Load today's stories for this viewer once; `key` changes when they sign in or out. */
export function loadStories(key: string, force = false): Promise<void> {
  if (!force && state.key === key && (state.data || inflight)) return inflight || Promise.resolve()
  const cached = state.key !== key || !state.data ? readCache(key) : null
  if (cached) emit({ key, data: withGuestSeen(cached), loading: false })
  else emit({ key, loading: true, ...(state.key !== key ? { data: null } : {}) })
  inflight = fetchStories()
    .then((data) => {
      if (state.key !== key) return
      if (data) writeCache(key, data)
      // A failed refresh keeps the cached copy rather than blanking the rings.
      if (data || !state.data) emit({ data: data ? withGuestSeen(data) : null, loading: false })
      else emit({ loading: false })
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function useStories(key: string | null): State {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state)
  useEffect(() => {
    if (key) void loadStories(key)
  }, [key])
  return snapshot.key === key ? snapshot : { key, data: null, loading: !!key }
}

/** Mark listings seen as soon as their slide shows, so the ring greys out without a refetch. */
export function markSeen(storyId: string, listingId: string) {
  const data = state.data
  if (!data) return
  if (data.group === "guest") {
    const seen = guestSeen()
    seen.add(listingId)
    saveGuestSeen(seen)
  }
  emit({
    data: {
      ...data,
      stories: data.stories.map((s) => {
        if (s.id !== storyId || s.seenIds.includes(listingId)) return s
        const seenIds = [...s.seenIds, listingId]
        return { ...s, seenIds, seen: seenIds.length >= s.items.length }
      }),
    },
  })
  persist()
}

export function patchStories(patch: Partial<StoriesToday>) {
  if (state.data) emit({ data: { ...state.data, ...patch } })
  persist()
}

export function setSavedPlaylist(storyId: string, playlistId: string) {
  const data = state.data
  if (!data) return
  emit({ data: { ...data, stories: data.stories.map((s) => (s.id === storyId ? { ...s, savedPlaylistId: playlistId } : s)) } })
  persist()
}

/** Keep the browser cache in step with what changed here, so a reload does not undo it. */
function persist() {
  if (state.key && state.data) writeCache(state.key, state.data)
}

/* ------------------------------------------------------------------ viewer */

/** Which story the full-screen viewer shows, if any. One viewer, mounted in the app layout. */
export type ViewerSource = "rail" | "popup" | "link" | "return"
/** `frame` opens on that slide rather than the first unseen one. */
export type ViewerState = { storyId: string; source: ViewerSource; frame?: number } | null

let viewer: ViewerState = null
const viewerListeners = new Set<() => void>()

export function openStoryViewer(storyId: string, source: ViewerSource = "rail", frame?: number) {
  viewer = { storyId, source, frame }
  for (const l of viewerListeners) l()
}

/* ------------------------------------------------------------------ return trip */

/**
 * A story that sent the user to a listing, and where to put them back.
 *
 * Set when the viewer hands off to a listing page; read by the viewer host
 * when the user comes back from that listing to the page the story was open
 * on, which reopens the story on the same slide. Session-scoped and short-
 * lived: a return half an hour later is a new visit, not a back.
 */
export type StoryReturn = {
  storyId: string
  frame: number
  /** The rail order the viewer had, so swiping on lands where it would have. */
  order: string[]
  from: string
  to: string
  at: number
}

const RETURN_KEY = "up-story-return"
const RETURN_TTL_MS = 30 * 60 * 1000

export function rememberStoryReturn(entry: Omit<StoryReturn, "at">) {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ ...entry, at: Date.now() }))
  } catch {
    // Storage blocked: back lands on the page without the story, as before.
  }
}

/** The pending return trip, if it is still fresh. Does not clear it. */
export function peekStoryReturn(): StoryReturn | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null") as StoryReturn | null
    if (!raw || Date.now() - raw.at > RETURN_TTL_MS) return null
    return raw
  } catch {
    return null
  }
}

export function clearStoryReturn() {
  try {
    sessionStorage.removeItem(RETURN_KEY)
  } catch {
    // Nothing to clear.
  }
}

export function closeStoryViewer() {
  viewer = null
  for (const l of viewerListeners) l()
}

export function useStoryViewer(): ViewerState {
  return useSyncExternalStore(
    (l) => {
      viewerListeners.add(l)
      return () => viewerListeners.delete(l)
    },
    () => viewer,
    () => null,
  )
}

/* ------------------------------------------------------------------ events */

let queue: StoryEvent[] = []
let flushBound = false

export function queueStoryEvent(event: Omit<StoryEvent, "at">) {
  queue.push({ ...event, at: Date.now() })
  if (!flushBound && typeof window !== "undefined") {
    flushBound = true
    // pagehide covers iOS, where unload never fires; visibilitychange covers
    // the app being swiped away from the switcher.
    window.addEventListener("pagehide", flushStoryEvents)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushStoryEvents()
    })
  }
  if (queue.length >= 150) flushStoryEvents()
}

/** Counters that add their own event at flush time (the feed's seen count). */
const beforeFlush = new Set<() => void>()

export function onBeforeStoryFlush(fn: () => void): () => void {
  beforeFlush.add(fn)
  return () => beforeFlush.delete(fn)
}

export function flushStoryEvents() {
  for (const fn of beforeFlush) fn()
  if (queue.length === 0) return
  const batch = queue
  queue = []
  sendStoryEvents(batch, state.data?.day ?? null)
}

export function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Today's rings have been on screen once this page load. */
export function useRingImpression(storyIds: string[]) {
  const [sent, setSent] = useState(false)
  useEffect(() => {
    if (sent || storyIds.length === 0) return
    setSent(true)
    for (const storyId of storyIds) queueStoryEvent({ type: "ring_impression", storyId })
  }, [sent, storyIds])
}
