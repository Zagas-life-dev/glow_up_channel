"use client"

/**
 * Counts feed cards the reader actually saw: at least half on screen for a
 * full second, once per card per page load.
 *
 * This is the feed's side of the stories comparison. A story slide is one
 * listing on screen; the feed shows a dozen per scroll. Comparing saves per
 * listing seen is fair to both, where raw save counts are not. Only the count
 * is sent, folded into the story event batch, never one request per card.
 */

import { useEffect, type RefObject } from "react"
import { onBeforeStoryFlush, queueStoryEvent } from "@/lib/stories/store"

const DWELL_MS = 1000

export function useFeedSeen(containerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = containerRef.current
    if (!enabled || !root || typeof IntersectionObserver === "undefined") return

    const seen = new Set<string>()
    const timers = new Map<Element, ReturnType<typeof setTimeout>>()
    let pending = 0

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.feedCard
          if (!id || seen.has(id)) continue
          if (entry.isIntersecting) {
            if (!timers.has(entry.target)) {
              timers.set(
                entry.target,
                setTimeout(() => {
                  timers.delete(entry.target)
                  if (seen.has(id)) return
                  seen.add(id)
                  pending++
                  io.unobserve(entry.target)
                }, DWELL_MS),
              )
            }
          } else {
            clearTimeout(timers.get(entry.target))
            timers.delete(entry.target)
          }
        }
      },
      { threshold: 0.5 },
    )

    const observeAll = () => {
      root.querySelectorAll<HTMLElement>("[data-feed-card]").forEach((el) => {
        if (!seen.has(el.dataset.feedCard || "")) io.observe(el)
      })
    }
    observeAll()
    const mo = new MutationObserver(observeAll)
    mo.observe(root, { childList: true, subtree: true })

    const off = onBeforeStoryFlush(() => {
      if (pending === 0) return
      queueStoryEvent({ type: "feed_seen", count: pending })
      pending = 0
    })

    return () => {
      off()
      mo.disconnect()
      io.disconnect()
      for (const t of timers.values()) clearTimeout(t)
      if (pending > 0) queueStoryEvent({ type: "feed_seen", count: pending })
    }
  }, [containerRef, enabled])
}
