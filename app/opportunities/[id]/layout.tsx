import type { Metadata } from "next"
import { buildOpportunityMetadata } from "@/lib/content-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildOpportunityMetadata(id)
}

export default function OpportunityDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
