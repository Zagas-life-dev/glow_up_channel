"use client"

/**
 * Placeholder matching the feed card's real geometry — type row, two-line title/description,
 * meta line, action row. Same padding and radii, so nothing shifts when content arrives.
 */
export function FeedCardSkeleton() {
  return (
    <div className="w-full animate-pulse rounded-2xl border border-border bg-card">
      <div className="p-4">
        {/* Type + provider */}
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 rounded-full bg-muted" />
          <div className="h-3 w-20 rounded-full bg-muted" />
          <div className="h-3 w-24 rounded-full bg-muted/70" />
        </div>

        {/* Title */}
        <div className="mt-3 h-4 w-4/5 rounded-full bg-muted" />

        {/* Description */}
        <div className="mt-2.5 space-y-2">
          <div className="h-3 w-full rounded-full bg-muted/70" />
          <div className="h-3 w-3/5 rounded-full bg-muted/70" />
        </div>

        {/* Meta */}
        <div className="mt-3 h-3 w-2/5 rounded-full bg-muted/60" />

        {/* Actions */}
        <div className="mt-3 flex items-center gap-3 border-t border-border/60 pt-3">
          <div className="h-4 w-10 rounded-full bg-muted/70" />
          <div className="h-4 w-10 rounded-full bg-muted/70" />
          <div className="h-4 w-10 rounded-full bg-muted/70" />
          <div className="h-4 w-10 rounded-full bg-muted/70" />
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
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <FeedCardSkeleton key={i} />
      ))}
    </div>
  )
}
