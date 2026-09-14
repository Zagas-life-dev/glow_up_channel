/**
 * The date filter on search: what a date range means, and the one-tap presets
 * for the question people actually bring to it — "what is about to close?"
 *
 * Two things a date can mean here, and they are not interchangeable:
 *
 *   deadline — when a listing closes. For opportunities and jobs that is the
 *              application deadline; for events it is the registration
 *              deadline, falling back to the start date and then the end date,
 *              matching how the backend both sorts and filters them. Resources
 *              never close, so they have no deadline at all.
 *   posted   — when it was added to the platform. Every type has one.
 *
 * `deadline` is the default because an expiry window is the useful question: a
 * grant that closes on Friday is worth surfacing in a way that one posted on
 * Friday is not.
 *
 * Dates are exchanged as bare `YYYY-MM-DD` in the reader's own calendar, which
 * is what `<input type="date">` speaks. The backend reads a bare date as the
 * whole of that day in UTC, so a range boundary can be off by the reader's
 * offset for something closing within hours of midnight — immaterial at
 * day-granularity, and the alternative (sending instants) would make the URL
 * unreadable and unshareable.
 */

import type { SearchFilters } from "@/lib/fetch-home-list-page"

export type DateBasis = "deadline" | "posted"

export const DEFAULT_DATE_BASIS: DateBasis = "deadline"

export type DatePreset = {
  id: string
  /** Short form, shown as a chip under its group heading. */
  chip: string
  /** Standalone form, for the active-filter summary where there is no heading. */
  label: string
  basis: DateBasis
  /**
   * Width of the window in days. A deadline window looks forward from today, a
   * posted window back from it — in both directions "7" means the week that
   * matters, just at opposite ends of a listing's life.
   */
  days: number
}

/** Closing windows, narrowest first. The headline of this filter. */
export const CLOSING_PRESETS: DatePreset[] = [
  { id: "closing-today", chip: "Today", label: "Closing today", basis: "deadline", days: 0 },
  { id: "closing-3d", chip: "3 days", label: "Closing within 3 days", basis: "deadline", days: 3 },
  { id: "closing-7d", chip: "7 days", label: "Closing within 7 days", basis: "deadline", days: 7 },
  { id: "closing-30d", chip: "30 days", label: "Closing within 30 days", basis: "deadline", days: 30 },
  { id: "closing-90d", chip: "3 months", label: "Closing within 3 months", basis: "deadline", days: 90 },
]

/** The other direction: what turned up recently. */
export const POSTED_PRESETS: DatePreset[] = [
  { id: "posted-7d", chip: "7 days", label: "Added in the last 7 days", basis: "posted", days: 7 },
  { id: "posted-30d", chip: "30 days", label: "Added in the last 30 days", basis: "posted", days: 30 },
]

export const DATE_PRESETS: DatePreset[] = [...CLOSING_PRESETS, ...POSTED_PRESETS]

export function findDatePreset(id: string): DatePreset | null {
  return DATE_PRESETS.find((preset) => preset.id === id) ?? null
}

/**
 * A calendar date in the reader's own timezone.
 *
 * Deliberately not `toISOString().slice(0, 10)`, which is the UTC day: west of
 * Greenwich that is yesterday for most of the evening, so "closing today" would
 * quietly ask for a day that has already ended.
 */
export function toLocalISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function shiftDays(from: Date, days: number): Date {
  const shifted = new Date(from)
  shifted.setDate(shifted.getDate() + days)
  return shifted
}

/** The concrete range a preset stands for, resolved against "now". */
export function resolveDatePreset(
  preset: DatePreset,
  now: Date = new Date(),
): Required<Pick<SearchFilters, "dateFrom" | "dateTo" | "dateField">> {
  const today = toLocalISODate(now)
  return preset.basis === "posted"
    ? {
        dateFrom: toLocalISODate(shiftDays(now, -preset.days)),
        dateTo: today,
        dateField: "posted",
      }
    : {
        dateFrom: today,
        dateTo: toLocalISODate(shiftDays(now, preset.days)),
        dateField: "deadline",
      }
}

/** True when any part of the date filter is set. */
export function hasDateFilter(filters: SearchFilters): boolean {
  return Boolean(filters.dateFrom || filters.dateTo)
}

/** The same filters with the date part removed. */
export function clearDateFilter(filters: SearchFilters): SearchFilters {
  const { dateFrom: _from, dateTo: _to, dateField: _field, ...rest } = filters
  return rest
}

/**
 * Which preset the current filters are, if any.
 *
 * Compares the resolved range rather than storing the preset id, so a range
 * restored from a shared URL still lights its chip — and a link shared last
 * month reads as the custom range it has become rather than as a live "closing
 * within 7 days" that no longer means what it said.
 */
export function activeDatePresetId(
  filters: SearchFilters,
  now: Date = new Date(),
): string | null {
  if (!hasDateFilter(filters)) return null
  const basis = filters.dateField ?? DEFAULT_DATE_BASIS

  for (const preset of DATE_PRESETS) {
    if (preset.basis !== basis) continue
    const range = resolveDatePreset(preset, now)
    if (range.dateFrom === filters.dateFrom && range.dateTo === filters.dateTo) {
      return preset.id
    }
  }
  return null
}

/**
 * Toggle a preset. Picking the one already active clears it, so the same tap
 * that turned a window on turns it off.
 */
export function toggleDatePreset(
  filters: SearchFilters,
  presetId: string,
  now: Date = new Date(),
): SearchFilters {
  if (activeDatePresetId(filters, now) === presetId) return clearDateFilter(filters)

  const preset = findDatePreset(presetId)
  if (!preset) return filters

  return { ...filters, ...resolveDatePreset(preset, now) }
}

/** Switch what the range is measured against, keeping the dates. */
export function setDateBasis(filters: SearchFilters, basis: DateBasis): SearchFilters {
  return { ...filters, dateField: basis }
}

function formatDay(value: string): string {
  // Parsed as UTC noon so the label cannot slip a day either way when rendered
  // in the reader's timezone.
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

/** One line naming the current date filter, for the active-filter summary. */
export function describeDateFilter(
  filters: SearchFilters,
  now: Date = new Date(),
): string | null {
  if (!hasDateFilter(filters)) return null

  const presetId = activeDatePresetId(filters, now)
  if (presetId) return findDatePreset(presetId)?.label ?? null

  const verb = (filters.dateField ?? DEFAULT_DATE_BASIS) === "posted" ? "Added" : "Closing"
  if (filters.dateFrom && filters.dateTo) {
    return `${verb} ${formatDay(filters.dateFrom)} – ${formatDay(filters.dateTo)}`
  }
  if (filters.dateFrom) return `${verb} on or after ${formatDay(filters.dateFrom)}`
  return `${verb} on or before ${formatDay(filters.dateTo as string)}`
}

/**
 * True when this content type cannot satisfy the current date filter.
 *
 * Only resources, and only on the deadline basis — they have no closing date,
 * so a closing window excludes every one of them. Worth knowing before the
 * request goes out: the search page skips the call, and the empty state can say
 * why rather than shrugging.
 */
export function dateFilterExcludesResources(filters: SearchFilters): boolean {
  return hasDateFilter(filters) && (filters.dateField ?? DEFAULT_DATE_BASIS) === "deadline"
}
