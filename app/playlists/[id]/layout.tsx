import type { Metadata } from "next"
import { buildPlaylistMetadata } from "@/lib/content-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildPlaylistMetadata(id)
}

export default function PlaylistDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
