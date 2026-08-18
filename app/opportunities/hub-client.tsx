"use client"

import { Suspense } from "react"
import { RiFocus3Line } from "react-icons/ri"
import PageSkeleton from "@/components/skeletons/page-skeleton"
import PublicHubFeed, { type PublicHubConfig } from "@/components/public-hub-feed"

const config: PublicHubConfig = {
  type: "opportunities",
  path: "/opportunities",
  heading: "Opportunities",
  noun: "opportunity",
  subheading: "Scholarships, fellowships, grants, and programs",
  searchPlaceholder: "Search opportunities by title, category, or provider...",
  icon: RiFocus3Line,
  iconClassName: "text-orange-500",
  tileClassName: "border-orange-500/20 bg-orange-500/15",
  suggestionTags: [
    "Scholarship",
    "Fellowship",
    "Internship",
    "Grant",
    "Competition",
    "Mentorship",
  ],
}

export default function OpportunitiesPage() {
  // Suspense boundary is required: the hub reads `?tag=` via useSearchParams.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PublicHubFeed config={config} />
    </Suspense>
  )
}
