import type { Metadata } from "next"
import { buildResourceMetadata } from "@/lib/content-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildResourceMetadata(id)
}

export default function ResourceDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
