"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { prefetchAllowed, prefetchFeeds } from "@/lib/background-prefetch"

/** Routes a reader is likely to open next; their code is fetched while idle. */
const FEED_ROUTES = ["/", "/playlists", "/opportunities", "/jobs", "/events", "/resources"]

/**
 * Renders nothing. Once auth has settled, warms every feed's first page and the
 * code for the main feed routes, so the next tap opens without a spinner. See
 * `lib/background-prefetch` for what is loaded and when it holds back.
 *
 * A signed-out visitor on "/" is looking at the marketing page, most of whom
 * never go further, so nothing is loaded for them until they step into the app.
 */
export default function BackgroundPrefetcher() {
  const { user, normalizedUser, isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const onLanding = !isAuthenticated && pathname === "/"
  const userId = isAuthenticated && user ? user._id : null

  useEffect(() => {
    if (isLoading || onLanding) return
    void prefetchFeeds({ userId, normalizedUser })
    // normalizedUser is read once per reader: it is already set by the time
    // isLoading clears, and a profile edit later should not rerun the warm-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, onLanding, userId])

  useEffect(() => {
    if (isLoading || onLanding || !prefetchAllowed()) return
    const id = setTimeout(() => {
      for (const route of FEED_ROUTES) if (route !== pathname) router.prefetch(route)
    }, 1500)
    return () => clearTimeout(id)
    // Once per reader; route code does not change as they navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, onLanding, userId])

  return null
}
