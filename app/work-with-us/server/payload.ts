import {
  BUNDLES,
  DETAIL_FIELDS,
  LISTING_TIERS,
  MAX_LISTINGS,
  MAX_PROMOTION_QUANTITY,
  PROMOTION_ITEMS,
  REVENUE_SHARE_OPTIONS,
  allowsMultiple,
  type Duration,
  type Kind,
  type SubmissionPayload,
} from "../config"

const KINDS = Object.keys(DETAIL_FIELDS) as Kind[]
const DURATIONS = Object.keys(LISTING_TIERS) as Duration[]

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
    const value = text(source[field.name], field.type === "textarea" ? 5000 : 500)
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

  // A signature bundle, if one was picked.
  let bundleId: string | null = null
  if (kind === "promotion") {
    const picked = text(body.bundleId, 60)
    if (picked) {
      if (!BUNDLES.some((bundle) => bundle.id === picked)) return { error: "Pick a bundle we sell" }
      bundleId = picked
    }
  }

  // Promotion items
  const promotions: { id: string; quantity: number }[] = []
  if (kind === "promotion") {
    const chosen = Array.isArray(body.promotions) ? body.promotions : []
    for (const entry of chosen) {
      const item = entry as Record<string, unknown>
      const id = text(item.id, 60)
      if (!PROMOTION_ITEMS.some((option) => option.id === id)) continue
      if (promotions.some((already) => already.id === id)) continue
      const count = Number(item.quantity)
      if (!Number.isInteger(count) || count < 1 || count > MAX_PROMOTION_QUANTITY) continue
      promotions.push({ id, quantity: count })
    }
    if (promotions.length === 0 && !bundleId) return { error: "Pick at least one promotion" }
  }

  // How long a paid listing runs. Everything else is left on the default.
  const asked = text(body.duration, 20) as Duration
  const duration: Duration = DURATIONS.includes(asked) ? asked : "standard"

  // Revenue share
  let revenueShare: number | null = null
  if (kind === "resource") {
    const share = Number(body.revenueShare)
    const option = REVENUE_SHARE_OPTIONS.find((entry) => entry.value === share)
    if (!option) return { error: "Choose which terms you want" }
    // The co-created split is scoped in writing, so it never comes in this way.
    if (option.contactOnly) return { error: "Those terms are agreed with our team first" }
    revenueShare = share
  }

  return { payload: { kind, entries, duration, bundleId, promotions, revenueShare, contact } }
}
