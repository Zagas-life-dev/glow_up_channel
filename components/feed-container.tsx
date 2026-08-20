"use client"

import { ReactNode } from 'react'
import FeedCard from './feed-card'
import { FeedCardSkeleton } from './skeletons/feed-card-skeleton'
import { RiInboxLine } from 'react-icons/ri'

interface FeedContainerProps {
  items: any[]
  loading?: boolean
  /** How many placeholder cards to show while loading. */
  skeletonCount?: number
  /** Announced to screen readers while the placeholders are up. */
  loadingMessage?: string
  emptyMessage?: string
  emptyIcon?: ReactNode
}

/**
 * The list every non-personalised feed renders through (opportunities, jobs, events,
 * resources). It shares the card and the skeleton with the For You feed so all five tabs
 * have the same geometry — the placeholder used to describe a card layout that no longer
 * existed, which made every load shift the page.
 */
export default function FeedContainer({
  items,
  loading = false,
  skeletonCount = 5,
  loadingMessage = "Loading content…",
  emptyMessage = "No content found",
  emptyIcon,
}: FeedContainerProps) {
  if (loading) {
    return (
      <div className="w-full max-w-full space-y-3" role="status" aria-busy="true">
        <span className="sr-only">{loadingMessage}</span>
        {[...Array(skeletonCount)].map((_, i) => (
          <FeedCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-20 text-center">
        {emptyIcon || (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <RiInboxLine className="h-5 w-5 text-muted-foreground" aria-hidden />
          </div>
        )}
        <h3 className="text-base font-semibold text-foreground">Nothing here yet</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-3">
      {items.map((post) => (
        <FeedCard key={post._id} item={post} />
      ))}
    </div>
  )
}
