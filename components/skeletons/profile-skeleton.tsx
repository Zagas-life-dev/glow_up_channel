"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Skeleton className="w-9 h-9 rounded-full bg-white/[0.05]" />
          <div className="text-center">
            <Skeleton className="h-4 w-32 bg-white/[0.05] mx-auto mb-1" />
            <Skeleton className="h-3 w-20 bg-white/[0.05] mx-auto" />
          </div>
          <Skeleton className="w-9 h-9 rounded-full bg-white/[0.05]" />
        </div>
      </div>

      {/* Profile Content Skeleton */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header Skeleton */}
        <div className="flex items-start gap-5 mb-6">
          {/* Avatar Skeleton */}
          <div className="relative flex-shrink-0">
            <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/[0.05]" />
          </div>

          {/* Stats Skeleton */}
          <div className="flex-1 flex items-center justify-around pt-2">
            <div className="text-center">
              <Skeleton className="h-6 w-8 bg-white/[0.05] mx-auto mb-1" />
              <Skeleton className="h-3 w-12 bg-white/[0.05] mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-8 bg-white/[0.05] mx-auto mb-1" />
              <Skeleton className="h-3 w-16 bg-white/[0.05] mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-8 bg-white/[0.05] mx-auto mb-1" />
              <Skeleton className="h-3 w-16 bg-white/[0.05] mx-auto" />
            </div>
          </div>
        </div>

        {/* Name & Bio Skeleton */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-6 w-32 bg-white/[0.05]" />
            <Skeleton className="h-4 w-16 bg-white/[0.05] rounded" />
          </div>
          <Skeleton className="h-4 w-48 bg-white/[0.05] mb-2" />
          <Skeleton className="h-4 w-full bg-white/[0.05] mb-1" />
          <Skeleton className="h-4 w-3/4 bg-white/[0.05]" />

          {/* Quick Info Skeleton */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
            <Skeleton className="h-3 w-24 bg-white/[0.05]" />
            <Skeleton className="h-3 w-32 bg-white/[0.05]" />
            <Skeleton className="h-3 w-28 bg-white/[0.05]" />
            <Skeleton className="h-3 w-20 bg-white/[0.05]" />
          </div>
        </div>

        {/* Skills Skeleton */}
        <div className="mb-5">
          <Skeleton className="h-3 w-16 bg-white/[0.05] mb-2" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-6 w-20 bg-white/[0.05] rounded-full" />
            <Skeleton className="h-6 w-24 bg-white/[0.05] rounded-full" />
            <Skeleton className="h-6 w-18 bg-white/[0.05] rounded-full" />
            <Skeleton className="h-6 w-22 bg-white/[0.05] rounded-full" />
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex gap-2 mb-6">
          <Skeleton className="flex-1 h-9 bg-white/[0.05] rounded-xl" />
          <Skeleton className="flex-1 h-9 bg-white/[0.05] rounded-xl" />
        </div>

        {/* Tabs Skeleton */}
        <div className="border-b border-white/[0.06] mb-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24 bg-white/[0.05] rounded-none" />
            <Skeleton className="h-10 w-28 bg-white/[0.05] rounded-none" />
            <Skeleton className="h-10 w-24 bg-white/[0.05] rounded-none" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
              <div className="flex items-start gap-3 mb-3">
                <Skeleton className="w-10 h-10 rounded-full bg-white/[0.05]" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 bg-white/[0.05] mb-2" />
                  <Skeleton className="h-3 w-16 bg-white/[0.05]" />
                </div>
              </div>
              <Skeleton className="h-4 w-full bg-white/[0.05] mb-2" />
              <Skeleton className="h-4 w-3/4 bg-white/[0.05] mb-4" />
              <Skeleton className="h-48 w-full rounded-xl bg-white/[0.05] mb-3" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-12 bg-white/[0.05]" />
                <Skeleton className="h-5 w-12 bg-white/[0.05]" />
                <Skeleton className="h-5 w-12 bg-white/[0.05]" />
                <Skeleton className="h-5 w-12 bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

