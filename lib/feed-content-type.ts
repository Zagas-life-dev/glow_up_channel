/**
 * Feed cards use `type` as content kind: opportunity | job | event | resource.
 * Opportunity API documents also use `type` for subtype (internship, scholarship, …).
 * Display normalization aligns list/search/unified items with the same FeedCard fields.
 */

import type { HomeListType } from "@/lib/fetch-home-list-page"

export type FeedContentKind = "opportunity" | "job" | "event" | "resource"

export type FeedApiPlural = "opportunities" | "events" | "jobs" | "resources"

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

/** Opportunity listing subtypes from the API `type` field (not feed content kind). */
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

function coalesceUrl(item: Record<string, unknown>): string | undefined {
  const candidates = [
    item.url,
    item.applicationLink,
    item.externalUrl,
    item.externalLink,
    item.fileUrl,
  ]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim()
  }
  return undefined
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

export type NormalizedFeedCardItem = Record<string, unknown> & {
  _id: string
  type: FeedContentKind
  score?: number
  opportunityType?: string
}

/**
 * Same display shape as anonymous feed / For You cards: provider→company, pay→financial, links, etc.
 * Preserves score, reasons, contentType, and all other API fields.
 */
export function normalizeFeedCardDisplay<T extends Record<string, unknown>>(
  item: T & { type: FeedContentKind },
): NormalizedFeedCardItem {
  const kind = item.type
  const link = coalesceUrl(item)
  const metrics =
    item.metrics && typeof item.metrics === "object"
      ? item.metrics
      : {}

  const base = {
    ...item,
    _id: String(item._id ?? item.id ?? ""),
    metrics,
    tags: Array.isArray(item.tags) ? item.tags : [],
  } as T & { type: FeedContentKind; _id: string }

  switch (kind) {
    case "opportunity": {
      const provider =
        (item.provider as string) ??
        (item.company as string) ??
        (item.organization as string)
      const financial =
        item.financial && typeof item.financial === "object"
          ? item.financial
          : undefined
      return {
        ...base,
        type: "opportunity",
        company: provider ?? (base.company as string | undefined),
        organization: provider ?? (base.organization as string | undefined),
        url: link ?? (item.url as string | undefined),
        applicationLink: link ?? (item.applicationLink as string | undefined),
        externalUrl: link ?? (item.externalUrl as string | undefined),
        externalLink: link ?? (item.externalLink as string | undefined),
        financial,
        dates: item.dates ?? base.dates,
        location: item.location ?? base.location,
      } as NormalizedFeedCardItem
    }
    case "event": {
      const organizer =
        (item.organizer as string) ??
        (item.company as string) ??
        (item.organization as string)
      const isPaid = item.isPaid as boolean | undefined
      const price = item.price as string | number | undefined
      const currency = item.currency as string | undefined
      const financial =
        item.financial && typeof item.financial === "object"
          ? item.financial
          : isPaid !== undefined
            ? {
                isPaid,
                amount: price != null ? String(price) : undefined,
                currency,
              }
            : undefined
      return {
        ...base,
        type: "event",
        company: organizer ?? (base.company as string | undefined),
        organization: organizer ?? (base.organization as string | undefined),
        isPaid,
        price: price != null ? String(price) : (base.price as string | undefined),
        url: link ?? (item.url as string | undefined),
        applicationLink: link ?? (item.applicationLink as string | undefined),
        externalUrl: link ?? (item.externalUrl as string | undefined),
        externalLink: link ?? (item.externalLink as string | undefined),
        financial,
        dates: item.dates ?? base.dates,
        location: item.location ?? base.location,
      } as NormalizedFeedCardItem
    }
    case "job": {
      const pay =
        item.pay && typeof item.pay === "object"
          ? (item.pay as { isPaid?: boolean; amount?: string; currency?: string })
          : undefined
      const financial =
        item.financial && typeof item.financial === "object"
          ? item.financial
          : pay
            ? {
                isPaid: pay.isPaid,
                amount: pay.amount,
                currency: pay.currency,
              }
            : undefined
      return {
        ...base,
        type: "job",
        company: (item.company as string) ?? (base.company as string | undefined),
        url: link ?? (item.url as string | undefined),
        applicationLink: link ?? (item.applicationLink as string | undefined),
        externalUrl: link ?? (item.externalUrl as string | undefined),
        externalLink: link ?? (item.externalLink as string | undefined),
        pay: item.pay ?? base.pay,
        financial,
        dates: item.dates ?? base.dates,
        location: item.location ?? base.location,
        requirements: item.requirements ?? base.requirements,
        benefits: item.benefits ?? base.benefits,
      } as NormalizedFeedCardItem
    }
    case "resource": {
      const fileUrl =
        (item.fileUrl as string) ?? (item.url as string) ?? link
      return {
        ...base,
        type: "resource",
        fileUrl,
        url: fileUrl,
        paymentLink: (item.paymentLink as string) ?? base.paymentLink,
        category: (item.category as string) ?? base.category,
        isPremium: item.isPremium ?? base.isPremium,
      } as NormalizedFeedCardItem
    }
    default:
      return base as NormalizedFeedCardItem
  }
}

function applyContentKind<T extends Record<string, unknown>>(
  listType: HomeListType,
  item: T,
): T & { type: FeedContentKind; opportunityType?: string } {
  const contentKind = LIST_TYPE_TO_KIND[listType]
  const rawType = typeof item.type === "string" ? item.type : undefined
  const opportunitySubtype =
    listType === "opportunities" &&
    rawType &&
    rawType !== contentKind &&
    !FEED_CONTENT_KINDS.has(rawType)
      ? rawType
      : undefined

  return {
    ...item,
    type: contentKind,
    ...(opportunitySubtype ? { opportunityType: opportunitySubtype } : {}),
  } as T & { type: FeedContentKind; opportunityType?: string }
}

/** List/search API rows — same card fields as For You (API response unchanged). */
export function normalizeFeedListItem<T extends Record<string, unknown>>(
  listType: HomeListType,
  item: T,
): NormalizedFeedCardItem {
  return normalizeFeedCardDisplay(applyContentKind(listType, item))
}

/** For You / unified recommendation rows — keeps score, reasons, contentType. */
export function normalizeUnifiedFeedItem<T extends Record<string, unknown>>(
  item: T,
): NormalizedFeedCardItem {
  const kind = resolveFeedContentKind(
    (item.contentType as string) ?? (item.type as string),
  )
  const rawType = typeof item.type === "string" ? item.type : undefined
  const opportunitySubtype =
    kind === "opportunity" &&
    rawType &&
    rawType !== kind &&
    !FEED_CONTENT_KINDS.has(rawType)
      ? rawType
      : undefined

  return normalizeFeedCardDisplay({
    ...item,
    type: kind,
    ...(opportunitySubtype ? { opportunityType: opportunitySubtype } : {}),
  } as T & { type: FeedContentKind })
}
