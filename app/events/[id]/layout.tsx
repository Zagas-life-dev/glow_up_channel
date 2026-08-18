import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/json-ld"
import { buildEventMetadata } from "@/lib/seo/metadata"
import { getEvent } from "@/lib/seo/fetch-content"
import {
  buildBreadcrumbJsonLd,
  buildEventJsonLd,
} from "@/lib/seo/structured-data"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildEventMetadata(id)
}

/**
 * The detail page itself is a client component, so its content never reaches a
 * crawler that does not run JS. The JSON-LD emitted here is the server-rendered
 * copy of the same facts — it is what lets an individual event be retrieved and
 * quoted by AI answer engines.
 *
 * `getEvent` is React-cached, so this shares one fetch with `generateMetadata`.
 */
export default async function EventDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEvent(id)

  return (
    <>
      {event?.title && (
        <JsonLd
          data={[
            buildEventJsonLd(event, id),
            buildBreadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Events", path: "/events" },
              { name: event.title, path: `/events/${id}` },
            ]),
          ]}
        />
      )}
      {children}
    </>
  )
}
