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
 * POST: swap the refresh cookie for a new access token.
 *
 * The backend rotates the refresh token on every call; the new one goes straight
 * back into the cookie and only the access token reaches the page. A browser
 * signed in before this existed still has its refresh token in localStorage: it
 * sends it once as `legacyRefreshToken`, and from then on it lives in the cookie.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const api = backendUrl()
  if (!api) return NextResponse.json({ error: "No backend URL configured." }, { status: 503 })

  const fromCookie = req.cookies.get(REFRESH_COOKIE)?.value
  const body = await req.json().catch(() => null)
  const token = looksLikeToken(fromCookie)
    ? fromCookie
    : looksLikeToken(body?.legacyRefreshToken)
      ? body.legacyRefreshToken
      : null
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  let upstream: Response
  try {
    upstream = await fetch(`${api}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token }),
      cache: "no-store",
    })
  } catch {
    // The backend could not be reached: keep the cookie, the page tries again.
    return NextResponse.json({ error: "Could not reach the server." }, { status: 502 })
  }

  const data = await upstream.json().catch(() => null)
  const tokens = data?.data?.tokens
  if (upstream.ok && looksLikeToken(tokens?.accessToken) && looksLikeToken(tokens?.refreshToken)) {
    const res = NextResponse.json({ accessToken: tokens.accessToken })
    setRefreshCookie(res, tokens.refreshToken)
    return res
  }

  if (upstream.status >= 400 && upstream.status < 500) {
    // Spent, revoked or expired: this device must sign in again.
    const res = NextResponse.json({ error: "Session ended" }, { status: 401 })
    clearRefreshCookie(res)
    return res
  }
  return NextResponse.json({ error: "Refresh failed" }, { status: 502 })
}
