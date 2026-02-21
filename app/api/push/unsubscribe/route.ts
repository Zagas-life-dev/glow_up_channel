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
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/users/me/push-subscription`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      })
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json(
          { error: text || "Backend rejected unsubscribe" },
          { status: res.status }
        )
      }
      return NextResponse.json({ success: true })
    } catch (e) {
      console.warn("Push unsubscribe: backend request failed", e)
    }
  }

  return NextResponse.json({ success: true })
}
