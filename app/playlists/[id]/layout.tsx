import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/json-ld"
import { buildPlaylistJsonLd, buildPlaylistMetadata } from "@/lib/content-metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildPlaylistMetadata(id)
}

export default async function PlaylistDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const jsonLd = await buildPlaylistJsonLd(id)
  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {children}
    </>
  )
}
