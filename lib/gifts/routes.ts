/**
 * Where gifts live in the URL space.
 *
 * The shared gift list is a tab on the profile page rather than a page of its
 * own, so the link depends on who is signed in. Centralised here because the
 * popup, the sidebar, and the gift detail page all need to produce it, and a
 * hand-built `/profile/${id}?tab=gifts` in three places drifts.
 */

import type { GiftListingRef, GiftListingType } from "@/lib/gifts/types"

/** The tab query value the profile page matches on. */
export const GIFTS_TAB = "gifts"

/**
 * The signed-in user's gift list.
 *
 * Returns null without an id rather than guessing: there is no `/profile`
 * index route in this app — every profile link is `/profile/{id}` — so a
 * fallback would render a dead link. Callers hide the entry point instead.
 */
export function giftsHref(userId?: string | null): string | null {
  return userId ? `/profile/${userId}?tab=${GIFTS_TAB}` : null
}

/** One gift's detail page. */
export function giftHref(giftId: string): string {
  return `/gifts/${giftId}`
}

/** Where each kind of listing gift points, once followed. */
const LISTING_SEGMENTS: Record<GiftListingType, string> = {
  opportunity: "opportunities",
  event: "events",
  job: "jobs",
  resource: "resources",
}

/**
 * The listing a gift hands over.
 *
 * Null once the listing has left its live collection: those detail routes 404,
 * so the gift shows the snapshot it kept instead of offering a link that goes
 * nowhere.
 */
export function giftListingHref(listing: GiftListingRef | null): string | null {
  if (!listing?.isLive) return null
  return `/${LISTING_SEGMENTS[listing.type]}/${listing.id}`
}
