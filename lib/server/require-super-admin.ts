import { NextRequest, NextResponse } from "next/server"

/**
 * Gate for Next API routes that spend a server key (email sender, AI model).
 *
 * The page that calls them is hidden from non-super-admins, but hiding a page
 * does not protect the route behind it: anyone can POST to the URL directly.
 * So the route asks the backend who the caller's token belongs to, and the
 * backend's answer (never anything the caller sent) decides.
 *
 * Returns null when the caller is a super admin, otherwise the response to send.
 */
export async function requireSuperAdmin(req: NextRequest): Promise<NextResponse | null> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backendUrl) {
    // Fail closed: with no backend to ask, nobody is a super admin.
    return NextResponse.json({ error: "No backend URL configured." }, { status: 503 })
  }
  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/auth/me`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    })
    if (!res.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const data = (await res.json().catch(() => null)) as
      | { data?: { user?: { role?: string } } }
      | null
    if (data?.data?.user?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return null
  } catch {
    return NextResponse.json({ error: "Could not reach the server." }, { status: 502 })
  }
}
