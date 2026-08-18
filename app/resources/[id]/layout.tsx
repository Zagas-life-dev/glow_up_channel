import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/json-ld"
import { buildResourceMetadata } from "@/lib/seo/metadata"
import { getResource } from "@/lib/seo/fetch-content"
import {
  buildBreadcrumbJsonLd,
  buildResourceJsonLd,
} from "@/lib/seo/structured-data"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildResourceMetadata(id)
}

/**
 * Server-rendered LearningResource data for a client-rendered page; see the
 * note in the events layout.
 */
export default async function ResourceDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const resource = await getResource(id)

  return (
    <>
      {resource?.title && (
        <JsonLd
          data={[
            buildResourceJsonLd(resource, id),
            buildBreadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Resources", path: "/resources" },
              { name: resource.title, path: `/resources/${id}` },
            ]),
          ]}
        />
      )}
      {children}
    </>
  )
}
