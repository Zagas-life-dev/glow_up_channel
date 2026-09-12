"use client"

/**
 * Credits a visit that arrived from an announcement push or email.
 *
 * The popup can count its own clicks because it is the thing being clicked. A
 * push notification and an email link cannot: the reader leaves the app (or was
 * never in it), and what lands is an ordinary visit to an ordinary detail page,
 * indistinguishable from one that came from the feed. Without this, the two
 * channels the extreme tier is largely sold on would report deliveries and no
 * outcomes at all.
 *
 * So the announcement links carry `?promo=<id>&src=push|email`, and this reads
 * them once on arrival.
 *
 * **Mounted once in the app layout rather than per page.** The alternative was
 * the same few lines in all four detail routes — `/opportunities/[id]`,
 * `/jobs/[id]`, `/events/[id]`, `/resources/[id]` — which is four places to
 * forget when a fifth content type is added. One mount covers every route the
 * announcements can point at, now and later.
 *
 * Reads `window.location` rather than `useSearchParams`, deliberately: the
 * latter opts the whole subtree into dynamic rendering and wants a Suspense
 * boundary, which is a heavy price for a side effect that only ever fires on a
 * cold entry from outside the app. Announcement links are always cold entries,
 * so there is no client-side navigation case to miss.
 */

import { useEffect, useRef } from "react"

import { ApiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"

/** The only sources that mint these links. Anything else is someone guessing. */
const SOURCES = new Set(["push", "email"])

export default function AnnouncementAttribution() {
  const { isAuthenticated, isLoading } = useAuth()
  const recorded = useRef(false)

  useEffect(() => {
    // Waits for auth rather than firing anonymously: the endpoint refuses
    // unauthenticated writes, and a reader following a push is signed in by
    // definition — the push was addressed to their account.
    if (isLoading || !isAuthenticated) return
    if (recorded.current) return
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    const promotionId = params.get("promo")
    const source = params.get("src")
    if (!promotionId || !source || !SOURCES.has(source)) return

    recorded.current = true
    void ApiClient.recordAnnouncementEvent(promotionId, "announcement_click")

    // Strip the markers. A refresh, a back-navigation, or a reader sharing the
    // link onward would otherwise credit the same arrival again — and a shared
    // link would credit arrivals the announcement never delivered. `replaceState`
    // so this does not add a history entry the back button has to walk through.
    params.delete("promo")
    params.delete("src")
    const query = params.toString()
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    )
  }, [isAuthenticated, isLoading])

  return null
}
