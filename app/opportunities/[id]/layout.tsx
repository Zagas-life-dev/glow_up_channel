import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/json-ld"
import { buildOpportunityMetadata } from "@/lib/seo/metadata"
import { getOpportunity } from "@/lib/seo/fetch-content"
import {
  buildBreadcrumbJsonLd,
  buildOpportunityJsonLd,
} from "@/lib/seo/structured-data"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildOpportunityMetadata(id)
}

/**
 * Server-rendered structured data for a client-rendered page. The emitted type
 * varies by opportunity kind (grant / job posting / program) so that funding
 * and program questions match the right entity; see `buildOpportunityJsonLd`.
 */
export default async function OpportunityDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const opportunity = await getOpportunity(id)

  return (
    <>
      {opportunity?.title && (
        <JsonLd
          data={[
            buildOpportunityJsonLd(opportunity, id),
            buildBreadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Opportunities", path: "/opportunities" },
              { name: opportunity.title, path: `/opportunities/${id}` },
            ]),
          ]}
        />
      )}
      {children}
    </>
  )
}
