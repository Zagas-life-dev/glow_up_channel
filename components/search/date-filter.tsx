"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SearchFilters } from "@/lib/fetch-home-list-page"
import {
  DEFAULT_DATE_BASIS,
  POSTED_PRESETS,
  activeDatePresetId,
  clearDateFilter,
  hasDateFilter,
  setDateBasis,
  toggleDatePreset,
  type DateBasis,
  type DatePreset,
} from "@/lib/search-date-filters"
import { cn } from "@/lib/utils"

/**
 * What a date range measures, spelled out per content type so nobody has to
 * guess which of a listing's three or four dates is being compared.
 */
const DEADLINE_HINT: Record<string, string> = {
  all: "Opportunities and jobs by their application deadline, events by registration — or by when they start, if registration has no deadline of its own.",
  opportunity: "By application deadline.",
  event: "By registration deadline, or by when the event starts if there is none.",
  job: "By application deadline.",
  resource:
    "Resources never close, so a closing window leaves them all out. Measure by date added to narrow these.",
}

const POSTED_HINT = "By when it was added to the platform."

export function dateFilterHint(contentType: string, basis: DateBasis): string {
  if (basis === "posted") return POSTED_HINT
  return DEADLINE_HINT[contentType] ?? DEADLINE_HINT.all
}

function Chip({
  preset,
  active,
  onSelect,
}: {
  preset: DatePreset
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={preset.label}
      title={preset.label}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[13px] font-semibold transition-colors",
        active
          ? "border-up-solid bg-up-solid text-up-on-solid"
          : "border-border bg-card text-muted-foreground hover:border-up-border-hover hover:text-foreground",
      )}
    >
      {preset.chip}
    </button>
  )
}

/**
 * One row of one-tap date windows.
 *
 * The closing windows sit in the open next to the type tabs rather than behind
 * the filter button: "what closes this week" is the question most people bring
 * to a listings search, and a filter you have to go looking for does not get
 * asked.
 */
export function DatePresetChips({
  presets,
  heading,
  filters,
  onChange,
  className,
}: {
  presets: DatePreset[]
  /** Names what the chips measure — "3 days" means nothing on its own. */
  heading: string
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  className?: string
}) {
  const headingId = React.useId()
  const activeId = activeDatePresetId(filters)

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className={cn("flex min-w-0 items-center gap-2", className)}
    >
      <span
        id={headingId}
        className="shrink-0 text-xs font-bold text-muted-foreground"
      >
        {heading}
      </span>
      <div className="scrollbar-hide flex gap-1.5 overflow-x-auto py-0.5">
        {presets.map((preset) => (
          <Chip
            key={preset.id}
            preset={preset}
            active={activeId === preset.id}
            onSelect={() => onChange(toggleDatePreset(filters, preset.id))}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * The precise version: what the range measures, and its two ends. Lives inside
 * the filter panel, for the ranges no chip covers — a conference season, a
 * deadline in a named month.
 */
export function DateRangeFields({
  contentType,
  filters,
  onChange,
}: {
  /** "all", or one of opportunity | event | job | resource. */
  contentType: string
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
}) {
  const basis: DateBasis = filters.dateField ?? DEFAULT_DATE_BASIS
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch })

  return (
    <div className="space-y-3">
      <DatePresetChips
        presets={POSTED_PRESETS}
        heading="Added in last"
        filters={filters}
        onChange={onChange}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="filter-date-basis" className="text-[13px] font-bold text-foreground">
            Dates measure
          </Label>
          <div className="relative">
            <select
              id="filter-date-basis"
              value={basis}
              onChange={(event) =>
                onChange(setDateBasis(filters, event.target.value as DateBasis))
              }
              className="h-11 w-full appearance-none rounded-up-md border-[1.5px] border-border bg-card px-4 pr-8 text-sm"
            >
              <option value="deadline">Closing date</option>
              <option value="posted">Date added</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-date-from" className="text-[13px] font-bold text-foreground">
            From
          </Label>
          <Input
            id="filter-date-from"
            type="date"
            value={filters.dateFrom ?? ""}
            max={filters.dateTo || undefined}
            onChange={(event) => set({ dateFrom: event.target.value || undefined })}
           
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-date-to" className="text-[13px] font-bold text-foreground">
            To
          </Label>
          <Input
            id="filter-date-to"
            type="date"
            value={filters.dateTo ?? ""}
            min={filters.dateFrom || undefined}
            onChange={(event) => set({ dateTo: event.target.value || undefined })}
           
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {dateFilterHint(contentType, basis)}
        </p>
        {hasDateFilter(filters) ? (
          <button
            type="button"
            onClick={() => onChange(clearDateFilter(filters))}
            className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear dates
          </button>
        ) : null}
      </div>
    </div>
  )
}
