"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { hasOpenOverlay } from "@/lib/dom/body-lock-guard"
import {
  PULL_THRESHOLD,
  classifyMove,
  resistedPull,
  touchBelongsElsewhere,
} from "@/lib/dom/pull-gesture"
import { reloadWithFreshData } from "@/lib/offline/fresh-reload"

/**
 * Pull down at the top of the page to refresh — in the installed app only.
 *
 * A browser tab already has the browser's own pull-to-refresh, so this stays
 * out of the way there. Installed, there is none: iOS never had one for
 * home-screen apps, and globals.css turns Android's off because its bare reload
 * reads as a crash. This one shows what it is about to do before it does it,
 * and refreshes onto fresh data (see reloadWithFreshData) rather than onto the
 * cards this session already cached.
 *
 * It stands down whenever the pull would mean something else: a sheet or popup
 * is open, the device is offline (a refresh could only show the saved copy),
 * the finger is in a panel that can still scroll up, or the swipe is sideways.
 *
 * The touchmove listener is non-passive so it can stop the page rubber-banding
 * under the indicator — which is why it is only attached for a touch that
 * starts at the very top, leaving ordinary scrolling passive and fast.
 */

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Something is holding the page still — a pull now would fight it. */
function pageIsLocked(): boolean {
  const body = document.body
  return (
    body.style.overflow === "hidden" ||
    body.style.pointerEvents === "none" ||
    body.style.position === "fixed" ||
    body.hasAttribute("data-scroll-locked") ||
    hasOpenOverlay()
  )
}

export default function PullToRefresh() {
  const [enabled, setEnabled] = useState(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)")
    const update = () => setEnabled(isStandalone())
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!enabled) return

    let startX = 0
    let startY = 0
    let direction: ReturnType<typeof classifyMove> = "pending"

    const setDistance = (value: number) => {
      pullRef.current = value
      setPull(value)
    }

    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch || e.touches.length !== 1) return end()
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      if (direction === "pending") {
        direction = classifyMove(dx, dy)
        if (direction === "ignore") return end()
        if (direction === "pending") return
      }

      if (e.cancelable) e.preventDefault()
      setDistance(resistedPull(dy))
    }

    const onEnd = () => {
      const armed = pullRef.current >= PULL_THRESHOLD
      end()
      if (!armed) {
        setDistance(0)
        return
      }
      refreshingRef.current = true
      setRefreshing(true)
      setDistance(PULL_THRESHOLD)
      void reloadWithFreshData()
    }

    const end = () => {
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onEnd)
      window.removeEventListener("touchcancel", onEnd)
      if (direction !== "pull" && !refreshingRef.current) setDistance(0)
    }

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) return
      if (window.scrollY > 0 || !navigator.onLine) return
      if (pageIsLocked() || touchBelongsElsewhere(e.target)) return

      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      direction = "pending"
      window.addEventListener("touchmove", onMove, { passive: false })
      window.addEventListener("touchend", onEnd)
      window.addEventListener("touchcancel", onEnd)
    }

    window.addEventListener("touchstart", onStart, { passive: true })
    return () => {
      window.removeEventListener("touchstart", onStart)
      end()
    }
  }, [enabled])

  if (!enabled || (pull === 0 && !refreshing)) return null

  const progress = Math.min(1, pull / PULL_THRESHOLD)
  const armed = refreshing || pull >= PULL_THRESHOLD

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center"
      style={{
        // Starts tucked above the top edge and follows the finger down.
        transform: `translateY(calc(env(safe-area-inset-top) + ${pull - 44}px))`,
        opacity: refreshing ? 1 : progress,
        transition: pull === 0 || refreshing ? "transform 200ms ease-out" : undefined,
      }}
    >
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border shadow-up-pop transition-colors",
          armed
            ? "border-transparent bg-up-orange text-white"
            : "border-border bg-card text-up-orange"
        )}
      >
        <RefreshCw
          className={cn("h-[18px] w-[18px]", refreshing && "motion-safe:animate-spin")}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          aria-hidden
        />
        <span className="sr-only">
          {refreshing ? "Refreshing" : armed ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
    </div>
  )
}
