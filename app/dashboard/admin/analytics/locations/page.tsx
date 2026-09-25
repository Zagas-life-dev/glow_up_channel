"use client"

/**
 * Admin location analytics: where users are, where listings are, and the gap.
 *
 * Three views of place:
 *   - people: registered users, users active in the window, and anonymous
 *     visitors, by country / state / city;
 *   - audience: views, clicks and applications across every listing;
 *   - supply vs demand: users against live listings per country — the table
 *     that shows where content needs sourcing.
 *
 * Admin-only, English-only for now. Small places are already folded into
 * "Other" by the backend.
 */

import { useCallback, useEffect, useState } from "react"
import { RiGlobalLine, RiMapPinLine, RiUserLocationLine, RiWifiLine } from "react-icons/ri"
import { toast } from "sonner"

import { AdminShell } from "@/components/admin/admin-shell"
import { AdminEmpty, AdminSection, AdminSkeletonRows, AdminStat, AdminStatGrid } from "@/components/admin/ui"
import { PlaceTable } from "@/components/analytics/location-audience-panel"
import { SegmentedTabs } from "@/components/provider/provider-ui"
import { fetchPlatformLocations, type PlatformLocationOverview } from "@/lib/analytics/location-analytics"

type Level = "countries" | "states" | "cities"

const LEVELS: { id: Level; label: string }[] = [
  { id: "countries", label: "Countries" },
  { id: "states", label: "States & regions" },
  { id: "cities", label: "Cities" },
]

const RANGES = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
] as const

type Range = (typeof RANGES)[number]["id"]

const otherPlaces = (count: number) => `${count} smaller places`

export default function AdminLocationAnalytics() {
  const [range, setRange] = useState<Range>("30")
  const [peopleLevel, setPeopleLevel] = useState<Level>("countries")
  const [audienceLevel, setAudienceLevel] = useState<Level>("countries")
  const [data, setData] = useState<PlatformLocationOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await fetchPlatformLocations(Number(range)))
    } catch (error: any) {
      toast.error(error?.message || "Failed to load location analytics")
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    load()
  }, [load])

  const totalUsers = data?.people.countries.reduce((sum, row) => sum + Number(row.users ?? 0), 0) ?? 0

  return (
    <AdminShell
      title="Location analytics"
      description="Where users are, where the audience for listings comes from, and where supply and demand diverge."
      onRefresh={load}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-5">
        <SegmentedTabs items={RANGES.map((r) => ({ id: r.id, label: r.label }))} value={range} onChange={setRange} />

        <AdminStatGrid>
          <AdminStat label="Users with a location" value={totalUsers.toLocaleString()} icon={RiUserLocationLine} />
          <AdminStat
            label="Users without one"
            value={(data?.usersWithoutLocation ?? 0).toLocaleString()}
            icon={RiMapPinLine}
            hint="Filled as they visit or allow location"
          />
          <AdminStat
            label="Countries with users"
            value={(data?.people.countries.filter((row) => row.key !== "other").length ?? 0).toLocaleString()}
            icon={RiGlobalLine}
          />
          <AdminStat label="Remote listings" value={(data?.remoteListings ?? 0).toLocaleString()} icon={RiWifiLine} />
        </AdminStatGrid>

        <AdminSection
          title="Supply vs demand"
          description="Users against live, approved listings per country. A low number per 1,000 users is where to source more."
        >
          {loading && !data ? (
            <AdminSkeletonRows />
          ) : !data || data.supplyVsDemand.length === 0 ? (
            <AdminEmpty title="No data yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Country</th>
                    <th className="py-2 pr-3 text-right font-medium">Users</th>
                    <th className="py-2 pr-3 text-right font-medium">Live listings</th>
                    <th className="py-2 pr-3 text-right font-medium">Listings per 1,000 users</th>
                  </tr>
                </thead>
                <tbody>
                  {data.supplyVsDemand.map((row) => (
                    <tr key={row.countryCode} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{row.country}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{row.users.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{row.listings.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {row.listingsPer1000Users === null ? "—" : row.listingsPer1000Users.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <AdminSection
          title="Where people are"
          description="Registered users, users active in the window, and anonymous visitors."
          actions={<SegmentedTabs items={LEVELS} value={peopleLevel} onChange={setPeopleLevel} />}
        >
          {loading && !data ? (
            <AdminSkeletonRows />
          ) : !data || data.people[peopleLevel].length === 0 ? (
            <AdminEmpty title="No location data yet" description="It appears as people visit and allow location." />
          ) : (
            <PlaceTable
              rows={data.people[peopleLevel]}
              metrics={["users", "activeUsers", "visitors"]}
              labels={{ place: "Place", users: "Users", activeUsers: "Active", visitors: "Visitors" }}
              otherLabel="Other"
              otherPlacesLabel={otherPlaces}
            />
          )}
        </AdminSection>

        <AdminSection
          title="Where the audience is"
          description="Views, clicks and applications across every listing."
          actions={<SegmentedTabs items={LEVELS} value={audienceLevel} onChange={setAudienceLevel} />}
        >
          {loading && !data ? (
            <AdminSkeletonRows />
          ) : !data || data.audience[audienceLevel].length === 0 ? (
            <AdminEmpty title="No audience data yet" description="It appears as people view and apply." />
          ) : (
            <PlaceTable
              rows={data.audience[audienceLevel]}
              metrics={["views", "clicks", "applications"]}
              labels={{ place: "Place", views: "Views", clicks: "Clicks", applications: "Applications" }}
              otherLabel="Other"
              otherPlacesLabel={otherPlaces}
            />
          )}
        </AdminSection>

        {data ? (
          <p className="text-xs text-muted-foreground">
            Places with fewer than {data.minCell} people are grouped as Other so no one can be identified.
          </p>
        ) : null}
      </div>
    </AdminShell>
  )
}
