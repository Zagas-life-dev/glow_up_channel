import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About",
  description:
    "Mission, values, and story behind GlowUp — connecting ambitious young people to real opportunities.",
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
