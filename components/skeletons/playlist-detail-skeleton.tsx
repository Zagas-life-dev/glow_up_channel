"use client"

export default function PlaylistDetailSkeleton() {
  return (
    <div className="min-h-screen bg-page pb-24 lg:pb-8">
      {/* Hero Section with Gradient Background */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,hsl(var(--primary)_/_0.06),transparent_55%)]" />
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-page/60 backdrop-blur-2xl border-b border-border">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between py-4">
              <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
              <div className="h-6 w-24 bg-muted rounded animate-pulse" />
              <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Playlist Header */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          <div className="flex items-start gap-6">
            {/* Icon Skeleton */}
            <div className="w-20 h-20 rounded-2xl bg-muted animate-pulse flex-shrink-0" />
            
            {/* Title and Info */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded w-64 animate-pulse" />
                <div className="h-4 bg-muted rounded w-48 animate-pulse" />
              </div>
              
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                <div className="h-4 bg-muted rounded w-20 animate-pulse" />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <div className="h-6 bg-muted rounded-full w-20 animate-pulse" />
                <div className="h-6 bg-muted rounded-full w-24 animate-pulse" />
                <div className="h-6 bg-muted rounded-full w-16 animate-pulse" />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <div className="h-10 bg-muted rounded-lg w-32 animate-pulse" />
                <div className="h-10 bg-muted rounded-lg w-32 animate-pulse" />
                <div className="h-10 bg-muted rounded-lg w-32 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-muted rounded w-32 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-muted animate-pulse flex-shrink-0" />
                
                {/* Content */}
                <div className="flex-1 space-y-3">
                  <div className="space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                  </div>
                  
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="h-3 bg-muted rounded w-24 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-32 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <div className="h-3 bg-muted rounded w-full animate-pulse" />
                    <div className="h-3 bg-muted rounded w-5/6 animate-pulse" />
                  </div>
                </div>

                {/* Actions */}
                <div className="h-8 w-8 bg-muted rounded-lg animate-pulse flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
