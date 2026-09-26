"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { PageShell } from "@/components/layout/page-shell"

/** The profile's navy header block, then the tabs and rows, so nothing jumps. */
export default function ProfileSkeleton() {
  return (
    <PageShell fullWidth className="relative font-sans">
      <div className="relative mx-auto w-full max-w-2xl" aria-busy="true" aria-label="Loading">
        <div className="relative mb-5 overflow-hidden rounded-up-xl bg-up-lead p-5 sm:p-6">
          <div className="h-20 w-20 rounded-full bg-white/[0.12] sm:h-24 sm:w-24" />
          <div className="mt-5 h-6 w-44 max-w-full animate-pulse rounded-full bg-white/[0.12] motion-reduce:animate-none" />
          <div className="mt-3 h-3.5 w-full max-w-sm rounded-full bg-white/[0.08]" />
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="h-11 min-w-[8rem] flex-1 rounded-full bg-white/[0.08]" />
            <div className="h-11 min-w-0 flex-1 rounded-full bg-white/[0.08]" />
          </div>
        </div>

        <div className="mb-4 flex gap-1 rounded-full bg-up-fill p-1">
          <Skeleton className="h-[34px] flex-1 rounded-full bg-card" />
          <div className="h-[34px] flex-1" />
        </div>

        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-up-xl border border-border bg-card p-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded-up-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full rounded-full" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
