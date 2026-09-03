"use client"

/**
 * Monitor — assigned listings.
 *
 * The landing screen for a monitor account: every listing an admin has handed
 * over, live and expired alike, with the headline numbers on each. There is no
 * "post" or "promote" affordance anywhere on this page because the role has no
 * such power — the API would refuse, and a button that always fails is worse
 * than no button.
 *
 * Admins land here too. They see their own assignments by default and can point
 * the picker at any monitor to read that account's view exactly as it appears to
 * them — the ?monitorId= in the URL is what carries that between the tabs.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import { AuthRequiredCard } from "@/components/auth-required-card"
import { canAccessMonitorPortal, isAdminOrSuperAdmin } from "@/lib/roles"
import {
  MonitorShell,
  MONITOR_NAV_ROUTES,
  monitorTabForPath,
} from "@/components/monitor/monitor-shell"
import { MonitorPicker, SELF } from "@/components/monitor/monitor-picker"
import {
  Panel,
  EmptyState,
  SegmentedTabs,
  StatTile,
  ProviderLoading,
  ErrorBanner,
} from "@/components/provider/provider-ui"
import { ListingAnalyticsCard } from "@/components/analytics/listing-analytics"
import {
  EMPTY_TOTALS,
  formatCount,
  type ListingAnalyticsTotals,
  type ListingContentType,
} from "@/lib/analytics/listing-analytics"
import {
  EMPTY_COUNTS,
  fetchMyAssignments,
  type AssignmentCounts,
  type MonitoredListing,
  type ViewingAs,
} from "@/lib/analytics/monitor"
import { Eye, Users, MousePointerClick, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

type TypeFilter = ListingContentType | "all"

const TYPE_TABS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "opportunity", label: "Opportunities" },
  { id: "job", label: "Jobs" },
  { id: "event", label: "Events" },
  { id: "resource", label: "Resources" },
]

/** Which figure sits at the top. */
type SortKey = "recent" | "assigned" | "views" | "applied"

const SORTS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Newest" },
  { id: "assigned", label: "Recently assigned" },
  { id: "views", label: "Most viewed" },
  { id: "applied", label: "Most applied" },
]

function time(value: string | null | undefined): number {
  return value ? new Date(value).getTime() : 0
}

function MonitorListingsContent() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, isLoading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const isAdmin = isAdminOrSuperAdmin(user?.role)
  // Only an admin can address another account; the backend ignores the
  // parameter from anyone else, so this is presentation, not enforcement.
  const selected = (isAdmin && searchParams.get("monitorId")) || SELF

  const [listings, setListings] = useState<MonitoredListing[]>([])
  const [totals, setTotals] = useState<ListingAnalyticsTotals>(EMPTY_TOTALS)
  const [counts, setCounts] = useState<AssignmentCounts>(EMPTY_COUNTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [sort, setSort] = useState<SortKey>("recent")
  const [viewingAs, setViewingAs] = useState<ViewingAs | null>(null)

  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  const load = useCallback(async () => {
    if (!user || !canAccessMonitorPortal(user.role)) return
    setLoading(true)
    setError(null)
    try {
      // A monitor's scope comes from the token alone. Only an admin's selection
      // is passed, and the backend re-checks the role before honouring it.
      const result = await fetchMyAssignments(
        selected === SELF ? {} : { monitorId: selected },
      )
      setListings(result.listings)
      setTotals(result.totals)
      setCounts(result.counts)
      setViewingAs(result.viewingAs ?? null)
    } catch (err: any) {
      const message = err?.message || "Failed to load assigned listings"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [user, isAdmin, selected])

  /** Keep the choice in the URL so the other tab and a shared link agree. */
  const chooseMonitor = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === SELF) params.delete("monitorId")
    else params.set("monitorId", value)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const filtered =
      typeFilter === "all" ? listings : listings.filter((row) => row.contentType === typeFilter)

    const sorted = [...filtered]
    if (sort === "views") sorted.sort((a, b) => b.engagement.views - a.engagement.views)
    else if (sort === "applied") sorted.sort((a, b) => b.funnel.applied - a.funnel.applied)
    else if (sort === "assigned") sorted.sort((a, b) => time(b.assignedAt) - time(a.assignedAt))
    return sorted
  }, [listings, typeFilter, sort])

  if (authLoading) return <ProviderLoading label="Loading your listings" />
  if (!user) return <AuthRequiredCard />
  if (!canAccessMonitorPortal(user.role)) {
    return (
      <AuthRequiredCard
        title="Monitors only"
        description="This area is for accounts assigned to watch specific listings."
      />
    )
  }

  return (
    <MonitorShell
      activeTab={monitorTabForPath(pathname)}
      onTabChange={(tab) => router.push(MONITOR_NAV_ROUTES[tab])}
      title="Assigned listings"
      assignedCount={counts.total}
      onRefresh={load}
      refreshing={loading}
      actions={isAdmin ? <MonitorPicker value={selected} onChange={chooseMonitor} /> : null}
      viewingAsLabel={viewingAs?.displayName ?? null}
    >
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {loading && listings.length === 0 ? (
        <ProviderLoading label="Loading your listings" />
      ) : listings.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Eye}
            title="Nothing assigned yet"
            description={
              viewingAs
                ? `${viewingAs.displayName} has no listings assigned yet. Assign some from their user page and they will appear here.`
                : isAdmin
                  ? "You hold no assignments of your own. Pick a monitor above to see what they see."
                  : "An admin has not assigned any listings to your account. Once they do, the listings and their performance will show up here."
            }
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
              label="Assigned"
              value={formatCount(counts.total)}
              hint={`${formatCount(totals.liveListings)} live right now`}
              icon={Eye}
              tone="violet"
            />
            <StatTile
              label="People reached"
              value={formatCount(totals.engagement.uniqueViewers)}
              hint={`${formatCount(totals.engagement.views)} total opens`}
              icon={Users}
              tone="primary"
            />
            <StatTile
              label="Clicked through"
              value={formatCount(totals.funnel.tracked)}
              hint="Left for the listing's own site"
              icon={MousePointerClick}
              tone="amber"
            />
            <StatTile
              label="Applied"
              value={formatCount(totals.funnel.applied)}
              hint="Confirmed they submitted"
              icon={CheckCircle2}
              tone="emerald"
            />
          </div>

          <Panel
            icon={Eye}
            title={viewingAs ? `What ${viewingAs.displayName} is watching` : "What you're watching"}
            subtitle={`${formatCount(counts.total)} listing${counts.total === 1 ? "" : "s"} assigned`}
            action={<SegmentedTabs items={SORTS} value={sort} onChange={setSort} />}
            bodyClassName="space-y-3"
          >
            <SegmentedTabs
              items={TYPE_TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
                count:
                  tab.id === "all"
                    ? listings.length
                    : listings.filter((row) => row.contentType === tab.id).length,
              }))}
              value={typeFilter}
              onChange={setTypeFilter}
            />

            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing of that type assigned.
              </p>
            ) : (
              visible.map((row) => (
                <ListingAnalyticsCard key={`${row.contentType}-${row._id}`} row={row} />
              ))
            )}
          </Panel>
        </div>
      )}
    </MonitorShell>
  )
}

/**
 * useSearchParams needs a Suspense boundary above it, so the page body is a
 * child component and this is the boundary.
 */
export default function MonitorListingsPage() {
  return (
    <Suspense fallback={<ProviderLoading label="Loading your listings" />}>
      <MonitorListingsContent />
    </Suspense>
  )
}
