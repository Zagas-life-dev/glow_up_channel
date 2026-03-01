import { NextRequest, NextResponse } from "next/server"
import { sendCampaignEmail } from "@/lib/email/service"
import { getTemplateHtml, type EmailTemplateId } from "@/lib/email/templates"

export async function POST(req: NextRequest) {
  try {
    const { subject, previewText, content, recipients, designId } = await req.json()

    if (!subject || !content || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "Subject, body, and at least one recipient are required." },
        { status: 400 }
      )
    }

    const safeContent = String(content).trim()

    const textBody = previewText
      ? `${subject}\n\n${previewText}\n\n${safeContent}`
      : `${subject}\n\n${safeContent}`

    const htmlBody = getTemplateHtml(designId as EmailTemplateId | undefined, {
      subject: String(subject),
      previewText: previewText ? String(previewText) : undefined,
      body: safeContent,
    })

    const result = await sendCampaignEmail({
      recipients,
      subject,
      htmlBody,
      textBody,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send campaign email." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Marketing send-campaign error:", error)
    return NextResponse.json(
      { error: "Failed to process campaign email request." },
      { status: 500 }
    )
  }
}

