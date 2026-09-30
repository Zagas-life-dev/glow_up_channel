import { getOpportunity } from "@/lib/seo/fetch-content"
import OpportunityDetail from "./opportunity-detail"

/**
 * Server entry for the opportunity detail page.
 *
 * The listing is fetched here (one cached round trip, shared with the layout's
 * metadata and JSON-LD) and handed to the client component, so the full page,
 * not a loading skeleton, is in the HTML. The client still refetches quietly
 * for fresh counts.
 */
export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const opportunity = await getOpportunity(id)
  return <OpportunityDetail id={id} initialOpportunity={opportunity} />
}
