"use client"

import { cn } from "@/lib/utils"
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
  className?: string
}

/**
 * A promoted item in the feed.
 *
 * It renders the ordinary feed card with a disclosure label above it, rather than boxing the
 * card inside a second bordered card with its own "Open" button — that nested the same border
 * twice and duplicated a link the card's own title already provides. Promoted items should
 * read as the same kind of thing as everything around them, just labelled.
 */
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

  return (
    <div className={cn("w-full", className)}>
      <p className="mb-1.5 pl-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
        Sponsored
      </p>
      <FeedCard
        item={{
          ...content,
          type: content.type as "opportunity" | "job" | "event" | "resource",
        }}
      />
    </div>
  )
}
