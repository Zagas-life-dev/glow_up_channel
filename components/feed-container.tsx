"use client"

import { ReactNode, useState } from 'react'
import FeedCard from './feed-card'
import { Inbox } from 'lucide-react'

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
      <div className="space-y-4 w-full max-w-full">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-full max-w-full relative rounded-2xl border transition-all duration-300 bg-white/[0.02] border-white/[0.06] overflow-hidden">
            <div className="p-4 w-full max-w-full overflow-hidden">
              <div className="animate-pulse">
                {/* Header Row - matches FeedCard structure */}
                <div className="flex items-start gap-4 mb-4">
                  {/* Type Icon */}
                  <div className="w-11 h-11 rounded-xl bg-white/[0.08] flex-shrink-0" />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Type & Provider */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-3 bg-white/[0.08] rounded w-16" />
                      <div className="h-3 bg-white/[0.08] rounded w-20" />
                    </div>
                    
                    {/* Title */}
                    <div className="h-4 bg-white/[0.08] rounded w-3/4" />
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4 space-y-2">
                  <div className="h-3 bg-white/[0.08] rounded w-full" />
                  <div className="h-3 bg-white/[0.08] rounded w-5/6" />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <div className="h-7 bg-white/[0.08] rounded-lg w-20" />
                  <div className="h-7 bg-white/[0.08] rounded-lg w-16" />
                  <div className="h-7 bg-white/[0.08] rounded-lg w-16" />
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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {emptyIcon || (
          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-5">
            <Inbox className="w-7 h-7 text-white/30" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-white mb-2">Nothing here yet</h3>
        <p className="text-white/50 max-w-sm text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full max-w-full">
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
