import type { Metadata } from "next"
import { buildEventMetadata } from "@/lib/content-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildEventMetadata(id)
}

export default function EventDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
