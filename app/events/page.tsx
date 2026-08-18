import { JsonLd } from "@/components/seo/json-ld"
import { previewEvents } from "@/lib/seo/fetch-content"
import { buildItemListJsonLd } from "@/lib/seo/structured-data"
import { HUB_TITLE, HUB_DESCRIPTION } from "./seo"
import EventsPage from "./hub-client"

/**
 * Server shell for the events hub.
 *
 * The feed is client-rendered, so this ItemList is the only view a crawler gets
 * of what is currently listed, and the only path from the hub to individual
 * event URLs. It lives on the page rather than the layout because a layout also
 * wraps `/events/[id]`, which would wrongly label a single event as a
 * collection.
 */
export default async function Page() {
  const events = await previewEvents().catch(() => [])

  return (
    <>
      {events.length > 0 && (
        <JsonLd
          data={buildItemListJsonLd(
            HUB_TITLE,
            HUB_DESCRIPTION,
            "/events",
            events,
          )}
        />
      )}
      <EventsPage />
    </>
  )
}
