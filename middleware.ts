import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Simple middleware - BetterAuth handles its own authentication
  // No auth checks needed here since BetterAuth manages sessions
  return NextResponse.next()
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
