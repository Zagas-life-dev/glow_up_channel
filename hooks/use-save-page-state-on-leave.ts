"use client"

import { useLayoutEffect, useRef } from "react"
import { savePageState, type PageStateData } from "@/lib/page-state-session"

/**
 * Hands a page's tab, feed and scroll depth to the next visit in this session.
 *
 * Saves when the page unmounts. Watching `usePathname` for the route to change
 * does not work in the App Router: the old page is gone before its pathname
 * updates, so a "pathname left this page" branch never runs and the reader came
 * back to a fresh feed on the first tab.
 *
 * A layout-effect cleanup runs in the commit's mutation phase, before Next
 * scrolls the incoming page to the top, so `window.scrollY` is still where the
 * reader stopped. The snapshot is read through a ref so the latest items and tab
 * are saved without re-running the effect on every render.
 *
 * Readers of the saved state should capture it once at mount (a `useState`
 * initialiser): Strict Mode's mount/unmount/mount in development fires this
 * cleanup straight away and overwrites it with the top of the page.
 */
export function useSavePageStateOnLeave(
  path: string,
  snapshot: () => Omit<PageStateData, "scrollY">,
): void {
  const snapshotRef = useRef(snapshot)
  useLayoutEffect(() => {
    snapshotRef.current = snapshot
  })

  useLayoutEffect(() => {
    return () => {
      savePageState(path, { scrollY: window.scrollY, ...snapshotRef.current() })
    }
  }, [path])
}
