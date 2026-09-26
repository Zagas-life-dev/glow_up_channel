"use client"

import { useEffect } from "react"
import { toast } from "sonner"

/**
 * Registers the service worker — in production only — and tells the reader when
 * a newer version of the app is live.
 *
 * The worker caches build output, so in development it would serve yesterday's
 * bundle back after a code change and the edit would read as having done
 * nothing. A registration also outlives the build that created it, so dev does
 * not just skip registering — it removes whatever is already installed on this
 * origin, which is how a developer who once loaded a production build on
 * localhost gets out from under it.
 *
 * Updates. An installed app is rarely reloaded — it is resumed from the app
 * switcher for days — so the code in memory drifts behind the deployment, and
 * the first navigation that lazy-loads a chunk the new build no longer has
 * fails. Two signals say a newer version exists:
 *
 *   - a new service worker is installed and waiting. The worker no longer
 *     takes over mid-session (public/sw.js), because activating deletes the
 *     old caches out from under the page still running on them;
 *   - /api/version reports a different build than the one this page carries.
 *     Most deploys change no line of sw.js, so this is the common case.
 *
 * Either one raises the same toast. Refresh hands over to the waiting worker if
 * there is one and reloads once it controls the page, or simply reloads.
 */

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID
/** How often a visible, open app re-checks. Also checked on every resume. */
const CHECK_EVERY_MS = 30 * 60 * 1000
const TOAST_ID = "up-app-update"

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

    let registration: ServiceWorkerRegistration | null = null
    let announced = false
    let lastCheck = 0

    const applyUpdate = () => {
      const waiting = registration?.waiting
      if (!waiting) {
        window.location.reload()
        return
      }
      // Reload once the new worker is actually in charge, so the next page is
      // served by it and from its caches — not by the old one mid-shutdown.
      navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true })
      waiting.postMessage("up-skip-waiting")
    }

    const announce = () => {
      if (announced) return
      announced = true
      toast.info("A new version of UP is ready", {
        id: TOAST_ID,
        duration: Infinity,
        action: { label: "Refresh", onClick: applyUpdate },
      })
    }

    /** Watch a registration for a worker that finishes installing behind us. */
    const watch = (reg: ServiceWorkerRegistration) => {
      registration = reg
      // Only an *update* is news. The very first install has no controller to
      // replace, activates straight away, and must not ask for a refresh.
      if (reg.waiting && navigator.serviceWorker.controller) announce()
      reg.addEventListener("updatefound", () => {
        const incoming = reg.installing
        incoming?.addEventListener("statechange", () => {
          if (incoming.state === "installed" && navigator.serviceWorker.controller) announce()
        })
      })
    }

    const check = async () => {
      if (announced || !navigator.onLine) return
      const now = Date.now()
      if (now - lastCheck < 60 * 1000) return // resume + interval can coincide
      lastCheck = now
      registration?.update().catch(() => {})
      if (!BUILD_ID) return
      try {
        const res = await fetch("/api/version", { cache: "no-store" })
        if (!res.ok) return
        const { build } = (await res.json()) as { build?: string | null }
        if (build && build !== BUILD_ID) announce()
      } catch {
        /* offline or the route is unreachable — try again on the next resume */
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void check()
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(watch)
      .catch(() => {})

    document.addEventListener("visibilitychange", onVisible)
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void check()
    }, CHECK_EVERY_MS)

    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.clearInterval(timer)
    }
  }, [])

  return null
}
