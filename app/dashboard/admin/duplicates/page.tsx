"use client"

/**
 * Admin — duplicates.
 *
 * Listings of the same type in the same country that look alike: over half
 * their title or description words shared (fillers ignored), or shared tags on
 * a borderline pair. Each group is one listing and the newer ones that match it,
 * so a listing can appear in two groups. Separate from Moderation: that
 * page reviews one listing at a time, this one reviews them against each other.
 *
 * Deleting here is the moderation page's delete — the listing moves to Past
 * posts, so a wrong call can be undone there. "Not duplicates" hides a group
 * until another listing joins it.
 *
 * Country copies (one listing posted to several countries) never appear: each
 * copy sits in its own country.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { RiFileCopy2Line, RiDeleteBinLine, RiExternalLinkLine, RiCheckDoubleLine } from "react-icons/ri"
import { toast } from "sonner"
import { AdminShell } from "@/components/admin/admin-shell"
import {
  AdminCard,
  AdminEmpty,
  AdminSkeletonRows,
  AdminStat,
  AdminStatGrid,
  AdminTabs,
  AdminToolbar,
  StatusPill,
} from "@/components/admin/ui"
import { Button } from "@/components/ui/button"
import { reasonText } from "@/components/posting/DuplicateTitleWarning"
import ApiClient, { type DuplicateGroup, type ListingDuplicate, type ListingKind } from "@/lib/api-client"
import { cn } from "@/lib/utils"

type TypeFilter = "all" | ListingKind

const TYPE_LABEL: Record<ListingKind, string> = {
  opportunity: "Opportunity",
  event: "Event",
  job: "Job",
  resource: "Resource",
}

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "opportunity", label: "Opportunities" },
  { value: "event", label: "Events" },
  { value: "job", label: "Jobs" },
  { value: "resource", label: "Resources" },
]

const PUBLIC_PATH: Record<ListingKind, string> = {
  opportunity: "/opportunities",
  event: "/events",
  job: "/jobs",
  resource: "/resources",
}

function ago(date: string | null): string {
  if (!date) return "date unknown"
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? "date unknown" : formatDistanceToNow(d, { addSuffix: true })
}

function stateLabel(state: ListingDuplicate["state"]): string {
  return state === "live" ? "active" : state === "hidden" ? "inactive" : "pending"
}

export default function AdminDuplicatesPage() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await ApiClient.getDuplicateGroups()
      setGroups(result.groups)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load duplicates")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const c: Record<TypeFilter, number> = { all: groups.length, opportunity: 0, event: 0, job: 0, resource: 0 }
    for (const g of groups) c[g.type]++
    return c
  }, [groups])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return groups.filter(
      (g) =>
        (typeFilter === "all" || g.type === typeFilter) &&
        (!needle || g.items.some((item) => item.title.toLowerCase().includes(needle))),
    )
  }, [groups, typeFilter, search])

  const extraListings = groups.reduce((sum, g) => sum + g.items.length - 1, 0)
  const liveClashes = groups.filter((g) => g.liveCount >= 2).length

  /**
   * Drop deleted listings from every group they sit in; a group that lost its
   * first listing, or is left with one, is resolved and goes too.
   */
  const removeItems = (ids: Set<string>) => {
    setGroups((prev) =>
      prev
        .map((g) => {
          if (ids.has(g.items[0]._id)) return { ...g, items: [] }
          const items = g.items.filter((item) => !ids.has(item._id))
          return { ...g, items, liveCount: items.filter((item) => item.state === "live").length }
        })
        .filter((g) => g.items.length >= 2),
    )
  }

  const deleteListings = async (group: DuplicateGroup, targets: ListingDuplicate[]) => {
    if (targets.length === 0) return
    const what =
      targets.length === 1
        ? `"${targets[0].title}"`
        : `${targets.length} ${TYPE_LABEL[group.type].toLowerCase()} listings`
    if (!window.confirm(`Delete ${what}? They move to Past posts and can be restored from there.`)) return

    setBusy(group.id)
    const done = new Set<string>()
    const failed: string[] = []
    for (const item of targets) {
      try {
        await ApiClient.deleteContentByAdmin(item._id, item.type, "Duplicate listing")
        done.add(item._id)
      } catch (err: unknown) {
        failed.push(err instanceof Error ? err.message : item.title)
      }
    }
    removeItems(done)
    setBusy(null)
    if (done.size > 0) toast.success(done.size === 1 ? "Duplicate deleted" : `${done.size} duplicates deleted`)
    if (failed.length > 0) toast.error(`Couldn't delete ${failed.length}: ${failed[0]}`)
  }

  const dismiss = async (group: DuplicateGroup) => {
    setBusy(group.id)
    try {
      await ApiClient.dismissDuplicateGroup({ type: group.type, key: group.key, ids: group.items.map((i) => i._id) })
      setGroups((prev) => prev.filter((g) => g.id !== group.id))
      toast.success("Marked as not duplicates")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to dismiss")
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminShell
      description="Listings of the same type in the same country with similar titles, descriptions or tags."
      onRefresh={load}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-5">
        <AdminStatGrid className="lg:grid-cols-3">
          <AdminStat label="Duplicate groups" value={groups.length} icon={RiFileCopy2Line} emphasis={groups.length ? "attention" : "none"} />
          <AdminStat label="Extra listings" value={extraListings} hint="Beyond one per group" />
          <AdminStat label="Live clashes" value={liveClashes} hint="Two or more live at once" />
        </AdminStatGrid>

        <AdminTabs
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_TABS.map((t) => ({ ...t, count: counts[t.value] }))}
        />
        <AdminToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search titles…" />

        {loading && groups.length === 0 ? (
          <AdminSkeletonRows rows={4} />
        ) : visible.length === 0 ? (
          <AdminEmpty
            icon={RiCheckDoubleLine}
            title={search.trim() || typeFilter !== "all" ? "No duplicates match" : "No duplicates"}
            description={
              search.trim() || typeFilter !== "all"
                ? "Try another type or search."
                : "No two listings in a country look alike."
            }
          />
        ) : (
          <div className="space-y-3">
            {visible.map((group) => {
              const [keep, ...rest] = group.items
              const isBusy = busy === group.id
              return (
                <AdminCard key={group.id} className={cn(isBusy && "opacity-60")}>
                  <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <h2 className="break-words text-sm font-semibold text-foreground">{group.title}</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {TYPE_LABEL[group.type]} · {group.country ?? (group.type === "resource" ? "No location" : "No country")} ·{" "}
                        {group.items.length} listings
                        {group.liveCount >= 2 ? ` · ${group.liveCount} live` : ""}
                        {reasonText(group.reasons) ? ` · ${reasonText(group.reasons)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={isBusy} onClick={() => dismiss(group)}>
                        Not duplicates
                      </Button>
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => deleteListings(group, rest)}
                        className="bg-red-500 text-white hover:bg-red-600"
                      >
                        Keep oldest, delete {rest.length}
                      </Button>
                    </div>
                  </div>
                  <ul className="divide-y divide-border">
                    {group.items.map((item) => (
                      <li key={item._id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                            <span className="break-words font-medium">{item.title}</span>
                            <StatusPill status={stateLabel(item.state)} />
                            {item._id === keep._id ? (
                              <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                                Oldest
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[reasonText(item.reasons), item.organization, [item.city, item.country].filter(Boolean).join(", "), `posted ${ago(item.createdAt)}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {item.state === "live" ? (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`${PUBLIC_PATH[item.type]}/${item._id}`} target="_blank">
                                View
                              </Link>
                            </Button>
                          ) : null}
                          {item.link ? (
                            <Button asChild size="icon" variant="ghost" className="h-8 w-8" aria-label="Open source link">
                              <a href={item.link} target="_blank" rel="noopener noreferrer">
                                <RiExternalLinkLine className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isBusy}
                            onClick={() => deleteListings(group, [item])}
                            className="text-red-600 hover:bg-red-500/10 hover:text-red-600"
                          >
                            <RiDeleteBinLine className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </AdminCard>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
