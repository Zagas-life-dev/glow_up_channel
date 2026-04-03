import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Playlists",
  description: "Save and organize opportunities, jobs, events, and resources into playlists.",
}

export default function PlaylistsLayout({ children }: { children: React.ReactNode }) {
  return children
}
