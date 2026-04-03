import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Events",
  description: "Discover workshops, programs, and events that help you grow.",
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children
}
