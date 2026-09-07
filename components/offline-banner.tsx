"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { CloudOff, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { clearOfflineCaches, refreshCachesOnEntry } from "@/lib/offline/cache-control"

/**
 * Says what state the connection is in, and owns the cache lifecycle that hangs
 * off it.
 *
 * Three states, because collapsing them would be a lie in one direction or the
 * other:
 *
 *   offline   the device has no connection. The app is read-only — see
 *             hooks/use-online-status.ts — so this also has to explain why the
 *             buttons went away, or their absence reads as breakage.
 *   stale     the network is up but did not answer inside the worker's timeout,
 *             so a saved copy was served. Common on bad mobile data, and the
 *             state users otherwise read as "the app is broken".
 *   restored  the connection came back. Caches are dropped and the page reloads,
 *             because what is on screen was saved during the outage and is the
 *             content most likely to be wrong.
 *
 * The stale signal arrives as a postMessage from the worker when it actually
 * serves a cached response, which is why no request path in the app has to know
 * any of this exists.
 */

const SLOW_NETWORK_LINGER_MS = 8000
/** How long the connection has to hold before the reload fires. A connection
 *  coming back is often a connection flapping, and reloading on each flap would
 *  be worse than the staleness it fixes. */
const RECONNECT_SETTLE_MS = 1500

type Mode = "offline" | "stale" | "restored"

/** Short relative age — "just now", "12m ago", "3h ago", "2d ago". */
function ageLabel(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return null
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()
  /** Set while the post-reconnect refresh is in flight. */
  const [restoring, setRestoring] = useState(false)
  /** The age of the cached copy the worker last served, or undefined when it
   *  has not served one recently. */
  const [staleAge, setStaleAge] = useState<string | null | undefined>(undefined)
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Whether this session has actually been offline, so a normal first load
   *  never announces a reconnection that did not happen. */
  const wasOffline = useRef(false)

  // Derived rather than stored: being offline is already a value React has, and
  // keeping a second copy of it in state only creates a way for the two to
  // disagree.
  const mode: Mode | null = !isOnline
    ? "offline"
    : restoring
      ? "restored"
      : staleAge !== undefined
        ? "stale"
        : null

  // Entering the app is a request for what is true now, not for what was true
  // when it was last closed. Runs once per session, and only while online.
  useEffect(() => {
    void refreshCachesOnEntry()
  }, [])

  useEffect(() => {
    // A page that loads with no connection has still "been offline", so a later
    // reconnect gets the same refresh as one that dropped mid-session.
    if (!navigator.onLine) wasOffline.current = true

    const handleOffline = () => {
      wasOffline.current = true
      if (staleTimer.current) clearTimeout(staleTimer.current)
      setStaleAge(undefined)
      setRestoring(false)
    }

    let settle: ReturnType<typeof setTimeout> | null = null
    const handleOnline = () => {
      if (!wasOffline.current) return
      setRestoring(true)
      // Hold briefly in case the connection is flapping, then drop the caches
      // filled during the outage and reload onto fresh data.
      settle = setTimeout(() => {
        if (!navigator.onLine) return
        wasOffline.current = false
        void clearOfflineCaches().finally(() => window.location.reload())
      }, RECONNECT_SETTLE_MS)
    }

    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "up-serving-cached") return
      if (!navigator.onLine) return // "offline" already says it, and says it better
      setStaleAge(ageLabel(event.data.ageMs ?? null))
      if (staleTimer.current) clearTimeout(staleTimer.current)
      staleTimer.current = setTimeout(() => setStaleAge(undefined), SLOW_NETWORK_LINGER_MS)
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    navigator.serviceWorker?.addEventListener("message", handleWorkerMessage)

    return () => {
      if (settle) clearTimeout(settle)
      if (staleTimer.current) clearTimeout(staleTimer.current)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      navigator.serviceWorker?.removeEventListener("message", handleWorkerMessage)
    }
  }, [])

  // The bar is fixed, so without this it sits on top of whatever the page puts
  // at the top — on the listing pages, the section heading. Height is measured
  // rather than assumed because the copy wraps to two lines on narrow screens.
  const barRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const body = document.body
    if (!mode || !barRef.current) {
      body.style.paddingTop = ""
      return
    }
    body.style.paddingTop = `${barRef.current.offsetHeight}px`
    return () => {
      body.style.paddingTop = ""
    }
  }, [mode, staleAge])

  if (!mode) return null

  const copy = {
    offline: {
      icon: <CloudOff className="h-4 w-4 shrink-0" aria-hidden />,
      text: "You're offline — you can read saved listings, but not save, apply or post.",
      tone: "bg-foreground text-background",
    },
    stale: {
      icon: <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />,
      text: staleAge
        ? `Slow connection — showing listings saved ${staleAge}.`
        : "Slow connection — showing saved listings.",
      tone: "bg-amber-500 text-black",
    },
    restored: {
      icon: <RefreshCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden />,
      text: "Back online — refreshing.",
      tone: "bg-emerald-600 text-white",
    },
  }[mode]

  return (
    <div
      ref={barRef}
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2",
        "text-center text-[13px] font-medium",
        // Sits under the notch on an installed iOS app, where the status bar is
        // translucent and the banner would otherwise be half-hidden.
        "pt-[calc(0.5rem+env(safe-area-inset-top))]",
        copy.tone
      )}
    >
      {copy.icon}
      <span>{copy.text}</span>
    </div>
  )
}
