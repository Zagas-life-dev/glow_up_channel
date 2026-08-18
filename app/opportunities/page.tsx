import { JsonLd } from "@/components/seo/json-ld"
import { previewOpportunities } from "@/lib/seo/fetch-content"
import { buildItemListJsonLd } from "@/lib/seo/structured-data"
import { HUB_TITLE, HUB_DESCRIPTION } from "./seo"
import OpportunitiesPage from "./hub-client"

/** Server shell carrying the hub's ItemList; see the events hub page. */
export default async function Page() {
  const opportunities = await previewOpportunities().catch(() => [])

  return (
    <>
      {opportunities.length > 0 && (
        <JsonLd
          data={buildItemListJsonLd(
            HUB_TITLE,
            HUB_DESCRIPTION,
            "/opportunities",
            opportunities,
          )}
        />
      )}
      <OpportunitiesPage />
    </>
  )
}
