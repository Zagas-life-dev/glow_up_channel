"use client"

import { useState, useCallback, useEffect, useRef } from 'react'

interface UseCursorPaginationOptions<T> {
  fetchFunction: (lastId: string | null) => Promise<{ items: T[], lastId: string | null, hasMore: boolean }>
  /** Used by page for session-store keying only; no cross-session persistence */
  storageKey?: string
  resetOnMount?: boolean // Whether to reset on component mount
  limit?: number
  /** Session-restored state: when provided, skip initial fetch and use these instead (from page-state-session) */
  initialItems?: T[]
  initialLastId?: string | null
  /** When false, defer initial fetch until it becomes true (e.g. wait for auth). Default true. */
  enabled?: boolean
}

/**
 * Custom hook for cursor-based pagination.
 * Does not use localStorage; cache is session-scoped and provided by the page via initialItems/initialLastId.
 * On refresh, no restored state is passed so the feed starts fresh.
 */
export function useCursorPagination<T extends { _id: string }>({
  fetchFunction,
  storageKey: _storageKey,
  resetOnMount = false,
  limit = 20,
  initialItems,
  initialLastId,
  enabled = true,
}: UseCursorPaginationOptions<T>) {
  const hasRestored = Array.isArray(initialItems) && initialItems.length >= 0 && initialLastId !== undefined
  const [items, setItems] = useState<T[]>(() => (hasRestored ? (initialItems ?? []) : []))
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastIdRef = useRef<string | null>(hasRestored ? (initialLastId ?? null) : null)
  const initialFetchDoneRef = useRef(false)
  const requestIdRef = useRef(0)

  // No localStorage: session-only cache is provided by the page via initialItems/initialLastId
  const clearCache = useCallback(() => {
    lastIdRef.current = null
  }, [])

  // Fetch items — ignore results from stale fetches (e.g. after tab switch) so we don't overwrite with wrong tab's data
  const fetchItems = useCallback(async (reset = false) => {
    const myRequestId = ++requestIdRef.current

    if (reset) {
      setItems([])
      setIsLoading(true)
      setIsRefreshing(true)
      clearCache()
      lastIdRef.current = null
    } else {
      setIsLoading(true)
    }

    setError(null)

    try {
      const currentLastId = reset ? null : lastIdRef.current
      const result = await fetchFunction(currentLastId)

      if (myRequestId !== requestIdRef.current) return

      if (reset) {
        setItems(result.items)
      } else {
        setItems(prev => {
          const existingIds = new Set(prev.map(item => item._id))
          const newItems = result.items.filter(item => !existingIds.has(item._id))
          return [...prev, ...newItems]
        })
      }

      if (result.items.length > 0) {
        const newLastId = result.lastId || result.items[result.items.length - 1]._id
        lastIdRef.current = newLastId
      }

      setHasMore(result.hasMore)
    } catch (err: any) {
      if (myRequestId !== requestIdRef.current) return
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error fetching items:', err)
      }
      setError(err.message || 'Failed to fetch items')
      if (reset) {
        setItems([])
      }
      setHasMore(false)
    } finally {
      if (myRequestId === requestIdRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [fetchFunction, clearCache, limit])

  // Load more items
  const loadMore = useCallback(() => {
    if (!isLoading && !isRefreshing && hasMore) {
      fetchItems(false)
    }
  }, [fetchItems, isLoading, isRefreshing, hasMore])

  // Reset and reload
  const reset = useCallback(() => {
    fetchItems(true)
  }, [fetchItems])

  // Update a single item in the list (for engagement updates without full refresh)
  const updateItem = useCallback((itemId: string, updatedItem: Partial<T>) => {
    setItems(prev => prev.map(item => 
      item._id === itemId ? { ...item, ...updatedItem } : item
    ))
  }, [])

  // Initial load: when enabled, run once (skip when session-restored). When enabled is false (e.g. auth loading), defer until enabled.
  useEffect(() => {
    if (!enabled || initialFetchDoneRef.current) return
    initialFetchDoneRef.current = true
    if (hasRestored) return
    if (resetOnMount) clearCache()
    fetchItems(true)
  }, [enabled])

  const getLastId = useCallback((): string | null => lastIdRef.current, [])

  return {
    items,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    loadMore,
    reset,
    updateItem,
    clearCache,
    getLastId,
  }
}



