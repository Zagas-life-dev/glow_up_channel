"use client"

/**
 * Soft-loading the feeds in the background.
 *
 * Every feed already keeps its first page in the session cache and reads it back
 * before touching the network — For You (`for-you-feed`), the home tabs
 * (`fetch-home-list-page`), the public hubs (`fetch-public-hub-page`) and Discover
 * (`playlist-engagement`). But a cache only fills when its page is visited, so the
 * first visit to each feed paid the full ranking round trip.
 *
 * This fills them ahead of time, through the same fetch functions, so what lands in
 * the cache is byte-for-byte what the page would have fetched itself — same seed,
 * same ordering, same promotion caps. Opening any feed afterwards is a cache read.
 *
 * Being polite about it is most of the design:
 *   - it waits for the browser to go idle after the page the reader actually asked
 *     for has loaded, so it never competes with that page's own requests;
 *   - it runs two requests at a time, most-likely-next first;
 *   - it skips anything already warm, and runs once per session per reader;
 *   - it stands down entirely on Save-Data or a 2G connection, and pauses while
 *     the tab is hidden.
 *
 * It does not change freshness. The caches are dropped on refresh, exactly as
 * before, and the prefetch reruns with the new seed — so a refresh still means a
 * new order.
 */

import { getBootId } from "@/lib/page-state-session"
import { getContentCache } from "@/lib/content-cache-session"
import { getFeedSessionSeed } from "@/lib/feed-session-seed"
import { fetchForYouPage, hasCachedForYou } from "@/lib/for-you-feed"
import { fetchHomeListPage, type HomeListType } from "@/lib/fetch-home-list-page"
import { fetchPublicHubPage } from "@/lib/fetch-public-hub-page"
import { prefetchDiscover } from "@/lib/playlist-engagement"
import type { NormalizedUser } from "@/lib/user"

export type PrefetchReader = {
  /** Signed-in user's id, or null for a visitor. */
  userId: string | null
  normalizedUser: NormalizedUser | null
}

type Task = { name: string; run: () => Promise<unknown> }

const LIST_TYPES: HomeListType[] = ["opportunities", "jobs", "events", "resources"]
const HUB_KEY: Record<HomeListType, "hub_opportunities" | "hub_jobs" | "hub_events" | "hub_resources"> = {
  opportunities: "hub_opportunities",
  jobs: "hub_jobs",
  events: "hub_events",
  resources: "hub_resources",
}

const CONCURRENCY = 2
/** Longest we wait for idle before going anyway — idle never comes on a busy page. */
const IDLE_TIMEOUT_MS = 3000
/** Let the landing route's own requests get out first even if the browser idles early. */
const MIN_DELAY_MS = 800

const ran = new Set<string>()

/** Should this device be downloading things nobody asked for yet? */
export function prefetchAllowed(): boolean {
  if (typeof navigator === "undefined") return false
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection
  if (connection?.saveData) return false
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false
  return true
}

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      }
      if (w.requestIdleCallback) w.requestIdleCallback(() => resolve(), { timeout: IDLE_TIMEOUT_MS })
      else setTimeout(resolve, 200)
    }, MIN_DELAY_MS)
  })
}

function whenVisible(): Promise<void> {
  if (document.visibilityState === "visible") return Promise.resolve()
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.visibilityState !== "visible") return
      document.removeEventListener("visibilitychange", onChange)
      resolve()
    }
    document.addEventListener("visibilitychange", onChange)
  })
}

/** The work for one reader, most-likely-next first, with anything warm left out. */
export function planPrefetch(reader: PrefetchReader, backendUrl: string): Task[] {
  const tasks: Task[] = []
  const signedIn = Boolean(reader.userId)
  const seed = getFeedSessionSeed()

  // 1. For You — the heaviest ranking call, and the page most readers go to.
  //    Visitors see the marketing page at "/" rather than the feed, so only
  //    signed-in readers need it warm.
  if (signedIn && !hasCachedForYou(reader.userId)) {
    tasks.push({
      name: "for-you",
      run: () =>
        fetchForYouPage({
          backendUrl,
          userId: reader.userId,
          normalizedUser: reader.normalizedUser,
          lastId: null,
        }),
    })
  }

  // 2. Discover — the other ranked feed.
  tasks.push({ name: "discover", run: () => prefetchDiscover(reader.userId ?? "anon") })

  // 3. The home tabs, for signed-in readers (they sit under For You).
  if (signedIn) {
    const token = localStorage.getItem("accessToken")
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    for (const type of LIST_TYPES) {
      if (getContentCache(type)?.items?.length) continue
      tasks.push({
        name: `tab:${type}`,
        run: () => fetchHomeListPage({ type, cursorLastId: null, backendUrl, headers }),
      })
    }
  }

  // 4. The public hub pages, which everyone can reach from the navigation.
  for (const type of LIST_TYPES) {
    if (getContentCache(HUB_KEY[type])?.items?.length) continue
    tasks.push({
      name: `hub:${type}`,
      run: () => fetchPublicHubPage({ type, cursorLastId: null, backendUrl, sessionSeed: seed }),
    })
  }

  return tasks
}

async function runQueue(tasks: Task[]): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++]
      await whenVisible()
      try {
        await task.run()
      } catch {
        // A failed warm-up is a cache miss later, nothing more. The page will
        // fetch for itself and surface its own error if there is one.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker))
}

/**
 * Warm every feed for this reader, once per session. Safe to call on every
 * render — repeat calls for the same boot and reader return immediately.
 */
export async function prefetchFeeds(reader: PrefetchReader): Promise<void> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backendUrl || typeof window === "undefined" || !prefetchAllowed()) return

  const key = `${getBootId()}:${reader.userId ?? "anon"}`
  if (ran.has(key)) return
  ran.add(key)

  await whenIdle()
  await runQueue(planPrefetch(reader, backendUrl))
}
