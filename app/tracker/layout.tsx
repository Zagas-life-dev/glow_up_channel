import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tracker",
  description: "Everything you left UP to apply for, and what actually happened.",
}

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return children
}
