"use client"

import { Suspense } from "react"
import { RiBookLine } from "react-icons/ri"
import PageSkeleton from "@/components/skeletons/page-skeleton"
import PublicHubFeed, { type PublicHubConfig } from "@/components/public-hub-feed"

const config: PublicHubConfig = {
  type: "resources",
  path: "/resources",
  heading: "Resources",
  noun: "resource",
  subheading: "Guides, templates, toolkits, and courses",
  searchPlaceholder: "Search resources by title, category, or topic...",
  icon: RiBookLine,
  iconClassName: "text-violet-400",
  tileClassName: "border-violet-500/20 bg-violet-500/15",
  suggestionTags: [
    "E-books",
    "Courses",
    "Templates",
    "Guides",
    "Tutorials",
    "Tools",
  ],
}

export default function ResourcesPage() {
  // Suspense boundary is required: the hub reads `?tag=` via useSearchParams.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PublicHubFeed config={config} />
    </Suspense>
  )
}
