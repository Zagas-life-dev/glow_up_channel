/**
 * Normalize any list / unified / search row into one FeedCard display shape.
 * Data sources stay the same (APIs unchanged); only client-side mapping for UI.
 */

import type { HomeListType } from "@/lib/fetch-home-list-page"

export type FeedContentKind = "opportunity" | "job" | "event" | "resource"

export type FeedApiPlural = "opportunities" | "events" | "jobs" | "resources"

export type FeedCardNormalizedItem = {
  _id: string
  title: string
  type: FeedContentKind
  description?: string
  company?: string
  organization?: string
  author?: string
  location?: {
    country?: string
    province?: string
    city?: string
    isRemote?: boolean
    isHybrid?: boolean
    address?: string
  }
  tags?: string[]
  financial?: {
    isPaid?: boolean
    amount?: string | number
    currency?: string
    benefits?: string[]
  }
  isPaid?: boolean
  price?: string | number
  dates?: {
    applicationDeadline?: string
    startDate?: string
    endDate?: string
    registrationDeadline?: string
  }
  metrics?: {
    viewCount?: number
    likeCount?: number
    saveCount?: number
    shareCount?: number
    playlistAddCount?: number
    playlistCount?: number
  }
  url?: string
  applicationLink?: string
  externalUrl?: string
  externalLink?: string
  paymentLink?: string
  fileUrl?: string
  category?: string
  duration?: string
  isPremium?: boolean
  requirements?: unknown
  benefits?: unknown
  pay?: unknown
  capacity?: unknown
  opportunityType?: string
  eventType?: string
  jobType?: string
  provider?: string
  organizer?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

const LIST_TYPE_TO_KIND: Record<HomeListType, FeedContentKind> = {
  opportunities: "opportunity",
  events: "event",
  jobs: "job",
  resources: "resource",
}

const KIND_TO_PLURAL: Record<FeedContentKind, FeedApiPlural> = {
  opportunity: "opportunities",
  event: "events",
  job: "jobs",
  resource: "resources",
}

const FEED_CONTENT_KINDS = new Set<string>([
  "opportunity",
  "job",
  "event",
  "resource",
])

const OPPORTUNITY_SUBTYPES = new Set([
  "internship",
  "scholarship",
  "grant",
  "competition",
  "fellowship",
  "training",
  "volunteer",
  "other",
])

function toIdString(id: unknown): string {
  if (id == null) return ""
  return typeof id === "string" ? id : String(id)
}

function linkFields(
  url: string | undefined,
  item: Record<string, unknown>,
): Pick<
  FeedCardNormalizedItem,
  "url" | "applicationLink" | "externalUrl" | "externalLink"
> {
  const link =
    (item.applicationLink as string | undefined) ||
    (item.externalUrl as string | undefined) ||
    (item.externalLink as string | undefined) ||
    url
  return {
    url: url ?? link,
    applicationLink: link,
    externalUrl: link,
    externalLink: link,
  }
}

export function resolveFeedContentKind(
  typeField: string | undefined,
): FeedContentKind {
  if (typeField && FEED_CONTENT_KINDS.has(typeField)) {
    return typeField as FeedContentKind
  }
  if (typeField && OPPORTUNITY_SUBTYPES.has(typeField.toLowerCase())) {
    return "opportunity"
  }
  return "opportunity"
}

export function toEngagementApiPlural(kind: FeedContentKind): FeedApiPlural {
  return KIND_TO_PLURAL[kind]
}

/**
 * Map API / recommendation documents to the shape FeedCard expects
 * (mirrors backend publicFeedService.normalizeForFeedCard).
 */
export function normalizeFeedCardItem(
  raw: Record<string, unknown>,
  hint?: { listType?: HomeListType; contentType?: string },
): FeedCardNormalizedItem {
  const contentKind: FeedContentKind = hint?.listType
    ? LIST_TYPE_TO_KIND[hint.listType]
    : resolveFeedContentKind(
        hint?.contentType ??
          (typeof raw.contentType === "string" ? raw.contentType : undefined) ??
          (typeof raw.type === "string" ? raw.type : undefined),
      )

  const _id = toIdString(raw._id)
  const base: FeedCardNormalizedItem = {
    ...raw,
    _id,
    title: typeof raw.title === "string" ? raw.title : "",
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    type: contentKind,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    metrics:
      raw.metrics && typeof raw.metrics === "object"
        ? (raw.metrics as FeedCardNormalizedItem["metrics"])
        : {},
    createdAt: raw.createdAt as string | undefined,
    updatedAt: raw.updatedAt as string | undefined,
  }

  if (contentKind === "opportunity") {
    const rawType = typeof raw.type === "string" ? raw.type : undefined
    const opportunityType =
      rawType && rawType !== "opportunity" && !FEED_CONTENT_KINDS.has(rawType)
        ? rawType
        : (raw.opportunityType as string | undefined)

    const provider =
      (raw.provider as string | undefined) ||
      (raw.company as string | undefined) ||
      (raw.organization as string | undefined)

    const financial =
      raw.financial && typeof raw.financial === "object"
        ? (raw.financial as FeedCardNormalizedItem["financial"])
        : undefined

    const url = (raw.url as string | undefined) || undefined

    return {
      ...base,
      opportunityType,
      provider,
      company: provider,
      organization: provider,
      category: raw.category as string | undefined,
      requirements: raw.requirements,
      financial,
      dates: raw.dates as FeedCardNormalizedItem["dates"],
      location: raw.location as FeedCardNormalizedItem["location"],
      ...linkFields(url, raw),
    }
  }

  if (contentKind === "event") {
    const organizer =
      (raw.organizer as string | undefined) ||
      (raw.company as string | undefined) ||
      (raw.organization as string | undefined)

    const isPaid = raw.isPaid as boolean | undefined
    const price = raw.price as string | number | undefined
    const financial =
      raw.financial && typeof raw.financial === "object"
        ? (raw.financial as FeedCardNormalizedItem["financial"])
        : isPaid !== undefined
          ? {
              isPaid,
              amount: price,
              currency: raw.currency as string | undefined,
            }
          : undefined

    const url = (raw.url as string | undefined) || undefined

    return {
      ...base,
      eventType: raw.eventType as string | undefined,
      organizer,
      company: organizer,
      organization: organizer,
      isPaid,
      price,
      financial,
      dates: raw.dates as FeedCardNormalizedItem["dates"],
      location: raw.location as FeedCardNormalizedItem["location"],
      capacity: raw.capacity,
      requirements: raw.requirements,
      ...linkFields(url, raw),
    }
  }

  if (contentKind === "job") {
    const pay =
      raw.pay && typeof raw.pay === "object"
        ? raw.pay
        : undefined
    const payObj = pay as { isPaid?: boolean; amount?: string | number; currency?: string } | undefined
    const financial =
      raw.financial && typeof raw.financial === "object"
        ? (raw.financial as FeedCardNormalizedItem["financial"])
        : payObj
          ? {
              isPaid: payObj.isPaid,
              amount: payObj.amount,
              currency: payObj.currency,
            }
          : undefined

    const url = (raw.url as string | undefined) || undefined

    return {
      ...base,
      jobType: (raw.jobType as string | undefined) || undefined,
      company: raw.company as string | undefined,
      pay,
      benefits: raw.benefits,
      requirements: raw.requirements,
      financial,
      dates: raw.dates as FeedCardNormalizedItem["dates"],
      location: raw.location as FeedCardNormalizedItem["location"],
      ...linkFields(url, raw),
    }
  }

  // resource
  const fileUrl =
    (raw.fileUrl as string | undefined) ||
    (raw.url as string | undefined) ||
    undefined

  return {
    ...base,
    category: raw.category as string | undefined,
    duration: raw.duration as string | undefined,
    isPremium: raw.isPremium as boolean | undefined,
    paymentLink: raw.paymentLink as string | undefined,
    fileUrl,
    author: raw.author as string | undefined,
    url: fileUrl,
    applicationLink: fileUrl,
    externalUrl: fileUrl,
    externalLink: fileUrl,
  }
}

/** List tab + search pages (known collection type). */
export function normalizeFeedListItem<T extends Record<string, unknown>>(
  listType: HomeListType,
  item: T,
): FeedCardNormalizedItem {
  return normalizeFeedCardItem(item, { listType })
}

/** For You / unified / anonymous feed rows (contentType on document). */
export function normalizeUnifiedFeedItem<T extends Record<string, unknown>>(
  item: T,
): FeedCardNormalizedItem {
  const contentType =
    typeof item.contentType === "string" ? item.contentType : undefined
  return normalizeFeedCardItem(item, { contentType })
}

export function normalizeFeedCardItems<T extends Record<string, unknown>>(
  items: T[],
  hint?: { listType?: HomeListType },
): FeedCardNormalizedItem[] {
  return items.map((item) =>
    hint?.listType
      ? normalizeFeedListItem(hint.listType, item)
      : normalizeUnifiedFeedItem(item),
  )
}
