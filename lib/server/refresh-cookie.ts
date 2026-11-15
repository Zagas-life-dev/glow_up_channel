import { NextRequest, NextResponse } from "next/server"

/**
 * The refresh token lives in an httpOnly cookie on this site's own domain, set by
 * this Next app (app/api/session/*). Page scripts cannot read it, so an injected
 * script or a bad dependency can no longer copy a 30-day sign-in out of
 * localStorage. No API subdomain is needed: the cookie belongs to whatever domain
 * Vercel serves the site on, and these routes talk to the backend server-side.
 */
export const REFRESH_COOKIE = "up_rt"
const MAX_AGE_S = 30 * 24 * 60 * 60

export function setRefreshCookie(res: NextResponse, token: string) {
  res.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Strict: only ever sent by this site's own pages to its own /api/session.
    sameSite: "strict",
    path: "/api/session",
    maxAge: MAX_AGE_S,
  })
}

export function clearRefreshCookie(res: NextResponse) {
  res.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/session",
    maxAge: 0,
  })
}

/**
 * Only this site's own pages may call the session routes. Without it, another
 * site could POST its own refresh token into a visitor's cookie (signing them in
 * as the attacker). Browsers always send Origin on a POST/DELETE fetch.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return false
  return origin === req.nextUrl.origin
}

/** A JWT-shaped string of sane length; anything else is not stored. */
export function looksLikeToken(v: unknown): v is string {
  return typeof v === "string" && v.length < 4096 && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(v)
}

export function backendUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL
  return url ? url.replace(/\/$/, "") : null
}
