import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Resources",
  description: "Guides, tools, and learning resources to support your journey on GlowUp.",
}

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return children
}
