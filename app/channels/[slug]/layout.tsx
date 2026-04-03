import type { Metadata } from "next"
import { buildChannelMetadata } from "@/lib/content-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  return buildChannelMetadata(slug)
}

export default function ChannelDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
