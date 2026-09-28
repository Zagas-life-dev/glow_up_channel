"use client"

/**
 * Admin demographics: who the users are, and how each group behaves.
 *
 * Every breakdown can be read four ways — how many users a group has, and
 * how many of them were active, joined, or applied in the window — so the
 * question "which groups sign up but never apply?" is one toggle away. The
 * country filter answers the same questions inside one market.
 *
 * Admin-only, English-only for now. Small groups are already folded into
 * "Other" by the backend.
 */

import { useCallback, useEffect, useState } from "react"
import { RiCake2Line, RiFileList3Line, RiGroupLine, RiUserFollowLine } from "react-icons/ri"
import { toast } from "sonner"

import { AdminShell } from "@/components/admin/admin-shell"
import { AnalyticsTabs } from "@/components/admin/analytics-tabs"
import { AdminEmpty, AdminSection, AdminSkeletonRows, AdminStat, AdminStatGrid } from "@/components/admin/ui"
import { SegmentedTabs } from "@/components/provider/provider-ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  fetchPlatformDemographics,
  type DemographicBreakdown,
  type DemographicMetric,
  type DemographicsOverview,
} from "@/lib/analytics/demographics"

const RANGES = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
] as const

type Range = (typeof RANGES)[number]["id"]

const METRICS: { id: DemographicMetric; label: string }[] = [
  { id: "users", label: "All users" },
  { id: "active", label: "Active" },
  { id: "newUsers", label: "New" },
  { id: "applicants", label: "Applied" },
]

const ALL = "all"

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

/**
 * One group per row. The bar is the group's share of the chosen metric; for
 * anything but "All users" the row also says what fraction of the group that
 * is, which is the number that compares groups of different sizes fairly.
 */
function BreakdownList({ data, metric }: { data: DemographicBreakdown; metric: DemographicMetric }) {
  const total = data.rows.reduce((sum, row) => sum + row[metric], 0)
  return (
    <div className="space-y-4">
      {data.rows.map((row) => {
        const value = row[metric]
        const share = pct(value, total)
        return (
          <div key={row.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-foreground">
                {row.name}
                {row.key === "other" && row.groups ? (
                  <span className="ml-1 text-xs text-muted-foreground">({row.groups} small groups)</span>
                ) : null}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {value.toLocaleString()}{" "}
                <span className="text-xs">
                  {metric === "users" ? `(${share}%)` : `· ${pct(value, row.users)}% of ${row.users.toLocaleString()}`}
                </span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${share}%`, background: "#d95f00" }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Dimension({
  title,
  description,
  data,
  metric,
  loading,
  totalUsers,
  multi = false,
}: {
  title: string
  description: string
  data: DemographicBreakdown | undefined
  metric: DemographicMetric
  loading: boolean
  totalUsers: number
  /** List answers: one person can sit in several groups, so shares are of mentions. */
  multi?: boolean
}) {
  const answered = data?.answered ?? 0
  const note = `${answered.toLocaleString()} of ${totalUsers.toLocaleString()} answered (${pct(answered, totalUsers)}%)${
    multi ? " · people can pick several" : ""
  }`
  return (
    <AdminSection title={title} description={data ? `${description} ${note}` : description}>
      {loading && !data ? (
        <AdminSkeletonRows rows={4} />
      ) : !data || data.rows.length === 0 ? (
        <AdminEmpty title="Not enough answers yet" description="Groups appear once they have enough people to stay anonymous." />
      ) : (
        <BreakdownList data={data} metric={metric} />
      )}
    </AdminSection>
  )
}

export default function AdminDemographics() {
  const [range, setRange] = useState<Range>("30")
  const [country, setCountry] = useState<string>(ALL)
  const [metric, setMetric] = useState<DemographicMetric>("users")
  const [data, setData] = useState<DemographicsOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await fetchPlatformDemographics({ days: Number(range), country: country === ALL ? null : country }))
    } catch (error: any) {
      toast.error(error?.message || "Failed to load demographics")
    } finally {
      setLoading(false)
    }
  }, [range, country])

  useEffect(() => {
    load()
  }, [load])

  const totals = data?.totals
  const users = totals?.users ?? 0
  const where = country === ALL ? "" : ` in ${data?.countries.find((c) => c.countryCode === country)?.country ?? country}`

  return (
    <AdminShell
      title="Demographics"
      description="Who the users are — age, career stage, education, sectors and communities — and how each group engages."
      onRefresh={load}
      refreshing={loading}
      width="wide"
      actions={
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="h-10 w-44 rounded-xl">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All countries</SelectItem>
            {(data?.countries ?? []).map((c) => (
              <SelectItem key={c.countryCode} value={c.countryCode}>
                {c.country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-5">
        <AnalyticsTabs />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs items={RANGES.map((r) => ({ id: r.id, label: r.label }))} value={range} onChange={setRange} />
          <SegmentedTabs items={METRICS} value={metric} onChange={setMetric} />
        </div>

        {data?.suppressed ? (
          <AdminEmpty
            title="Too few users to show"
            description={`This country has fewer than ${data.minCell} users, so its breakdown stays hidden.`}
          />
        ) : null}

        <AdminStatGrid>
          <AdminStat
            label={`Users${where}`}
            value={users.toLocaleString()}
            hint={`${(totals?.newUsers ?? 0).toLocaleString()} joined in the last ${range} days`}
            icon={RiGroupLine}
          />
          <AdminStat
            label="Active in window"
            value={`${pct(totals?.active ?? 0, users)}%`}
            hint={`${(totals?.active ?? 0).toLocaleString()} signed in`}
            icon={RiUserFollowLine}
          />
          <AdminStat
            label="Applied in window"
            value={`${pct(totals?.applicants ?? 0, users)}%`}
            hint={`${(totals?.applicants ?? 0).toLocaleString()} people applied to something`}
            icon={RiFileList3Line}
            emphasis="positive"
          />
          <AdminStat
            label="Median age"
            value={totals?.medianAge ?? "—"}
            hint={`${pct(totals?.withAge ?? 0, users)}% gave a date of birth · ${pct(totals?.onboarded ?? 0, users)}% onboarded`}
            icon={RiCake2Line}
          />
        </AdminStatGrid>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Dimension title="Age" description="From date of birth." data={data?.age} metric={metric} loading={loading} totalUsers={users} />
          <Dimension title="Career stage" description="From onboarding." data={data?.careerStage} metric={metric} loading={loading} totalUsers={users} />
          <Dimension title="Education" description="Highest level reached." data={data?.education} metric={metric} loading={loading} totalUsers={users} />
          <Dimension title="Account type" description="Seekers, providers and monitors." data={data?.roles} metric={metric} loading={loading} totalUsers={users} />
          <Dimension title="Industry sectors" description="Top sectors." data={data?.sectors} metric={metric} loading={loading} totalUsers={users} multi />
          <Dimension title="Interests" description="Top interests." data={data?.interests} metric={metric} loading={loading} totalUsers={users} multi />
        </div>

        <Dimension
          title="Communities"
          description="Groups people said describe them."
          data={data?.communities}
          metric={metric}
          loading={loading}
          totalUsers={users}
          multi
        />

        {data ? (
          <p className="text-xs text-muted-foreground">
            Groups with fewer than {data.minCell} people are combined as Other, and countries that small can't be
            selected, so no one can be identified. Staff accounts are excluded.
          </p>
        ) : null}
      </div>
    </AdminShell>
  )
}
