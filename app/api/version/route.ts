import { NextResponse } from "next/server"

/**
 * The deployment that is live right now. An open app compares this with the
 * build id baked into its own bundle; when they differ it is running old code
 * and offers a refresh. Dynamic and uncached, or the answer could come from the
 * same stale layer it exists to detect. The service worker never intercepts
 * same-origin /api/, so it cannot be answered from the worker's caches either.
 */
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json(
    { build: process.env.NEXT_PUBLIC_BUILD_ID ?? null },
    { headers: { "Cache-Control": "no-store" } }
  )
}
