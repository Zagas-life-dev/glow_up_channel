import type { Metadata } from "next"
import { HUB_TITLE, HUB_DESCRIPTION } from "./seo"

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESCRIPTION,
  alternates: { canonical: "/events" },
  keywords: [
    "events",
    "events to attend",
    "workshops",
    "conferences",
    "webinars",
    "bootcamps",
    "meetups",
    "free events",
    "online events",
  ],
  openGraph: {
    type: "website",
    url: "/events",
    siteName: "UP",
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
  },
}

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
