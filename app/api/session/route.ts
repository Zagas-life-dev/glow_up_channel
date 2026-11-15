import { NextRequest, NextResponse } from "next/server"
import {
  REFRESH_COOKIE,
  backendUrl,
  clearRefreshCookie,
  isSameOrigin,
  looksLikeToken,
  setRefreshCookie,
} from "@/lib/server/refresh-cookie"

/**
 * POST { refreshToken }: keep this sign-in's refresh token in the httpOnly cookie.
 * Called right after login, sign-up or a password change; the page then forgets it.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!looksLikeToken(body?.refreshToken)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }
  const res = NextResponse.json({ ok: true })
  setRefreshCookie(res, body.refreshToken)
  return res
}

/** DELETE: sign out on this device. Ends the backend session, then drops the cookie. */
export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const token = req.cookies.get(REFRESH_COOKIE)?.value
  const api = backendUrl()
  if (api && looksLikeToken(token)) {
    await fetch(`${api}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token }),
      cache: "no-store",
    }).catch(() => {})
  }
  const res = NextResponse.json({ ok: true })
  clearRefreshCookie(res)
  return res
}
