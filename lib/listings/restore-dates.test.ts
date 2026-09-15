/**
 * The restore dialog and the restore endpoint must refuse the same dates.
 *
 * `lib/listings/restore-dates.ts` is a hand-written mirror of the backend's
 * `src/utils/restoreDates.js`. The server is the authority — it re-runs every rule
 * before it writes — so drift cannot corrupt data, but it can produce the worst kind of
 * admin form: one whose Restore button is enabled for dates the server then rejects, or
 * disabled for dates it would have accepted.
 *
 * So rather than assert the mirror against a copy of the rules, this runs both
 * implementations over the same cases and asserts they agree on the verdict.
 */

import { describe, expect, it } from "vitest"

import {
  EDITABLE_DATE_FIELDS,
  primaryDateField,
  readCurrentDates,
  resolveExpiry,
  toDateInputValue,
  validateRestoreDates,
  type RestorableType,
} from "@/lib/listings/restore-dates"

// The authority. Imported directly so the twin cannot drift unnoticed.
import backend from "../../latest-glowup-channel/src/utils/restoreDates.js"

const NOW = new Date("2026-09-15T10:00:00.000Z")

/** What the backend's untyped CJS util hands back, narrowed enough to compare against. */
type BackendVerdict = {
  ok: boolean
  code?: string
  expiryDate?: Date
  expiryField?: string
  changedFields?: string[]
  fieldIssues?: Record<string, string>
  governingField?: string | null
}

/** Run the backend rules the way its service does: read, merge, validate. */
function backendVerdict(
  doc: Record<string, unknown>,
  type: RestorableType,
  submitted: Record<string, string | null>,
): BackendVerdict {
  const archived = backend.readCurrentDates(doc, type)
  const { dates, invalidFields } = backend.mergeRestoreDates(archived, submitted, type)
  return backend.validateRestoreDates({ archivedDoc: doc, nextDates: dates, type, now: NOW, invalidFields })
}

/** Cases both sides are asked to judge. */
const CASES: Array<{
  name: string
  type: RestorableType
  doc: Record<string, unknown>
  submitted: Record<string, string | null>
}> = [
  {
    name: "expired opportunity, dates untouched",
    type: "opportunity",
    doc: { dates: { applicationDeadline: "2026-08-01" } },
    submitted: { applicationDeadline: "2026-08-01" },
  },
  {
    name: "expired opportunity, new future deadline",
    type: "opportunity",
    doc: { dates: { applicationDeadline: "2026-08-01" } },
    submitted: { applicationDeadline: "2026-12-01" },
  },
  {
    name: "expired opportunity, new deadline still in the past",
    type: "opportunity",
    doc: { dates: { applicationDeadline: "2026-08-01" } },
    submitted: { applicationDeadline: "2026-09-01" },
  },
  {
    name: "expired opportunity, deadline set to today",
    type: "opportunity",
    doc: { dates: { applicationDeadline: "2026-08-01" } },
    submitted: { applicationDeadline: "2026-09-15" },
  },
  {
    name: "expired opportunity, deadline cleared",
    type: "opportunity",
    doc: { dates: { applicationDeadline: "2026-08-01" } },
    submitted: { applicationDeadline: null },
  },
  {
    name: "opportunity where only the ignored startDate moved",
    type: "opportunity",
    doc: { dates: { applicationDeadline: "2026-08-01", startDate: "2026-07-01" } },
    submitted: { applicationDeadline: "2026-08-01", startDate: "2026-12-20" },
  },
  {
    name: "opportunity carrying a legacy `deadline` alias",
    type: "opportunity",
    doc: { dates: { deadline: "2026-08-01", startDate: "2026-07-01" } },
    submitted: { applicationDeadline: "2026-12-01" },
  },
  {
    name: "manually moved opportunity with a still-future deadline, resubmitted",
    type: "opportunity",
    doc: { pastStatus: "moved", dates: { applicationDeadline: "2026-12-01" } },
    submitted: { applicationDeadline: "2026-12-01" },
  },
  {
    name: "event re-dated into the future",
    type: "event",
    doc: { dates: { startDate: "2026-08-01", endDate: "2026-08-03" } },
    submitted: { startDate: "2026-12-01", endDate: "2026-12-03" },
  },
  {
    name: "event whose end precedes its start",
    type: "event",
    doc: { dates: { startDate: "2026-08-01", endDate: "2026-08-03" } },
    submitted: { startDate: "2026-12-05", endDate: "2026-12-01" },
  },
  {
    name: "event restored on registrationDeadline alone",
    type: "event",
    doc: { dates: { registrationDeadline: "2026-08-01" } },
    submitted: { registrationDeadline: "2026-12-01" },
  },
  {
    name: "event with its endDate cleared to a single day",
    type: "event",
    doc: { dates: { startDate: "2026-08-01", endDate: "2026-08-03" } },
    submitted: { startDate: "2026-12-01", endDate: null },
  },
  {
    name: "job with a root-level legacy date",
    type: "job",
    doc: { applicationDeadline: "2026-08-01" },
    submitted: { applicationDeadline: "2026-11-30" },
  },
  {
    name: "job whose archived deadline is scraped placeholder text",
    type: "job",
    doc: { dates: { applicationDeadline: "Rolling" } },
    submitted: { applicationDeadline: "2026-12-01" },
  },
  {
    name: "unparseable submitted date",
    type: "opportunity",
    doc: { dates: { applicationDeadline: "2026-08-01" } },
    submitted: { applicationDeadline: "next tuesday-ish" },
  },
]

describe("restore date rules agree with the backend", () => {
  for (const testCase of CASES) {
    it(testCase.name, () => {
      const mine = validateRestoreDates(testCase.doc, testCase.submitted, testCase.type, NOW)
      const theirs = backendVerdict(testCase.doc, testCase.type, testCase.submitted)

      expect(mine.ok).toBe(theirs.ok)

      // The per-field diagnostics are what the dialog marks boxes with, so they have to
      // agree on every path — including the failing ones, where they matter most.
      if (theirs.code !== "INVALID_TYPE" && theirs.code !== "INVALID_DATE") {
        expect(mine.fieldIssues).toEqual(theirs.fieldIssues)
        expect(mine.governingField).toBe(theirs.governingField ?? null)
        expect(mine.changedFields).toEqual(theirs.changedFields)
      }

      if (!mine.ok || !theirs.ok) {
        expect(mine.ok ? undefined : mine.code).toBe(theirs.code)
        return
      }
      expect(mine.expiryField).toBe(theirs.expiryField)
      expect(mine.expiryDate.toISOString()).toBe(theirs.expiryDate?.toISOString())
    })
  }

  it("offers the same editable fields per type", () => {
    for (const type of ["opportunity", "event", "job"] as const) {
      expect(EDITABLE_DATE_FIELDS[type]).toEqual(backend.EDITABLE_DATE_FIELDS[type])
      expect(primaryDateField(type)).toBe(backend.primaryDateField(type))
    }
  })

  it("reads the same archived dates off a document", () => {
    const doc = { dates: { applicationDeadline: "2026-08-01", startDate: "2026-07-01" } }
    expect(readCurrentDates(doc, "opportunity")).toEqual(backend.readCurrentDates(doc, "opportunity"))
  })
})

describe("the forced date change", () => {
  it("blocks a restore that keeps the archived deadline", () => {
    const doc = { dates: { applicationDeadline: "2026-08-01" } }
    const verdict = validateRestoreDates(doc, { applicationDeadline: "2026-08-01" }, "opportunity", NOW)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.code).toBe("DATES_UNCHANGED")
  })

  it("blocks a restore whose new deadline is still behind us", () => {
    const doc = { dates: { applicationDeadline: "2026-08-01" } }
    const verdict = validateRestoreDates(doc, { applicationDeadline: "2026-09-14" }, "opportunity", NOW)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.code).toBe("STILL_PAST")
  })

  it("names the field to fix, so the dialog can mark it", () => {
    const doc = { dates: { startDate: "2026-08-01", endDate: "2026-08-03" } }
    const verdict = validateRestoreDates(doc, { startDate: "2026-12-05", endDate: "2026-12-01" }, "event", NOW)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.field).toBe("endDate")
  })

  it("flags a stale date the admin never touched, not just the one rule that failed", () => {
    // This is the reported bug: the form seeds every date from the archive, so setting a
    // good new deadline still got rejected over an `endDate` from last August that the
    // admin could see no error against. Every offending box has to be markable.
    const doc = { dates: { applicationDeadline: "2026-08-01", endDate: "2026-08-05" } }
    const verdict = validateRestoreDates(
      doc,
      { applicationDeadline: "2026-12-01", endDate: "2026-08-05" },
      "opportunity",
      NOW,
    )
    expect(verdict.ok).toBe(true)
    expect(verdict.fieldIssues).toEqual({ endDate: "2026-08-05 has already passed." })
    expect(verdict.governingField).toBe("applicationDeadline")
  })

  it("says which date governs when the admin changed a different one", () => {
    const doc = { dates: { applicationDeadline: "2026-08-01", startDate: "2026-07-01" } }
    const verdict = validateRestoreDates(
      doc,
      { applicationDeadline: "2026-08-01", startDate: "2026-12-20" },
      "opportunity",
      NOW,
    )
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.code).toBe("DATES_UNCHANGED")
      expect(verdict.message).toContain("Start date changed")
      expect(verdict.message).toContain("Application deadline is what decides")
      expect(verdict.field).toBe("applicationDeadline")
    }
  })

  it("points END_BEFORE_START at the end date with both values", () => {
    const doc = { dates: { startDate: "2026-08-01", endDate: "2026-08-05" } }
    const verdict = validateRestoreDates(
      doc,
      { startDate: "2026-12-01", endDate: "2026-08-05" },
      "event",
      NOW,
    )
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) {
      expect(verdict.code).toBe("END_BEFORE_START")
      expect(verdict.field).toBe("endDate")
      expect(verdict.fieldIssues.endDate).toBeTruthy()
    }
  })

  it("reports how long a valid restore keeps the post alive", () => {
    const doc = { dates: { applicationDeadline: "2026-08-01" } }
    const verdict = validateRestoreDates(doc, { applicationDeadline: "2026-12-01" }, "opportunity", NOW)
    expect(verdict.ok).toBe(true)
    // End of 1 Dec in Africa/Lagos is 22:59:59.999Z.
    if (verdict.ok) expect(verdict.liveUntil.toISOString()).toBe("2026-12-01T22:59:59.999Z")
  })
})

describe("form helpers", () => {
  it("turns an archived ISO date into a date-input value", () => {
    expect(toDateInputValue("2026-08-01T00:00:00.000Z")).toBe("2026-08-01")
    expect(toDateInputValue(null)).toBe("")
    expect(toDateInputValue("Rolling")).toBe("")
  })

  it("resolves the governing field the same way for each type", () => {
    expect(resolveExpiry({ dates: { applicationDeadline: "2026-12-01" } }, "opportunity").field).toBe("applicationDeadline")
    expect(resolveExpiry({ dates: { startDate: "2026-12-01", endDate: "2026-12-03" } }, "event").field).toBe("endDate")
  })
})
