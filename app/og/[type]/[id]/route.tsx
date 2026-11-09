import { ImageResponse } from "next/og"
import { getEvent, getJob, getOpportunity } from "@/lib/seo/fetch-content"
import { BRAND_LOGOS, brandLogoUrl } from "@/lib/seo/brand"

/**
 * Share card for a listing: 1200x630, title, organisation, deadline and the UP mark.
 *
 * Listings without their own picture used to unfurl on WhatsApp as the bare logo,
 * so a shared link said nothing about the job. lib/seo/metadata points og:image here
 * whenever a listing has no image. Two-colour brand: navy and orange, lime for events.
 */

const NAVY = "#0B1233"
const ORANGE = "#FF6A00"
const LIME = "#D6FF3F"

type Kind = "jobs" | "opportunities" | "events"
const LABEL: Record<Kind, string> = { jobs: "Job", opportunities: "Opportunity", events: "Event" }

type Loose = {
  title?: string
  company?: string
  organization?: string
  organizer?: string
  provider?: string
  location?: { city?: string | null; province?: string | null; country?: string | null; isRemote?: boolean }
  dates?: { applicationDeadline?: string | null; registrationDeadline?: string | null; startDate?: string | null }
}

async function load(kind: Kind, id: string): Promise<Loose | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null
  const getter = kind === "jobs" ? getJob : kind === "events" ? getEvent : getOpportunity
  return ((await getter(id)) as Loose | null) ?? null
}

function dateLine(kind: Kind, doc: Loose): string | null {
  const raw = kind === "events" ? doc.dates?.startDate ?? doc.dates?.registrationDeadline : doc.dates?.applicationDeadline
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" })
  return kind === "events" ? `On ${day}` : `Apply by ${day}`
}

export async function GET(_req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params
  if (type !== "jobs" && type !== "opportunities" && type !== "events") return new Response("Not found", { status: 404 })
  const kind = type as Kind
  const doc = await load(kind, id)
  if (!doc?.title) return new Response("Not found", { status: 404 })

  const org = doc.company || doc.organization || doc.organizer || doc.provider || ""
  const place = doc.location?.isRemote ? "Remote" : [doc.location?.city, doc.location?.country].filter(Boolean).join(", ")
  const when = dateLine(kind, doc)
  const accent = kind === "events" ? LIME : ORANGE
  const title = doc.title.length > 110 ? `${doc.title.slice(0, 107)}…` : doc.title

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: NAVY, color: "#fff", padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", background: accent, color: NAVY, fontSize: 28, fontWeight: 800, padding: "8px 22px", borderRadius: 999 }}>{LABEL[kind]}</div>
          {when ? <div style={{ display: "flex", fontSize: 30, color: accent, fontWeight: 700 }}>{when}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: title.length > 70 ? 54 : 66, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
          {org || place ? <div style={{ display: "flex", fontSize: 32, color: "#C9CEE6" }}>{[org, place].filter(Boolean).join(" · ")}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 28, color: "#C9CEE6" }}>Found on UP · glowupchannel.com</div>
          {/* The real U-arrow-P mark (brand rule: never a drawn "UP"). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brandLogoUrl(BRAND_LOGOS.orange, { height: 48, format: "png" })} width={96} height={96} alt="UP" style={{ borderRadius: 24 }} />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    },
  )
}
