"use client"

import { ReactNode, useState } from 'react'
import FeedCard from './feed-card'
import { RiInboxLine, RiSparklingLine } from 'react-icons/ri'

interface FeedContainerProps {
  items: any[]
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: ReactNode
}

export default function FeedContainer({
  items,
  loading = false,
  emptyMessage = "No content found",
  emptyIcon
}: FeedContainerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading) {
    return (
      <div className="space-y-5 w-full max-w-full">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-full max-w-full relative rounded-2xl border transition-all duration-300 bg-card/50 border-border overflow-hidden backdrop-blur-sm">
            <div className="p-6 w-full max-w-full overflow-hidden">
              <div className="animate-pulse">
                {/* Header Row - matches FeedCard structure */}
                <div className="flex items-start gap-4 mb-5">
                  {/* Type Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-muted/70 flex-shrink-0" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Type & Provider */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 bg-muted/70 rounded-full w-20" />
                      <div className="h-3 bg-muted/70 rounded-full w-24" />
                    </div>

                    {/* Title */}
                    <div className="h-5 bg-muted/70 rounded-lg w-4/5" />
                  </div>
                </div>

                {/* Description */}
                <div className="mb-5 space-y-2">
                  <div className="h-3 bg-muted/70 rounded-lg w-full" />
                  <div className="h-3 bg-muted/70 rounded-lg w-5/6" />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <div className="h-8 bg-muted/70 rounded-xl w-24" />
                  <div className="h-8 bg-muted/70 rounded-xl w-20" />
                  <div className="h-8 bg-muted/70 rounded-xl w-20" />
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
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-6 shadow-lg">
            <RiInboxLine className="w-9 h-9 text-muted-foreground/40" aria-hidden />
          </div>
        )}
        <h3 className="text-xl font-bold text-foreground mb-2">Nothing here yet</h3>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 w-full max-w-full">
      {items.map((item) => (
        <FeedCard
          key={item._id}
          item={item}
          isExpanded={expandedId === item._id}
          onExpand={() => handleExpand(item._id)}
        />
      ))}
    </div>
  )
}
