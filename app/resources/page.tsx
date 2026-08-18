import { JsonLd } from "@/components/seo/json-ld"
import { previewResources } from "@/lib/seo/fetch-content"
import { buildItemListJsonLd } from "@/lib/seo/structured-data"
import { HUB_TITLE, HUB_DESCRIPTION } from "./seo"
import ResourcesPage from "./hub-client"

/** Server shell carrying the hub's ItemList; see the events hub page. */
export default async function Page() {
  const resources = await previewResources().catch(() => [])

  return (
    <>
      {resources.length > 0 && (
        <JsonLd
          data={buildItemListJsonLd(
            HUB_TITLE,
            HUB_DESCRIPTION,
            "/resources",
            resources,
          )}
        />
      )}
      <ResourcesPage />
    </>
  )
}
