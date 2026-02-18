"use client"

/**
 * Single feed/post card skeleton. Use in lists (opportunities, jobs, events, resources, community).
 */
export function FeedCardSkeleton() {
  return (
    <div className="w-full rounded-2xl bg-card border border-border overflow-hidden animate-pulse">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-3 bg-muted rounded w-20" />
            </div>
          </div>
        </div>
        <div className="space-y-2 mt-3">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-4 bg-muted rounded w-4/6" />
        </div>
        <div className="h-40 bg-muted rounded-xl mt-3" />
        <div className="flex items-center gap-2 pt-3 border-t border-border mt-3">
          <div className="h-8 w-16 bg-muted rounded-lg" />
          <div className="h-8 w-16 bg-muted rounded-lg" />
          <div className="h-8 w-16 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/**
 * List of feed card skeletons for list pages.
 */
export default function FeedListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <FeedCardSkeleton key={i} />
      ))}
    </div>
  )
}
