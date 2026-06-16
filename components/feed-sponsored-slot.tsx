"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import FeedAd from "@/components/feed-ad"
import FeedCard from "@/components/feed-card"
import { Button } from "@/components/ui/button"

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
  /** When true, render FeedAd below the sponsored card (for "sponsored + ads" slots). */
  showAdBelow?: boolean
  /** Slot ID for the ad below; uses slotId if not provided. */
  adSlotId?: string
  className?: string
}

export default function FeedSponsoredSlot({
  kind,
  content,
  adKey: _adKey,
  slotId,
  showAdBelow = false,
  adSlotId,
  className,
}: FeedSponsoredSlotProps) {
  const adId = adSlotId ?? slotId

  // Pure ad slot: render the ad bare so it collapses to nothing when it doesn't
  // fill, instead of leaving an empty "Sponsored" card in the feed.
  if (kind !== "promoted" || !content || !content.type) {
    return <FeedAd slotId={slotId} className={className} />
  }

  const detailHref =
    content
      ? content.type === "opportunity"
        ? `/opportunities/${content._id}`
        : content.type === "job"
          ? `/jobs/${content._id}`
          : content.type === "event"
            ? `/events/${content._id}`
            : `/resources/${content._id}`
      : null

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
      <div className="px-3 pb-3 space-y-3">
        <div className="space-y-3">
          <FeedCard
            item={{
              ...content,
              type: content.type as "opportunity" | "job" | "event" | "resource",
            }}
          />
          {detailHref && (
            <div className="flex justify-end">
              <Button asChild size="sm" className="rounded-full">
                <Link href={detailHref}>
                  Open
                </Link>
              </Button>
            </div>
          )}
        </div>
        {showAdBelow && adId && <FeedAd slotId={adId} />}
      </div>
    </div>
  )
}
