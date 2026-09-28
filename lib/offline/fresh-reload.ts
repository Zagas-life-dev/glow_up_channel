import { clearOfflineCaches } from "@/lib/offline/cache-control"
import { clearPageStateCache } from "@/lib/page-state-session"

/**
 * Reload onto fresh data rather than onto what this session already saved.
 *
 * A plain reload is not enough: the session feed caches would restore the same
 * cards, and the service worker could answer from its API cache. So both are
 * dropped first. The worker clear is awaited — reloading before it finishes
 * would let the new page be served from the very cache being discarded.
 * Offline, the worker caches are kept: they are the only content left to read.
 */
export async function reloadWithFreshData(): Promise<void> {
  if (typeof window === "undefined") return
  clearPageStateCache()
  if (navigator.onLine) await clearOfflineCaches()
  window.location.reload()
}
