import { NextRequest, NextResponse } from "next/server"

/**
 * Removes push subscription for the current user.
 * Forwards to backend if it has a DELETE push-subscription endpoint.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backendUrl) {
    return NextResponse.json({ error: "Push is not configured on this server (no backend URL)." }, { status: 503 })
  }

  // Only this device: the endpoint identifies it. Without one the backend would
  // drop every device the user has.
  let endpoint = ""
  try {
    endpoint = (await request.json())?.endpoint || ""
  } catch {
    /* no body — falls through to remove all */
  }
  const qs = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : ""

  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/users/me/push-subscription${qs}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      return NextResponse.json(
        { error: data?.message || data?.error || "Backend rejected unsubscribe" },
        { status: res.status }
      )
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.warn("Push unsubscribe: backend request failed", e)
    return NextResponse.json({ error: "Could not reach the server." }, { status: 502 })
  }
}
