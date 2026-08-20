"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import ApiClient from "@/lib/api-client"
import { AdminShell } from "@/components/admin/admin-shell"
import {
  AdminStat,
  AdminStatGrid,
  AdminSection,
  AdminSkeletonStats,
  StatusPill,
} from "@/components/admin/ui"
import { ActivityChart, type ActivityPoint } from "@/components/admin/activity-chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RiErrorWarningLine,
  RiUserLine,
  RiUserFollowLine,
  RiStackLine,
  RiPulseLine,
  RiUserAddLine,
} from "react-icons/ri"
import { toast } from "sonner"

interface PlatformStats {
  totalUsers?: number
  activeUsers?: number
  pendingUsers?: number
  recentRegistrations?: number
  totalOpportunitySeekers?: number
  totalPosters?: number
  totalOpportunities?: number
  totalEvents?: number
  totalJobs?: number
  totalResources?: number
  dailyActiveUsers?: number
  dailyVisitors?: number
  userStats?: Record<string, number>
  [key: string]: any
}

interface DailyStats {
  series: ActivityPoint[]
  range: { start: string; end: string; days: number }
  totals: {
    activeUsers: number
    visitors: number
    signups: number
    peakActiveUsers: number
    peakVisitors: number
    peakSignups: number
  }
}

type TimeRange = "7d" | "30d" | "90d" | "365d"

const RANGE_DAYS: Record<TimeRange, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 }

/**
 * A labelled proportion bar. Nominal categories get one colour for every bar — shading each
 * one darker-where-bigger would double-encode length as hue and burn the only free channel.
 */
function BreakdownBar({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="truncate text-sm text-foreground">{label}</span>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {value.toLocaleString()} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#d95f00" }} />
      </div>
    </div>
  )
}

export default function AdminAnalytics() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [daily, setDaily] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, dailyData] = await Promise.all([
        ApiClient.getPlatformStats(),
        ApiClient.getDailyStats(RANGE_DAYS[timeRange]),
      ])
      setStats(statsData)
      setDaily(dailyData as DailyStats)
    } catch (err: any) {
      console.error("Error fetching analytics:", err)
      setError(err.message || "Failed to load analytics")
      toast.error("Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const usersByRole = useMemo(() => {
    if (!stats?.userStats) return []
    const distribution: Record<string, number> = {}
    for (const [key, count] of Object.entries(stats.userStats)) {
      const [role] = key.split("_")
      if (role !== "admin" && role !== "super") {
        distribution[role] = (distribution[role] || 0) + (count as number)
      }
    }
    return Object.entries(distribution)
      .map(([role, value]) => ({
        label: role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
      }))
      .sort((a, b) => b.value - a.value)
  }, [stats])

  const usersByStatus = useMemo(() => {
    if (!stats?.userStats) return []
    const distribution: Record<string, number> = {}
    for (const [key, count] of Object.entries(stats.userStats)) {
      const parts = key.split("_")
      const status = parts[parts.length - 1]
      distribution[status] = (distribution[status] || 0) + (count as number)
    }
    return Object.entries(distribution)
      .map(([status, value]) => ({ status, value }))
      .sort((a, b) => b.value - a.value)
  }, [stats])

  const contentByType = useMemo(
    () =>
      [
        { label: "Opportunities", value: stats?.totalOpportunities || 0 },
        { label: "Events", value: stats?.totalEvents || 0 },
        { label: "Jobs", value: stats?.totalJobs || 0 },
        { label: "Resources", value: stats?.totalResources || 0 },
      ].sort((a, b) => b.value - a.value),
    [stats]
  )

  const totalContent = contentByType.reduce((sum, c) => sum + c.value, 0)
  const totalRoleUsers = usersByRole.reduce((sum, r) => sum + r.value, 0)
  const totalStatusUsers = usersByStatus.reduce((sum, s) => sum + s.value, 0)

  const activationRate =
    stats?.totalUsers && stats.totalUsers > 0
      ? Math.round(((stats.activeUsers || 0) / stats.totalUsers) * 100)
      : 0

  const avgActive = daily?.series.length
    ? Math.round(daily.totals.activeUsers / daily.series.length)
    : 0
  const avgVisitors = daily?.series.length
    ? Math.round(daily.totals.visitors / daily.series.length)
    : 0
  const avgSignups = daily?.series.length
    ? Math.round(daily.totals.signups / daily.series.length)
    : 0

  return (
    <AdminShell
      title="Analytics"
      description="Platform activity, audience mix, and content performance."
      onRefresh={fetchAnalytics}
      refreshing={loading}
      width="wide"
      actions={
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="h-10 w-36 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="365d">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {error ? (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <RiErrorWarningLine className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="min-w-0 break-words text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      ) : null}

      <div className="space-y-6">
        {/* Headline: the real activity series, persisted daily */}
        <ActivityChart
          data={daily?.series ?? []}
          loading={loading && !daily}
          description={
            daily
              ? `${daily.range.start} to ${daily.range.end} · averaging ${avgVisitors.toLocaleString()} visitors, ${avgActive.toLocaleString()} active users and ${avgSignups.toLocaleString()} signups per day`
              : undefined
          }
        />

        {loading && !stats ? (
          <AdminSkeletonStats count={4} />
        ) : (
          <AdminStatGrid>
            <AdminStat
              label="Peak visitors"
              value={(daily?.totals.peakVisitors ?? 0).toLocaleString()}
              hint={`Best day in the last ${RANGE_DAYS[timeRange]} days`}
              icon={RiPulseLine}
            />
            <AdminStat
              label="Peak active users"
              value={(daily?.totals.peakActiveUsers ?? 0).toLocaleString()}
              hint={`Best day in the last ${RANGE_DAYS[timeRange]} days`}
              icon={RiUserFollowLine}
            />
            <AdminStat
              label="Peak signups"
              value={(daily?.totals.peakSignups ?? 0).toLocaleString()}
              hint={`${(daily?.totals.signups ?? 0).toLocaleString()} new accounts in ${RANGE_DAYS[timeRange]} days`}
              icon={RiUserAddLine}
              emphasis="positive"
            />
            <AdminStat
              label="Total content"
              value={totalContent.toLocaleString()}
              hint={`${activationRate}% of ${(stats?.totalUsers || 0).toLocaleString()} users active`}
              icon={RiStackLine}
            />
          </AdminStatGrid>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AdminSection title="Users by role" description={`${totalRoleUsers.toLocaleString()} accounts`}>
            {usersByRole.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No user data yet.</p>
            ) : (
              <div className="space-y-4">
                {usersByRole.map((row) => (
                  <BreakdownBar key={row.label} label={row.label} value={row.value} total={totalRoleUsers} />
                ))}
              </div>
            )}
          </AdminSection>

          <AdminSection title="Content by type" description={`${totalContent.toLocaleString()} live items`}>
            {totalContent === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No content yet.</p>
            ) : (
              <div className="space-y-4">
                {contentByType.map((row) => (
                  <BreakdownBar key={row.label} label={row.label} value={row.value} total={totalContent} />
                ))}
              </div>
            )}
          </AdminSection>
        </div>

        {/* Statuses carry meaning, so they use the reserved status vocabulary, not series colours. */}
        <AdminSection title="Users by status" description={`${totalStatusUsers.toLocaleString()} accounts`}>
          {usersByStatus.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No user data yet.</p>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {usersByStatus.map((row) => (
                <div key={row.status} className="flex items-center gap-2">
                  <StatusPill status={row.status} />
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {row.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      </div>
    </AdminShell>
  )
}
