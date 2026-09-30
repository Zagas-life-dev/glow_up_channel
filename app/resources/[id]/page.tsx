import { getResource } from "@/lib/seo/fetch-content"
import ResourceDetail from "./resource-detail"

/**
 * Server entry for the resource detail page.
 *
 * The listing is fetched here (one cached round trip, shared with the layout's
 * metadata and JSON-LD) and handed to the client component, so the full page,
 * not a loading skeleton, is in the HTML. The client still refetches quietly
 * for fresh counts.
 */
export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const resource = await getResource(id)
  return <ResourceDetail id={id} initialResource={resource} />
}
