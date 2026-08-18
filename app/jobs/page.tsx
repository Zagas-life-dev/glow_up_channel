import { JsonLd } from "@/components/seo/json-ld"
import { previewJobs } from "@/lib/seo/fetch-content"
import { buildItemListJsonLd } from "@/lib/seo/structured-data"
import { HUB_TITLE, HUB_DESCRIPTION } from "./seo"
import JobsPage from "./hub-client"

/** Server shell carrying the hub's ItemList; see the events hub page. */
export default async function Page() {
  const jobs = await previewJobs().catch(() => [])

  return (
    <>
      {jobs.length > 0 && (
        <JsonLd
          data={buildItemListJsonLd(HUB_TITLE, HUB_DESCRIPTION, "/jobs", jobs)}
        />
      )}
      <JobsPage />
    </>
  )
}
