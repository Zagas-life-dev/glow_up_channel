import { NextResponse } from "next/server"

import { audienceSize } from "../../server/stats"

/**
 * The audience figure for the landing page's trust strip.
 *
 * The sales pipeline (§3.4, §14) is explicit that proof numbers must be current
 * and verified, and that stale ones must never be hard-coded — so the page asks
 * for this rather than carrying a number in the source. If the count cannot be
 * read, this returns null and the strip does not render at all: claiming nothing
 * is the only safe failure here.
 */
export const revalidate = 3600

export async function GET() {
  const users = await audienceSize()
  return NextResponse.json({ users })
}
