import { NextRequest, NextResponse } from "next/server"
import { getPlaylistProxyBackendUrl } from "@/lib/playlist-proxy-backend-url"

function isLikelyObjectId(id: string) {
  return /^[a-f\d]{24}$/i.test(id)
}

/**
 * Normalizes edit-modal fields: mirrors premium flags and coerces types.
 * Only keys present in `raw` are set (partial updates still go to backend as-is for those keys).
 */
function buildPlaylistUpdatePayload(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = {}

  if (typeof raw.name === "string") {
    out.name = raw.name.trim()
  }
  if (typeof raw.description === "string") {
    out.description = raw.description.trim()
  }
  if (Array.isArray(raw.hashtags)) {
    out.hashtags = raw.hashtags.filter((t): t is string => typeof t === "string")
  }
  if (raw.isPublic !== undefined) {
    out.isPublic = Boolean(raw.isPublic)
  }

  const hasPremiumCamel = Object.prototype.hasOwnProperty.call(raw, "isPremiumPlaylist")
  const hasPremiumSnake = Object.prototype.hasOwnProperty.call(raw, "is_premium")
  if (hasPremiumCamel || hasPremiumSnake) {
    const premium =
      raw.isPremiumPlaylist === true ||
      raw.is_premium === true ||
      raw.isPremiumPlaylist === "true" ||
      raw.is_premium === "true" ||
      raw.isPremiumPlaylist === 1 ||
      raw.is_premium === 1
    out.isPremiumPlaylist = premium
    out.is_premium = premium
  }

  return out
}

async function proxyPlaylistUpdate(request: NextRequest, id: string) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
  }

  if (!isLikelyObjectId(id)) {
    return NextResponse.json({ success: false, message: "Invalid playlist ID" }, { status: 400 })
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

  const payload = buildPlaylistUpdatePayload(body)
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ success: false, message: "No valid fields to update" }, { status: 400 })
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[playlists update proxy] →", `${backendUrl}/api/playlists/${id}`, payload)
  }

  try {
    const res = await fetch(`${backendUrl}/api/playlists/${encodeURIComponent(id)}`, {
      method: "PUT",
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
    console.error("[playlists update proxy]", e)
    return NextResponse.json(
      {
        success: false,
        message: `Cannot reach backend at ${backendUrl}. Start the API server or set NEXT_PUBLIC_BACKEND_URL / BACKEND_URL. (${msg})`,
      },
      { status: 502 }
    )
  }
}

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH — same as PUT; use from the edit modal for semantic partial update. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyPlaylistUpdate(request, id)
}

/** PUT — forwards to backend PUT (backend only registers PUT on /api/playlists/:id). */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyPlaylistUpdate(request, id)
}
