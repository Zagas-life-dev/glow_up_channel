"use client"

/** Mirrors the detail page's shape: top bar, header column, hairline item list. */
export default function PlaylistDetailSkeleton() {
  return (
    <div className="min-h-screen bg-page pb-24 lg:pb-12">
      <div className="sticky top-0 z-40 border-b border-border/50 bg-page/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6 lg:h-16">
          <div className="h-6 w-6 animate-pulse rounded-lg bg-muted" />
          <div className="ml-auto h-9 w-9 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 xl:gap-14">
          <div className="py-5 lg:py-8">
            <div className="flex items-center gap-4 lg:block">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-muted sm:h-20 sm:w-20 lg:mb-5 lg:h-40 lg:w-40 lg:rounded-3xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-6 w-40 animate-pulse rounded-lg bg-muted" />
                <div className="h-3.5 w-28 animate-pulse rounded-full bg-muted/70" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-muted/60" />
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted/60" />
            </div>
            <div className="mt-5 h-11 w-full animate-pulse rounded-2xl bg-muted/70" />
          </div>

          <div className="pb-8 lg:py-8">
            <div className="border-b border-border/60 pb-3">
              <div className="h-3 w-20 animate-pulse rounded-full bg-muted/70" />
            </div>
            <ul className="divide-y divide-border/50">
              {[...Array(6)].map((_, i) => (
                <li key={i} className="flex items-start gap-3 py-4">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-muted" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted/70" />
                    <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted/50" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
