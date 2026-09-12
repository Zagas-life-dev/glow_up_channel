"use client"

/**
 * Extreme promotion announcements.
 *
 * Shaped after `gift-context`, with one important difference in where the work
 * happens. A gift is a server-side event — the client asks "is there one newer
 * than I have acknowledged?" and the server answers. An announcement is not an
 * event at all: the campaign list changes at most once a day, and *which* two
 * days of it this reader meets is a pure function of their id, computed in
 * `lib/promotions/announcement`.
 *
 * So this polls the network rarely and re-evaluates locally often. The campaign
 * list is fetched on mount and refreshed on a slow refocus throttle; the
 * decision about whether to announce anything runs off a local timer against
 * that list, costing nothing. A reader who leaves a tab open overnight crosses
 * into their announcement day without a single extra request.
 *
 * The opt-out is checked lazily, only once something is actually due. Nearly
 * every session has no announcement in it, and those sessions should not pay
 * for a preferences round trip to discover that.
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
import {
  markAnnounced,
  selectAnnouncement,
  type ExtremeCampaign,
  type SelectedAnnouncement,
} from "@/lib/promotions/announcement"

/** How often to re-evaluate the local decision. No network involved. */
const EVALUATE_INTERVAL_MS = 5 * 60 * 1000

/** How stale the campaign list may get before a refocus refetches it. */
const REFETCH_AFTER_MS = 30 * 60 * 1000

interface PromotionAnnouncementValue {
  /** The announcement to show, or null when there is nothing due. */
  announced: SelectedAnnouncement | null
  /**
   * Retire the announcement. Every exit routes through this, so one is shown
   * exactly once per reader per day whichever way they close it.
   */
  dismiss: () => void
}

const PromotionAnnouncementContext = createContext<PromotionAnnouncementValue | null>(null)

/** An announcement is only ever valid for the account it was selected for. */
interface OwnedAnnouncement {
  userId: string
  selected: SelectedAnnouncement
}

/**
 * Whether this reader still wants announcement popups.
 *
 * Defaults to true on any failure, matching how every other notification
 * preference in the app reads (`ns.key !== false`): an unreachable preferences
 * endpoint should not silently switch a delivery channel off.
 */
async function popupsEnabled(backendUrl: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl}/api/users/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return true
    const data = await res.json()
    return data?.data?.preferences?.notificationSettings?.promotionPopups !== false
  } catch {
    return true
  }
}

export function PromotionAnnouncementProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [campaigns, setCampaigns] = useState<ExtremeCampaign[]>([])
  const [announcement, setAnnouncement] = useState<OwnedAnnouncement | null>(null)

  const lastFetchedAt = useRef(0)
  /** Guards the preference lookup, so one due announcement asks once. */
  const checkingRef = useRef(false)

  const ownerId = user?._id
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

  const fetchCampaigns = useCallback(async () => {
    if (!ownerId || !backendUrl) return
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    if (!token) return

    lastFetchedAt.current = Date.now()
    try {
      const res = await fetch(`${backendUrl}/api/promoted/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const rows = data?.data?.campaigns
      if (Array.isArray(rows)) setCampaigns(rows)
    } catch {
      // An announcement is not worth surfacing an error for.
    }
  }, [ownerId, backendUrl])

  /**
   * Decide whether anything is due, and confirm the reader still wants it.
   *
   * `selectAnnouncement` is the cheap local part; the preference lookup only
   * runs when it returns something.
   */
  const evaluate = useCallback(async () => {
    if (!ownerId || !backendUrl) return
    if (checkingRef.current) return

    const selected = selectAnnouncement(campaigns, ownerId, Date.now())
    if (!selected) return

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    if (!token) return

    checkingRef.current = true
    try {
      if (!(await popupsEnabled(backendUrl, token))) return
      // Stamp the owner at selection time; the derivation below discards it if
      // the session changed while the preference request was in flight.
      setAnnouncement({ userId: ownerId, selected })
    } finally {
      checkingRef.current = false
    }
  }, [campaigns, ownerId, backendUrl])

  /**
   * Derived rather than cleared in an effect, for the same reason the gift
   * context derives its own: an announcement selected for the previous session
   * must never appear for whoever signs in next, not even for the one render
   * between sign-in and the next evaluation.
   */
  const announced =
    announcement && announcement.userId === ownerId ? announcement.selected : null

  // Campaign list: on mount, then only when it goes stale.
  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    let cancelled = false

    const run = () => {
      if (cancelled) return
      void fetchCampaigns()
    }

    run()

    const onFocus = () => {
      if (document.visibilityState === "hidden") return
      if (Date.now() - lastFetchedAt.current < REFETCH_AFTER_MS) return
      run()
    }

    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      cancelled = true
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [isAuthenticated, isLoading, fetchCampaigns])

  // The local decision: on every campaign change, then on a slow timer so a
  // long-lived tab still crosses into its announcement day.
  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    if (announced) return
    let cancelled = false

    const run = () => {
      if (cancelled) return
      void evaluate()
    }

    run()
    const timer = setInterval(run, EVALUATE_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [isAuthenticated, isLoading, evaluate, announced])

  const dismiss = useCallback(() => {
    if (!announced || !ownerId) return
    // Written before the state change so a fast remount cannot re-select the
    // same announcement from a ledger that has not caught up yet.
    markAnnounced(ownerId, announced.campaign, announced.dayIndex, Date.now())
    setAnnouncement(null)
  }, [announced, ownerId])

  return (
    <PromotionAnnouncementContext.Provider value={{ announced, dismiss }}>
      {children}
    </PromotionAnnouncementContext.Provider>
  )
}

/** For components that may render outside the provider. */
export function useOptionalPromotionAnnouncement(): PromotionAnnouncementValue | null {
  return useContext(PromotionAnnouncementContext)
}
