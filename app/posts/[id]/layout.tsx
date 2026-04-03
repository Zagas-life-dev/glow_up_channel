import type { Metadata } from "next"
import { buildPostMetadata } from "@/lib/content-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildPostMetadata(id)
}

export default function PostDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
