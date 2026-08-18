"use client"

import * as React from "react"
import { ChevronDown, SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSearchFacets } from "@/hooks/use-search-facets"
import type { SearchFilters } from "@/lib/search-list-fetch"
import type { SearchTab } from "@/lib/search-list-fetch"
import { cn } from "@/lib/utils"

/** Which type list to offer for a given content type, and what to call it. */
const TYPE_FACET: Record<string, { key: string; label: string }> = {
  opportunity: { key: "opportunity", label: "Opportunity type" },
  event: { key: "event", label: "Event type" },
  job: { key: "job", label: "Job type" },
  resource: { key: "resource", label: "Category" },
}

/** What the date range means, spelled out so nobody has to guess. */
const DATE_HINT: Record<string, string> = {
  all: "Events by when they start, opportunities and jobs by their deadline",
  opportunity: "By application deadline",
  event: "By when the event starts",
  job: "By application deadline",
  resource: "By when it was posted",
}

/** Tabs on the public search page are plural; content types are singular. */
const TAB_TO_CONTENT_TYPE: Record<SearchTab, string> = {
  all: "all",
  opportunities: "opportunity",
  events: "event",
  jobs: "job",
  resources: "resource",
}

export function contentTypeForTab(tab: SearchTab): string {
  return TAB_TO_CONTENT_TYPE[tab]
}

export function countActiveFilters(filters: SearchFilters): number {
  return Object.values(filters).filter((value) =>
    typeof value === "string" ? value.trim().length > 0 : value !== undefined,
  ).length
}

function Select({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string
  label: string
  value: string | undefined
  options: string[]
  placeholder: string
  onChange: (value: string | undefined) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <select
          id={id}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || undefined)}
          disabled={options.length === 0}
          className="h-10 w-full appearance-none rounded-xl border border-border/70 bg-background px-3 pr-8 text-sm disabled:opacity-50"
        >
          <option value="">{options.length === 0 ? "None yet" : placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
    </div>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | undefined
  onChange: (value: boolean | undefined) => void
}) {
  // Three states: off, yes, no. Clicking cycles through them.
  const next = value === undefined ? true : value ? false : undefined
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className={cn(
        "rounded-xl border px-3 py-2 text-sm transition-colors",
        value === undefined
          ? "border-border/70 text-muted-foreground hover:text-foreground"
          : "border-primary bg-primary/10 font-medium text-foreground",
      )}
    >
      {label}
      {value !== undefined && (
        <span className="ml-1.5 text-primary">{value ? "yes" : "no"}</span>
      )}
    </button>
  )
}

export default function SearchFiltersPanel({
  contentType,
  filters,
  onChange,
  scope = "public",
}: {
  /** "all", or one of opportunity | event | job | resource. */
  contentType: string
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  /** Admin scope also offers values found in unpublished content. */
  scope?: "public" | "admin"
}) {
  const [open, setOpen] = React.useState(false)
  const { facets } = useSearchFacets(scope)

  const active = countActiveFilters(filters)
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch })

  const typeFacet = contentType === "all" ? null : (TYPE_FACET[contentType] ?? null)
  const typeOptions = typeFacet ? (facets.types[typeFacet.key] ?? []) : []
  const hasLocation = contentType !== "resource"

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={open ? "default" : "outline"}
          size="sm"
          onClick={() => setOpen((current) => !current)}
          className="rounded-xl"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden />
          Filters
          {active > 0 && (
            <span className="ml-2 rounded-full bg-primary/20 px-1.5 text-xs font-medium">
              {active}
            </span>
          )}
        </Button>

        {active > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-muted-foreground"
            onClick={() => onChange({})}
          >
            <X className="mr-1.5 h-4 w-4" aria-hidden />
            Clear all
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4">
          {hasLocation && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                id="filter-country"
                label="Country"
                value={filters.country}
                options={facets.countries}
                placeholder="Any country"
                onChange={(country) => set({ country })}
              />
              <Select
                id="filter-city"
                label="City or state"
                value={filters.city}
                options={facets.cities}
                placeholder="Anywhere"
                onChange={(city) => set({ city })}
              />
            </div>
          )}

          {typeFacet && (
            <Select
              id="filter-type"
              label={typeFacet.label}
              value={filters.type}
              options={typeOptions}
              placeholder="Any type"
              onChange={(type) => set({ type })}
            />
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Date range</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                aria-label="From"
                value={filters.dateFrom ?? ""}
                onChange={(event) => set({ dateFrom: event.target.value || undefined })}
                className="rounded-xl"
              />
              <Input
                type="date"
                aria-label="To"
                value={filters.dateTo ?? ""}
                onChange={(event) => set({ dateTo: event.target.value || undefined })}
                className="rounded-xl"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {DATE_HINT[contentType] ?? DATE_HINT.all}
            </p>
          </div>

          {hasLocation && (
            <div className="flex flex-wrap gap-2">
              <Toggle
                label="Remote"
                value={filters.isRemote}
                onChange={(isRemote) => set({ isRemote })}
              />
              <Toggle label="Paid" value={filters.isPaid} onChange={(isPaid) => set({ isPaid })} />
            </div>
          )}

          {!hasLocation ? (
            <p className="text-xs text-muted-foreground">
              Resources have no location, so place filters do not apply here.
            </p>
          ) : contentType === "all" &&
            (filters.country || filters.city || filters.isRemote !== undefined) ? (
            <p className="text-xs text-muted-foreground">
              Place filters do not narrow resources — they have no location.
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
