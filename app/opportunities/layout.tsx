import type { Metadata } from "next"
import { HUB_TITLE, HUB_DESCRIPTION } from "./seo"

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESCRIPTION,
  alternates: { canonical: "/opportunities" },
  keywords: [
    "opportunities",
    "scholarships",
    "grants",
    "fellowships",
    "funding",
    "accelerators",
    "training programs",
    "applications open",
  ],
  openGraph: {
    type: "website",
    url: "/opportunities",
    siteName: "UP",
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
  },
}

export default function OpportunitiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
