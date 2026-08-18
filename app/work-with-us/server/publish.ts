import { LIST_PATH, promotionRunDays } from "../config"
import { backendPost, type AdminCaller } from "./admin-auth"
import type { ItemDoc } from "./db"

/** Where an admin-granted promotion is started. Add this route to the backend. */
export const GRANT_PROMOTION_PATH = "/api/promotions/admin-grant"

function tagList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10)
}

function place(value?: string) {
  const city = (value ?? "").trim()
  return { city, isRemote: /remote|online|virtual|anywhere/i.test(city) }
}

function isoDate(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/**
 * Maps a submitted listing onto what the backend's create endpoints expect.
 * Mirrors the payloads the provider posting page sends.
 */
export function buildContentPayload(item: ItemDoc): Record<string, unknown> {
  const f = item.fields
  const tags = tagList(f.tags)
  const company = item.contact.organisation || item.contact.name

  switch (item.contentType) {
    case "opportunity":
      return {
        title: f.title,
        company,
        type: f.type,
        description: f.description,
        url: f.link,
        tags,
        location: place(f.location),
        dates: { ...(f.deadline && { applicationDeadline: f.deadline }) },
        status: "active",
        isApproved: true,
      }

    case "job":
      return {
        title: f.title,
        company,
        type: f.type,
        description: f.description,
        url: f.link,
        tags,
        location: place(f.location),
        pay: { isPaid: true, currency: "NGN" },
        dates: { ...(f.deadline && { applicationDeadline: f.deadline }) },
        status: "active",
        isApproved: true,
      }

    case "event":
      return {
        title: f.title,
        organizer: company,
        eventType: f.type,
        description: f.description,
        url: f.link,
        tags,
        isPaid: item.kind === "paid-event",
        currency: "NGN",
        location: place(f.location),
        dates: { ...(isoDate(f.date) && { startDate: isoDate(f.date) }) },
        status: "active",
        isApproved: true,
      }

    case "resource":
      return {
        title: f.title,
        description: f.description,
        category: f.type,
        tags,
        paymentLink: f.link,
        status: "active",
        isApproved: true,
      }

    default:
      return {}
  }
}

/** Digs the new record's id out of whatever shape the backend returned. */
function findId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const record = data as Record<string, unknown>
  if (typeof record._id === "string") return record._id
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const nested = (value as Record<string, unknown>)._id
      if (typeof nested === "string") return nested
    }
  }
  return null
}

export async function publishListing(
  caller: AdminCaller,
  item: ItemDoc,
): Promise<{ ok: true; contentId: string } | { ok: false; error: string }> {
  if (!item.contentType) return { ok: false, error: "This item has no content type" }

  const result = await backendPost(
    caller,
    `/api/${LIST_PATH[item.contentType]}`,
    buildContentPayload(item),
  )
  if (!result.ok) return { ok: false, error: result.error }

  const contentId = findId(result.data)
  if (!contentId) return { ok: false, error: "Published, but the backend returned no id" }
  return { ok: true, contentId }
}

/**
 * Starts the platform promotion the customer already paid for. Needs an
 * admin-only endpoint on the backend that grants a promotion without charging.
 */
export async function startPromotion(
  caller: AdminCaller,
  item: ItemDoc,
  contentId: string,
): Promise<{ ok: true; days: number | null } | { ok: false; error: string }> {
  const days = promotionRunDays(item.promotions ?? [])
  // Nothing on this order runs automatically — it is all hand-delivered work.
  if (!days) return { ok: true, days: null }

  const result = await backendPost(caller, GRANT_PROMOTION_PATH, {
    contentId,
    contentType: item.contentType,
    durationDays: days,
    reason: `work-with-us ${item.ref}`,
  })
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.status === 404
          ? `The backend has no ${GRANT_PROMOTION_PATH} route yet — add it, or start this promotion by hand.`
          : result.error,
    }
  }
  return { ok: true, days }
}
