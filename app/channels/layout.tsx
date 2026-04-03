import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Channels",
  description:
    "Browse and join GlowUp channels — topic-based spaces for focused conversation and collaboration.",
}

export default function ChannelsLayout({ children }: { children: React.ReactNode }) {
  return children
}
