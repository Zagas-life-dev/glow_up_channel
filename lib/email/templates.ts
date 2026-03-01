export type EmailTemplateId = "minimal" | "bold" | "newsletter" | "glowup"

export type EmailTemplateMetadata = {
  id: EmailTemplateId
  name: string
  description: string
}

export const EMAIL_TEMPLATES: EmailTemplateMetadata[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean, single-column layout with simple typography.",
  },
  {
    id: "bold",
    name: "Bold promo",
    description: "Strong header bar and clear call-to-action styling.",
  },
  {
    id: "newsletter",
    name: "Newsletter",
    description: "Multi-section layout for weekly digests and updates.",
  },
  {
    id: "glowup",
    name: "GlowUp branded",
    description: "GlowUp-style gradient header and brand-forward layout.",
  },
]

type TemplateContext = {
  subject: string
  previewText?: string
  body: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function formatBodyHtml(body: string): string {
  const escaped = escapeHtml(body)
  return escaped.replace(/\n/g, "<br />")
}

function baseWrapper(innerHtml: string, subject: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#0b0b0f; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#f9fafb;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:24px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; max-width:640px; border-collapse:collapse; background-color:#020617; border-radius:16px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.45); border:1px solid #1f2933;">
            ${innerHtml}
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`.trim()
}

function renderMinimal(ctx: TemplateContext): string {
  const preview = ctx.previewText ? escapeHtml(ctx.previewText) : ""
  const bodyHtml = formatBodyHtml(ctx.body)

  const inner = `
    <tr>
      <td style="padding:20px 24px 12px 24px; background-color:#020617;">
        <p style="margin:0 0 8px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.18em; color:#9ca3af; font-weight:600;">
          GlowUp Campaign
        </p>
        <h1 style="margin:0; font-size:22px; line-height:1.3; color:#f9fafb;">
          ${escapeHtml(ctx.subject)}
        </h1>
        ${
          preview
            ? `<p style="margin:8px 0 0 0; font-size:13px; color:#9ca3af;">${preview}</p>`
            : ""
        }
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px 24px 24px; background-color:#020617;">
        <div style="font-size:14px; line-height:1.7; color:#e5e7eb;">
          ${bodyHtml}
        </div>
      </td>
    </tr>
  `

  return baseWrapper(inner, ctx.subject)
}

function renderBold(ctx: TemplateContext): string {
  const preview = ctx.previewText ? escapeHtml(ctx.previewText) : ""
  const bodyHtml = formatBodyHtml(ctx.body)

  const inner = `
    <tr>
      <td style="padding:22px 24px; background:linear-gradient(135deg,#f97316,#f97316 30%,#db2777); border-bottom:1px solid rgba(15,23,42,0.6);">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="font-size:20px; font-weight:800; color:#0b0b0f;">
              GlowUp
            </td>
            <td align="right">
              <span style="display:inline-block; padding:6px 12px; border-radius:999px; background-color:rgba(15,23,42,0.8); color:#fef3c7; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.18em;">
                Campaign
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 24px 8px 24px; background-color:#020617;">
        <h1 style="margin:0 0 8px 0; font-size:24px; line-height:1.25; color:#f9fafb;">
          ${escapeHtml(ctx.subject)}
        </h1>
        ${
          preview
            ? `<p style="margin:0; font-size:13px; color:#e5e7eb;">${preview}</p>`
            : ""
        }
      </td>
    </tr>
    <tr>
      <td style="padding:8px 24px 24px 24px; background-color:#020617;">
        <div style="font-size:14px; line-height:1.7; color:#e5e7eb; margin-bottom:16px;">
          ${bodyHtml}
        </div>
        <div style="margin-top:12px;">
          <a
            href="https://glowupchannel.com/"
            style="display:inline-block; padding:10px 20px; border-radius:999px; background:linear-gradient(135deg,#f97316,#ec4899); color:#0b0b0f; font-size:13px; font-weight:700; text-decoration:none;"
          >
            Explore opportunities
          </a>
        </div>
      </td>
    </tr>
  `

  return baseWrapper(inner, ctx.subject)
}

function renderNewsletter(ctx: TemplateContext): string {
  const preview = ctx.previewText ? escapeHtml(ctx.previewText) : ""
  const bodyHtml = formatBodyHtml(ctx.body)

  const inner = `
    <tr>
      <td style="padding:18px 24px; background-color:#020617; border-bottom:1px solid #111827;">
        <p style="margin:0 0 4px 0; font-size:11px; text-transform:uppercase; letter-spacing:0.18em; color:#9ca3af; font-weight:600;">
          GlowUp Weekly
        </p>
        <h1 style="margin:0; font-size:20px; line-height:1.4; color:#f9fafb;">
          ${escapeHtml(ctx.subject)}
        </h1>
        ${
          preview
            ? `<p style="margin:6px 0 0 0; font-size:12px; color:#9ca3af;">${preview}</p>`
            : ""
        }
      </td>
    </tr>
    <tr>
      <td style="padding:18px 24px 16px 24px; background-color:#020617;">
        <div style="font-size:14px; line-height:1.7; color:#e5e7eb; margin-bottom:16px;">
          ${bodyHtml}
        </div>
        <hr style="border:none; border-top:1px solid #111827; margin:18px 0;" />
        <p style="margin:0; font-size:11px; color:#6b7280;">
          You are receiving this because you’re part of the GlowUp community. For more stories, resources, and opportunities, visit
          <a href="https://glowupchannel.com/" style="color:#f97316; text-decoration:none;">glowupchannel.com</a>.
        </p>
      </td>
    </tr>
  `

  return baseWrapper(inner, ctx.subject)
}

function renderGlowup(ctx: TemplateContext): string {
  const preview = ctx.previewText ? escapeHtml(ctx.previewText) : ""
  const bodyHtml = formatBodyHtml(ctx.body)

  const inner = `
    <tr>
      <td style="padding:28px 24px 18px 24px; background:radial-gradient(circle at top left,#f97316 0,#020617 45%), radial-gradient(circle at bottom right,#db2777 0,#020617 55%); border-bottom:1px solid rgba(15,23,42,0.7);">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="vertical-align:middle;">
              <div style="display:inline-flex; align-items:center; gap:8px;">
                <div style="width:32px; height:32px; border-radius:999px; background-color:rgba(15,23,42,0.85); display:flex; align-items:center; justify-content:center; color:#f97316; font-weight:800; font-size:18px;">
                  G
                </div>
                <div>
                  <p style="margin:0; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#0b0b0f;">
                    GlowUp
                  </p>
                  <p style="margin:0; font-size:11px; color:#111827; font-weight:500;">
                    Opportunities · Community · Focus
                  </p>
                </div>
              </div>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="display:inline-block; padding:6px 12px; border-radius:999px; background-color:rgba(15,23,42,0.85); color:#e5e7eb; font-size:11px; font-weight:600;">
                Campaign update
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px 8px 24px; background-color:#020617;">
        <h1 style="margin:0 0 8px 0; font-size:22px; line-height:1.35; color:#f9fafb;">
          ${escapeHtml(ctx.subject)}
        </h1>
        ${
          preview
            ? `<p style="margin:0; font-size:13px; color:#e5e7eb;">${preview}</p>`
            : ""
        }
      </td>
    </tr>
    <tr>
      <td style="padding:8px 24px 22px 24px; background-color:#020617;">
        <div style="font-size:14px; line-height:1.7; color:#e5e7eb; margin-bottom:18px;">
          ${bodyHtml}
        </div>
        <div style="margin-top:8px;">
          <a
            href="https://glowupchannel.com/"
            style="display:inline-block; padding:10px 18px; border-radius:999px; background-color:#f97316; color:#0b0b0f; font-size:13px; font-weight:700; text-decoration:none; margin-right:6px;"
          >
            Visit GlowUp
          </a>
          <a
            href="https://whatsapp.com/channel/0029Vanm1p0InlqII9gDQl0i"
            style="display:inline-block; padding:9px 16px; border-radius:999px; border:1px solid #374151; color:#e5e7eb; font-size:13px; font-weight:500; text-decoration:none;"
          >
            Join the community
          </a>
        </div>
      </td>
    </tr>
  `

  return baseWrapper(inner, ctx.subject)
}

export function getTemplateHtml(
  designId: EmailTemplateId | undefined,
  ctx: TemplateContext
): string {
  const id = designId && (EMAIL_TEMPLATES.some((t) => t.id === designId) ? designId : "minimal")

  switch (id) {
    case "bold":
      return renderBold(ctx)
    case "newsletter":
      return renderNewsletter(ctx)
    case "glowup":
      return renderGlowup(ctx)
    case "minimal":
    default:
      return renderMinimal(ctx)
  }
}

