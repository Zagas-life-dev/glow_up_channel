"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import { AdminShell } from "@/components/admin/admin-shell"
import {
  AdminStat,
  AdminStatGrid,
  AdminSkeletonStats,
  AdminCard,
} from "@/components/admin/ui"
import {
  RiUserLine,
  RiUserFollowLine,
  RiTimeLine,
  RiErrorWarningLine,
  RiFocus3Line,
  RiCalendarLine,
  RiBriefcaseLine,
  RiBookOpenLine,
  RiArrowRightLine,
  RiFileTextLine,
  RiAddCircleLine,
  RiBuilding2Line,
  RiMegaphoneLine,
  RiBarChartBoxLine,
  RiArchiveLine,
  RiUserAddLine,
} from "react-icons/ri"
import type { IconType } from "react-icons"
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
  userStats?: Record<string, number>
  [key: string]: any
}

interface QuickAction {
  label: string
  description: string
  href: string
  icon: IconType
  superAdminOnly?: boolean
}

/**
 * Navigation lives in the sidebar now, so the overview does not repeat it as a wall of cards.
 * These are the handful of jobs an admin actually starts a session with.
 */
const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Moderate content",
    description: "Review and approve submissions",
    href: "/dashboard/admin/content",
    icon: RiFileTextLine,
  },
  {
    label: "Create content",
    description: "Post an event, job, opportunity or resource",
    href: "/dashboard/admin/create-content",
    icon: RiAddCircleLine,
  },
  {
    label: "Poster details",
    description: "Onboarding status and uploaded documents",
    href: "/dashboard/admin/business-upload",
    icon: RiBuilding2Line,
    superAdminOnly: true,
  },
  {
    label: "Promotions",
    description: "Requests, revenue and receipts",
    href: "/dashboard/admin/promotions",
    icon: RiMegaphoneLine,
    superAdminOnly: true,
  },
  {
    label: "Analytics",
    description: "Engagement and content performance",
    href: "/dashboard/admin/analytics",
    icon: RiBarChartBoxLine,
  },
  {
    label: "Past posts",
    description: "Expired posts, retained for compliance",
    href: "/dashboard/admin/past-posts",
    icon: RiArchiveLine,
  },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const statsData = await ApiClient.getPlatformStats()
      setStats(statsData)
    } catch (err: any) {
      console.error("Error fetching admin stats:", err)
      setError(err.message || "Failed to load admin dashboard")
      toast.error("Failed to load admin dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const isSuperAdmin = user?.role === "super_admin"
  const pendingUsers = stats?.pendingUsers || 0
  const pendingPosterApprovals = stats?.userStats?.["opportunity_poster_pending"] || 0
  const needsAttention = pendingUsers > 0 || pendingPosterApprovals > 0

  const num = (value?: number) => (value || 0).toLocaleString()
  const actions = QUICK_ACTIONS.filter((a) => !a.superAdminOnly || isSuperAdmin)

  return (
    <AdminShell
      description={`Signed in as ${user?.firstName || user?.email?.split("@")[0] || "admin"}. Platform activity at a glance.`}
      onRefresh={fetchStats}
      refreshing={loading}
      width="wide"
    >
      {error ? (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <RiErrorWarningLine className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="min-w-0 break-words text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      ) : null}

      {loading && !stats ? (
        <div className="space-y-8">
          <AdminSkeletonStats count={4} />
          <AdminSkeletonStats count={4} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Only surfaced when there is genuinely something waiting. */}
          {needsAttention ? (
            <section>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Needs attention
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {pendingUsers > 0 ? (
                  <AdminStat
                    label="Pending users"
                    value={num(pendingUsers)}
                    hint="Awaiting account approval"
                    icon={RiTimeLine}
                    emphasis="attention"
                    href={isSuperAdmin ? "/dashboard/admin/users/pending" : undefined}
                  />
                ) : null}
                {pendingPosterApprovals > 0 ? (
                  <AdminStat
                    label="Pending poster approvals"
                    value={num(pendingPosterApprovals)}
                    hint="Onboarding documents to review"
                    icon={RiUserFollowLine}
                    emphasis="attention"
                    href={isSuperAdmin ? "/dashboard/admin/business-upload" : undefined}
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              People
            </h2>
            <AdminStatGrid>
              <AdminStat label="Total users" value={num(stats?.totalUsers)} icon={RiUserLine} />
              <AdminStat
                label="New signups"
                value={num(stats?.recentRegistrations)}
                hint="Last 30 days"
                icon={RiUserAddLine}
                emphasis="positive"
                href="/dashboard/admin/analytics"
              />
              <AdminStat label="Opportunity seekers" value={num(stats?.totalOpportunitySeekers)} icon={RiUserLine} />
              <AdminStat label="Posters" value={num(stats?.totalPosters)} icon={RiUserFollowLine} />
            </AdminStatGrid>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Content
            </h2>
            <AdminStatGrid>
              <AdminStat label="Opportunities" value={num(stats?.totalOpportunities)} icon={RiFocus3Line} />
              <AdminStat label="Events" value={num(stats?.totalEvents)} icon={RiCalendarLine} />
              <AdminStat label="Jobs" value={num(stats?.totalJobs)} icon={RiBriefcaseLine} />
              <AdminStat label="Resources" value={num(stats?.totalResources)} icon={RiBookOpenLine} />
            </AdminStatGrid>
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Quick actions
            </h2>
            <AdminCard className="divide-y divide-border">
              {actions.map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center gap-3 px-4 py-3.5 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-primary">
                      <Icon className="h-[1.05rem] w-[1.05rem]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{action.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                    </span>
                    <RiArrowRightLine className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                )
              })}
            </AdminCard>
          </section>
        </div>
      )}
    </AdminShell>
  )
}
