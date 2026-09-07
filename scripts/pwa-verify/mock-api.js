/**
 * Stand-in for the Express API on the port NEXT_PUBLIC_BACKEND_URL points at,
 * so the service worker's caching rules can be exercised against a real
 * cross-origin server with real CORS preflights.
 *
 * The listing responses mirror the real payload shape that
 * lib/fetch-home-list-page.ts parses — `{ success, data: { <type>: [], pagination } }`
 * — because the point of several of these checks is that a cached page still
 * *renders*, which a stub shape would not prove.
 */
const http = require("http")

const PORT = 3002
const hits = Object.create(null)

const TYPES = ["opportunities", "events", "jobs", "resources"]
const SINGULAR = {
  opportunities: "opportunity",
  events: "event",
  jobs: "job",
  resources: "resource",
}

function cors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin || "*")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,X-View-Source,x-anon-id,x-session-id"
  )
  res.setHeader("Vary", "Origin")
}

function listing(type, index) {
  const id = (index + 1).toString(16).padStart(24, "0")
  return {
    _id: id,
    title: `Cached ${SINGULAR[type]} ${index + 1}`,
    description: `A ${SINGULAR[type]} held in the offline cache for verification.`,
    type: SINGULAR[type],
    organization: "Verification Org",
    company: "Verification Org",
    location: { country: "Nigeria", city: "Lagos", isRemote: true },
    tags: ["verification", SINGULAR[type]],
    pricing: { isPaid: false },
    applicationDeadline: new Date(Date.now() + 86400000 * 30).toISOString(),
    createdAt: new Date().toISOString(),
    metrics: { likeCount: 3, saveCount: 2, shareCount: 1, viewCount: 40 },
    status: "active",
    isApproved: true,
  }
}

function listPayload(type) {
  const items = Array.from({ length: 6 }, (_, i) => listing(type, i))
  return {
    success: true,
    data: {
      [type]: items,
      pagination: { lastId: items[items.length - 1]._id, hasMore: false },
    },
  }
}

function detailPayload(type, id) {
  return { success: true, data: { ...listing(type, 0), _id: id } }
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost:" + PORT)
    cors(res, req.headers.origin)

    if (req.method === "OPTIONS") {
      res.writeHead(204)
      res.end()
      return
    }

    hits[url.pathname] = (hits[url.pathname] || 0) + 1

    if (url.pathname === "/__hits") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(hits))
      return
    }

    const json = (payload) => {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(payload))
    }

    const segments = url.pathname.split("/").filter(Boolean) // ["api", type, id?]
    const type = segments[1]
    let payload

    if (segments[0] === "api" && TYPES.includes(type)) {
      payload = segments.length === 2 ? listPayload(type) : detailPayload(type, segments[2])
    } else {
      payload = { success: true, servedAt: Date.now(), path: url.pathname, data: {} }
    }

    // ?slow=1 outlasts the worker's network timeout, which is how the
    // slow-network path is exercised without unplugging anything.
    if (url.searchParams.get("slow") === "1") setTimeout(() => json(payload), 6000)
    else json(payload)
  })
  .listen(PORT, () => console.log("mock API on " + PORT))
