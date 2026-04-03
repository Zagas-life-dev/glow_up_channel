import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Locked In",
  description: "Track streaks and stay consistent with your goals on GlowUp.",
}

export default function LockedInLayout({ children }: { children: React.ReactNode }) {
  return children
}
