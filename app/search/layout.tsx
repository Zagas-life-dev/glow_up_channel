import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Search",
  description: "Search opportunities, jobs, events, resources, and people on GlowUp.",
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
