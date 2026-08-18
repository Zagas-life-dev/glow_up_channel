import type { Metadata } from "next"
import { JsonLd } from "@/components/seo/json-ld"
import { buildJobMetadata } from "@/lib/seo/metadata"
import { getJob } from "@/lib/seo/fetch-content"
import { buildBreadcrumbJsonLd, buildJobJsonLd } from "@/lib/seo/structured-data"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return buildJobMetadata(id)
}

/**
 * Server-rendered JobPosting data for a client-rendered page. This is what
 * Google Jobs and AI assistants read; see the note in the events layout.
 */
export default async function JobDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const job = await getJob(id)

  return (
    <>
      {job?.title && (
        <JsonLd
          data={[
            buildJobJsonLd(job, id),
            buildBreadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Jobs", path: "/jobs" },
              { name: job.title, path: `/jobs/${id}` },
            ]),
          ]}
        />
      )}
      {children}
    </>
  )
}
