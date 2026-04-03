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
          <div className="mb-5 flex items-start gap-4">
            <Skeleton className="h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-28" />
            <div className="flex min-w-0 flex-1 justify-between gap-1">
              <Skeleton className="h-[3.25rem] flex-1 rounded-xl" />
              <Skeleton className="h-[3.25rem] flex-1 rounded-xl" />
              <Skeleton className="h-[3.25rem] flex-1 rounded-xl" />
            </div>
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
          <Skeleton className="h-11 min-h-11 flex-1 rounded-2xl" />
        </div>

        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[1.25rem] border border-border/50 bg-card/50 p-5">
              <div className="mb-3 flex items-start gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-2 h-4 w-[85%]" />
              <Skeleton className="mb-4 h-40 w-full rounded-2xl" />
              <div className="flex flex-wrap gap-4">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
