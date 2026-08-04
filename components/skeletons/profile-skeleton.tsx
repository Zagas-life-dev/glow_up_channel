"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { PageShell } from "@/components/layout/page-shell"

export default function ProfileSkeleton() {
  return (
    <PageShell fullWidth className="relative font-sans">
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="sticky top-0 z-20 -mx-1 mb-1 flex items-center justify-between gap-2 border-b border-border/50 bg-page/90 px-2 py-2.5 backdrop-blur-xl sm:static sm:mx-0 sm:mb-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-3 sm:backdrop-blur-0">
          <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
          <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
        </div>

        <div className="mb-5 overflow-hidden rounded-[1.35rem] border border-border/60 bg-card/70 p-4 sm:p-6">
          <div className="mb-5 flex items-start">
            <Skeleton className="h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-28" />
          </div>
          <Skeleton className="mb-2 h-8 w-44 max-w-full" />
          <Skeleton className="mb-3 h-4 w-full max-w-sm" />
          <Skeleton className="mb-4 h-16 w-full max-w-lg" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 min-w-[8rem] flex-1 rounded-2xl" />
            <Skeleton className="h-11 min-w-0 flex-1 rounded-2xl" />
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <Skeleton className="h-11 min-h-11 flex-1 rounded-2xl" />
          <Skeleton className="h-11 min-h-11 flex-1 rounded-2xl" />
        </div>

        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl p-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
