"use client"

/**
 * Admin listing analytics.
 *
 * The same numbers a provider sees on their own dashboard, but across the whole
 * platform and filterable to one provider. It doubles as the attachment queue:
 * "Unattached" lists everything no provider owns, which is where an admin goes
 * to decide who a scraped posting belongs to.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { AdminShell } from "@/components/admin/admin-shell"
import { AdminSection, AdminStat, AdminStatGrid, AdminEmpty, AdminSkeletonRows } from "@/components/admin/ui"
import { AttachListingDialog, type AttachTargetListing } from "@/components/admin/attach-listing-dialog"
import { ListingAnalyticsCard, ListingAnalyticsSummary } from "@/components/analytics/listing-analytics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  EMPTY_TOTALS,
  fetchListingAnalytics,
  fetchUnattachedListings,
  formatCount,
  formatRate,
  type ListingAnalyticsRow,
  type ListingAnalyticsTotals,
  type ListingContentType,
} from "@/lib/analytics/listing-analytics"
import { fetchAttachableProviders, type AttachableProvider } from "@/lib/analytics/provider-attachment"
import {
  RiSearchLine,
  RiEyeLine,
  RiBookmarkLine,
  RiSendPlaneLine,
  RiUserSharedLine,
} from "react-icons/ri"
import { toast } from "sonner"

type TypeFilter = ListingContentType | "all"
type Scope = "all" | "unattached"

export default function AdminListingAnalytics() {
  const [listings, setListings] = useState<ListingAnalyticsRow[]>([])
  const [totals, setTotals] = useState<ListingAnalyticsTotals>(EMPTY_TOTALS)
  const [providers, setProviders] = useState<AttachableProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [truncated, setTruncated] = useState<{ shown: number; matched: number } | null>(null)

  const [scope, setScope] = useState<Scope>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [attachTarget, setAttachTarget] = useState<AttachTargetListing | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = {
        contentType: typeFilter,
        search: search.trim() || undefined,
      }
      const result =
        scope === "unattached"
          ? await fetchUnattachedListings(query)
          : await fetchListingAnalytics({
              ...query,
              providerId: providerFilter !== "all" ? providerFilter : undefined,
            })
      setListings(result.listings)
      setTotals(result.totals)
      // The totals describe what was analysed, not what matched — say so rather
      // than letting a capped page read as a platform-wide figure.
      setTruncated(
        result.truncated
          ? { shown: result.listings.length, matched: result.matchedCount ?? result.listings.length }
          : null,
      )
    } catch (err: any) {
      const message = err?.message || "Failed to load listing analytics"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [scope, typeFilter, providerFilter, search])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetchAttachableProviders()
      .then(setProviders)
      .catch(() => setProviders([]))
  }, [])

  const unattachedCount = useMemo(
    () => listings.filter((row) => !row.providerId).length,
    [listings],
  )

  return (
    <AdminShell
      title="Listing analytics"
      description="Views, saves and the application funnel for every listing — and who each one belongs to."
      onRefresh={load}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-5">
        <AdminStatGrid>
          <AdminStat label="Views" value={formatCount(totals.engagement.views)} icon={RiEyeLine} hint={`${formatCount(totals.engagement.uniqueViewers)} distinct people`} />
          <AdminStat label="Saves" value={formatCount(totals.engagement.saves)} icon={RiBookmarkLine} hint={`${formatRate(totals.rates.saveRate)} of views`} />
          <AdminStat label="Applied" value={formatCount(totals.funnel.applied)} icon={RiSendPlaneLine} hint={`${formatRate(totals.rates.submitRate)} of apply clicks`} emphasis="positive" />
          <AdminStat
            label="Unattached"
            value={formatCount(unattachedCount)}
            icon={RiUserSharedLine}
            hint="No provider dashboard shows these"
            emphasis={unattachedCount > 0 ? "attention" : "none"}
          />
        </AdminStatGrid>

        {/* Filters in one row above the results, per the dashboard convention. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search listings by title or organisation"
              className="h-10 rounded-xl pl-9"
            />
          </div>

          <Select value={scope} onValueChange={(value) => setScope(value as Scope)}>
            <SelectTrigger className="h-10 w-full rounded-xl sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All listings</SelectItem>
              <SelectItem value="unattached">Unattached only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
            <SelectTrigger className="h-10 w-full rounded-xl sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="opportunity">Opportunities</SelectItem>
              <SelectItem value="job">Jobs</SelectItem>
              <SelectItem value="event">Events</SelectItem>
              <SelectItem value="resource">Resources</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={providerFilter}
            onValueChange={setProviderFilter}
            disabled={scope === "unattached"}
          >
            <SelectTrigger className="h-10 w-full rounded-xl sm:w-52">
              <SelectValue placeholder="Any provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any provider</SelectItem>
              {providers.map((provider) => (
                <SelectItem key={provider._id} value={provider._id}>
                  {provider.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {truncated ? (
          <p className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
            Showing the {formatCount(truncated.shown)} newest of {formatCount(truncated.matched)} matching listings.
            Every figure above covers only those — narrow the filters for a total you can rely on.
          </p>
        ) : null}

        {error ? (
          <AdminSection>
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={load} className="mt-3 rounded-xl">
              Try again
            </Button>
          </AdminSection>
        ) : null}

        {loading ? (
          <AdminSection title="Listings">
            <AdminSkeletonRows rows={6} />
          </AdminSection>
        ) : listings.length === 0 ? (
          <AdminSection>
            <AdminEmpty
              title={scope === "unattached" ? "Everything is attached" : "No listings match"}
              description={
                scope === "unattached"
                  ? "Every listing belongs to a provider account."
                  : "Try a different filter or search term."
              }
            />
          </AdminSection>
        ) : (
          <>
            {scope !== "unattached" ? (
              <AdminSection
                title="Across everything in scope"
                description={`${formatCount(totals.listings)} listings · ${formatCount(totals.liveListings)} live`}
              >
                <ListingAnalyticsSummary totals={totals} />
              </AdminSection>
            ) : null}

            <AdminSection
              title="By listing"
              description={
                scope === "unattached"
                  ? "Attach a listing to put it in that provider's dashboard."
                  : undefined
              }
            >
              <div className="space-y-3">
                {listings.map((row) => (
                  <ListingAnalyticsCard
                    key={`${row.contentType}-${row._id}`}
                    row={row}
                    actions={
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() =>
                          setAttachTarget({
                            _id: row._id,
                            title: row.title,
                            type: row.contentType,
                            providerId: row.providerId,
                            providerName: row.providerName,
                          })
                        }
                      >
                        <RiUserSharedLine className="mr-1.5 h-3.5 w-3.5" />
                        {row.providerId ? "Reassign" : "Attach"}
                      </Button>
                    }
                  />
                ))}
              </div>
            </AdminSection>
          </>
        )}
      </div>

      <AttachListingDialog
        open={attachTarget !== null}
        onOpenChange={(open) => { if (!open) setAttachTarget(null) }}
        listing={attachTarget}
        onAttached={load}
      />
    </AdminShell>
  )
}
