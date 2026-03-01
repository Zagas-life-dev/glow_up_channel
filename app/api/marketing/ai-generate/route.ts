import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/email/templates"

const VALID_DESIGN_IDS = new Set(EMAIL_TEMPLATES.map((t) => t.id))

function sanitize(str: string, maxLen: number): string {
  if (typeof str !== "string") return ""
  let out = str.trim().slice(0, maxLen)
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  return out
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI generation is not configured. Set GEMINI_API_KEY in .env.local." },
        { status: 503 }
      )
    }

    const { subject = "", body = "", tone = "", campaignType = "" } = await req.json()

    const ai = new GoogleGenAI({ apiKey })

    const designList = EMAIL_TEMPLATES.map((t) => `"${t.id}" (${t.name}: ${t.description})`).join("; ")

    const userPrompt = `
Generate a marketing email for GlowUp (a platform for youth opportunities, growth, and community). 

Current draft (you may improve or replace):
- Subject: ${subject || "(none)"}
- Body: ${body || "(none)"}
${tone ? `- Tone: ${tone}` : ""}
${campaignType ? `- Campaign type: ${campaignType}` : ""}

Respond with a JSON object only, no markdown or extra text:
{
  "subject": "Compelling subject line (max ~60 chars)",
  "body": "Email body in plain text. Use short paragraphs separated by newlines. No HTML.",
  "suggestedDesignId": "one of: minimal, bold, newsletter, glowup"
}

Available designs: ${designList}
Pick suggestedDesignId based on content: use "newsletter" for digests/updates, "bold" for promos/CTAs, "glowup" for brand-heavy, "minimal" for simple announcements.`

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
    })

    const rawText = (response as { text?: string }).text ?? ""

    let parsed: { subject?: string; body?: string; suggestedDesignId?: string }
    try {
      const jsonStr = rawText.replace(/^[\s\S]*?\{/, "{").replace(/\}[\s\S]*$/, "}")
      parsed = JSON.parse(jsonStr) as { subject?: string; body?: string; suggestedDesignId?: string }
    } catch {
      parsed = {}
    }

    const outSubject = sanitize(parsed.subject ?? subject ?? "", 200)
    const outBody = sanitize(parsed.body ?? body ?? "", 8000)
    let suggestedDesignId: EmailTemplateId | undefined
    if (parsed.suggestedDesignId && VALID_DESIGN_IDS.has(parsed.suggestedDesignId as EmailTemplateId)) {
      suggestedDesignId = parsed.suggestedDesignId as EmailTemplateId
    }

    return NextResponse.json({
      subject: outSubject,
      body: outBody,
      ...(suggestedDesignId && { suggestedDesignId }),
    })
  } catch (error) {
    console.error("Marketing AI generate error:", error)
    return NextResponse.json(
      { error: "Failed to generate email. Check your API key and try again." },
      { status: 500 }
    )
  }
}
