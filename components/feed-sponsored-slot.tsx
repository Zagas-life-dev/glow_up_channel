"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
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
  className?: string
}

export default function FeedSponsoredSlot({
  kind,
  content,
  className,
}: FeedSponsoredSlotProps) {
  // Only provider-promoted content renders. Slots the feed builder reserved for
  // ads collapse to nothing.
  if (kind !== "promoted" || !content || !content.type) {
    return null
  }

  const detailHref =
    content.type === "opportunity"
      ? `/opportunities/${content._id}`
      : content.type === "job"
        ? `/jobs/${content._id}`
        : content.type === "event"
          ? `/events/${content._id}`
          : `/resources/${content._id}`

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
          <div className="flex justify-end">
            <Button asChild size="sm" className="rounded-full">
              <Link href={detailHref}>
                Open
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
