import { NextRequest, NextResponse } from "next/server"
import { sendContactEmail } from "@/lib/email/service"

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json()

    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message are required." },
        { status: 400 }
      )
    }

    const result = await sendContactEmail({
      fromEmail: email,
      name,
      message,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send message.", details: result.error },
        { status: 500 }
      )
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

