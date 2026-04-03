import type { Metadata } from "next"
import { buildJobMetadata } from "@/lib/content-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildJobMetadata(id)
}

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
