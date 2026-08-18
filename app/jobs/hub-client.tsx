"use client"

import { Suspense } from "react"
import { RiBriefcaseLine } from "react-icons/ri"
import PageSkeleton from "@/components/skeletons/page-skeleton"
import PublicHubFeed, { type PublicHubConfig } from "@/components/public-hub-feed"

const config: PublicHubConfig = {
  type: "jobs",
  path: "/jobs",
  heading: "Jobs",
  noun: "job",
  subheading: "Roles, internships, and contract work",
  searchPlaceholder: "Search jobs by title, company, or location...",
  icon: RiBriefcaseLine,
  iconClassName: "text-primary",
  tileClassName: "border-primary/20 bg-primary/15",
  suggestionTags: [
    "Remote",
    "Full-time",
    "Part-time",
    "Internship",
    "Contract",
    "Freelance",
  ],
}

export default function JobsPage() {
  // Suspense boundary is required: the hub reads `?tag=` via useSearchParams.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PublicHubFeed config={config} />
    </Suspense>
  )
}
