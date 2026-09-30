import { getJob } from "@/lib/seo/fetch-content"
import JobDetail from "./job-detail"

/**
 * Server entry for the job detail page.
 *
 * The listing is fetched here (one cached round trip, shared with the layout's
 * metadata and JSON-LD) and handed to the client component, so the full page,
 * not a loading skeleton, is in the HTML. The client still refetches quietly
 * for fresh counts.
 */
export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const job = await getJob(id)
  return <JobDetail id={id} initialJob={job} />
}
