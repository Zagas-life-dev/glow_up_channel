import { getEvent } from "@/lib/seo/fetch-content"
import EventDetail from "./event-detail"

/**
 * Server entry for the event detail page.
 *
 * The listing is fetched here (one cached round trip, shared with the layout's
 * metadata and JSON-LD) and handed to the client component, so the full page,
 * not a loading skeleton, is in the HTML. The client still refetches quietly
 * for fresh counts.
 */
export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEvent(id)
  return <EventDetail id={id} initialEvent={event} />
}
