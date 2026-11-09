"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { prefetchFeeds } from "@/lib/background-prefetch"

/**
 * Renders nothing. Once auth has settled, warms every feed's first page so the
 * next tap opens without a spinner. Route code is left to the nav <Link>s, which
 * prefetch it when they are on screen: a router.prefetch loop here fetched the
 * same routes a second time (Next 16 splits each into ~4 segment requests, so
 * 20-24 RSC requests per page measured live, ~300 ms each), and /resources
 * while resources are paused. See
 * `lib/background-prefetch` for what is loaded and when it holds back.
 *
 * A signed-out visitor on "/" is looking at the marketing page, most of whom
 * never go further, so nothing is loaded for them until they step into the app.
 */
export default function BackgroundPrefetcher() {
  const { user, normalizedUser, isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()

  const onLanding = !isAuthenticated && pathname === "/"
  const userId = isAuthenticated && user ? user._id : null

  useEffect(() => {
    if (isLoading || onLanding) return
    void prefetchFeeds({ userId, normalizedUser })
    // normalizedUser is read once per reader: it is already set by the time
    // isLoading clears, and a profile edit later should not rerun the warm-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, onLanding, userId])

  return null
}
