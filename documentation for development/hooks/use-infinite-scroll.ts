"use client"

import { useEffect, useRef, useCallback, useState } from 'react'

interface UseInfiniteScrollOptions {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  threshold?: number // Distance from bottom to trigger load (in pixels)
  rootMargin?: string // Intersection observer root margin
  itemsBeforeLoad?: number // Number of items before end to trigger load (default: 5)
  estimatedItemHeight?: number // Estimated height of each item in pixels (default: 400)
}

/**
 * Custom hook for infinite scrolling using Intersection Observer
 * Similar to Twitter's infinite scroll implementation
 * Triggers loading when user is approximately 5 items from the end
 * Returns a ref that should be attached to a sentinel element
 */
export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 200, // Fallback distance from bottom to trigger load (in pixels)
  rootMargin,
  itemsBeforeLoad = 5, // Load when 5 items from the end
  estimatedItemHeight = 400 // Average height of each item in pixels
}: UseInfiniteScrollOptions) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Calculate rootMargin based on itemsBeforeLoad if not provided
  const calculatedRootMargin = rootMargin || `0px 0px ${itemsBeforeLoad * estimatedItemHeight}px 0px`

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    setIsIntersecting(entry.isIntersecting)

    if (entry.isIntersecting && hasMore && !isLoading) {
      onLoadMore()
    }
  }, [hasMore, isLoading, onLoadMore])

  useEffect(() => {
    const options = {
      root: null, // Use viewport as root
      rootMargin: calculatedRootMargin,
      threshold: 0.1
    }

    observerRef.current = new IntersectionObserver(handleIntersection, options)

    const currentSentinel = sentinelRef.current
    if (currentSentinel) {
      observerRef.current.observe(currentSentinel)
    }

    return () => {
      if (observerRef.current && currentSentinel) {
        observerRef.current.unobserve(currentSentinel)
      }
    }
  }, [handleIntersection, calculatedRootMargin])

  // Return the ref and threshold for the consuming component to render the sentinel
  return { 
    sentinelRef,
    threshold,
    isIntersecting 
  }
}
