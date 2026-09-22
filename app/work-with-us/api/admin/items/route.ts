import { NextResponse } from "next/server"

import { listItems } from "../../../server/api"

/**
 * The review queue. Newest first, filtered by status — `all` for everything.
 *
 * A pass-through to the order book, which owns the collection, the filtering
 * and the counts. The admin check happens there too, on the token forwarded
 * below: this server does not hold the JWT secret, so a check made here would
 * be a second opinion rather than the decision, and the decision is better made
 * where the data is.
 */
export async function GET(request: Request) {
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!token) {
    return NextResponse.json(
      { error: "Sign in with an admin account to see this." },
      { status: 401 },
    )
  }

  const status = new URL(request.url).searchParams.get("status") ?? "pending_review"

  const result = await listItems(status, token)
  if (!result.ok) {
    console.error("work-with-us admin list failed:", result.error)
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result.data)
}
