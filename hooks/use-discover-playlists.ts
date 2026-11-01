"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Playlist } from "@/contexts/playlist-context"
import { getFeedSessionSeed } from "@/lib/feed-session-seed"
import { cacheDiscover, fetchDiscoverPage, getCachedDiscover } from "@/lib/playlist-engagement"

const PAGE_SIZE = 20

/**
 * The Discover feed: ranked on the server, paged by cursor, shuffled per visit.
 *
 * The seed is For You's feed-session seed, read once per mount. Every page of a
 * visit sends the same one, so the server finds the cursor in the same order and
 * infinite scroll neither repeats nor skips; a refresh mints a new seed and the
 * page comes back in a different order. That is the whole "never goes stale" rule,
 * and keeping it on one seed keeps Discover and For You refreshing together.
 *
 * `viewerKey` restarts the feed when the reader changes (sign in / out), because
 * relevance — and which lists count as "your own" — depends on who is reading.
 *
 * `query` (already debounced by the caller) restarts it as a search: the server
 * returns only matching lists, best match first. Searches skip the session
 * cache, which holds the unsearched feed alone, so clearing the box goes
 * straight back to where the reader was.
 */
export function useDiscoverPlaylists(viewerKey: string, enabled = true, query = "") {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const seedRef = useRef<number | null>(null)
  const viewerKeyRef = useRef(viewerKey)
  const term = query.trim()
  const queryRef = useRef(term)
  useEffect(() => {
    viewerKeyRef.current = viewerKey
    queryRef.current = term
  }, [viewerKey, term])
  const cursorRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)
  // Bumped on reset, so a page that lands after the reader changed is dropped.
  const generationRef = useRef(0)

  const loadPage = useCallback(async (first: boolean) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    const generation = generationRef.current
    if (first) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const page = await fetchDiscoverPage({
        seed: seedRef.current,
        lastId: first ? null : cursorRef.current,
        limit: PAGE_SIZE,
        q: queryRef.current,
      })
      if (generation !== generationRef.current) return
      cursorRef.current = page.lastId
      setHasMore(page.hasMore)
      setError(null)
      setPlaylists((prev) => {
        let next = page.playlists
        if (!first) {
          const seen = new Set(prev.map((p) => p._id))
          next = [...prev, ...page.playlists.filter((p) => !seen.has(p._id))]
        }
        if (!queryRef.current) {
          cacheDiscover(viewerKeyRef.current, { playlists: next, lastId: page.lastId, hasMore: page.hasMore })
        }
        return next
      })
    } catch (err) {
      if (generation !== generationRef.current) return
      console.warn("Discover failed to load:", err)
      setError("Couldn't load Discover. Pull to refresh or try again.")
      setHasMore(false)
    } finally {
      if (generation === generationRef.current) {
        inFlightRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    }
  }, [])

  const reload = useCallback(() => {
    generationRef.current += 1
    inFlightRef.current = false
    seedRef.current = getFeedSessionSeed()
    cursorRef.current = null
    setHasMore(true)
    void loadPage(true)
  }, [loadPage])

  // Load once per reader. Tabbing away and back keeps the feed and scroll depth;
  // only a different reader (or a refresh, via a new mount) starts it over. A
  // page the background prefetcher (or an earlier visit this session) already
  // cached opens instantly, with no request at all.
  const loadedForRef = useRef<string | null>(null)
  useEffect(() => {
    const loadKey = `${viewerKey}\n${term}`
    if (!enabled || loadedForRef.current === loadKey) return
    loadedForRef.current = loadKey
    // The ref effect above has already run this commit, so loadPage sees `term`.
    const cached = term ? null : getCachedDiscover(viewerKey)
    if (cached) {
      generationRef.current += 1
      seedRef.current = getFeedSessionSeed()
      cursorRef.current = cached.lastId
      setPlaylists(cached.playlists)
      setHasMore(cached.hasMore)
      setIsLoading(false)
      return
    }
    // Clear first, so the last term's lists are not shown under the new one.
    setPlaylists([])
    reload()
  }, [viewerKey, enabled, term, reload])

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return
    void loadPage(false)
  }, [hasMore, isLoading, isLoadingMore, loadPage])

  /** Update one card in place after a save or like, without refetching the feed. */
  const patch = useCallback((id: string, update: (p: Playlist) => Playlist) => {
    const apply = (list: Playlist[]) => list.map((p) => (p._id === id ? update(p) : p))
    setPlaylists(apply)
    // Patched separately: on a search, what is on screen is not the cached feed.
    const cached = getCachedDiscover(viewerKeyRef.current)
    if (cached) cacheDiscover(viewerKeyRef.current, { ...cached, playlists: apply(cached.playlists) })
  }, [])

  return { playlists, isLoading, isLoadingMore, hasMore, error, loadMore, reload, patch }
}
