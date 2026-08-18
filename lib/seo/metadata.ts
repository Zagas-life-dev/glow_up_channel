import type { Metadata } from "next"
import { getSiteUrl } from "@/lib/site-url"
import { plainText } from "./structured-data"
import {
  getEvent,
  getJob,
  getOpportunity,
  getResource,
} from "./fetch-content"
import type { SeoLocation } from "./content-types"

/**
 * Metadata for individual listing pages.
 *
 * Beyond title/description these add the canonical URL, Open Graph and Twitter
 * cards, and keyword sets — the signals that decide whether a shared link
 * renders as a rich card and whether the page is treated as the authoritative
 * copy of a listing that also exists on the organiser's own site.
 */

const META_DESC_MAX = 160

function metaDescription(value?: string | null, fallback?: string): string {
  return plainText(value, META_DESC_MAX) ?? fallback ?? ""
}

/** Human-readable place string used to make titles and descriptions specific. */
function locationLabel(loc?: SeoLocation): string | null {
  if (loc?.isRemote && !loc.isHybrid) return "Remote"
  const parts = [loc?.city, loc?.country].filter(Boolean)
  if (!parts.length) return loc?.isHybrid ? "Hybrid" : null
  return parts.join(", ")
}

function formatDate(value?: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

interface PageMetaInput {
  title: string
  description: string
  path: string
  image?: string | null
  keywords?: (string[] | undefined)[]
  /** OG type; listings read better as "article" than the site-wide "website". */
  ogType?: "article" | "website" | "profile"
  publishedTime?: string
  modifiedTime?: string
}

function buildPageMetadata(input: PageMetaInput): Metadata {
  const url = `${getSiteUrl()}${input.path}`
  const images = input.image ? [{ url: input.image }] : undefined
  const keywords = Array.from(
    new Set(
      (input.keywords ?? [])
        .flatMap((g) => g ?? [])
        .map((k) => String(k).trim())
        .filter(Boolean),
    ),
  ).slice(0, 20)

  return {
    title: input.title,
    description: input.description,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      type: input.ogType ?? "article",
      url,
      siteName: "UP",
      title: input.title,
      description: input.description,
      images,
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      images: input.image ? [input.image] : undefined,
    },
  }
}

/** Marks a listing we could not load, so thin 404-ish pages stay out of the index. */
const NOINDEX: Metadata = {
  title: "Not found",
  robots: { index: false, follow: true },
}

/* -------------------------------------------------------------------------- */

export async function buildEventMetadata(id: string): Promise<Metadata> {
  const event = await getEvent(id)
  if (!event?.title) return NOINDEX

  const place = locationLabel(event.location)
  const when = formatDate(event.dates?.startDate)
  // Front-load the facts a searcher actually typed: what, where, when.
  const titleBits = [event.title, place].filter(Boolean).join(" — ")
  const descFallback = [
    when ? `Happening ${when}.` : null,
    place ? `Location: ${place}.` : null,
    event.organizer ? `Organized by ${event.organizer}.` : null,
    "Find details and register on UP.",
  ]
    .filter(Boolean)
    .join(" ")

  return buildPageMetadata({
    title: titleBits,
    description: metaDescription(event.description, descFallback),
    path: `/events/${id}`,
    image: event.image,
    keywords: [
      event.tags,
      event.industrySectors,
      event.targetAudience,
      [event.eventType, place, "event"].filter(Boolean) as string[],
    ],
    publishedTime: event.publishedAt,
    modifiedTime: event.updatedAt,
  })
}

export async function buildJobMetadata(id: string): Promise<Metadata> {
  const job = await getJob(id)
  if (!job?.title) return NOINDEX

  const place = locationLabel(job.location)
  const titleBits = [job.title, job.company, place].filter(Boolean).join(" — ")
  const descFallback = [
    job.company ? `${job.company} is hiring.` : null,
    place ? `Location: ${place}.` : null,
    job.jobType ? `${job.jobType} role.` : null,
    "Apply through UP.",
  ]
    .filter(Boolean)
    .join(" ")

  return buildPageMetadata({
    title: titleBits,
    description: metaDescription(job.description, descFallback),
    path: `/jobs/${id}`,
    image: job.image,
    keywords: [
      job.tags,
      job.industrySectors,
      job.targetAudience,
      [job.jobType, job.company, place, "job"].filter(Boolean) as string[],
    ],
    publishedTime: job.publishedAt,
    modifiedTime: job.updatedAt,
  })
}

export async function buildOpportunityMetadata(id: string): Promise<Metadata> {
  const o = await getOpportunity(id)
  if (!o?.title) return NOINDEX

  const place = locationLabel(o.location)
  const deadline = formatDate(o.dates?.applicationDeadline)
  const titleBits = [o.title, o.provider].filter(Boolean).join(" — ")
  const descFallback = [
    o.type ? `${o.type} opportunity.` : null,
    o.provider ? `Offered by ${o.provider}.` : null,
    place ? `Location: ${place}.` : null,
    deadline ? `Apply by ${deadline}.` : null,
  ]
    .filter(Boolean)
    .join(" ")

  return buildPageMetadata({
    title: titleBits,
    description: metaDescription(o.description, descFallback),
    path: `/opportunities/${id}`,
    image: o.image,
    keywords: [
      o.tags,
      o.industrySectors,
      o.targetAudience,
      [o.type, o.category, o.provider, place, "opportunity"].filter(
        Boolean,
      ) as string[],
    ],
    publishedTime: o.publishedAt,
    modifiedTime: o.updatedAt,
  })
}

export async function buildResourceMetadata(id: string): Promise<Metadata> {
  const r = await getResource(id)
  if (!r?.title) return NOINDEX

  const descFallback = [
    r.resourceType ? `${r.resourceType}.` : null,
    r.category ? `Category: ${r.category}.` : null,
    r.isPremium ? null : "Free to access on UP.",
  ]
    .filter(Boolean)
    .join(" ")

  return buildPageMetadata({
    title: r.title,
    description: metaDescription(r.description, descFallback),
    path: `/resources/${id}`,
    keywords: [
      r.tags,
      [r.category, r.resourceType, "resource", r.isPremium ? null : "free"].filter(
        Boolean,
      ) as string[],
    ],
    modifiedTime: r.updatedAt,
  })
}
