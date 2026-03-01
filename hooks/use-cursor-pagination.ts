"use client"

import { useState, useCallback, useEffect, useRef } from 'react'

interface UseCursorPaginationOptions<T> {
  fetchFunction: (lastId: string | null) => Promise<{ items: T[], lastId: string | null, hasMore: boolean }>
  storageKey?: string // localStorage key to cache lastId
  resetOnMount?: boolean // Whether to reset on component mount
  limit?: number
}

/**
 * Custom hook for cursor-based pagination
 * Stores last item ID in localStorage and uses it for next fetch
 */
export function useCursorPagination<T extends { _id: string }>({
  fetchFunction,
  storageKey,
  resetOnMount = false,
  limit = 20
}: UseCursorPaginationOptions<T>) {
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastIdRef = useRef<string | null>(null)
  const isInitialLoadRef = useRef(true)
  const requestIdRef = useRef(0)

  // Get cached lastId from localStorage
  const getCachedLastId = useCallback((): string | null => {
    if (!storageKey || typeof window === 'undefined') return null
    try {
      const cached = localStorage.getItem(storageKey)
      return cached || null
    } catch {
      return null
    }
  }, [storageKey])

  // Save lastId to localStorage
  const saveLastId = useCallback((id: string | null) => {
    if (!storageKey || typeof window === 'undefined') return
    try {
      if (id) {
        localStorage.setItem(storageKey, id)
      } else {
        localStorage.removeItem(storageKey)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey])

  // Clear cached lastId
  const clearCache = useCallback(() => {
    lastIdRef.current = null
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [storageKey])

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
      const currentLastId = reset ? null : (lastIdRef.current || getCachedLastId())
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
        saveLastId(newLastId)
      }

      setHasMore(result.hasMore && result.items.length === limit)
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
  }, [fetchFunction, getCachedLastId, saveLastId, clearCache, limit])

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

  // Initial load
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      if (resetOnMount) {
        clearCache()
        fetchItems(true)
      } else {
        fetchItems(true)
      }
    }
  }, []) // Only run on mount

  return {
    items,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    loadMore,
    reset,
    updateItem,
    clearCache
  }
}



