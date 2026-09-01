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
 *
 * The label itself now belongs to `FeedCard`, keyed on `isPromoted`. It moved there because
 * promoted listings stopped being exclusive to this slot: they also sit inline in the hub
 * lists and the feeds, pulled toward the top by the orderers, and those needed the same
 * disclosure. One owner means the two can never disagree — and means this slot must pass
 * `isPromoted` down rather than drawing its own label, or the card would say "Sponsored"
 * twice.
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
      <FeedCard
        item={{
          ...content,
          // Everything reaching this slot is a paid placement by definition —
          // the per-type promoted endpoints answer with nothing else — but the
          // rows they return project `isPromoted` off the *content* document,
          // where it is usually absent. Setting it here is what guarantees the
          // card discloses.
          isPromoted: true,
          type: content.type as "opportunity" | "job" | "event" | "resource",
        }}
      />
    </div>
  )
}
