"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdminLayout } from "@/components/admin-sidebar"
import { RiEyeLine } from "react-icons/ri"
import {
  RiUserLine,
  RiUserReceivedLine,
  RiArrowUpLine,
  RiSettingsLine,
  RiBarChartBoxLine,
  RiErrorWarningLine,
  RiTimeLine,
  RiFileLine,
  RiArchiveLine,
  RiCalendarLine,
  RiRefreshLine,
  RiLayoutLine,
  RiDashboardLine,
  RiMoneyDollarCircleLine,
  RiBillLine,
  RiFocus3Line,
  RiBriefcaseLine,
  RiBookOpenLine,
  RiAddCircleLine,
} from "react-icons/ri"
import PageSkeleton from "@/components/skeletons/page-skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const Users = RiUserLine
const UserCheck = RiUserReceivedLine
const TrendingUp = RiArrowUpLine
const Settings = RiSettingsLine
const BarChart3 = RiBarChartBoxLine
const AlertTriangle = RiErrorWarningLine
const Clock = RiTimeLine
const Eye = RiEyeLine
const FileText = RiFileLine
const Timer = RiTimeLine
const Archive = RiArchiveLine
const Calendar = RiCalendarLine
const RefreshCw = RiRefreshLine
const LayoutDashboard = RiLayoutLine
const DollarSign = RiMoneyDollarCircleLine
const Receipt = RiBillLine
const Target = RiFocus3Line
const Briefcase = RiBriefcaseLine
const BookOpen = RiBookOpenLine

// TypeScript Interfaces
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

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Hide navbar and footer when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        setError('Access denied. Admin privileges required.')
        setLoading(false)
        return
      }
      fetchStats()
    }
  }, [authLoading, isAuthenticated, user])

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const statsData = await ApiClient.getPlatformStats()
      setStats(statsData)
    } catch (error: any) {
      console.error('Error fetching admin stats:', error)
      setError(error.message || 'Failed to load admin dashboard')
      toast.error('Failed to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  if (authLoading) {
    return <PageSkeleton />
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You need admin or super admin privileges to access this page.
          </p>
          <Button asChild className="bg-primary hover:bg-primary/90 rounded-xl">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'super_admin'

  // Calculate pending poster approvals from userStats
  const pendingPosterApprovals = stats?.userStats?.['opportunity_poster_pending'] || 0

  const statBanners = [
    { 
      label: 'Total Users', 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      gradient: 'from-primary/20 to-primary/10',
      borderColor: 'border-primary/30',
      iconColor: 'text-primary',
      valueColor: 'text-primary'
    },
    { 
      label: 'Pending Users', 
      value: stats?.pendingUsers || 0, 
      icon: Clock, 
      gradient: 'from-yellow-500/20 to-yellow-600/10',
      borderColor: 'border-yellow-500/30',
      iconColor: 'text-yellow-400',
      valueColor: 'text-yellow-400'
    },
    { 
      label: 'Pending Poster Approvals', 
      value: pendingPosterApprovals, 
      icon: UserCheck, 
      gradient: 'from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/30',
      iconColor: 'text-orange-400',
      valueColor: 'text-orange-400'
    },
    { 
      label: 'Opportunity Seekers', 
      value: stats?.totalOpportunitySeekers || 0, 
      icon: Users, 
      gradient: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      iconColor: 'text-purple-400',
      valueColor: 'text-purple-400'
    },
    { 
      label: 'Posters', 
      value: stats?.totalPosters || 0, 
      icon: UserCheck, 
      gradient: 'from-emerald-500/20 to-emerald-600/10',
      borderColor: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-400'
    },
    { 
      label: 'Opportunities', 
      value: stats?.totalOpportunities || 0, 
      icon: Target, 
      gradient: 'from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/30',
      iconColor: 'text-orange-400',
      valueColor: 'text-orange-400'
    },
    { 
      label: 'Events', 
      value: stats?.totalEvents || 0, 
      icon: Calendar, 
      gradient: 'from-emerald-500/20 to-emerald-600/10',
      borderColor: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-400'
    },
    { 
      label: 'Jobs', 
      value: stats?.totalJobs || 0, 
      icon: Briefcase, 
      gradient: 'from-primary/20 to-primary/10',
      borderColor: 'border-primary/30',
      iconColor: 'text-primary',
      valueColor: 'text-primary'
    },
    { 
      label: 'Resources', 
      value: stats?.totalResources || 0, 
      icon: BookOpen, 
      gradient: 'from-violet-500/20 to-violet-600/10',
      borderColor: 'border-violet-500/30',
      iconColor: 'text-violet-400',
      valueColor: 'text-violet-400'
    },
  ]

  const actionCards = [
    ...(isSuperAdmin ? [{
      title: 'User Management',
      description: 'Manage user accounts, approve registrations, and handle user status.',
      icon: Users,
      color: 'orange',
      actions: [
        { label: 'Manage Users', href: '/dashboard/admin/users', icon: Users },
        { label: 'Pending', href: '/dashboard/admin/users/pending', icon: Clock, variant: 'outline' as const },
      ]
    }] : []),
    {
      title: 'Create content',
      description: 'Post new events, jobs, opportunities, and resources. Add a link so viewers can access the main resource.',
      icon: RiAddCircleLine,
      color: 'primary',
      actions: [
        { label: 'Post event, job, opportunity, or resource', href: '/dashboard/admin/create-content', icon: RiAddCircleLine },
      ]
    },
    {
      title: 'Content Moderation',
      description: 'Review and approve content submissions, manage payment verification.',
      icon: FileText,
      color: 'primary',
      actions: [
        { label: 'Moderate Content', href: '/dashboard/admin/content', icon: FileText },
      ]
    },
    ...(isSuperAdmin ? [{
      title: 'Posters Details',
      description: 'View all opportunity posters, their onboarding status, uploaded documents, and approval status.',
      icon: UserCheck,
      color: 'orange',
      actions: [
        { label: 'View Posters Details', href: '/dashboard/admin/business-upload', icon: Users },
      ]
    }] : []),
    {
      title: 'Past Posts',
      description: 'View and manage posts that have been moved to past collections due to expiry. Never deleted for legal compliance.',
      icon: Archive,
      color: 'purple',
      actions: [
        { label: 'View Past Posts', href: '/dashboard/admin/past-posts', icon: Archive },
      ]
    },
    {
      title: 'Analytics',
      description: 'View platform statistics, user engagement, and content performance.',
      icon: BarChart3,
      color: 'primary',
      actions: [
        { label: 'View Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
      ]
    },
    ...(isSuperAdmin ? [{
      title: 'Promotion Management',
      description: 'Manage content promotions, track revenue, and handle promotion requests.',
      icon: TrendingUp,
      color: 'green',
      actions: [
        { label: 'Manage Promotions', href: '/dashboard/admin/promotions', icon: TrendingUp },
        { label: 'Revenue', href: '/dashboard/admin/promotions/revenue', icon: DollarSign, variant: 'outline' as const },
        { label: 'Receipts', href: '/dashboard/admin/receipts', icon: Receipt, variant: 'outline' as const },
      ]
    }] : []),
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { icon: string; bg: string; border: string; gradient: string }> = {
      orange: { icon: 'text-orange-500', bg: 'bg-primary/10', border: 'border-orange-500/20', gradient: 'from-orange-500/20 to-orange-600/10' },
      blue: { icon: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', gradient: 'from-primary/20 to-primary/10' },
      emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', gradient: 'from-emerald-500/20 to-emerald-600/10' },
      violet: { icon: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20', gradient: 'from-violet-500/20 to-violet-600/10' },
      green: { icon: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', gradient: 'from-green-500/20 to-green-600/10' },
      purple: { icon: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', gradient: 'from-purple-500/20 to-purple-600/10' },
      yellow: { icon: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', gradient: 'from-yellow-500/20 to-yellow-600/10' },
    }
    return colors[color] || colors.orange
  }

  return (
    <AdminLayout
      pageTitle="Overview"
      pageSubtitle={isSuperAdmin ? "Super Admin" : "Admin"}
      PageIcon={RiDashboardLine}
      onRefresh={fetchStats}
      refreshLoading={loading}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-400 break-words">{error}</p>
                </div>
              </div>
            )}

            {/* Welcome Section */}
            <div className="mb-8">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">
                      Welcome back, {user?.firstName || user?.email?.split('@')[0]}!
                    </h1>
                    <p className="text-muted-foreground">Manage your platform and monitor activity</p>
                  </div>
                  <Button 
                    onClick={() => fetchStats()} 
                    variant="outline"
                    disabled={loading}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh Stats
                  </Button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && !stats && (
              <div className="space-y-4 py-8 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border p-6 bg-card h-28" />
                  ))}
                </div>
                <div className="h-48 rounded-2xl bg-muted border border-border" />
              </div>
            )}

            {/* Stats Overview - Bento Grid Design */}
            {stats && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {/* Total Users - Large Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-primary/20 to-primary/10",
                    "border-primary/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-2 lg:col-span-2"
                  )}>
                    <div className="flex items-start justify-between h-full">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Total Users</p>
                        <p className="text-5xl font-bold text-primary mb-2">
                          {(stats?.totalUsers || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">All registered users</p>
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <Users className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                  </div>

                  {/* Pending Users - Medium Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-yellow-500/20 to-yellow-600/10",
                    "border-yellow-500/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-1 lg:col-span-1"
                  )}>
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mb-4">
                        <Clock className="w-6 h-6 text-yellow-400" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Pending Users</p>
                      <p className="text-3xl font-bold text-yellow-400">
                        {(stats?.pendingUsers || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Pending Poster Approvals - Medium Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-orange-500/20 to-orange-600/10",
                    "border-orange-500/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-1 lg:col-span-1"
                  )}>
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 border border-orange-500/30 flex items-center justify-center mb-4">
                        <UserCheck className="w-6 h-6 text-orange-400" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Pending Poster Approvals</p>
                      <p className="text-3xl font-bold text-orange-400">
                        {pendingPosterApprovals.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Opportunity Seekers - Medium Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-purple-500/20 to-purple-600/10",
                    "border-purple-500/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-1 lg:col-span-1"
                  )}>
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-purple-400" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Opportunity Seekers</p>
                      <p className="text-3xl font-bold text-purple-400">
                        {(stats?.totalOpportunitySeekers || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Posters - Medium Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-emerald-500/20 to-emerald-600/10",
                    "border-emerald-500/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-1 lg:col-span-1"
                  )}>
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                        <UserCheck className="w-6 h-6 text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Posters</p>
                      <p className="text-3xl font-bold text-emerald-400">
                        {(stats?.totalPosters || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Opportunities - Medium Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-orange-500/20 to-orange-600/10",
                    "border-orange-500/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-1 lg:col-span-1"
                  )}>
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 border border-orange-500/30 flex items-center justify-center mb-4">
                        <Target className="w-6 h-6 text-orange-400" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Opportunities</p>
                      <p className="text-3xl font-bold text-orange-400">
                        {(stats?.totalOpportunities || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Events - Medium Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-emerald-500/20 to-emerald-600/10",
                    "border-emerald-500/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-1 lg:col-span-1"
                  )}>
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                        <Calendar className="w-6 h-6 text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Events</p>
                      <p className="text-3xl font-bold text-emerald-400">
                        {(stats?.totalEvents || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Jobs - Medium Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-primary/20 to-primary/10",
                    "border-primary/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-1 lg:col-span-1"
                  )}>
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Jobs</p>
                      <p className="text-3xl font-bold text-primary">
                        {(stats?.totalJobs || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Resources - Medium Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-violet-500/20 to-violet-600/10",
                    "border-violet-500/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-1 lg:col-span-1"
                  )}>
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-4">
                        <BookOpen className="w-6 h-6 text-violet-400" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Resources</p>
                      <p className="text-3xl font-bold text-violet-400">
                        {(stats?.totalResources || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {actionCards.map((card) => {
                    const Icon = card.icon
                    const colors = getColorClasses(card.color)
                    
                    return (
                      <Card key={card.title} className="bg-card border-border hover:bg-muted transition-colors">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-foreground">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg, colors.border, "border")}>
                              <Icon className={cn("h-5 w-5", colors.icon)} />
                            </div>
                            <span>{card.title}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">{card.description}</p>
                          <div className={cn(
                            "flex gap-2",
                            card.actions.length > 1 ? "flex-col" : "flex-row"
                          )}>
                            {card.actions.map((action) => {
                              const ActionIcon = action.icon
                              return (
                                <Button
                                  key={action.label}
                                  asChild
                                  size="sm"
                                  variant={action.variant || 'default'}
                                  className={cn(
                                    action.variant === 'outline'
                                      ? "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                      : "bg-primary hover:bg-primary/90",
                                    card.actions.length > 1 ? "w-full" : "flex-1"
                                  )}
                                >
                                  <Link href={action.href}>
                                    <ActionIcon className="h-4 w-4 mr-2" />
                                    {action.label}
                                  </Link>
                                </Button>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {/* System Settings - Only for Super Admin */}
                  {isSuperAdmin && (
                    <Card className="bg-card border-border hover:bg-muted transition-colors">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Settings className="h-5 w-5 text-purple-500" />
                          </div>
                          <span>System Settings</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Configure system settings, manage admins, and platform configuration.
                        </p>
                        <Button asChild size="sm" className="w-full bg-primary hover:bg-primary/90">
                          <Link href="/dashboard/admin/settings">
                            <Settings className="h-4 w-4 mr-2" />
                            System Settings
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </div>
    </AdminLayout>
  )
}
