"use client"

/**
 * Gift announcements.
 *
 * A gift is published once by an admin and belongs to every user at the same
 * time, so there is no per-user notification row to deliver — the client asks
 * "is there a gift newer than the one I last acknowledged?" and the answer is
 * two indexed reads no matter how many users exist.
 *
 * There is no socket or SSE layer in this app, so "everyone gets notified"
 * resolves to three cheap triggers:
 *
 *   1. App mount, once the user is known to be signed in.
 *   2. A slow poll, so someone already sitting on the page sees it too.
 *   3. Tab refocus, which catches the laptop-reopened-after-lunch case without
 *      waiting out the poll interval.
 *
 * The poll is deliberately slow. A gift is not time-critical, and this request
 * would otherwise run on every open tab of every signed-in user forever.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/lib/auth-context"
import { acknowledgeAnnouncement, fetchAnnouncement } from "@/lib/gifts/api"
import type { Gift } from "@/lib/gifts/types"

/** How often to re-check while the tab is open. */
const POLL_INTERVAL_MS = 3 * 60 * 1000

/** Refocus checks closer together than this are collapsed into one. */
const MIN_REFOCUS_GAP_MS = 60 * 1000

interface GiftContextValue {
  /** The gift to celebrate, or null when there is nothing to announce. */
  announced: Gift | null
  /** Total unacknowledged gifts, so the popup can say "+2 more". */
  newCount: number
  /**
   * Retire the popup. Every exit — X, View, View others — calls this, so a gift
   * is announced exactly once whichever button the user reaches for.
   */
  dismiss: () => void
  /** Force a check now; used after an admin publishes from this session. */
  refresh: () => Promise<void>
}

const GiftContext = createContext<GiftContextValue | null>(null)

/** An announcement is only ever valid for the account it was fetched for. */
interface OwnedAnnouncement {
  userId: string
  gift: Gift
  newCount: number
}

export function GiftProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [announcement, setAnnouncement] = useState<OwnedAnnouncement | null>(null)
  const lastCheckedAt = useRef(0)

  const ownerId = user?._id

  const check = useCallback(async () => {
    if (!ownerId) return
    lastCheckedAt.current = Date.now()
    const result = await fetchAnnouncement()
    if (!result?.gift) return
    // Stamp the owner at fetch time; the derivation below discards it if the
    // session changed while the request was in flight.
    setAnnouncement({ userId: ownerId, gift: result.gift, newCount: result.newCount })
  }, [ownerId])

  /**
   * Derived, not cleared in an effect.
   *
   * Tying the announcement to the account it was fetched for means a gift meant
   * for the previous session can never appear for whoever signs in next — not
   * even for the render between sign-in and the first poll response, which a
   * clear-on-sign-out effect would still leave exposed.
   */
  const current = announcement && announcement.userId === ownerId ? announcement : null
  const announced = current?.gift ?? null
  const newCount = current?.newCount ?? 0

  // Mount check + slow poll.
  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    let cancelled = false

    const run = () => {
      if (cancelled) return
      void check()
    }

    run()
    const timer = setInterval(run, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [isAuthenticated, isLoading, check])

  // Refocus check — the laptop-reopened case, throttled so tab-flicking is free.
  useEffect(() => {
    if (isLoading || !isAuthenticated) return

    const onFocus = () => {
      if (document.visibilityState === "hidden") return
      if (Date.now() - lastCheckedAt.current < MIN_REFOCUS_GAP_MS) return
      void check()
    }

    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [isAuthenticated, isLoading, check])

  const dismiss = useCallback(() => {
    const stamp = announced?.createdAt
    // Hide immediately; the ack is fire-and-forget. Stamping the announced
    // gift's own createdAt rather than "now" means a gift published while this
    // popup was on screen still gets its own popup.
    setAnnouncement(null)
    void acknowledgeAnnouncement(stamp)
  }, [announced])

  return (
    <GiftContext.Provider value={{ announced, newCount, dismiss, refresh: check }}>
      {children}
    </GiftContext.Provider>
  )
}

export function useGifts(): GiftContextValue {
  const context = useContext(GiftContext)
  if (!context) throw new Error("useGifts must be used within a GiftProvider")
  return context
}

/** For components that may render outside the provider (e.g. admin shells). */
export function useOptionalGifts(): GiftContextValue | null {
  return useContext(GiftContext)
}
