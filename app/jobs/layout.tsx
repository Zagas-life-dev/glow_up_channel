import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Jobs",
  description: "Browse job listings from partners and employers on GlowUp.",
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children
}
