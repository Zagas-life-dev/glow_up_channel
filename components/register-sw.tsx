"use client"

import { useEffect } from "react"

/**
 * Registers the service worker — in production only.
 *
 * The worker caches build output, so in development it would serve yesterday's
 * bundle back after a code change and the edit would read as having done
 * nothing. That was harmless while the worker only handled push; now that it
 * has a fetch handler it is a live foot-gun.
 *
 * A registration also outlives the build that created it, so dev does not just
 * skip registering — it removes whatever is already installed on this origin,
 * which is how a developer who once loaded a production build on localhost gets
 * out from under it.
 */
export default function RegisterSw() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => r.unregister()))
        .catch(() => {})
      return
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
  }, [])

  return null
}
