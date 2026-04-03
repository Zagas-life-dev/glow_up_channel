import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Opportunities",
  description: "Explore scholarships, programs, and opportunities curated for ambitious young people.",
}

export default function OpportunitiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
