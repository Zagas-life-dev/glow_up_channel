"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  createInitialSearchCursors,
  createInitialSearchHasMore,
  fetchSearchAllCategoriesPage,
  fetchSearchCategoryPage,
  searchTabToListType,
  type SearchCursors,
  type SearchHasMoreByType,
  type SearchTab,
} from "@/lib/search-list-fetch"
import type { HomeListItem, HomeListType } from "@/lib/fetch-home-list-page"
import { trackSearch } from "@/lib/tracking"

type SearchFeedItem = HomeListItem & { _id: string }

export function useSearchFeed(searchQuery: string, activeTab: SearchTab) {
  const [items, setItems] = useState<SearchFeedItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const singleLastIdRef = useRef<string | null>(null)
  const allCursorsRef = useRef<SearchCursors>(createInitialSearchCursors())
  const allHasMoreRef = useRef<SearchHasMoreByType>(createInitialSearchHasMore())
  const requestIdRef = useRef(0)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""

  const runFetch = useCallback(
    async (mode: "reset" | "more") => {
      const term = searchQuery.trim()
      if (!term) {
        setItems([])
        setHasMore(false)
        singleLastIdRef.current = null
        allCursorsRef.current = createInitialSearchCursors()
        allHasMoreRef.current = createInitialSearchHasMore()
        return
      }

      if (!backendUrl) {
        setError("Search is unavailable (backend URL not configured).")
        setItems([])
        setHasMore(false)
        return
      }

      const requestId = ++requestIdRef.current
      const listType = searchTabToListType(activeTab)

      if (mode === "reset") {
        setIsLoading(true)
        setError(null)
        singleLastIdRef.current = null
        allCursorsRef.current = createInitialSearchCursors()
        allHasMoreRef.current = createInitialSearchHasMore()
      } else {
        setIsLoading(true)
      }

      try {
        if (listType) {
          const page = await fetchSearchCategoryPage({
            type: listType,
            cursorLastId: mode === "reset" ? null : singleLastIdRef.current,
            backendUrl,
            search: term,
          })

          if (requestId !== requestIdRef.current) return

          singleLastIdRef.current = page.lastId

          if (mode === "reset") {
            setItems(page.items as SearchFeedItem[])
          } else {
            setItems((prev) => {
              const seen = new Set(prev.map((i) => i._id))
              const next = page.items.filter((i) => !seen.has(String(i._id)))
              return [...prev, ...(next as SearchFeedItem[])]
            })
          }
          setHasMore(page.hasMore)
        } else {
          const result = await fetchSearchAllCategoriesPage({
            backendUrl,
            search: term,
            cursors: allCursorsRef.current,
            hasMoreByType: allHasMoreRef.current,
            reset: mode === "reset",
          })

          if (requestId !== requestIdRef.current) return

          allCursorsRef.current = result.cursors
          allHasMoreRef.current = result.hasMoreByType

          if (mode === "reset") {
            setItems(result.items as SearchFeedItem[])
          } else {
            setItems((prev) => {
              const seen = new Set(prev.map((i) => i._id))
              const next = result.items.filter((i) => !seen.has(String(i._id)))
              return [...prev, ...(next as SearchFeedItem[])]
            })
          }
          setHasMore(result.hasMore)
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        console.error("Search feed error:", err)
        setError("Something went wrong while searching. Please try again.")
        if (mode === "reset") setItems([])
        setHasMore(false)
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [searchQuery, activeTab, backendUrl],
  )

  const reset = useCallback(() => {
    void runFetch("reset")
  }, [runFetch])

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return
    void runFetch("more")
  }, [hasMore, isLoading, runFetch])

  useEffect(() => {
    const timer = setTimeout(() => {
      // Reported from inside the debounce, so a settled query counts and the keystrokes
      // on the way to it do not. An empty box is a cleared search, not a search.
      // trackSearch itself dedupes to one event per session per day.
      if (searchQuery.trim()) trackSearch()
      void runFetch("reset")
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, activeTab, runFetch])

  return {
    items,
    isLoading,
    hasMore,
    error,
    reset,
    loadMore,
    hasQuery: Boolean(searchQuery.trim()),
  }
}

export type { SearchTab, HomeListType }
