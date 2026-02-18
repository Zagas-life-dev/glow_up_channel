"use client"

/**
 * Full-page skeleton for auth check, dashboard, settings, and other generic pages.
 * Use instead of spinner + "Loading..." text.
 */
export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-page/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 bg-muted rounded-xl animate-pulse" />
            <div className="h-6 w-24 bg-muted rounded animate-pulse" />
            <div className="h-9 w-9 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 md:px-6 py-8 space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-card border border-border p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </div>
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
