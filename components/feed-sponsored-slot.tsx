"use client"

import { cn } from "@/lib/utils"
import FeedAd from "@/components/feed-ad"
import FeedCard from "@/components/feed-card"

export type PromotedContentItem = {
  _id: string
  title: string
  description?: string
  type: "opportunity" | "job" | "event" | "resource"
  [key: string]: unknown
}

interface FeedSponsoredSlotProps {
  kind: "promoted" | "ad"
  content?: PromotedContentItem | null
  adKey?: string
  slotId: string
  className?: string
}

export default function FeedSponsoredSlot({
  kind,
  content,
  adKey: _adKey,
  slotId,
  className,
}: FeedSponsoredSlotProps) {
  const showPromoted = kind === "promoted" && content && content.type

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border/70 bg-card/80 overflow-hidden min-h-[120px]",
        className
      )}
    >
      <div className="px-3 pt-2 pb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Sponsored
        </span>
      </div>
      <div className="px-3 pb-3">
        {showPromoted ? (
          <FeedCard
            item={{
              ...content,
              type: content.type as "opportunity" | "job" | "event" | "resource",
            }}
          />
        ) : (
          <FeedAd slotId={slotId} className="min-h-[100px]" />
        )}
      </div>
    </div>
  )
}
