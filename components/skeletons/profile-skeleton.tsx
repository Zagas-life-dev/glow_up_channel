"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-40 bg-page/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Skeleton className="w-9 h-9 rounded-full bg-muted" />
          <div className="text-center">
            <Skeleton className="h-4 w-32 bg-muted mx-auto mb-1" />
            <Skeleton className="h-3 w-20 bg-muted mx-auto" />
          </div>
          <Skeleton className="w-9 h-9 rounded-full bg-muted" />
        </div>
      </div>

      {/* Profile Content Skeleton */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header Skeleton */}
        <div className="flex items-start gap-5 mb-6">
          {/* Avatar Skeleton */}
          <div className="relative flex-shrink-0">
            <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted" />
          </div>

          {/* Stats Skeleton */}
          <div className="flex-1 flex items-center justify-around pt-2">
            <div className="text-center">
              <Skeleton className="h-6 w-8 bg-muted mx-auto mb-1" />
              <Skeleton className="h-3 w-12 bg-muted mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-8 bg-muted mx-auto mb-1" />
              <Skeleton className="h-3 w-16 bg-muted mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-8 bg-muted mx-auto mb-1" />
              <Skeleton className="h-3 w-16 bg-muted mx-auto" />
            </div>
          </div>
        </div>

        {/* Name & Bio Skeleton */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-6 w-32 bg-muted" />
            <Skeleton className="h-4 w-16 bg-muted rounded" />
          </div>
          <Skeleton className="h-4 w-48 bg-muted mb-2" />
          <Skeleton className="h-4 w-full bg-muted mb-1" />
          <Skeleton className="h-4 w-3/4 bg-muted" />

          {/* Quick Info Skeleton */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
            <Skeleton className="h-3 w-24 bg-muted" />
            <Skeleton className="h-3 w-32 bg-muted" />
            <Skeleton className="h-3 w-28 bg-muted" />
            <Skeleton className="h-3 w-20 bg-muted" />
          </div>
        </div>

        {/* Skills Skeleton */}
        <div className="mb-5">
          <Skeleton className="h-3 w-16 bg-muted mb-2" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-6 w-20 bg-muted rounded-full" />
            <Skeleton className="h-6 w-24 bg-muted rounded-full" />
            <Skeleton className="h-6 w-18 bg-muted rounded-full" />
            <Skeleton className="h-6 w-22 bg-muted rounded-full" />
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex gap-2 mb-6">
          <Skeleton className="flex-1 h-9 bg-muted rounded-xl" />
          <Skeleton className="flex-1 h-9 bg-muted rounded-xl" />
        </div>

        {/* Tabs Skeleton */}
        <div className="border-b border-border mb-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24 bg-muted rounded-none" />
            <Skeleton className="h-10 w-28 bg-muted rounded-none" />
            <Skeleton className="h-10 w-24 bg-muted rounded-none" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-5">
              <div className="flex items-start gap-3 mb-3">
                <Skeleton className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 bg-muted mb-2" />
                  <Skeleton className="h-3 w-16 bg-muted" />
                </div>
              </div>
              <Skeleton className="h-4 w-full bg-muted mb-2" />
              <Skeleton className="h-4 w-3/4 bg-muted mb-4" />
              <Skeleton className="h-48 w-full rounded-xl bg-muted mb-3" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-12 bg-muted" />
                <Skeleton className="h-5 w-12 bg-muted" />
                <Skeleton className="h-5 w-12 bg-muted" />
                <Skeleton className="h-5 w-12 bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

