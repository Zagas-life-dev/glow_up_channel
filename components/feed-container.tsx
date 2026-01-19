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
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-11 h-11 rounded-xl bg-white/[0.05] animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/[0.05] rounded-lg w-24 animate-pulse" />
                <div className="h-4 bg-white/[0.05] rounded-lg w-3/4 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-white/[0.05] rounded-lg animate-pulse" />
              <div className="h-3 bg-white/[0.05] rounded-lg w-5/6 animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 bg-white/[0.05] rounded-lg w-20 animate-pulse" />
              <div className="h-7 bg-white/[0.05] rounded-lg w-16 animate-pulse" />
              <div className="h-7 bg-white/[0.05] rounded-lg w-16 animate-pulse" />
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
    <div className="space-y-4">
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
