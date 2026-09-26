"use client"

import { useCallback, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

/**
 * A back button that always goes somewhere.
 *
 * `router.back()` is only right when this tab has moved within the app. When a
 * page was the first thing opened — a shared link, a notification, the
 * installed app launched from a push — there is nothing behind it: in the
 * installed app, which has no browser back button, the tap does nothing, and in
 * a tab it leaves UP for whatever came before. So the first in-app move of the
 * tab is recorded, and until one has happened back goes to the page's section
 * (or home) instead.
 *
 * Per tab (sessionStorage), because browser history is per tab too.
 */

const KEY = "up-has-in-app-history"

let navigated = false

function hasInAppHistory(): boolean {
  if (navigated) return true
  try {
    return sessionStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

/** Mount once. Records the first client-side route change of the tab. */
export function InAppHistoryTracker() {
  const pathname = usePathname()
  const first = useRef<string | null>(null)

  useEffect(() => {
    if (first.current === null) {
      first.current = pathname
      return
    }
    if (navigated || pathname === first.current) return
    navigated = true
    try {
      sessionStorage.setItem(KEY, "1")
    } catch {
      // The in-memory flag still covers this page load.
    }
  }, [pathname])

  return null
}

/** Sections with their own list page, where a detail page's back should land. */
const SECTIONS = new Set(["opportunities", "events", "jobs", "resources"])

function fallbackFor(pathname: string | null): string {
  const head = pathname?.split("/").filter(Boolean)[0]
  return head && SECTIONS.has(head) ? `/${head}` : "/"
}

/** Back when there is in-app history, otherwise up to the section, or home. */
export function useGoBack(fallback?: string) {
  const router = useRouter()
  const pathname = usePathname()

  return useCallback(() => {
    if (hasInAppHistory()) router.back()
    else router.replace(fallback ?? fallbackFor(pathname))
  }, [router, pathname, fallback])
}
