"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdminLayout } from "@/components/admin-sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RiEyeLine } from "react-icons/ri"
import {
  RiBarChartBoxLine,
  RiUserLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiCalendarLine,
  RiArrowLeftLine,
  RiErrorWarningLine,
  RiHeartLine,
  RiBookmarkLine,
  RiUserAddLine,
  RiFocus3Line,
  RiBriefcaseLine,
  RiBookOpenLine,
  RiFileLine,
  RiRefreshLine,
  RiTimeLine,
  RiMoneyDollarCircleLine,
  RiMessageLine,
  RiShareLine,
  RiDownloadLine,
  RiFilterLine,
} from "react-icons/ri"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import PageSkeleton from "@/components/skeletons/page-skeleton"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const BarChart3 = RiBarChartBoxLine
const Users = RiUserLine
const TrendingUp = RiArrowUpLine
const TrendingDown = RiArrowDownLine
const Calendar = RiCalendarLine
const ChevronLeft = RiArrowLeftLine
const AlertTriangle = RiErrorWarningLine
const Activity = RiArrowUpLine
const Eye = RiEyeLine
const Heart = RiHeartLine
const Bookmark = RiBookmarkLine
const UserPlus = RiUserAddLine
const Target = RiFocus3Line
const Briefcase = RiBriefcaseLine
const BookOpen = RiBookOpenLine
const FileText = RiFileLine
const RefreshCw = RiRefreshLine
const Clock = RiTimeLine
const DollarSign = RiMoneyDollarCircleLine
const ArrowUp = RiArrowUpLine
const ArrowDown = RiArrowDownLine
const Zap = RiArrowUpLine
const MessageCircle = RiMessageLine
const Share2 = RiShareLine
const Download = RiDownloadLine
const Filter = RiFilterLine

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

type TimeRange = '7d' | '30d' | '90d' | 'all'

export default function AdminAnalytics() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      fetchAnalytics()
    }
  }, [authLoading, isAuthenticated, user, timeRange])

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const statsData = await ApiClient.getPlatformStats()
      setStats(statsData)
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      setError(error.message || 'Failed to load analytics')
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  // Generate mock time series data for charts
  const generateTimeSeriesData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
    const data = []
    const now = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      // Generate realistic mock data based on stats
      const baseUsers = stats?.totalUsers || 1000
      const baseGrowth = stats?.recentRegistrations || 50
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date.toISOString().split('T')[0],
        users: Math.floor(baseUsers + (baseGrowth / days) * (days - i) + Math.random() * 20 - 10),
        registrations: Math.floor((baseGrowth / days) + Math.random() * 5),
        activeUsers: Math.floor((stats?.activeUsers || 500) * (0.8 + Math.random() * 0.4)),
        contentViews: Math.floor(1000 + Math.random() * 500),
        engagements: Math.floor(200 + Math.random() * 100),
        opportunities: Math.floor((stats?.totalOpportunities || 100) * (0.9 + Math.random() * 0.2)),
        events: Math.floor((stats?.totalEvents || 50) * (0.9 + Math.random() * 0.2)),
        jobs: Math.floor((stats?.totalJobs || 30) * (0.9 + Math.random() * 0.2)),
      })
    }
    
    return data
  }, [timeRange, stats])

  // Calculate user distribution by role
  const userDistributionData = useMemo(() => {
    if (!stats?.userStats) return []
    
    const distribution: Record<string, number> = {}
    Object.entries(stats.userStats).forEach(([key, count]) => {
      const [role] = key.split('_')
      if (role !== 'admin' && role !== 'super_admin') {
        distribution[role] = (distribution[role] || 0) + (count as number)
      }
    })
    
    return Object.entries(distribution).map(([role, count]) => ({
      name: role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
      role
    }))
  }, [stats])

  // Calculate status distribution
  const statusDistributionData = useMemo(() => {
    if (!stats?.userStats) return []
    
    const distribution: Record<string, number> = {}
    Object.entries(stats.userStats).forEach(([key, count]) => {
      const [, status] = key.split('_')
      distribution[status] = (distribution[status] || 0) + (count as number)
    })
    
    return Object.entries(distribution).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      status
    }))
  }, [stats])

  // Content type distribution
  const contentDistributionData = useMemo(() => {
    return [
      { name: 'Opportunities', value: stats?.totalOpportunities || 0, color: '#f97316' },
      { name: 'Events', value: stats?.totalEvents || 0, color: '#10b981' },
      { name: 'Jobs', value: stats?.totalJobs || 0, color: '#3b82f6' },
      { name: 'Resources', value: stats?.totalResources || 0, color: '#8b5cf6' },
    ]
  }, [stats])

  const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']

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

  // Calculate growth percentages
  const userGrowth = stats?.recentRegistrations && stats?.totalUsers 
    ? ((stats.recentRegistrations / stats.totalUsers) * 100).toFixed(1)
    : '0'
  
  const activationRate = stats?.dailyActiveUsers && stats?.totalUsers
    ? ((stats.dailyActiveUsers / stats.totalUsers) * 100).toFixed(1)
    : '0'

  const pendingRate = stats?.pendingUsers && stats?.totalUsers
    ? ((stats.pendingUsers / stats.totalUsers) * 100).toFixed(1)
    : '0'

  return (
    <AdminLayout
      pageTitle="Analytics"
      pageSubtitle="Platform insights"
      PageIcon={RiBarChartBoxLine}
      onRefresh={fetchAnalytics}
      refreshLoading={loading}
      backHref="/dashboard/admin"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Link href="/dashboard/admin" className="flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Link>
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
                    <p className="text-sm text-muted-foreground">Comprehensive insights and metrics</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                  <SelectTrigger className="w-32 rounded-2xl bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAnalytics()}
                  disabled={loading}
                  className="rounded-2xl border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Mobile Time Range Selector */}
            <div className="lg:hidden mb-4">
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <SelectTrigger className="w-full bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-400 break-words">{error}</p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && !stats && (
              <div className="space-y-4 py-8 animate-pulse">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-border p-5 bg-card h-24" />
                  ))}
                </div>
                <div className="h-64 rounded-xl bg-muted border border-border" />
              </div>
            )}

            {/* Analytics Content */}
            {stats && (
              <>
                {/* Key Metrics - Bento Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-xl border p-5 bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Total Users</p>
                      <Users className="w-5 h-5 text-primary/50" />
                    </div>
                    <p className="text-3xl font-bold text-primary mb-1">{(stats?.totalUsers || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>+{userGrowth}% growth</span>
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Daily Active Users</p>
                      <Activity className="w-5 h-5 text-emerald-400/50" />
                    </div>
                    <p className="text-3xl font-bold text-emerald-400 mb-1">{(stats?.dailyActiveUsers || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Users who engaged today</span>
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Pending Users</p>
                      <Clock className="w-5 h-5 text-yellow-400/50" />
                    </div>
                    <p className="text-3xl font-bold text-yellow-400 mb-1">{(stats?.pendingUsers || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{pendingRate}% of total</span>
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">New Registrations</p>
                      <UserPlus className="w-5 h-5 text-purple-400/50" />
                    </div>
                    <p className="text-3xl font-bold text-purple-400 mb-1">{(stats?.recentRegistrations || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Last 30 days</span>
                    </div>
                  </div>
                </div>

                {/* Daily Activity Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl border p-5 bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Daily Visitors</p>
                      <Eye className="w-5 h-5 text-indigo-400/50" />
                    </div>
                    <p className="text-3xl font-bold text-indigo-400 mb-1">{(stats?.dailyVisitors || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Total visits today</span>
                    </div>
                  </div>
                </div>

                {/* User Growth Chart - Large Bento */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-card border-border lg:col-span-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <TrendingUp className="h-5 w-5 text-orange-400" />
                          <span>User Growth Trend</span>
                        </CardTitle>
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : 'All time'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={generateTimeSeriesData}>
                          <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#ffffff40"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis 
                            stroke="#ffffff40"
                            style={{ fontSize: '12px' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#141414', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ color: '#ffffff60', fontSize: '12px' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="users" 
                            stroke="#f97316" 
                            fillOpacity={1} 
                            fill="url(#colorUsers)"
                            name="Total Users"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="registrations" 
                            stroke="#3b82f6" 
                            fillOpacity={1} 
                            fill="url(#colorRegistrations)"
                            name="New Registrations"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Content & Engagement Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {/* Content Distribution */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Target className="h-5 w-5 text-orange-400" />
                        <span>Content Distribution</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={contentDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {contentDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#141414', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {contentDistributionData.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-muted-foreground">{item.name}</span>
                            <span className="text-sm font-semibold text-foreground ml-auto">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* User Role Distribution */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Users className="h-5 w-5 text-primary" />
                        <span>Users by Role</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={userDistributionData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                          <XAxis type="number" stroke="#ffffff40" style={{ fontSize: '12px' }} />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            stroke="#ffffff40"
                            style={{ fontSize: '12px' }}
                            width={100}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#141414', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                          <Bar dataKey="value" fill="#f97316" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Engagement & Activity Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {/* Engagement Trend */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        <span>Engagement Trend</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={generateTimeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#ffffff40"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis 
                            stroke="#ffffff40"
                            style={{ fontSize: '12px' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#141414', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ color: '#ffffff60', fontSize: '12px' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="contentViews" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            name="Content Views"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="engagements" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            name="Engagements"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* User Status Distribution */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Activity className="h-5 w-5 text-emerald-400" />
                        <span>User Status Distribution</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={statusDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#141414', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {statusDistributionData.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                            <span className="text-xs font-semibold text-foreground ml-auto">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Content Performance - Large Bento */}
                <Card className="bg-card border-border mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <BarChart3 className="h-5 w-5 text-orange-400" />
                      <span>Content Performance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={generateTimeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#ffffff40"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#ffffff40"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#141414', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ color: '#ffffff60', fontSize: '12px' }}
                        />
                        <Bar dataKey="opportunities" stackId="a" fill="#f97316" name="Opportunities" />
                        <Bar dataKey="events" stackId="a" fill="#10b981" name="Events" />
                        <Bar dataKey="jobs" stackId="a" fill="#3b82f6" name="Jobs" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Detailed Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Opportunity Seekers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground mb-1">{(stats?.totalOpportunitySeekers || 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Total seekers</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Posters</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground mb-1">{(stats?.totalPosters || 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Total posters</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground mb-1">
                        {((stats?.totalOpportunities || 0) + (stats?.totalEvents || 0) + (stats?.totalJobs || 0) + (stats?.totalResources || 0)).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">All content types</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Platform Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-400 mb-1">{activationRate}%</div>
                      <p className="text-xs text-muted-foreground">Activation rate</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
    </AdminLayout>
  )
}
