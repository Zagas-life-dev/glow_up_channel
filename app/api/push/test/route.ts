import { NextRequest, NextResponse } from "next/server"

/** Asks the backend to push a test message to the signed-in user's saved devices. */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backendUrl) {
    return NextResponse.json({ error: "No backend URL configured." }, { status: 503 })
  }
  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/users/me/push-test`, {
      method: "POST",
      headers: { Authorization: authHeader },
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Could not reach the server." }, { status: 502 })
  }
}
