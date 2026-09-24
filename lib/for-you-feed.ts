"use client"

/**
 * One page of the For You feed.
 *
 * Lifted out of `home-client` so the background prefetcher can warm the first
 * page from whatever route the reader opened on, through exactly the same
 * request and the same session cache the home page reads. Two copies of this
 * would drift, and a prefetch that built a subtly different page than the home
 * page would be worse than no prefetch.
 */

import { getContentCache, setContentCache } from "@/lib/content-cache-session"
import { normalizeUnifiedFeedItem } from "@/lib/feed-content-type"
import { getFeedSessionSeed } from "@/lib/feed-session-seed"
import { applyVarietyOrder } from "@/lib/feed-variety-order"
import { isExtremePromotion, isPromoted } from "@/lib/promotion-boost"
import {
  MAX_EXTREME_IN_FEED_TOP,
  MAX_PROMOTED_IN_FEED_TOP,
  enforcePromotedCaps,
  leadWithExtreme,
} from "@/lib/promotion-placement"
import { getOrCreateAnonId } from "@/lib/anon-id"
import type { NormalizedUser } from "@/lib/user"

export type ForYouPage = {
  items: any[]
  lastId: string | null
  hasMore: boolean
}

const EMPTY: ForYouPage = { items: [], lastId: null, hasMore: false }

export type ForYouParams = {
  backendUrl: string | undefined
  /** Signed-in reader's id, or null for a visitor. */
  userId: string | null
  normalizedUser: NormalizedUser | null
  lastId: string | null
}

/** Is page one of this reader's For You already in the session cache? */
export function hasCachedForYou(userId: string | null): boolean {
  const cached = userId
    ? getContentCache("unified_auth", { owner: userId })
    : getContentCache("unified")
  return Boolean(cached?.items?.length)
}

/**
 * First-page requests in flight, by reader. If the reader opens For You while the
 * background prefetch of it is still running, the page joins that request instead
 * of sending a second copy of the most expensive call on the platform.
 */
const firstPageInFlight = new Map<string, Promise<ForYouPage>>()

export function fetchForYouPage(params: ForYouParams): Promise<ForYouPage> {
  if (params.lastId) return loadForYouPage(params)
  const key = params.userId ?? "anon"
  const pending = firstPageInFlight.get(key)
  if (pending) return pending
  const request = loadForYouPage(params).finally(() => firstPageInFlight.delete(key))
  firstPageInFlight.set(key, request)
  return request
}

async function loadForYouPage({
  backendUrl,
  userId,
  normalizedUser,
  lastId,
}: ForYouParams): Promise<ForYouPage> {
  if (!backendUrl) return EMPTY

  // First page: use session cache for instant load (anon: unified, auth: unified_auth
  // scoped to this reader, so we never serve anyone else's cache).
  if (!lastId) {
    const cached = userId
      ? getContentCache("unified_auth", { owner: userId })
      : getContentCache("unified")
    if (cached?.items?.length) {
      return {
        items: (cached.items as Record<string, unknown>[]).map((row) => normalizeUnifiedFeedItem(row)),
        lastId: cached.lastId,
        hasMore: true,
      }
    }
  }

  // Anonymous users: use public feed API (cached 100-item interleaved feed)
  if (!userId) {
    const anonId = getOrCreateAnonId()
    const headers: HeadersInit = { "Content-Type": "application/json" }
    if (anonId) headers["X-Anon-Id"] = anonId
    try {
      const response = await fetch(`${backendUrl}/api/feed/anonymous`, { headers })
      if (!response.ok) return EMPTY
      const data = await response.json()
      const feed = Array.isArray(data?.data?.feed) ? data.data.feed : []
      const normalizedFeed = feed.map((row: Record<string, unknown>) => normalizeUnifiedFeedItem(row))

      // The anonymous endpoint serves one shared, server-cached list, built by
      // recency and interleaved by type — identical for every visitor for ten
      // minutes, and blind to deadlines. Order it here instead: this arrives
      // as a single page (hasMore is false), so there is no cursor to keep
      // stable and the ordering can be redrawn freely on each load.
      //
      // These items carry no score, so they all land in one band and the band
      // weighting is a no-op — the deadline weighting inside the band is the
      // part that does the work, which is exactly what is wanted here.
      //
      // `leadWithExtreme` before the caps, not after: at slot 0 no cap has
      // been met yet, so the lead always survives them, and the caps still
      // govern every paid card behind it. `applyVarietyOrder` usually leads
      // with the extreme item on its own, which makes this a no-op — usually
      // is not the guarantee the tier is sold on.
      const ordered = enforcePromotedCaps(
        leadWithExtreme(
          applyVarietyOrder(normalizedFeed as Parameters<typeof applyVarietyOrder>[0]),
          { isExtreme: isExtremePromotion, sessionSeed: getFeedSessionSeed() },
        ),
        {
          isPromoted,
          isExtreme: isExtremePromotion,
          maxExtreme: MAX_EXTREME_IN_FEED_TOP,
          maxPromoted: MAX_PROMOTED_IN_FEED_TOP,
        },
      ) as typeof normalizedFeed

      if (ordered.length) {
        setContentCache("unified", { items: ordered, lastId: null })
      }
      return { items: ordered, lastId: null, hasMore: false }
    } catch (err) {
      console.error("Anonymous feed fetch error:", err)
      return EMPTY
    }
  }

  const token = localStorage.getItem("accessToken")
  if (!token) return EMPTY

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  // One seed per feed session, replayed on every page of it. New on refresh,
  // so the shuffle is redrawn; constant while scrolling, so the server's
  // cursor keeps pointing into the same ordering. See `feed-session-seed`.
  const feedSeed = getFeedSessionSeed()

  try {
    let response: Response
    if (normalizedUser) {
      // Send frontend merged normalized user so the algo uses the same data (fixes 50% fallback for users without backend profile/onboarding)
      const payload = {
        normalizedUser: {
          id: normalizedUser.id,
          interests: Array.isArray(normalizedUser.interests) ? normalizedUser.interests : [],
          industrySectors: Array.isArray(normalizedUser.industrySectors) ? normalizedUser.industrySectors : [],
          skills: Array.isArray(normalizedUser.skills) ? normalizedUser.skills : [],
          aspirations: Array.isArray(normalizedUser.aspirations) ? normalizedUser.aspirations : [],
          country: normalizedUser.country ?? null,
          province: normalizedUser.province ?? null,
          city: normalizedUser.city ?? null,
          careerStage: normalizedUser.careerStage ?? null,
          dateOfBirth: normalizedUser.dateOfBirth ?? null,
        },
        includeOpportunities: true,
        includeEvents: true,
        includeJobs: true,
        includeResources: true,
        minScore: 0,
        limit: lastId ? 20 : 15,
        ...(lastId && { lastId }),
        ...(feedSeed !== null && { feedSeed }),
      }
      response = await fetch(`${backendUrl}/api/recommended/unified`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
    } else {
      const url = new URL(`${backendUrl}/api/recommended/unified`)
      url.searchParams.set("includeOpportunities", "true")
      url.searchParams.set("includeEvents", "true")
      url.searchParams.set("includeJobs", "true")
      url.searchParams.set("includeResources", "true")
      url.searchParams.set("minScore", "0")
      url.searchParams.set("limit", lastId ? "20" : "15")
      if (lastId) {
        url.searchParams.set("lastId", lastId)
      }
      if (feedSeed !== null) {
        url.searchParams.set("feedSeed", String(feedSeed))
      }
      response = await fetch(url.toString(), { headers })
    }

    if (!response.ok) {
      console.warn("Failed to fetch unified recommendations:", response.status, response.statusText)
      return EMPTY
    }

    const data = await response.json()
    if (!data?.success || !data?.data?.content) {
      return EMPTY
    }

    const unifiedItems = (data.data.content as Record<string, unknown>[]).map((item) =>
      normalizeUnifiedFeedItem(item),
    )

    // Scatter ordering happens server-side (scatterRankingService), where it can
    // draw on the whole candidate pool instead of just the page we were sent, and
    // where the deadline weighting sees every candidate rather than the 15 that
    // happened to land on this page. `feedSeed` above keeps that ordering stable
    // across the paginated requests of this session.
    // Re-shuffling here would only jumble an already-ordered page.
    const sorted = unifiedItems

    const lastItemId = sorted.length > 0 ? sorted[sorted.length - 1]._id : null
    const resultLastId = data.data?.pagination?.lastId ?? lastItemId
    const pageLimit = lastId ? 20 : 15
    const hasMore =
      (data.data?.pagination?.hasMore ?? data.data?.total > sorted.length) && sorted.length >= pageLimit
    // The cache holds everything loaded so far plus the cursor after it. Later
    // pages append rather than replace: replacing (the old behaviour) threw page
    // one away, so a return visit opened on page three and the detail page lost
    // the server score for every listing the reader saw first. Appending keeps
    // items and cursor consistent — the next page after a restore is the right one.
    if (sorted.length) {
      const previous = lastId ? getContentCache<{ _id: string }>("unified_auth", { owner: userId }) : null
      if (!lastId || previous) {
        setContentCache("unified_auth", {
          items: previous ? [...previous.items, ...sorted] : sorted,
          lastId: resultLastId,
          owner: userId,
        })
      }
    }

    return {
      items: sorted,
      lastId: resultLastId,
      hasMore,
    }
  } catch (error) {
    console.error("Error fetching unified recommendations:", error)
    return EMPTY
  }
}
