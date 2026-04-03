import type { Metadata } from "next"
import { buildProfileMetadata } from "@/lib/content-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildProfileMetadata(id)
}

export default function PublicProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
