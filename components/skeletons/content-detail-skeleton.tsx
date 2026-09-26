"use client"

/**
 * Mirrors the detail page: a navy block where the hero will be (so the page
 * doesn't flash white-then-navy), then the body column and the side rail.
 */
export default function ContentDetailSkeleton() {
  return (
    <div className="min-h-screen bg-page pb-24 lg:pb-12" aria-busy="true" aria-label="Loading">
      <div className="mx-auto w-full lg:max-w-6xl lg:px-8 lg:pt-8">
        <div className="relative overflow-hidden bg-up-lead px-5 pb-10 pt-4 lg:rounded-[28px] lg:px-9 lg:pb-10 lg:pt-7">
          <div className="h-10 w-10 rounded-full bg-white/[0.08]" />
          <div className="mt-6 flex items-center gap-2">
            <div className="h-7 w-7 rounded-[10px] bg-white/[0.12]" />
            <div className="h-3 w-28 rounded-full bg-white/[0.12]" />
          </div>
          <div className="mt-4 h-6 w-4/5 max-w-lg animate-pulse rounded-full bg-white/[0.12] motion-reduce:animate-none" />
          <div className="mt-2.5 h-6 w-3/5 max-w-sm animate-pulse rounded-full bg-white/[0.12] motion-reduce:animate-none" />
          <div className="mt-5 flex gap-2">
            <div className="h-7 w-24 rounded-full bg-white/[0.08]" />
            <div className="h-7 w-20 rounded-full bg-white/[0.08]" />
          </div>
        </div>

        <div className="relative -mt-5 rounded-t-[1.75rem] bg-page px-4 pt-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0">
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="animate-pulse rounded-up-xl border border-border bg-card p-5 motion-reduce:animate-none">
                <div className="h-3 w-24 rounded-full bg-up-fill" />
                <div className="mt-4 space-y-2.5">
                  <div className="h-3 w-full rounded-full bg-up-hairline" />
                  <div className="h-3 w-full rounded-full bg-up-hairline" />
                  <div className="h-3 w-4/5 rounded-full bg-up-hairline" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 hidden animate-pulse rounded-up-xl border border-border bg-card p-5 motion-reduce:animate-none lg:mt-0 lg:block">
            <div className="h-11 w-full rounded-full bg-up-fill" />
            <div className="mt-4 space-y-2.5">
              <div className="h-3 w-3/4 rounded-full bg-up-hairline" />
              <div className="h-3 w-1/2 rounded-full bg-up-hairline" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
