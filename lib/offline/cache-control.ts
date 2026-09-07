/**
 * When the offline caches get thrown away and refilled.
 *
 * Two moments, both for the same reason: cached listings go stale in ways the
 * user cannot see. An opportunity closes, a deadline passes, an event is
 * cancelled — and none of that is visible in a copy saved yesterday. So rather
 * than trying to expire entries individually, the whole set is dropped at the
 * two points where the user's expectation resets:
 *
 *   1. The connection comes back. What is on screen was saved during an outage,
 *      so it is exactly the content most likely to be wrong.
 *   2. A new session starts. Opening the app is a request for what is true now,
 *      not for what was true when it was last closed.
 *
 * Both are conditional on actually being online. Clearing while offline would
 * destroy the only content the user can still read, which is the opposite of
 * the point.
 */

const CLEAR_MESSAGE = "up-clear-caches"
const SESSION_KEY = "up:caches-refreshed"
const ACK_TIMEOUT_MS = 3000

/** True once per browser session — the first call in a new tab/launch. */
export function isNewSession(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false
    sessionStorage.setItem(SESSION_KEY, "1")
    return true
  } catch {
    // Private mode or storage disabled. Treating it as "not new" avoids
    // clearing the cache on every render in a browser that cannot remember.
    return false
  }
}

/**
 * Ask the service worker to drop the document, API and image caches, and wait
 * for it to confirm.
 *
 * The acknowledgement matters on the reconnect path: the page reloads straight
 * after, and reloading before the delete has finished would let the worker
 * answer the new page's requests from the caches we just asked it to discard.
 * Resolves false if there is no worker, or if it does not answer in time — the
 * caller carries on either way, since network-first means a live connection
 * produces fresh data regardless.
 */
export function clearOfflineCaches(): Promise<boolean> {
  if (typeof navigator === "undefined") return Promise.resolve(false)
  const worker = navigator.serviceWorker?.controller
  if (!worker) return Promise.resolve(false)

  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => {
      channel.port1.close()
      resolve(false)
    }, ACK_TIMEOUT_MS)

    channel.port1.onmessage = (event) => {
      clearTimeout(timer)
      channel.port1.close()
      resolve(event.data?.cleared === true)
    }

    try {
      worker.postMessage(CLEAR_MESSAGE, [channel.port2])
    } catch {
      clearTimeout(timer)
      resolve(false)
    }
  })
}

/**
 * Drop the caches once at the start of a session, so entering the app never
 * shows yesterday's listings.
 *
 * No reload is needed here: the page is already loading, and its own requests
 * refill the caches as they resolve. It matters mainly on a slow connection,
 * where the worker would otherwise answer from cache the moment its timeout
 * elapsed — with the cache empty, the first load waits for the network and the
 * user gets current data, which is what opening the app is asking for.
 */
export async function refreshCachesOnEntry(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.onLine) return
  if (!isNewSession()) return
  await clearOfflineCaches()
}
