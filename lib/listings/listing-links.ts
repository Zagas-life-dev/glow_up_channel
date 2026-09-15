/**
 * Which link a listing actually sends a reader to.
 *
 * Listings carry up to seven different link fields, accumulated from different ingest
 * paths, and each detail page picks one by walking its own fallback chain. The chains
 * below mirror those pages exactly:
 *
 *   app/opportunities/[id]/page.tsx   url → applicationLink → application_link → externalUrl → externalLink
 *   app/events/[id]/page.tsx          url → registrationLink → externalUrl → externalLink
 *   app/jobs/[id]/page.tsx            url   (the apply button is hidden when it is empty)
 *
 * This matters wherever an admin edits a listing's link: `url` outranks everything, so
 * filling in "Application link" on a listing that already has a `url` changes nothing a
 * reader will ever see, and filling it in on a *job* changes nothing at all. Showing
 * which field is in effect is the difference between editing the link and appearing to.
 *
 * Kept as data rather than duplicated conditionals so the restore dialog and anything
 * else that needs the answer read the same chain.
 */

import type { RestorableType } from "@/lib/listings/restore-dates"

/** Fallback order per type, highest priority first. Mirrors the detail pages. */
export const LINK_PRECEDENCE: Record<RestorableType, readonly string[]> = {
  opportunity: ["url", "applicationLink", "application_link", "externalUrl", "externalLink"],
  event: ["url", "registrationLink", "externalUrl", "externalLink"],
  job: ["url"],
}

/**
 * Every link field known to appear on a listing document.
 *
 * Wider than the chains above: fields outside a type's chain are inert for that type but
 * still hold data worth showing an admin, because a live-looking link sitting in an
 * ignored field is exactly how a listing ends up with no working way to apply.
 */
export const KNOWN_LINK_FIELDS = [
  "url",
  "applicationLink",
  "application_link",
  "registrationLink",
  "eventLink",
  "externalUrl",
  "externalLink",
] as const

export const LINK_FIELD_LABELS: Record<string, string> = {
  url: "Link",
  applicationLink: "Application link",
  application_link: "Application link (legacy)",
  registrationLink: "Registration link",
  eventLink: "Event link",
  externalUrl: "External URL",
  externalLink: "External link",
}

export function linkLabelFor(field: string): string {
  return LINK_FIELD_LABELS[field] ?? field
}

/** Trimmed string value of a link field, or "" when absent. */
function readLink(source: Record<string, unknown> | null | undefined, field: string): string {
  const raw = source?.[field]
  return typeof raw === "string" ? raw.trim() : ""
}

/**
 * The link fields to show for a listing: the type's chain, then any other known link
 * field that actually holds something on this document.
 *
 * @param doc the listing (archived or live)
 * @param type content type
 */
export function linkFieldsFor(
  doc: Record<string, unknown> | null | undefined,
  type: RestorableType,
): string[] {
  const chain = LINK_PRECEDENCE[type] ?? ["url"]
  const extras = KNOWN_LINK_FIELDS.filter(
    (field) => !chain.includes(field) && readLink(doc, field) !== "",
  )
  return [...chain, ...extras]
}

/** True when `field` is one the listing page for `type` will actually consult. */
export function isLinkFieldUsed(field: string, type: RestorableType): boolean {
  return (LINK_PRECEDENCE[type] ?? []).includes(field)
}

/**
 * The field a reader's click will actually follow, given a set of link values.
 *
 * @returns the winning field and its URL, or nulls when the listing has no usable link —
 *   which is itself worth surfacing, since a restored listing with no link is a dead end.
 */
export function resolveOutboundLink(
  values: Record<string, unknown> | null | undefined,
  type: RestorableType,
): { field: string | null; url: string | null } {
  for (const field of LINK_PRECEDENCE[type] ?? []) {
    const value = readLink(values, field)
    if (value) return { field, url: value }
  }
  return { field: null, url: null }
}

/**
 * Whether a value is safe to hand to `window.open` / an `href`.
 *
 * Only http(s) — a stored `javascript:` or `data:` URL must never become a clickable
 * link in an admin tool, and a bare "example.com/apply" is not something to open blind.
 */
export function isOpenableLink(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false
  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

/** Host of a link, for a compact "opens example.com" hint. Empty when unparseable. */
export function linkHost(value: string | null | undefined): string {
  if (!isOpenableLink(value)) return ""
  try {
    return new URL(String(value).trim()).host.replace(/^www\./, "")
  } catch {
    return ""
  }
}
