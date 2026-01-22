"use client"

export default function ContentDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 bg-white/[0.05] rounded-xl animate-pulse" />
            <div className="h-6 w-20 bg-white/[0.05] rounded animate-pulse" />
            <div className="w-9" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Main Card */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/[0.08] animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/[0.08] rounded w-32 animate-pulse" />
                <div className="h-3 bg-white/[0.08] rounded w-20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <div className="h-8 bg-white/[0.08] rounded w-full animate-pulse" />
              <div className="h-8 bg-white/[0.08] rounded w-3/4 animate-pulse" />
            </div>

            {/* Meta Info Row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-4 bg-white/[0.08] rounded w-24 animate-pulse" />
              <div className="h-4 bg-white/[0.08] rounded w-32 animate-pulse" />
              <div className="h-4 bg-white/[0.08] rounded w-16 animate-pulse" />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <div className="h-6 bg-white/[0.08] rounded-full w-20 animate-pulse" />
              <div className="h-6 bg-white/[0.08] rounded-full w-24 animate-pulse" />
              <div className="h-6 bg-white/[0.08] rounded-full w-16 animate-pulse" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="h-4 bg-white/[0.08] rounded w-24 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-white/[0.08] rounded w-full animate-pulse" />
                <div className="h-4 bg-white/[0.08] rounded w-full animate-pulse" />
                <div className="h-4 bg-white/[0.08] rounded w-5/6 animate-pulse" />
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-3">
              <div className="h-4 bg-white/[0.08] rounded w-32 animate-pulse" />
              <div className="space-y-2 pl-6">
                <div className="h-4 bg-white/[0.08] rounded w-full animate-pulse" />
                <div className="h-4 bg-white/[0.08] rounded w-3/4 animate-pulse" />
              </div>
            </div>

            {/* Image Skeleton */}
            <div className="h-64 bg-white/[0.08] rounded-xl animate-pulse" />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
              <div className="h-10 bg-white/[0.08] rounded-lg w-32 animate-pulse" />
              <div className="h-10 bg-white/[0.08] rounded-lg w-32 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Engagement Actions Skeleton */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center justify-center gap-6">
            <div className="h-8 w-16 bg-white/[0.08] rounded animate-pulse" />
            <div className="h-8 w-16 bg-white/[0.08] rounded animate-pulse" />
            <div className="h-8 w-16 bg-white/[0.08] rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
