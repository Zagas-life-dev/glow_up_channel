import { NextRequest, NextResponse } from 'next/server'

import { COUNTRY_COOKIE, LOCALE_COOKIE, localeFromAcceptLanguage, localeFromCountry, normalizeLocale } from '@/lib/i18n/config'

/**
 * Decides the locale before the page renders.
 *
 * Without this the client would pick a locale in an effect and the first paint
 * would be English for everyone — a visible flash for three quarters of the
 * supported languages. Reading `Accept-Language` and the CDN's country header
 * here means the server and the first client render already agree.
 *
 * Only sets the cookie when there is nothing there yet. An explicit choice made
 * in the UI must not be overwritten on the next navigation.
 */
export async function middleware(request: NextRequest) {
  // BetterAuth handles its own sessions; nothing to check here.
  const response = NextResponse.next()

  const countryCode =
    request.headers.get('x-vercel-ip-country') ?? request.headers.get('cf-ipcountry')

  // The root layout no longer reads request headers (so pages can be static),
  // so the country reaches the client through this cookie instead.
  if (countryCode && request.cookies.get(COUNTRY_COOKIE)?.value !== countryCode) {
    response.cookies.set(COUNTRY_COOKIE, countryCode, {
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    })
  }

  const existing = normalizeLocale(request.cookies.get(LOCALE_COOKIE)?.value)
  if (existing) return response

  const locale =
    localeFromAcceptLanguage(request.headers.get('accept-language')) ??
    localeFromCountry(countryCode) ??
    'en'

  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes handled by BetterAuth)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
