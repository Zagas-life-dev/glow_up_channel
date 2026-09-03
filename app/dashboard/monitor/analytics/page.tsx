"use client"

/**
 * Monitor — analytics.
 *
 * The same figures the owning provider sees, over the listings this account was
 * assigned: reach, engagement, and what happened to everyone who clicked
 * through to apply. Promotion performance sits underneath, without what the
 * promotion cost — a monitor reads results, not the provider's spending.
 *
 * Admins read this page too, either on their own assignments or on any
 * monitor's, selected with the picker and carried in ?monitorId=.
 */

import { Suspense, useCallback, useEffect, useState } from "react"
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
  ProviderLoading,
  ErrorBanner,
  statusToneClass,
} from "@/components/provider/provider-ui"
import { ListingAnalyticsSummary } from "@/components/analytics/listing-analytics"
import {
  EMPTY_TOTALS,
  formatCount,
  formatRate,
  type ListingAnalyticsTotals,
} from "@/lib/analytics/listing-analytics"
import {
  EMPTY_COUNTS,
  fetchMyAssignments,
  fetchMyPromotions,
  type AssignmentCounts,
  type MonitoredListing,
  type MonitoredPromotion,
  type ViewingAs,
} from "@/lib/analytics/monitor"
import { cn } from "@/lib/utils"
import { BarChart3, Sparkles, Zap } from "lucide-react"
import { toast } from "sonner"

/** Title lookup so a promotion row can name the listing it ran on. */
function titleFor(listings: MonitoredListing[], promotion: MonitoredPromotion): string {
  const match = listings.find(
    (row) => row._id === promotion.contentId && row.contentType === promotion.contentType,
  )
  return match?.title || "Listing no longer assigned"
}

function MonitorAnalyticsContent() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, isLoading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const isAdmin = isAdminOrSuperAdmin(user?.role)
  const selected = (isAdmin && searchParams.get("monitorId")) || SELF

  const [listings, setListings] = useState<MonitoredListing[]>([])
  const [totals, setTotals] = useState<ListingAnalyticsTotals>(EMPTY_TOTALS)
  const [counts, setCounts] = useState<AssignmentCounts>(EMPTY_COUNTS)
  const [promotions, setPromotions] = useState<MonitoredPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      // Fetched together rather than in sequence — they are independent reads
      // and the page needs both.
      const target = selected === SELF ? undefined : selected
      const [assignments, promotionResult] = await Promise.all([
        fetchMyAssignments(target ? { monitorId: target } : {}),
        fetchMyPromotions(target),
      ])
      setListings(assignments.listings)
      setTotals(assignments.totals)
      setCounts(assignments.counts)
      setPromotions(promotionResult.promotions)
      setViewingAs(assignments.viewingAs ?? null)
    } catch (err: any) {
      const message = err?.message || "Failed to load analytics"
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

  if (authLoading) return <ProviderLoading label="Loading analytics" />
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
      title="Analytics"
      assignedCount={counts.total}
      onRefresh={load}
      refreshing={loading}
      actions={isAdmin ? <MonitorPicker value={selected} onChange={chooseMonitor} /> : null}
      viewingAsLabel={viewingAs?.displayName ?? null}
    >
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {loading && listings.length === 0 ? (
        <ProviderLoading label="Loading analytics" />
      ) : listings.length === 0 ? (
        <Panel>
          <EmptyState
            icon={BarChart3}
            title="No listings assigned"
            description={
              viewingAs
                ? `${viewingAs.displayName} has no listings assigned, so there is nothing to chart.`
                : isAdmin
                  ? "You hold no assignments of your own. Pick a monitor above to read their numbers."
                  : "Analytics appear here once an admin assigns listings to your account."
            }
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          <Panel
            icon={Sparkles}
            title={viewingAs ? `Across everything ${viewingAs.displayName} watches` : "Across everything you watch"}
            subtitle={`${formatCount(totals.listings)} listings · ${formatCount(totals.liveListings)} live`}
          >
            <ListingAnalyticsSummary totals={totals} />
          </Panel>

          <Panel
            icon={Zap}
            title="Promotions"
            subtitle={
              promotions.length > 0
                ? `${formatCount(promotions.length)} campaign${promotions.length === 1 ? "" : "s"} on these listings`
                : undefined
            }
            bodyClassName="space-y-2"
          >
            {promotions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                None of these assigned listings have been promoted.
              </p>
            ) : (
              <>
                {promotions.map((promotion) => (
                  <div
                    key={promotion.promotionId}
                    className="rounded-xl border border-border bg-card p-3 sm:p-4"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                        {titleFor(listings, promotion)}
                      </h3>
                      {promotion.packageName ? (
                        <span className="shrink-0 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {promotion.packageName}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                          statusToneClass(promotion.status),
                        )}
                      >
                        {promotion.status}
                      </span>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "Views", value: formatCount(promotion.metrics.views) },
                        { label: "Saves", value: formatCount(promotion.metrics.saves) },
                        { label: "Applications", value: formatCount(promotion.metrics.applications) },
                        { label: "Engagement", value: formatRate(promotion.metrics.engagementRate) },
                      ].map((stat) => (
                        <div key={stat.label}>
                          <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                            {stat.label}
                          </dt>
                          <dd className="text-body font-semibold tabular-nums text-foreground">
                            {stat.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
                <p className="pt-1 text-[11px] text-muted-foreground">
                  Reach and engagement only — promotion costs and billing stay with the provider.
                </p>
              </>
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
export default function MonitorAnalyticsPage() {
  return (
    <Suspense fallback={<ProviderLoading label="Loading analytics" />}>
      <MonitorAnalyticsContent />
    </Suspense>
  )
}
