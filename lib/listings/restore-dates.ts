/**
 * Client-side mirror of the backend's restore date rules.
 *
 * TWIN FILE — keep in step with `latest-glowup-channel/src/utils/restoreDates.js`.
 * That file is the authority: the server re-runs every rule here before it writes, so a
 * mismatch cannot corrupt data, it can only make the admin form disagree with the reply
 * it gets. The mirror exists so the restore dialog can say "this date has already passed"
 * while the admin is still typing, rather than after a round trip.
 *
 * The rules, and why both are needed:
 *
 *   1. The governing date must be in the future (`STILL_PAST`). A post sits in `past_*`
 *      because its dates ran out; restoring it unchanged just means the nightly cleanup
 *      sweep archives it again, after a day of showing readers a dead deadline.
 *   2. The governing date must differ from the archived one (`DATES_UNCHANGED`). Rule 1
 *      covers the expired majority, but a post moved to past by hand can still hold a
 *      future deadline — there, resubmitting it untouched would slip through.
 *
 * "Governing" matters: each type has one date that decides expiry, and changing any
 * other one is not a change as far as cleanup is concerned. See `resolveExpiry`.
 */

export type RestorableType = "opportunity" | "event" | "job"
export type PastCollection = "opportunities" | "events" | "jobs"

export const COLLECTION_TO_TYPE: Record<PastCollection, RestorableType> = {
  opportunities: "opportunity",
  events: "event",
  jobs: "job",
}

/** The date fields the restore form offers, per type, in display order. */
export const EDITABLE_DATE_FIELDS: Record<RestorableType, readonly string[]> = {
  opportunity: ["applicationDeadline", "startDate", "endDate"],
  event: ["startDate", "endDate", "registrationDeadline"],
  job: ["applicationDeadline", "startDate"],
}

export const DATE_FIELD_LABELS: Record<string, string> = {
  applicationDeadline: "Application deadline",
  registrationDeadline: "Registration deadline",
  startDate: "Start date",
  endDate: "End date",
  deadline: "Deadline",
  closingDate: "Closing date",
}

/**
 * Precedence used to pick the governing date for opportunities and jobs. Mirrors
 * `DEADLINE_PRECEDENCE` in the backend's contentExpiry.
 */
const DEADLINE_PRECEDENCE: Record<string, readonly string[]> = {
  opportunity: ["applicationDeadline", "deadline", "closingDate", "endDate", "registrationDeadline", "startDate"],
  job: ["applicationDeadline", "deadline", "closingDate", "endDate", "startDate"],
}

/**
 * Strings that appear in scraped date fields and are not dates. `new Date("")` and
 * `new Date(0)` are both valid Dates, so these have to be rejected by name.
 */
const NON_DATE_SENTINELS = new Set([
  "", "n/a", "na", "tbd", "tba", "none", "null", "undefined",
  "rolling", "ongoing", "open", "varies", "flexible", "continuous",
])

/** Africa/Lagos is UTC+1 year-round, so a fixed offset is exact. */
const TZ_OFFSET_MINUTES = 60

export function labelFor(field: string): string {
  return DATE_FIELD_LABELS[field] ?? field
}

export function primaryDateField(type: RestorableType): string {
  return EDITABLE_DATE_FIELDS[type]?.[0] ?? "applicationDeadline"
}

/** Parse a stored date value, or null when it does not represent one. */
export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null
    const fromEpoch = new Date(value)
    return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (NON_DATE_SENTINELS.has(trimmed.toLowerCase())) return null
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

/** The UTC instant at which a date's calendar day ends in Africa/Lagos. */
export function endOfLocalDay(date: Date): Date {
  const local = new Date(date.getTime() + TZ_OFFSET_MINUTES * 60000)
  local.setUTCHours(23, 59, 59, 999)
  return new Date(local.getTime() - TZ_OFFSET_MINUTES * 60000)
}

/**
 * The date a post expires on, and the field that decided it.
 *
 * Events run until the later of start and end; only an event with neither falls back to
 * registrationDeadline. Opportunities and jobs take the first field present in their
 * precedence list, which is why changing `startDate` on an opportunity that has an
 * `applicationDeadline` changes nothing about when it expires.
 */
export function resolveExpiry(
  doc: Record<string, unknown> | null | undefined,
  type: RestorableType,
): { date: Date | null; field: string | null } {
  const none = { date: null, field: null }
  if (!doc || typeof doc !== "object") return none

  const nested = (doc.dates && typeof doc.dates === "object" ? doc.dates : {}) as Record<string, unknown>
  const read = (field: string) =>
    parseDate(nested[field] !== undefined ? nested[field] : (doc as Record<string, unknown>)[field])

  if (type === "event") {
    const start = read("startDate")
    const end = read("endDate")
    if (start && end) {
      return end.getTime() >= start.getTime()
        ? { date: end, field: "endDate" }
        : { date: start, field: "startDate" }
    }
    if (end) return { date: end, field: "endDate" }
    if (start) return { date: start, field: "startDate" }
    const registration = read("registrationDeadline")
    if (registration) return { date: registration, field: "registrationDeadline" }
    const deadline = read("deadline")
    return deadline ? { date: deadline, field: "deadline" } : none
  }

  for (const field of DEADLINE_PRECEDENCE[type] ?? []) {
    const parsed = read(field)
    if (parsed) return { date: parsed, field }
  }
  return none
}

/**
 * Dates already on an archived post, keyed by editable field, as ISO strings or null.
 */
export function readCurrentDates(
  doc: Record<string, unknown> | null | undefined,
  type: RestorableType,
): Record<string, string | null> {
  const source = (doc && typeof doc === "object" ? doc : {}) as Record<string, unknown>
  const nested = (source.dates && typeof source.dates === "object" ? source.dates : {}) as Record<string, unknown>
  const out: Record<string, string | null> = {}
  for (const field of EDITABLE_DATE_FIELDS[type] ?? []) {
    const parsed = parseDate(nested[field] !== undefined ? nested[field] : source[field])
    out[field] = parsed ? parsed.toISOString() : null
  }
  return out
}

/** Short day label for messages, matching the backend's wording. */
function formatDay(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : ""
}

/**
 * Per-field problems with a proposed set of dates, keyed by field.
 *
 * Separate from the pass/fail verdict on purpose. The verdict can only ever name one
 * field — the one that governs expiry — and that is routinely NOT the field the admin
 * just edited: the form seeds every date from the archived post, so an untouched
 * `endDate` from last August can reject a perfectly good new `applicationDeadline` and
 * report a date the admin never typed. Marking every offending field lets the form flag
 * them all in place, so "pick a future date" always points at a box the admin can see.
 */
export function collectFieldIssues(
  dates: Record<string, string | null>,
  type: RestorableType,
  now: Date,
): Record<string, string> {
  const issues: Record<string, string> = {}
  const values = dates ?? {}

  for (const field of EDITABLE_DATE_FIELDS[type] ?? []) {
    const parsed = parseDate(values[field])
    if (!parsed) continue
    if (now.getTime() > endOfLocalDay(parsed).getTime()) {
      issues[field] = `${formatDay(parsed)} has already passed.`
    }
  }

  const start = parseDate(values.startDate)
  const end = parseDate(values.endDate)
  if (start && end && end.getTime() < start.getTime()) {
    issues.endDate = `${formatDay(end)} is before the start date.`
  }

  return issues
}

/** Shared by both verdict branches, so the form can mark fields either way. */
interface RestoreDateContext {
  /** Every offered date that is in the past, or conflicts, keyed by field. */
  fieldIssues: Record<string, string>
  /** Dates that differ from the archived post. */
  changedFields: string[]
  /** The one field that decides when this expires, or null when no date is set. */
  governingField: string | null
}

export type RestoreDateVerdict =
  | (RestoreDateContext & {
      ok: true
      expiryDate: Date
      expiryField: string
      previousExpiryDate: Date | null
      liveUntil: Date
    })
  | (RestoreDateContext & {
      ok: false
      code: "INVALID_TYPE" | "INVALID_DATE" | "NO_DATE" | "DATES_UNCHANGED" | "STILL_PAST" | "END_BEFORE_START"
      message: string
      /** The field the admin has to fix, when one can be named. */
      field?: string
    })

/**
 * Merge submitted dates over the archived ones.
 *
 * An omitted key keeps the archived value; an explicit null or empty string clears the
 * field, which is how an admin turns a two-day event back into a one-day one. The
 * distinction matters for parity: the backend merges the same way, and treating an
 * omitted key as "cleared" here would make the dialog disagree with the endpoint about
 * which fields changed.
 */
export function mergeRestoreDates(
  archivedDates: Record<string, string | null>,
  submitted: Record<string, string | null> | null | undefined,
  type: RestorableType,
): { dates: Record<string, string | null>; invalidFields: string[] } {
  const input = (submitted ?? {}) as Record<string, string | null>
  const dates: Record<string, string | null> = {}
  const invalidFields: string[] = []

  for (const field of EDITABLE_DATE_FIELDS[type] ?? []) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      dates[field] = archivedDates[field] ?? null
      continue
    }
    const raw = input[field]
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      dates[field] = null
      continue
    }
    const parsed = parseDate(raw)
    if (!parsed) {
      invalidFields.push(field)
      dates[field] = archivedDates[field] ?? null
      continue
    }
    dates[field] = parsed.toISOString()
  }

  return { dates, invalidFields }
}

/**
 * Apply the restore rules to a set of proposed dates.
 *
 * @param archivedDoc the post as it sits in `past_*`
 * @param submitted   form values keyed by editable field; "" and null mean cleared, an
 *                    omitted key keeps whatever the archived post carries
 * @param type        content type
 * @param now         current time, injected so this stays pure and testable
 */
export function validateRestoreDates(
  archivedDoc: Record<string, unknown> | null | undefined,
  submitted: Record<string, string | null>,
  type: RestorableType,
  now: Date,
): RestoreDateVerdict {
  const empty: RestoreDateContext = { fieldIssues: {}, changedFields: [], governingField: null }

  if (!EDITABLE_DATE_FIELDS[type]) {
    return { ok: false, code: "INVALID_TYPE", message: `Cannot restore content of type "${type}".`, ...empty }
  }

  const fields = EDITABLE_DATE_FIELDS[type]
  const archivedDates = readCurrentDates(archivedDoc, type)
  const { dates, invalidFields } = mergeRestoreDates(archivedDates, submitted, type)

  if (invalidFields.length > 0) {
    return {
      ok: false,
      code: "INVALID_DATE",
      message: `${labelFor(invalidFields[0])} is not a valid date.`,
      field: invalidFields[0],
      ...empty,
    }
  }

  // Computed up front and returned on every path, so the form can mark every offending
  // box whichever rule ends up failing.
  const fieldIssues = collectFieldIssues(dates, type, now)
  const changedFields = fields.filter((field) => {
    const before = parseDate(archivedDates[field])
    const after = parseDate(dates[field])
    if (!before && !after) return false
    if (!before || !after) return true
    return before.getTime() !== after.getTime()
  })

  // Built from the form's dates alone, so a legacy alias on the archived document
  // cannot outrank what the admin just set — the server clears those aliases on restore.
  const { date: expiryDate, field: expiryField } = resolveExpiry({ dates }, type)
  const context: RestoreDateContext = { fieldIssues, changedFields, governingField: expiryField }

  const start = parseDate(dates.startDate)
  const end = parseDate(dates.endDate)
  if (start && end && end.getTime() < start.getTime()) {
    return {
      ok: false,
      code: "END_BEFORE_START",
      message: `End date is ${formatDay(end)}, before the start date of ${formatDay(start)}. Update it too.`,
      field: "endDate",
      ...context,
    }
  }

  if (!expiryDate || !expiryField) {
    const primary = primaryDateField(type)
    return {
      ok: false,
      code: "NO_DATE",
      message: `Set a ${labelFor(primary).toLowerCase()} — a restored post needs a date, or cleanup cannot tell when it ends.`,
      field: primary,
      ...context,
    }
  }

  const previousExpiryDate = resolveExpiry(archivedDoc ?? {}, type).date

  // The message has to name the governing field and say it is the one that counts.
  // Saying only "unchanged" sent admins back to the date they had just edited, because
  // the field they changed and the field that governs are frequently not the same one.
  if (previousExpiryDate && previousExpiryDate.getTime() === expiryDate.getTime()) {
    const alsoChanged = changedFields.filter((field) => field !== expiryField)
    const preamble = alsoChanged.length ? `${alsoChanged.map(labelFor).join(" and ")} changed, but ` : ""
    return {
      ok: false,
      code: "DATES_UNCHANGED",
      message: `${preamble}${labelFor(expiryField)} is what decides when this expires, and it is still ${formatDay(expiryDate)}. Change it to restore this post.`,
      field: expiryField,
      ...context,
    }
  }

  // Same end-of-day comparison the cleanup sweep makes, so "today" is still valid.
  if (now.getTime() > endOfLocalDay(expiryDate).getTime()) {
    return {
      ok: false,
      code: "STILL_PAST",
      message: `${labelFor(expiryField)} is what decides when this expires, and ${formatDay(expiryDate)} has already passed. Pick a future date.`,
      field: expiryField,
      ...context,
    }
  }

  return {
    ok: true,
    expiryDate,
    expiryField,
    previousExpiryDate: previousExpiryDate ?? null,
    liveUntil: endOfLocalDay(expiryDate),
    ...context,
  }
}

/** ISO string -> the `yyyy-mm-dd` a `<input type="date">` expects, or "". */
export function toDateInputValue(iso: string | null | undefined): string {
  const parsed = parseDate(iso)
  return parsed ? parsed.toISOString().slice(0, 10) : ""
}
