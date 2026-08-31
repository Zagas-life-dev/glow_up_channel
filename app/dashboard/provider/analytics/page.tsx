"use client"

/**
 * Provider analytics.
 *
 * The provider nav has always had an Analytics tab; until now it pointed at
 * settings because there was nothing to show. This is that page: per listing,
 * how many people saw it, how many saved or liked it, and — from the honesty
 * tracker — what happened to the people who clicked through to apply.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import { AuthRequiredCard } from "@/components/auth-required-card"
import { getPostingLimit } from "@/lib/posting-limits"
import { canPublishContent } from "@/lib/roles"
import { ProviderShell, providerTabForPath, PROVIDER_NAV_ROUTES } from "@/components/provider/provider-shell"
import {
  Panel,
  EmptyState,
  SegmentedTabs,
  ProviderLoading,
  ErrorBanner,
} from "@/components/provider/provider-ui"
import {
  ListingAnalyticsCard,
  ListingAnalyticsSummary,
} from "@/components/analytics/listing-analytics"
import {
  EMPTY_TOTALS,
  fetchListingAnalytics,
  formatCount,
  formatRate,
  type ListingAnalyticsRow,
  type ListingAnalyticsTotals,
  type ListingContentType,
} from "@/lib/analytics/listing-analytics"
import { BarChart3, Sparkles } from "lucide-react"
import { toast } from "sonner"

type TypeFilter = ListingContentType | "all"

const TYPE_TABS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "opportunity", label: "Opportunities" },
  { id: "job", label: "Jobs" },
  { id: "event", label: "Events" },
  { id: "resource", label: "Resources" },
]

/** Which figure sits at the top. Ordered as a provider reads their own results. */
type SortKey = "recent" | "views" | "applied" | "saves"

const SORTS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Newest" },
  { id: "views", label: "Most viewed" },
  { id: "applied", label: "Most applied" },
  { id: "saves", label: "Most saved" },
]

export default function ProviderAnalyticsPage() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, profile, isLoading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const [listings, setListings] = useState<ListingAnalyticsRow[]>([])
  const [totals, setTotals] = useState<ListingAnalyticsTotals>(EMPTY_TOTALS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [sort, setSort] = useState<SortKey>("recent")

  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  const load = useCallback(async () => {
    if (!user || !canPublishContent(user.role)) return
    setLoading(true)
    setError(null)
    try {
      // The backend scopes a provider to their own listings regardless of what
      // is asked for, so no providerId is sent from here.
      const result = await fetchListingAnalytics()
      setListings(result.listings)
      setTotals(result.totals)
    } catch (err: any) {
      const message = err?.message || "Failed to load analytics"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const filtered =
      typeFilter === "all" ? listings : listings.filter((row) => row.contentType === typeFilter)

    const sorted = [...filtered]
    if (sort === "views") sorted.sort((a, b) => b.engagement.views - a.engagement.views)
    else if (sort === "applied") sorted.sort((a, b) => b.funnel.applied - a.funnel.applied)
    else if (sort === "saves") sorted.sort((a, b) => b.engagement.saves - a.engagement.saves)
    return sorted
  }, [listings, typeFilter, sort])

  const postingLimit = getPostingLimit(user?.role)

  if (authLoading) return <ProviderLoading label="Loading analytics" />
  if (!user) return <AuthRequiredCard />
  if (!canPublishContent(user.role)) {
    return (
      <AuthRequiredCard
        title="Providers only"
        description="You need a publishing account to see listing analytics."
      />
    )
  }

  return (
    <ProviderShell
      user={user}
      profile={profile}
      activeTab={providerTabForPath(pathname)}
      onTabChange={(tab) => router.push(PROVIDER_NAV_ROUTES[tab])}
      title="Analytics"
      totalPostings={listings.length}
      postingLimit={postingLimit}
      onRefresh={load}
      refreshing={loading}
    >
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {loading && listings.length === 0 ? (
        <ProviderLoading label="Loading analytics" />
      ) : listings.length === 0 ? (
        <Panel>
          <EmptyState
            icon={BarChart3}
            title="No listings yet"
            description="Post something, or ask an admin to attach an existing listing to your account, and its numbers will show up here."
            ctaHref="/dashboard/provider/posting"
            ctaLabel="Post content"
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          <Panel
            icon={Sparkles}
            title="Everything you've posted"
            subtitle={`${formatCount(totals.listings)} listings · ${formatCount(totals.liveListings)} live`}
          >
            <ListingAnalyticsSummary totals={totals} />
          </Panel>

          <Panel
            icon={BarChart3}
            title="By listing"
            subtitle={`${formatRate(totals.rates.submitRate)} of people who clicked through said they applied`}
            action={
              <SegmentedTabs items={SORTS} value={sort} onChange={setSort} />
            }
            bodyClassName="space-y-3"
          >
            <SegmentedTabs
              items={TYPE_TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
                count: tab.id === "all"
                  ? listings.length
                  : listings.filter((row) => row.contentType === tab.id).length,
              }))}
              value={typeFilter}
              onChange={setTypeFilter}
            />

            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing of that type yet.
              </p>
            ) : (
              visible.map((row) => <ListingAnalyticsCard key={`${row.contentType}-${row._id}`} row={row} />)
            )}
          </Panel>
        </div>
      )}
    </ProviderShell>
  )
}
