"use client"

export default function PostDetailSkeleton() {
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back Button Skeleton */}
        <div className="mb-4">
          <div className="h-10 w-20 bg-white/[0.05] rounded-lg animate-pulse" />
        </div>

        {/* Post Card Skeleton */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 mb-6">
          <div className="animate-pulse space-y-4">
            {/* Author Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/[0.08]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/[0.08] rounded w-32" />
                <div className="h-3 bg-white/[0.08] rounded w-20" />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="h-4 bg-white/[0.08] rounded w-full" />
              <div className="h-4 bg-white/[0.08] rounded w-5/6" />
              <div className="h-4 bg-white/[0.08] rounded w-4/6" />
            </div>

            {/* Image Skeleton */}
            <div className="h-64 bg-white/[0.08] rounded-xl" />

            {/* Actions */}
            <div className="flex items-center gap-6 pt-3 border-t border-white/[0.06]">
              <div className="h-8 w-16 bg-white/[0.08] rounded" />
              <div className="h-8 w-16 bg-white/[0.08] rounded" />
              <div className="h-8 w-16 bg-white/[0.08] rounded" />
            </div>
          </div>
        </div>

        {/* Reply Composer Skeleton */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 mb-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.08] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-16 bg-white/[0.08] rounded-lg animate-pulse" />
              <div className="h-8 w-20 bg-white/[0.08] rounded-lg animate-pulse ml-auto" />
            </div>
          </div>
        </div>

        {/* Replies Section Skeleton */}
        <div className="space-y-3">
          <div className="h-6 w-32 bg-white/[0.08] rounded animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/[0.08] animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-white/[0.08] rounded w-24 animate-pulse" />
                  <div className="h-2 bg-white/[0.08] rounded w-16 animate-pulse" />
                </div>
              </div>
              <div className="ml-10 space-y-2">
                <div className="h-3 bg-white/[0.08] rounded w-full animate-pulse" />
                <div className="h-3 bg-white/[0.08] rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
