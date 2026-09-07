/**
 * UP PWA service worker — offline shell, offline data, and push.
 *
 * The shell alone was not worth much: the app is client-rendered, so a cached
 * page booted offline rendered its chrome and then sat empty while every listing
 * fetch failed against the API on the other origin. So the worker also caches
 * the listing data itself, which is what makes the offline state a usable app
 * rather than a skeleton.
 *
 * What may be cached from the API is a closed list, and the reason that is safe
 * is structural rather than a judgement call: GET /api/{opportunities,events,
 * jobs,resources} and their /:id details are mounted in the Express app with no
 * `authenticateToken` and no `optionalAuth`, so `req.user` is never populated
 * and every caller receives identical bytes. The client still attaches a Bearer
 * token to them — it does that uniformly — but the token cannot change the
 * response, so one user's cached copy can never contain another's data. Nothing
 * outside PUBLIC_API is stored, ever.
 *
 *   documents            network-first → cache → /offline.html
 *   build assets         cache-first (content-hashed)
 *   other same-origin    stale-while-revalidate
 *   public listing API   network-first with a timeout → cache
 *   remote images        cache-first, CORS-readable responses only
 *   everything else      not intercepted
 */

const VERSION = "v3"
const PRECACHE = `up-precache-${VERSION}`
const DOCUMENTS = `up-documents-${VERSION}`
const ASSETS = `up-assets-${VERSION}`
const API = `up-api-${VERSION}`
const IMAGES = `up-images-${VERSION}`
const CURRENT = new Set([PRECACHE, DOCUMENTS, ASSETS, API, IMAGES])

const OFFLINE_URL = "/offline.html"
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/badge-96.png",
  // The start URL. The opening navigation of a first visit is not controlled by
  // this worker — it is what installs it — so without precaching, a user who
  // installs and immediately loses signal has nothing to open. Documents are
  // network-first, so an online user is never served this stale.
  "/",
]

const MAX_ENTRIES = {
  [DOCUMENTS]: 50,
  [ASSETS]: 120,
  [API]: 160,
  // Deliberately small. Images are the one thing here that can be large, and the
  // low-end Android this app is aimed at is exactly where blowing the origin
  // quota gets the whole cache — offline page included — evicted.
  [IMAGES]: 48,
}

/**
 * The only API paths that may be stored. List endpoints, details keyed by a
 * 24-hex ObjectId (the id format the controllers validate), and the small public
 * taxonomy endpoints the filters read. `/inactive` and `/my/opportunities` are
 * role-gated and are excluded by construction rather than by an explicit deny.
 */
const PUBLIC_API =
  /^\/api\/(opportunities|events|jobs|resources)(?:\/(?:[a-f0-9]{24}|categories|types|featured))?$/i

/** How long a request waits for the network before the cached copy is served
 *  instead. The request is not abandoned — it keeps running and refreshes the
 *  cache — this only bounds what the user waits for. Tuned for the high-latency
 *  mobile networks this app actually runs on. */
const NETWORK_TIMEOUT_MS = 3500

/** Marks when a cached copy was stored, so the UI can say how old it is. */
const STAMP = "x-up-cached-at"

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable()
      }
      const names = await caches.keys()
      await Promise.all(
        names.filter((n) => n.startsWith("up-") && !CURRENT.has(n)).map((n) => caches.delete(n))
      )
      await caches.delete("glowup-sw-v1")
      await self.clients.claim()
    })()
  )
})

/* ---------------------------------------------------------------------------
 * Cache plumbing
 * ------------------------------------------------------------------------- */

/** Drop the oldest entries once a cache is over its cap. The Cache API preserves
 *  insertion order, so the front of the list is the coldest. */
async function trim(cacheName) {
  const limit = MAX_ENTRIES[cacheName]
  if (!limit) return
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= limit) return
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)))
}

async function putAndTrim(cacheName, request, response) {
  const cache = await caches.open(cacheName)
  await cache.put(request, response)
  await trim(cacheName)
}

/** Re-wrap a response with the time it was stored. Only used on responses whose
 *  body is readable to us; an opaque response is never cached at all. */
async function stamped(response) {
  const headers = new Headers(response.headers)
  headers.set(STAMP, Date.now().toString())
  // blob() returns decoded bytes, so these two now describe a body that no
  // longer exists. Left in place, a cached page can be handed back as gzip that
  // is not gzip, and the length is simply wrong.
  headers.delete("content-encoding")
  headers.delete("content-length")
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function cachedAge(response) {
  const at = Number(response.headers.get(STAMP))
  return Number.isFinite(at) && at > 0 ? Date.now() - at : null
}

/**
 * Tell the open pages that what they just received came from cache because the
 * network did not answer. The offline banner listens for this; nothing else in
 * the app needs to know, which is why this is a message rather than a change to
 * lib/api-client.ts.
 */
async function announceStale(kind, request, response) {
  const clients = await self.clients.matchAll({ type: "window" })
  if (!clients.length) return
  const message = { type: "up-serving-cached", kind, url: request.url, ageMs: cachedAge(response) }
  for (const client of clients) client.postMessage(message)
}

/** Race the network against the clock. Resolves to the response if it arrives in
 *  time, or null if it times out or fails — in both cases the caller falls back
 *  to cache and the original request is left running to refresh it. */
function withTimeout(networkPromise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    networkPromise
      .then((response) => {
        clearTimeout(timer)
        resolve(response)
      })
      .catch(() => {
        clearTimeout(timer)
        resolve(null)
      })
  })
}

/* ---------------------------------------------------------------------------
 * Strategies
 * ------------------------------------------------------------------------- */

async function handleDocument(event) {
  const { request } = event
  try {
    const preloaded = await event.preloadResponse
    const response = preloaded || (await fetch(request))
    if (response && response.ok) {
      event.waitUntil(stamped(response.clone()).then((s) => putAndTrim(DOCUMENTS, request, s)))
    }
    return response
  } catch {
    // Offline. Serve this exact page if it has been seen before, otherwise the
    // offline notice. Falling back to the cached "/" shell would be wrong: App
    // Router HTML carries the RSC payload for the route it was rendered for, so
    // the home shell at another URL renders home content under the wrong address.
    const hit = await caches.match(request)
    if (hit) {
      event.waitUntil(announceStale("document", request, hit))
      return hit
    }
    return (await caches.match(OFFLINE_URL)) || Response.error()
  }
}

/**
 * Public listing data. Fresh whenever the network can answer promptly; the
 * cached copy the moment it cannot. That second half is what the feed needed
 * anyway — the client fans out to four endpoints per load, and on a slow
 * connection the cached answer is the difference between a usable screen and a
 * spinner.
 */
async function handleApi(event, request) {
  const cache = await caches.open(API)
  const cached = await cache.match(request, { ignoreVary: true })

  const network = fetch(request).then(async (response) => {
    if (response && response.ok) {
      await cache.put(request, await stamped(response.clone()))
      await trim(API)
    }
    return response
  })

  if (!cached) {
    try {
      const response = await network
      if (response) return response
    } catch {
      /* fall through to the offline answer below */
    }
    // Never fetched, and no network now. A JSON body in the shape the client
    // already parses turns "Failed to fetch" into something the UI can say out
    // loud; see handleResponse in lib/api-client.ts.
    return new Response(
      JSON.stringify({
        success: false,
        message: "You're offline, and this hasn't been saved for offline use yet.",
        offline: true,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    )
  }

  const fresh = await withTimeout(network, NETWORK_TIMEOUT_MS)
  if (fresh) return fresh

  // Slow or absent network. Serve what we have and let the refresh finish in the
  // background so the next read is current.
  event.waitUntil(network.catch(() => {}))
  event.waitUntil(announceStale("api", request, cached))
  return cached
}

/**
 * Remote listing artwork. Cached only when it comes back CORS-readable: an
 * opaque response is charged against the origin quota at a heavily padded size,
 * and the cap that protects the rest of the caches cannot see that padding. When
 * CORS is refused the request simply passes through uncached.
 */
async function handleImage(event, request) {
  const cache = await caches.open(IMAGES)
  const hit = await cache.match(request, { ignoreVary: true })
  if (hit) return hit

  try {
    const readable = await fetch(request.url, { mode: "cors", credentials: "omit" })
    if (readable && readable.ok && readable.type !== "opaque") {
      event.waitUntil(cache.put(request, readable.clone()).then(() => trim(IMAGES)))
      return readable
    }
  } catch {
    /* CORS refused or offline — fall through */
  }

  try {
    return await fetch(request)
  } catch {
    return Response.error()
  }
}

async function cacheFirst(event, request) {
  const hit = await caches.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response && response.ok) {
    event.waitUntil(putAndTrim(ASSETS, request, response.clone()))
  }
  return response
}

async function staleWhileRevalidate(event, request) {
  const hit = await caches.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await putAndTrim(ASSETS, request, response.clone())
      }
      return response
    })
    .catch(() => null)

  // On a hit the response goes back immediately and the refresh keeps running
  // after this function returns, so the event has to be told to stay alive or
  // the browser is free to kill the worker mid-write.
  if (hit) {
    event.waitUntil(network)
    return hit
  }
  return (await network) || Response.error()
}

/* ---------------------------------------------------------------------------
 * Routing
 * ------------------------------------------------------------------------- */

function isImmutable(url) {
  return url.pathname.startsWith("/_next/static/")
}

function isAsset(url, request) {
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/")) return true
  return ["style", "script", "font", "image"].includes(request.destination)
}

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") return
  // Range requests (media seeking) must reach the network to be satisfied.
  if (request.headers.has("range")) return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  if (request.mode === "navigate") {
    event.respondWith(handleDocument(event))
    return
  }

  if (!sameOrigin) {
    // The API lives on its own origin, so this is how it is recognised without
    // the worker needing to know NEXT_PUBLIC_BACKEND_URL.
    if (url.pathname.startsWith("/api/")) {
      if (PUBLIC_API.test(url.pathname)) event.respondWith(handleApi(event, request))
      return
    }
    if (request.destination === "image") {
      event.respondWith(handleImage(event, request))
    }
    return
  }

  // Next.js route handlers and RSC payloads: data, not assets, and neither is
  // content-hashed.
  if (url.pathname.startsWith("/api/") || url.searchParams.has("_rsc")) return

  if (isImmutable(url)) {
    event.respondWith(cacheFirst(event, request))
    return
  }

  if (isAsset(url, request)) {
    event.respondWith(staleWhileRevalidate(event, request))
  }
})

/**
 * Drop everything derived from browsing: cached pages, listing data and images.
 * The build assets and the precached offline page survive, because they are not
 * stale-able in the same way and throwing them away would only cost a download.
 *
 * Three callers, in lib/offline/cache-control.ts and lib/api-client.ts: sign-out,
 * reconnecting after an outage, and the start of a new session. The reply is
 * what lets the reconnect path wait before reloading — without it the new page
 * could be answered from caches that were still being deleted.
 */
self.addEventListener("message", (event) => {
  if (event.data !== "up-clear-caches") return
  const reply = event.ports && event.ports[0]
  event.waitUntil(
    Promise.all([caches.delete(API), caches.delete(DOCUMENTS), caches.delete(IMAGES)])
      .then(() => reply && reply.postMessage({ cleared: true }))
      .catch(() => reply && reply.postMessage({ cleared: false }))
  )
})

/* ---------------------------------------------------------------------------
 * Push notifications — unchanged behaviour.
 * ------------------------------------------------------------------------- */

self.addEventListener("push", (event) => {
  if (!event.data) return
  let payload = { title: "UP", body: "", url: "/" }
  try {
    payload = { ...payload, ...event.data.json() }
  } catch {
    payload.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "UP", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: payload.tag || "glowup-push",
      data: { url: payload.url || "/" },
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0]
        client.focus();
        client.navigate(url)
      } else if (self.clients.openWindow) {
        self.clients.openWindow(self.location.origin + (url.startsWith("/") ? url : "/" + url))
      }
    })
  )
})
