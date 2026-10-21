import { NextRequest, NextResponse } from "next/server"

/**
 * The unsubscribe link in every UP email.
 *
 *   GET  ?u=&t=   the link a reader clicks: unsubscribes, then shows a short
 *                 page with an undo button (a plain form, so it works with no JS).
 *   POST ?u=&t=   RFC 8058 one-click, sent by Gmail/Yahoo/Apple Mail from the
 *                 List-Unsubscribe-Post header. Also the undo form (action=resubscribe).
 *
 * The signed token is checked by the backend; this route only forwards.
 */

function backend(): string | null {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL
  return url ? url.replace(/\/$/, "") : null
}

async function forward(path: "unsubscribe" | "resubscribe", u: string, t: string): Promise<boolean> {
  const base = backend()
  if (!base) return false
  try {
    const res = await fetch(`${base}/api/email/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ u, t }),
    })
    return res.ok
  } catch {
    return false
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)
}

function page(title: string, body: string, form?: { u: string; t: string; action: string; label: string }): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · UP</title><meta name="robots" content="noindex">
<style>body{margin:0;background:#F4F5F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1F2433}
main{max-width:440px;margin:12vh auto;padding:28px 24px;background:#fff;border-radius:16px}
h1{margin:0 0 8px;font-size:22px;color:#0B1233}p{margin:0 0 18px;line-height:1.5;color:#5B6275}
button,a.btn{display:inline-block;border:0;border-radius:999px;padding:12px 22px;font-weight:800;font-size:15px;cursor:pointer;text-decoration:none}
button{background:#FF6A00;color:#fff}a.btn{background:#EEF0F4;color:#0B1233;margin-left:8px}</style></head>
<body><main><h1>${esc(title)}</h1><p>${esc(body)}</p>
${
  form
    ? `<form method="post" action="/api/email/unsubscribe?u=${encodeURIComponent(form.u)}&t=${encodeURIComponent(form.t)}&action=${form.action}"><button type="submit">${esc(form.label)}</button><a class="btn" href="/">Go to UP</a></form>`
    : `<a class="btn" style="margin-left:0" href="/">Go to UP</a>`
}
</main></body></html>`
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
}

export async function GET(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("u") || ""
  const t = request.nextUrl.searchParams.get("t") || ""
  if (!(await forward("unsubscribe", u, t))) {
    return page("That link didn't work", "It may be incomplete. You can turn marketing emails off in Settings → Notifications.")
  }
  return page(
    "You're unsubscribed",
    "No more marketing emails or digests. Reminders you set yourself and account emails still arrive.",
    { u, t, action: "resubscribe", label: "Undo" },
  )
}

export async function POST(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("u") || ""
  const t = request.nextUrl.searchParams.get("t") || ""
  const action = request.nextUrl.searchParams.get("action") === "resubscribe" ? "resubscribe" : "unsubscribe"
  const ok = await forward(action, u, t)
  // A mail client's one-click POST only reads the status code.
  const isForm = (request.headers.get("content-type") || "").includes("form") && action === "resubscribe"
  if (isForm) {
    return ok
      ? page("You're subscribed again", "Thanks for sticking around.")
      : page("That link didn't work", "You can change this in Settings → Notifications.")
  }
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 })
}
