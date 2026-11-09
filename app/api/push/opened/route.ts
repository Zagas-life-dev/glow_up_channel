import { NextResponse } from "next/server"

/**
 * POST /api/push/opened { n } — relays a tapped push from the service worker to the
 * backend (POST /api/push-opened), which stamps openedAt on that notification_log row.
 *
 * Same-origin on purpose: the service worker knows only this site's origin, not the
 * backend's, and a same-origin call needs no CORS.
 */
export async function POST(req: Request) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "")
  if (!backend) return NextResponse.json({ success: false }, { status: 503 })
  let n: unknown
  try {
    n = (await req.json())?.n
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
  if (typeof n !== "string" || !/^[a-f0-9]{24}$/i.test(n)) {
    return NextResponse.json({ success: false }, { status: 400 })
  }
  try {
    const res = await fetch(`${backend}/api/push-opened`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n }),
    })
    return NextResponse.json(await res.json().catch(() => ({ success: res.ok })), { status: res.status })
  } catch {
    return NextResponse.json({ success: false }, { status: 502 })
  }
}
