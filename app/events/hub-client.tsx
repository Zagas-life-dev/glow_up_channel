"use client"

import { Suspense } from "react"
import { RiCalendarLine } from "react-icons/ri"
import PageSkeleton from "@/components/skeletons/page-skeleton"
import PublicHubFeed, { type PublicHubConfig } from "@/components/public-hub-feed"

const config: PublicHubConfig = {
  type: "events",
  path: "/events",
  heading: "Events",
  noun: "event",
  subheading: "Conferences, workshops, and networking events",
  searchPlaceholder: "Search events by title, category, or location...",
  icon: RiCalendarLine,
  iconClassName: "text-emerald-400",
  tileClassName: "border-emerald-500/20 bg-emerald-500/15",
  suggestionTags: [
    "Conference",
    "Workshop",
    "Meetup",
    "Webinar",
    "Hackathon",
    "Networking",
  ],
}

export default function EventsPage() {
  // Suspense boundary is required: the hub reads `?tag=` via useSearchParams.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PublicHubFeed config={config} />
    </Suspense>
  )
}
