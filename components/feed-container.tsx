"use client"

import { ReactNode, useState } from 'react'
import FeedCard from './feed-card'
import FeedAd from './feed-ad'
import { buildFeedWithAds } from '@/lib/feed-ads'
import { RiInboxLine, RiSparklingLine } from 'react-icons/ri'

interface FeedContainerProps {
  items: any[]
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: ReactNode
  /** Session-restored expanded card id */
  initialExpandedId?: string | null
  /** Notify parent when expanded id changes (for session save) */
  onExpandedIdChange?: (id: string | null) => void
  /** Insert an ad after every N cards. 0 disables ads. */
  adEvery?: number
  /** Adsterra zone key for in-feed ads. Defaults to NEXT_PUBLIC_ADSTERRA_FEED_KEY. */
  adSlotId?: string
}

export default function FeedContainer({
  items,
  loading = false,
  emptyMessage = "No content found",
  emptyIcon,
  initialExpandedId = null,
  onExpandedIdChange,
  adEvery = 4,
  adSlotId = process.env.NEXT_PUBLIC_ADSTERRA_FEED_KEY || "",
}: FeedContainerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId ?? null)

  const handleExpand = (id: string) => {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    onExpandedIdChange?.(next)
  }

  if (loading) {
    return (
      <div className="space-y-5 w-full max-w-full">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-full max-w-full relative rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden animate-pulse">
            <div className="p-6 w-full max-w-full overflow-hidden">
              <div>
                {/* Header Row - matches FeedCard structure */}
                <div className="flex items-start gap-4 mb-5">
                  {/* Type Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex-shrink-0" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Type & Provider */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 bg-muted/60 rounded-full w-20" />
                      <div className="h-3 bg-muted/60 rounded-full w-24" />
                    </div>

                    {/* Title */}
                    <div className="h-5 bg-muted/60 rounded-full w-4/5" />
                  </div>
                </div>

                {/* Description */}
                <div className="mb-5 space-y-2">
                  <div className="h-3 bg-muted/60 rounded-full w-full" />
                  <div className="h-3 bg-muted/60 rounded-full w-5/6" />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <div className="h-8 bg-muted/60 rounded-full w-24" />
                  <div className="h-8 bg-muted/60 rounded-full w-20" />
                  <div className="h-8 bg-muted/60 rounded-full w-20" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        {emptyIcon || (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/15 to-rose-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
            <RiInboxLine className="w-9 h-9 text-orange-400/60" aria-hidden />
          </div>
        )}
        <h3 className="text-xl font-bold text-foreground mb-2">Nothing here yet</h3>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{emptyMessage}</p>
      </div>
    )
  }

  const showAds = adEvery > 0 && !!adSlotId
  const feed = showAds
    ? buildFeedWithAds(items, { adEvery })
    : items.map((post) => ({ type: "post" as const, post }))

  return (
    <div className="space-y-5 w-full max-w-full">
      {feed.map((entry) =>
        entry.type === "ad" ? (
          <FeedAd key={entry.key} slotId={adSlotId} className="my-1" />
        ) : (
          <FeedCard
            key={entry.post._id}
            item={entry.post}
            isExpanded={expandedId === entry.post._id}
            onExpand={() => handleExpand(entry.post._id)}
          />
        )
      )}
    </div>
  )
}
