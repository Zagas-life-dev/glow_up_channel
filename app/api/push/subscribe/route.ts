import { NextRequest, NextResponse } from "next/server"

/**
 * Saves a push subscription for the current user.
 * Expects Authorization: Bearer <token> and JSON body: { subscription: PushSubscriptionJSON }
 * Forwards to the backend and passes its failure through — never reports success
 * for a subscription that was not stored.
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
  if (!backendUrl) {
    // Reporting success here is what made "enabled" and "never delivered" look the
    // same: the browser holds a subscription the server never stored.
    return NextResponse.json({ error: "Push is not configured on this server (no backend URL)." }, { status: 503 })
  }

  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/users/me/push-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ subscription: body.subscription }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      return NextResponse.json(
        { error: data?.message || data?.error || "Backend rejected the subscription" },
        { status: res.status }
      )
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.warn("Push subscribe: backend request failed", e)
    return NextResponse.json({ error: "Could not reach the server to save this device." }, { status: 502 })
  }
}
