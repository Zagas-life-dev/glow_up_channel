import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Premium",
  description: "GlowUp Premium — expanded access to playlists, channels, and member benefits.",
}

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return children
}
