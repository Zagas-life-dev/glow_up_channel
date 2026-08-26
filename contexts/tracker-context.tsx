"use client"

/**
 * The honesty tracker's return watcher.
 *
 * The problem this solves: the Apply button is the last thing the platform can
 * see. The user leaves for someone else's site, does or does not apply, and
 * comes back — and nothing about that outcome is observable from here. Asking
 * them, once, at the moment they return, is the only way to learn it.
 *
 * Detection has to survive three different exits, because all three happen:
 *
 *   1. Desktop new tab. The origin tab stays alive; `visibilitychange` and
 *      `focus` both fire when they come back to it.
 *   2. Mobile in-app browser over the PWA. The document is frozen, not
 *      destroyed, so `visibilitychange` fires — but possibly hours later.
 *   3. The tab is closed outright. Nothing fires. The only trace is what was
 *      written to localStorage before leaving, read on the next app open.
 *
 * So the armed record lives in localStorage rather than memory, and the server
 * keeps its own pending queue as the cross-device backstop.
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
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import {
  getPending,
  recordOutcome,
  recordReturn,
  snoozeEntry,
  startTracking as startTrackingRequest,
} from "@/lib/tracker/api"
import type {
  TrackerAnswer,
  TrackerContentType,
  TrackerEntry,
  TrackerReason,
} from "@/lib/tracker/types"

/** Where the armed exit is parked while the user is away. */
const ARMED_KEY = "glowup.tracker.armed"

/**
 * Mirrors ApplicationTracker.MIN_AWAY_MS on the backend.
 *
 * Checked on the client too so a misclick never even costs a round trip — the
 * server still enforces it, this is purely to stay quiet.
 */
const MIN_AWAY_MS = 25 * 1000

interface ArmedExit {
  entryId: string
  leftAt: number
  contentType: TrackerContentType
  contentId: string
}

interface TrackerContextValue {
  /** The entry currently being asked about, if the sheet is up. */
  activeEntry: TrackerEntry | null
  /** Arm an exit. Call this in the click handler of any outbound apply/register link. */
  startTracking: (
    contentType: TrackerContentType,
    contentId: string,
    source?: string,
  ) => Promise<void>
  /** Answer the sheet. */
  answer: (
    entryId: string,
    status: TrackerAnswer,
    options?: { reason?: TrackerReason; remindWeekday?: string },
  ) => Promise<void>
  /** Dismiss without answering. */
  dismiss: (entryId: string) => Promise<void>
  /** Bumped whenever an answer lands, so the tracker page can refetch. */
  answeredAt: number
}

const TrackerContext = createContext<TrackerContextValue | null>(null)

function readArmed(): ArmedExit | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(ARMED_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ArmedExit
    if (!parsed?.entryId || typeof parsed.leftAt !== "number") return null
    return parsed
  } catch {
    // A private window, cleared storage, or a half-written value. The server
    // queue still holds the entry, so this is a soft loss.
    return null
  }
}

function writeArmed(value: ArmedExit | null): void {
  if (typeof window === "undefined") return
  try {
    if (value === null) window.localStorage.removeItem(ARMED_KEY)
    else window.localStorage.setItem(ARMED_KEY, JSON.stringify(value))
  } catch {
    // Storage denied. Tracking degrades to the server queue, which is fine.
  }
}

export function TrackerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [activeEntry, setActiveEntry] = useState<TrackerEntry | null>(null)
  const [answeredAt, setAnsweredAt] = useState(0)

  /**
   * Whether the server-side backlog has already interrupted this app open.
   *
   * The backlog is capped at one prompt per open — a queue of five stale
   * questions fired in sequence is an interrogation, not a check-in. A return
   * the user *just* triggered is exempt, because they are still in the moment
   * and the question is obviously connected to what they did.
   */
  const backlogShown = useRef(false)

  /** Guards against two listeners racing the same armed record. */
  const claiming = useRef(false)

  /**
   * A readable mirror of activeEntry.
   *
   * The app-open sequence needs to know whether the armed claim already raised
   * the sheet before it reaches for the backlog, and it needs to know that
   * outside of React's render cycle.
   */
  const activeEntryRef = useRef<TrackerEntry | null>(null)

  /**
   * Set the sheet's entry and its mirror together.
   *
   * The ref is written here rather than during render, so the two can never
   * disagree and render stays free of side effects.
   */
  const showEntry = useCallback((entry: TrackerEntry | null) => {
    activeEntryRef.current = entry
    setActiveEntry(entry)
  }, [])

  /**
   * Claim the armed exit and ask the server whether it is worth a prompt.
   *
   * The armed record is cleared before the request resolves: if the user is
   * bouncing in and out of the tab, a second claim must not re-ask about an
   * exit that is already being handled.
   */
  const claimArmedReturn = useCallback(async () => {
    if (claiming.current) return
    const armed = readArmed()
    if (!armed) return

    const awayMs = Date.now() - armed.leftAt

    // Too quick to be real. Clear it and stay silent — they never got there.
    if (awayMs < MIN_AWAY_MS) {
      writeArmed(null)
      return
    }

    claiming.current = true
    writeArmed(null)

    try {
      const { shouldPrompt, entry } = await recordReturn(armed.entryId, awayMs)
      if (shouldPrompt && entry) showEntry(entry)
    } finally {
      claiming.current = false
    }
  }, [showEntry])

  /** The backlog: anything still unanswered from a previous session. */
  const loadBacklog = useCallback(async () => {
    if (backlogShown.current) return
    const entries = await getPending()
    if (entries.length === 0) return

    if (activeEntryRef.current) return

    backlogShown.current = true
    // getPending returns most-recently-clicked first: the freshest memory wins.
    showEntry(entries[0])
  }, [showEntry])

  // App open: claim any armed exit first, then fall back to the server backlog.
  // Order matters — an exit from thirty seconds ago is a far better question
  // than one from three days ago, and only one of them gets asked.
  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false
    void (async () => {
      await claimArmedReturn()
      if (cancelled) return
      // Only reach for the backlog if the armed claim did not already ask.
      if (!activeEntryRef.current) await loadBacklog()
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, claimArmedReturn, loadBacklog])

  // Coming back to a tab that was never unloaded — the desktop and PWA cases.
  useEffect(() => {
    if (!isAuthenticated) return
    if (typeof document === "undefined") return

    const onVisible = () => {
      if (document.visibilityState === "visible") void claimArmedReturn()
    }
    // `focus` catches the desktop case where the tab was visible the whole time
    // and only lost focus to the new window; visibilitychange never fires there.
    const onFocus = () => void claimArmedReturn()
    // bfcache restores fire neither of the above on some mobile browsers.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void claimArmedReturn()
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)
    window.addEventListener("pageshow", onPageShow)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [isAuthenticated, claimArmedReturn])

  /**
   * Arm an exit. Called from the click handler, in the same tick as the
   * navigation, so everything here must be non-blocking.
   */
  const startTracking = useCallback(
    async (contentType: TrackerContentType, contentId: string, source?: string) => {
      if (!isAuthenticated) return

      const leftAt = Date.now()
      const { tracked, entryId } = await startTrackingRequest(contentType, contentId, source)

      // In-app resources come back tracked:false — nothing left the site, so
      // there is nothing to ask about on the way back.
      if (!tracked || !entryId) return

      writeArmed({ entryId, leftAt, contentType, contentId })
    },
    [isAuthenticated],
  )

  const answer = useCallback(
    async (
      entryId: string,
      status: TrackerAnswer,
      options?: { reason?: TrackerReason; remindWeekday?: string },
    ) => {
      // Closed first, deliberately: the user has answered, and holding the
      // sheet open behind a spinner would make an honest answer feel expensive.
      showEntry(null)

      const saved = await recordOutcome(entryId, status, options)

      if (!saved) {
        // The entry stays pending server-side, so it will simply be asked again
        // on a later app open. Saying so is better than a silent no-op.
        toast.error("Couldn't save that — we'll ask again later.")
        return
      }

      setAnsweredAt(Date.now())
    },
    [showEntry],
  )

  const dismiss = useCallback(
    async (entryId: string) => {
      showEntry(null)
      await snoozeEntry(entryId)
    },
    [showEntry],
  )

  /**
   * Signing out must not leave another account's question on screen.
   *
   * Derived rather than cleared in an effect: the sheet disappears in the same
   * render that authentication drops, with no frame in between where the
   * previous user's listing is still visible.
   */
  const visibleEntry = isAuthenticated ? activeEntry : null

  // The device-local traces still need clearing — but none of this is setState.
  useEffect(() => {
    if (isAuthenticated) return
    backlogShown.current = false
    activeEntryRef.current = null
    writeArmed(null)
  }, [isAuthenticated])

  return (
    <TrackerContext.Provider
      value={{ activeEntry: visibleEntry, startTracking, answer, dismiss, answeredAt }}
    >
      {children}
    </TrackerContext.Provider>
  )
}

export function useTracker(): TrackerContextValue {
  const context = useContext(TrackerContext)
  if (!context) {
    throw new Error("useTracker must be used within a TrackerProvider")
  }
  return context
}

/**
 * The tracker without the throw.
 *
 * Detail pages render in contexts that do not always sit under the provider
 * (previews, tests). They should degrade to "no tracking" rather than crash the
 * page an application link lives on.
 */
export function useOptionalTracker(): TrackerContextValue | null {
  return useContext(TrackerContext)
}
