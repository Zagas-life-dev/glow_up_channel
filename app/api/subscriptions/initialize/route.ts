import { NextRequest, NextResponse } from "next/server"

/**
 * Proxies POST /api/subscriptions/initialize to the backend so the browser does not
 * cross-origin fetch to localhost:3001 (avoids CORS / "Failed to fetch" in dev).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "")
  if (!backendUrl) {
    return NextResponse.json(
      { success: false, message: "NEXT_PUBLIC_BACKEND_URL is not configured on the server." },
      { status: 500 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 })
  }

  try {
    const res = await fetch(`${backendUrl}/api/subscriptions/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body ?? {}),
    })
    const data = await res.json().catch(() => ({ success: false, message: "Invalid response from API" }))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error"
    console.error("[subscriptions/initialize proxy]", e)
    return NextResponse.json(
      {
        success: false,
        message: `Cannot reach backend at ${backendUrl}. Start the API server or fix NEXT_PUBLIC_BACKEND_URL. (${msg})`,
      },
      { status: 502 }
    )
  }
}
