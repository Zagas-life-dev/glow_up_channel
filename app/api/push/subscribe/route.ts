import { NextRequest, NextResponse } from "next/server"

/**
 * Saves a push subscription for the current user.
 * Expects Authorization: Bearer <token> and JSON body: { subscription: PushSubscriptionJSON }
 * Forwards to backend if NEXT_PUBLIC_BACKEND_URL has a push-subscription endpoint;
 * otherwise returns success (backend can implement storage and web-push sending).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { subscription: PushSubscriptionJSON }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body?.subscription?.endpoint) {
    return NextResponse.json({ error: "Missing subscription" }, { status: 400 })
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/users/me/push-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ subscription: body.subscription }),
      })
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json(
          { error: text || "Backend rejected subscription" },
          { status: res.status }
        )
      }
      return NextResponse.json({ success: true })
    } catch (e) {
      // Backend may not have the endpoint yet; still accept so client can subscribe
      console.warn("Push subscribe: backend request failed", e)
    }
  }

  return NextResponse.json({ success: true })
}
