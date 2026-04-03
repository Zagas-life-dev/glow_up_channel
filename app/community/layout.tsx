import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Community",
  description:
    "Join the GlowUp community — discussions, posts, and peer support for your growth journey.",
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children
}
