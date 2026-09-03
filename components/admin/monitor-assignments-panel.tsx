"use client"

/**
 * Admin: the listings one monitor watches.
 *
 * Sits on the monitor's own user page, because the question this answers is
 * "what does this account see?" — and the answer has to be in the same place an
 * admin manages the account, or the two drift apart.
 *
 * Assigning writes nothing to the listing: ownership, metrics and approval state
 * are untouched, so a listing can belong to its provider and be watched here at
 * the same time without the two ideas competing for one field.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Eye, Loader2, Plus, Search, X } from "lucide-react"
import { toast } from "sonner"
import {
  CONTENT_TYPE_LABELS,
  fetchListingAnalytics,
  listingStatusLabel,
  type ListingAnalyticsRow,
  type ListingContentType,
} from "@/lib/analytics/listing-analytics"
import {
  assignListings,
  fetchMonitorAssignments,
  unassignListing,
  type MonitoredListing,
} from "@/lib/analytics/monitor"

const TYPE_OPTIONS: { id: ListingContentType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "opportunity", label: "Opportunities" },
  { id: "job", label: "Jobs" },
  { id: "event", label: "Events" },
  { id: "resource", label: "Resources" },
]

function keyOf(row: { contentType: string; _id: string }): string {
  return `${row.contentType}:${row._id}`
}

export function MonitorAssignmentsPanel({
  monitorId,
  onChange,
}: {
  monitorId: string
  /** Fired after an assign or remove, so a parent list can refresh its counts. */
  onChange?: () => void
}) {
  const [assigned, setAssigned] = useState<MonitoredListing[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<ListingContentType | "all">("all")
  const [results, setResults] = useState<ListingAnalyticsRow[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const assignedKeys = useMemo(() => new Set(assigned.map(keyOf)), [assigned])

  const loadAssigned = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchMonitorAssignments(monitorId)
      setAssigned(result.listings)
    } catch (err: any) {
      toast.error(err?.message || "Failed to load assignments")
    } finally {
      setLoading(false)
    }
  }, [monitorId])

  useEffect(() => {
    loadAssigned()
  }, [loadAssigned])

  // Debounced so typing a listing title is one search, not one per keystroke.
  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        // Admin scope: no providerId, so this searches every listing on the
        // platform — including ones no provider owns yet.
        const result = await fetchListingAnalytics({
          search: search.trim(),
          contentType: typeFilter,
          limit: 40,
        })
        if (!cancelled) setResults(result.listings)
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || "Search failed")
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, typeFilter])

  const toggle = (row: ListingAnalyticsRow) => {
    const key = keyOf(row)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const assign = async () => {
    const items = results
      .filter((row) => selected.has(keyOf(row)))
      .map((row) => ({ contentType: row.contentType, contentId: row._id }))

    if (items.length === 0) return

    setSaving(true)
    try {
      const result = await assignListings(monitorId, items)
      const parts = [`${result.assigned} assigned`]
      if (result.alreadyAssigned) parts.push(`${result.alreadyAssigned} already there`)
      if (result.failed) parts.push(`${result.failed} failed`)
      toast.success(parts.join(" · "))

      setSelected(new Set())
      await loadAssigned()
      onChange?.()
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign listings")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: MonitoredListing) => {
    setSaving(true)
    try {
      await unassignListing(monitorId, row.contentType, row._id)
      toast.success("Assignment removed")
      // Optimistic enough to feel instant, then reconciled by the reload.
      setAssigned((prev) => prev.filter((item) => keyOf(item) !== keyOf(row)))
      await loadAssigned()
      onChange?.()
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove assignment")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          <span>Assigned listings</span>
          <Badge variant="outline" className="ml-1 tabular-nums">
            {assigned.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          This account can see these listings and their analytics, and nothing else. It cannot post,
          edit or promote anything.
        </p>

        {/* ---------------------------------------------------------- current */}
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assignments
          </div>
        ) : assigned.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Nothing assigned yet. Search below to add listings.
          </p>
        ) : (
          <ul className="space-y-2">
            {assigned.map((row) => (
              <li
                key={keyOf(row)}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {CONTENT_TYPE_LABELS[row.contentType]}
                    {row.providerName ? ` · ${row.providerName}` : ""}
                    {row.assignedAt
                      ? ` · assigned ${new Date(row.assignedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {listingStatusLabel(row)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => remove(row)}
                  aria-label={`Remove ${row.title}`}
                  className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* ------------------------------------------------------------- add */}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search listings by title or provider"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant={typeFilter === option.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(option.id)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {searching ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching
            </div>
          ) : results.length > 0 ? (
            <>
              <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {results.map((row) => {
                  const key = keyOf(row)
                  const already = assignedKeys.has(key)
                  const checked = selected.has(key)
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={already}
                        onClick={() => toggle(row)}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                          already
                            ? "cursor-not-allowed border-border bg-muted/40 opacity-60"
                            : checked
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {CONTENT_TYPE_LABELS[row.contentType]}
                            {row.providerName ? ` · ${row.providerName}` : " · unattached"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {already ? "Assigned" : checked ? "Selected" : ""}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <Button onClick={assign} disabled={saving || selected.size === 0} size="sm">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Assign {selected.size > 0 ? selected.size : ""} listing
                {selected.size === 1 ? "" : "s"}
              </Button>
            </>
          ) : search.trim() ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No listings match that.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
