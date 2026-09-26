"use client"

/**
 * Admin tagging: the AI queue, listings missing a location, and a per-listing
 * editor.
 *
 * This is the only screen that shows which tags an AI chose — the "AI" badge
 * on a tag. Users and providers only ever see the tags. Saving here marks every
 * tag as admin-chosen, which the rules and the AI then never overwrite.
 */

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { RiCheckLine, RiComputerLine, RiErrorWarningLine, RiMapPinLine, RiRobot2Line, RiTimeLine } from "react-icons/ri"
import { toast } from "sonner"

import { AdminShell } from "@/components/admin/admin-shell"
import { AdminEmpty, AdminSection, AdminSkeletonRows, AdminStat, AdminStatGrid } from "@/components/admin/ui"
import { SegmentedTabs } from "@/components/provider/provider-ui"
import { TagPicker } from "@/components/tags/tag-picker"
import {
  EMPTY_LISTING_LOCATION,
  ListingLocationFields,
  isListingLocationComplete,
  type ListingLocationValue,
} from "@/components/posting/ListingLocationFields"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  fetchListingTags,
  fetchLocationMissing,
  fetchTaggingQueue,
  fetchTaggingStats,
  retagWithAi,
  runTaggingQueue,
  saveListingLocation,
  saveListingTags,
  type ListingKind,
  type ListingTags,
  type LocationMissingRow,
  type QueueRow,
  type TagSource,
  type TaggingStatus,
} from "@/lib/admin/tagging"

type Tab = "needs_ai" | "ai_failed" | "ai_gave_up" | "location"

const TABS: { id: Tab; label: string }[] = [
  { id: "needs_ai", label: "Waiting for AI" },
  { id: "ai_failed", label: "AI failed" },
  { id: "ai_gave_up", label: "AI gave up" },
  { id: "location", label: "Location missing" },
]

const SOURCE_LABEL: Record<TagSource, string> = {
  admin: "Admin",
  provider: "Provider",
  ai: "AI",
  rule: "Rules",
  migration: "Cleanup",
  unknown: "—",
}

function SourceBadge({ source }: { source: TagSource }) {
  return (
    <span
      className={
        source === "ai"
          ? "rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-300"
          : "rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
      }
    >
      {SOURCE_LABEL[source]}
    </span>
  )
}

function ListingEditor({
  target,
  onClose,
  onSaved,
}: {
  target: { kind: ListingKind; id: string; title: string } | null
  onClose: () => void
  onSaved: () => void
}) {
  const [details, setDetails] = useState<ListingTags | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!target) return
    setDetails(null)
    try {
      const result = await fetchListingTags(target.kind, target.id)
      setDetails(result)
      setSelected(result.canonicalTags.map((tag) => tag.id))
    } catch (error: any) {
      toast.error(error?.message || "Failed to load tags")
    }
  }, [target])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!target) return
    setBusy(true)
    try {
      await saveListingTags(target.kind, target.id, selected)
      toast.success("Tags saved")
      onSaved()
      await load()
    } catch (error: any) {
      toast.error(error?.message || "Failed to save tags")
    } finally {
      setBusy(false)
    }
  }

  const rerun = async () => {
    if (!target) return
    setBusy(true)
    try {
      const result = await retagWithAi(target.kind, target.id)
      if (result.status === "ok") toast.success("AI retagged the listing")
      else toast.error(result.error || "Both AI providers failed")
      onSaved()
      await load()
    } catch (error: any) {
      toast.error(error?.message || "AI retagging failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-6">{target?.title}</SheetTitle>
          <SheetDescription>
            {details
              ? `Status: ${details.status}${details.aiProvider ? ` · last AI: ${details.aiProvider}` : ""}${details.attempts ? ` · ${details.attempts} AI attempts` : ""}`
              : "Loading…"}
          </SheetDescription>
        </SheetHeader>

        {details ? (
          <div className="mt-4 space-y-5">
            {details.lastError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {details.lastError}
              </p>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Current tags and who chose them</p>
              <div className="flex flex-wrap gap-1.5">
                {details.canonicalTags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">None</span>
                ) : (
                  details.canonicalTags.map((tag) => (
                    <span key={tag.id} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
                      {tag.label}
                      <SourceBadge source={tag.source} />
                    </span>
                  ))
                )}
              </div>
              {details.rawTags.length ? (
                <p className="text-xs text-muted-foreground">Original tags: {details.rawTags.join(", ")}</p>
              ) : null}
            </div>

            <TagPicker kind={target!.kind} value={selected} onChange={setSelected} />

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={busy} className="rounded-xl">
                Save as admin
              </Button>
              <Button variant="outline" onClick={rerun} disabled={busy} className="rounded-xl">
                <RiRobot2Line className="mr-1.5 h-4 w-4" aria-hidden />
                Re-run AI
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Saving marks every tag as admin-chosen; the rules and the AI will not change them afterwards.
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function LocationFixer({
  target,
  onClose,
  onSaved,
}: {
  target: LocationMissingRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [place, setPlace] = useState<ListingLocationValue>(EMPTY_LISTING_LOCATION)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPlace(EMPTY_LISTING_LOCATION)
  }, [target])

  const save = async () => {
    if (!target) return
    setBusy(true)
    try {
      await saveListingLocation(target.contentType, target._id, {
        country: place.country?.name,
        countryCode: place.country?.code,
        province: place.province.trim() || undefined,
        city: place.city.trim() || undefined,
        isRemote: place.isRemote,
        remoteCountries: place.remoteCountries,
      })
      toast.success("Location saved")
      onSaved()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || "Failed to save the location")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-6">{target?.title}</SheetTitle>
          <SheetDescription>Where is this listing? The AI never sets a location — only an admin can.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <ListingLocationFields value={place} onChange={setPlace} />
          <Button onClick={save} disabled={busy || !isListingLocationComplete(place)} className="rounded-xl">
            Save location
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function AdminTaggingPage() {
  const [tab, setTab] = useState<Tab>("needs_ai")
  const [stats, setStats] = useState<Partial<Record<TaggingStatus, number>>>({})
  const [rows, setRows] = useState<QueueRow[]>([])
  const [missing, setMissing] = useState<LocationMissingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [editing, setEditing] = useState<{ kind: ListingKind; id: string; title: string } | null>(null)
  const [fixing, setFixing] = useState<LocationMissingRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextStats, nextRows] = await Promise.all([
        fetchTaggingStats(),
        tab === "location" ? Promise.resolve<QueueRow[]>([]) : fetchTaggingQueue(tab),
      ])
      setStats(nextStats)
      setRows(nextRows)
      if (tab === "location") setMissing(await fetchLocationMissing())
    } catch (error: any) {
      toast.error(error?.message || "Failed to load tagging data")
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const runNow = async () => {
    setRunning(true)
    try {
      const result = await runTaggingQueue(20)
      toast.success(`AI tagged ${result.ok} of ${result.processed}; ${result.failed} failed`)
      await load()
    } catch (error: any) {
      toast.error(error?.message || "Failed to run the queue")
    } finally {
      setRunning(false)
    }
  }

  return (
    <AdminShell
      title="Tagging"
      description="The AI queue, listings without a location, and every listing's tags with who chose them."
      onRefresh={load}
      refreshing={loading}
      width="wide"
      actions={
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link href="/dashboard/admin/tagging/local">
            <RiComputerLine className="mr-1.5 h-4 w-4" aria-hidden />
            Local tagger
          </Link>
        </Button>
      }
    >
      <div className="space-y-5">
        <AdminStatGrid>
          <AdminStat label="Tagged" value={(stats.ok ?? 0).toLocaleString()} icon={RiCheckLine} />
          <AdminStat label="Waiting for AI" value={(stats.needs_ai ?? 0).toLocaleString()} icon={RiTimeLine} />
          <AdminStat
            label="AI failed"
            value={((stats.ai_failed ?? 0) + (stats.ai_gave_up ?? 0)).toLocaleString()}
            icon={RiErrorWarningLine}
            hint="Retried by the weekly local run"
          />
          <AdminStat label="Location missing" value={tab === "location" ? missing.length.toLocaleString() : "—"} icon={RiMapPinLine} />
        </AdminStatGrid>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedTabs items={TABS} value={tab} onChange={setTab} />
          <Button onClick={runNow} disabled={running} variant="outline" className="rounded-xl">
            <RiRobot2Line className="mr-1.5 h-4 w-4" aria-hidden />
            {running ? "Running…" : "Run AI on 20 now"}
          </Button>
        </div>

        <AdminSection>
          {loading ? (
            <AdminSkeletonRows />
          ) : tab === "location" ? (
            missing.length === 0 ? (
              <AdminEmpty title="Every listing has a location" />
            ) : (
              <ul className="divide-y divide-border">
                {missing.map((row) => (
                  <li key={row._id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.contentType} · stored: {[row.location?.city, row.location?.province, row.location?.country].filter(Boolean).join(", ") || "nothing"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-xl"
                      onClick={() => setFixing(row)}
                    >
                      Set location
                    </Button>
                  </li>
                ))}
              </ul>
            )
          ) : rows.length === 0 ? (
            <AdminEmpty title="Nothing here" description="Listings appear here when the rules leave them with three tags or fewer." />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={`${row.contentType}-${row.contentId}`} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.contentType} · {row.tagCount} tags
                      {row.missing.length ? ` · missing ${row.missing.join(", ")}` : ""}
                      {row.attempts ? ` · ${row.attempts} attempts` : ""}
                    </p>
                    {row.lastError ? <p className="truncate text-xs text-destructive">{row.lastError}</p> : null}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-xl"
                    onClick={() => setEditing({ kind: row.contentType, id: row.contentId, title: row.title })}
                  >
                    Review
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>

      <ListingEditor target={editing} onClose={() => setEditing(null)} onSaved={load} />
      <LocationFixer target={fixing} onClose={() => setFixing(null)} onSaved={load} />
    </AdminShell>
  )
}
