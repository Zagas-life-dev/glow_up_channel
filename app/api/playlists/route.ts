import { NextRequest, NextResponse } from "next/server"
import { getPlaylistProxyBackendUrl } from "@/lib/playlist-proxy-backend-url"

const CONTENT_TYPES = new Set(["opportunity", "job", "event", "resource"])

/**
 * Normalizes the playlist create body so every field the backend expects is present
 * (camelCase + is_premium mirror). Validates name before proxying.
 */
function buildPlaylistCreatePayload(raw: Record<string, unknown>) {
  const name = typeof raw.name === "string" ? raw.name.trim() : ""
  const description = typeof raw.description === "string" ? raw.description.trim() : ""
  const hashtags = Array.isArray(raw.hashtags)
    ? raw.hashtags.filter((t): t is string => typeof t === "string")
    : []
  const isPublic = raw.isPublic === undefined ? true : Boolean(raw.isPublic)
  const premium =
    raw.isPremiumPlaylist === true ||
    raw.is_premium === true ||
    raw.isPremiumPlaylist === "true" ||
    raw.is_premium === "true" ||
    raw.isPremiumPlaylist === 1 ||
    raw.is_premium === 1

  let items: unknown[] | undefined
  if (Array.isArray(raw.items)) {
    items = raw.items.slice(0, 100).map((entry) => {
      if (!entry || typeof entry !== "object") return entry
      const o = entry as Record<string, unknown>
      return {
        contentId: o.contentId,
        contentType: o.contentType,
        title: o.title,
        company: o.company ?? null,
        organization: o.organization ?? null,
        author: o.author ?? null,
        description: o.description ?? null,
      }
    })
  }

  const payload: Record<string, unknown> = {
    name,
    description,
    hashtags,
    isPublic,
    isPremiumPlaylist: premium,
    is_premium: premium,
  }

  if (items && items.length > 0) {
    payload.items = items
  }

  return { payload, name }
}

/**
 * POST /api/playlists — proxies to the backend with a canonical create body.
 * Avoids browser → backend CORS in dev and guarantees consistent JSON shape.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
  }

  const backendUrl = getPlaylistProxyBackendUrl()
  if (!backendUrl) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL or BACKEND_URL for the Next.js server (same host as your Express API).",
      },
      { status: 500 }
    )
  }

  let body: Record<string, unknown>
  try {
    const parsed = await request.json()
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 })
  }

  const { payload, name } = buildPlaylistCreatePayload(body)
  if (!name) {
    return NextResponse.json({ success: false, message: "Playlist name is required" }, { status: 400 })
  }

  // Light item shape check when items are sent
  if (Array.isArray(payload.items)) {
    for (const row of payload.items) {
      if (!row || typeof row !== "object") {
        return NextResponse.json({ success: false, message: "Invalid items payload" }, { status: 400 })
      }
      const item = row as Record<string, unknown>
      const ct = item.contentType
      if (typeof ct !== "string" || !CONTENT_TYPES.has(ct)) {
        return NextResponse.json({ success: false, message: "Invalid content type in items" }, { status: 400 })
      }
      if (item.contentId == null || item.title == null || String(item.title).trim() === "") {
        return NextResponse.json(
          { success: false, message: "Each item needs contentId, contentType, and title" },
          { status: 400 }
        )
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[playlists create proxy] →", `${backendUrl}/api/playlists`, {
      isPremiumPlaylist: payload.isPremiumPlaylist,
      is_premium: payload.is_premium,
      hasItems: Array.isArray(payload.items) && payload.items.length > 0,
    })
  }

  try {
    const res = await fetch(`${backendUrl}/api/playlists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({ success: false, message: "Invalid response from API" }))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error"
    console.error("[playlists create proxy]", e)
    return NextResponse.json(
      {
        success: false,
        message: `Cannot reach backend at ${backendUrl}. Start the API server or set NEXT_PUBLIC_BACKEND_URL / BACKEND_URL. (${msg})`,
      },
      { status: 502 }
    )
  }
}
