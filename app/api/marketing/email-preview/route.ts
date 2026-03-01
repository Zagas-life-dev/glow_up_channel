import { NextRequest, NextResponse } from "next/server"
import { getTemplateHtml, type EmailTemplateId } from "@/lib/email/templates"

export async function POST(req: NextRequest) {
  try {
    const { designId, subject, previewText, content } = await req.json()

    if (!subject || !content) {
      return NextResponse.json(
        { error: "Subject and body are required for preview." },
        { status: 400 }
      )
    }

    const html = getTemplateHtml(designId as EmailTemplateId | undefined, {
      subject: String(subject),
      previewText: previewText ? String(previewText) : undefined,
      body: String(content),
    })

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("Marketing email preview error:", error)
    return NextResponse.json(
      { error: "Failed to generate email preview." },
      { status: 500 }
    )
  }
}

