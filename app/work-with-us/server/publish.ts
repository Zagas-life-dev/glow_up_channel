import { LIST_PATH, promotionRunDays, type ContentType } from "../config"
import { backendUrl, type ItemDoc } from "./api"
import { buildListingPayload, type ListingDraft } from "@/lib/listings/payload"

/** Where an admin-granted promotion is started. Lives in the backend at src/routes/promotions.js. */
export const GRANT_PROMOTION_PATH = "/api/promotions/admin-grant"

/**
 * The reviewer, as far as publishing is concerned: their token and nothing
 * else. Who they are is not checked here — the order book's own endpoints do
 * that, on a token this server never validates, because the backend owns the
 * JWT secret. So this can only ever be as trusting as the backend is, and a
 * call made with a non-admin's token is refused there rather than here.
 */
export type AdminCaller = { token: string }

/** Calls the platform API as the admin who is signed in. */
export async function backendPost(
  caller: AdminCaller,
  path: string,
  body: unknown,
): Promise<{ ok: true; data: any } | { ok: false; error: string; status: number }> {
  try {
    const response = await fetch(`${backendUrl()}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${caller.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: json?.message || `Backend refused (HTTP ${response.status})`,
      }
    }
    return { ok: true, data: json?.data ?? json }
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : "Could not reach the backend",
    }
  }
}

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
 *
 * Delegates to `buildListingPayload`, the same builder the provider sheet and
 * the admin form use. It previously mirrored those payloads by hand, and
 * inherited their bugs along with their shape: jobs were sent with `type` where
 * the model reads `jobType`, and every listing was stamped `currency: "NGN"`
 * with no amount beside it.
 *
 * The importer states no figures — the intake form does not collect them — so
 * `money` is null and `isPaid` reflects only the paid-event flag. That is
 * deliberate: a currency with no amount is noise, and stamping NGN on a
 * Ghanaian submission was worse than saying nothing.
 */
export function buildContentPayload(item: ItemDoc): Record<string, unknown> {
  const f = item.fields
  const tags = tagList(f.tags)
  const organizationName = item.contact.organisation || item.contact.name
  const location = place(f.location)

  const draft: ListingDraft = {
    kind: item.contentType as ListingDraft["kind"],
    title: f.title,
    description: f.description,
    url: f.link,
    organizationName,
    type: f.type,
    tags,
    location: item.contentType === "resource" ? undefined : location,
    money: null,
    isPaid: item.contentType === "event" && item.kind === "paid-event",
    dates:
      item.contentType === "event"
        ? { startDate: isoDate(f.date) }
        : { applicationDeadline: f.deadline },
    // Vetted by an admin before it reaches here, so it publishes directly.
    status: "active",
    isApproved: true,
  }

  return buildListingPayload(draft)
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
  target: { contentId: string; contentType: ContentType },
): Promise<{ ok: true; days: number | null } | { ok: false; error: string }> {
  const days = promotionRunDays(item.promotions ?? [])
  // Nothing on this order runs automatically — it is all hand-delivered work.
  if (!days) return { ok: true, days: null }

  // The type has to come from whatever is being promoted, not from the
  // promotion item: a promotion publishes nothing itself, so its own
  // `contentType` is null, and sending that made the backend reject every
  // grant with "contentId and contentType are required".
  const result = await backendPost(caller, GRANT_PROMOTION_PATH, {
    contentId: target.contentId,
    contentType: target.contentType,
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
