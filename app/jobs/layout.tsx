import type { Metadata } from "next"
import { HUB_TITLE, HUB_DESCRIPTION } from "./seo"

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_DESCRIPTION,
  alternates: { canonical: "/jobs" },
  keywords: [
    "jobs",
    "job openings",
    "internships",
    "remote jobs",
    "entry level jobs",
    "graduate jobs",
    "hiring",
    "vacancies",
  ],
  openGraph: {
    type: "website",
    url: "/jobs",
    siteName: "UP",
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
  },
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children
}
