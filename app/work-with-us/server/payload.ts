import {
  BUNDLES,
  DETAIL_FIELDS,
  DURATIONS,
  MAX_LISTINGS,
  RESOURCE_COMMISSION,
  allowsMultiple,
  normaliseLink,
  type Duration,
  type Kind,
  type SubmissionPayload,
} from "../config"

const KINDS = Object.keys(DETAIL_FIELDS) as Kind[]

function text(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/** Every required field for this kind must be filled in. */
function parseEntry(
  kind: Kind,
  raw: unknown,
  position: string,
): { entry: Record<string, string> } | { error: string } {
  const source = (raw ?? {}) as Record<string, unknown>
  const entry: Record<string, string> = {}
  for (const field of DETAIL_FIELDS[kind]) {
    const typed = text(source[field.name], field.type === "textarea" ? 5000 : 500)
    const value = field.type === "url" ? normaliseLink(typed) : typed
    if (!value && !field.optional) return { error: `${field.label}${position} is required` }
    if (value) entry[field.name] = value
  }
  return { entry }
}

/**
 * Turns whatever the browser sent into a payload we are willing to act on,
 * or an error to show. Prices are never read from the request — the server
 * recomputes them from config.ts.
 */
export function parsePayload(raw: unknown): { payload: SubmissionPayload } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Nothing to submit" }
  const body = raw as Record<string, unknown>

  const kind = text(body.kind) as Kind
  if (!KINDS.includes(kind)) return { error: "Pick what you want to submit" }

  // Contact
  const contactRaw = (body.contact ?? {}) as Record<string, unknown>
  const contact = {
    name: text(contactRaw.name, 120),
    email: text(contactRaw.email, 160).toLowerCase(),
    phone: text(contactRaw.phone, 40),
    organisation: text(contactRaw.organisation, 160),
  }
  if (!contact.name) return { error: "Your name is required" }
  if (!isEmail(contact.email)) return { error: "A valid email is required" }
  if (!contact.phone) return { error: "A phone number is required" }

  // One filled-in form per listing.
  const many = allowsMultiple(kind)
  const rawEntries = Array.isArray(body.entries) ? body.entries : []
  if (rawEntries.length === 0) return { error: "Fill in the form first" }
  if (!many && rawEntries.length !== 1) return { error: "Fill in the form first" }
  if (rawEntries.length > MAX_LISTINGS) {
    return { error: `You can send up to ${MAX_LISTINGS} listings at a time` }
  }

  const entries: Record<string, string>[] = []
  for (const [index, rawEntry] of rawEntries.entries()) {
    const parsed = parseEntry(kind, rawEntry, many ? ` on listing ${index + 1}` : "")
    if ("error" in parsed) return { error: parsed.error }
    entries.push(parsed.entry)
  }

  // A package. The old à-la-carte pieces are no longer sold, so they are ignored.
  let bundleId: string | null = null
  if (kind === "promotion") {
    const picked = text(body.bundleId, 60)
    if (!BUNDLES.some((bundle) => bundle.id === picked)) return { error: "Pick a package" }
    bundleId = picked
  }
  const promotions: { id: string; quantity: number }[] = []

  // Listings are free and stay up until their deadline; the field is kept for old orders.
  const asked = text(body.duration, 20) as Duration
  const duration: Duration = DURATIONS.includes(asked) ? asked : "standard"

  // One commission for every resource, whatever an older saved order asked for.
  const revenueShare = kind === "resource" ? RESOURCE_COMMISSION : null

  return { payload: { kind, entries, duration, bundleId, promotions, revenueShare, contact } }
}
