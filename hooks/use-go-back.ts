"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"

/**
 * Browser-back with a floor under it.
 *
 * The nav bars offer this to signed-out visitors, who mostly arrive on a deep
 * link — a shared listing, a search result — rather than by walking in from the
 * landing page. On that first view there is no in-app history to pop, so a bare
 * `router.back()` either does nothing at all or throws them straight back off
 * the site. Falling through to the landing page keeps the button meaningful on
 * a cold entry, and turns a dead control into the one that starts the tour.
 *
 * `history.length` counts the whole tab rather than just this origin, so it is
 * a floor and not a precise measure: it can report history that belongs to
 * another site. That is the safe direction to be wrong in — the worst case is
 * an ordinary browser-back, which is what the button says it does.
 */
export function useGoBack(): () => void {
  const router = useRouter()

  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push("/")
  }, [router])
}
