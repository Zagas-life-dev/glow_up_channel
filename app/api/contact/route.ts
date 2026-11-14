import { NextRequest, NextResponse } from "next/server"
import { sendContactEmail } from "@/lib/email/service"

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/

/**
 * A light brake per address: 5 messages per 10 minutes. It is held in memory, so
 * per server instance, which is enough to stop one client looping on the form
 * and burning the SES quota. It is not a wall against a spread-out attack.
 */
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()

function tooMany(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return false
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown"
  if (tooMany(ip)) {
    return NextResponse.json(
      { error: "Too many messages. Please try again in a few minutes." },
      { status: 429 }
    )
  }

  try {
    const { name, email, message } = await req.json()

    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message are required." },
        { status: 400 }
      )
    }
    if (
      typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email) ||
      typeof message !== "string" || message.length > 5000 ||
      (name != null && (typeof name !== "string" || name.length > 100))
    ) {
      return NextResponse.json(
        { error: "Check your email address. Names are up to 100 characters, messages up to 5,000." },
        { status: 400 }
      )
    }

    const result = await sendContactEmail({
      fromEmail: email,
      name: name || undefined,
      message,
    })

    if (!result.success) {
      // The provider's own error stays in the server log, not in the reply.
      console.error("Contact form send failed:", result.error)
      return NextResponse.json({ error: "Failed to send message." }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    )
  }
}
