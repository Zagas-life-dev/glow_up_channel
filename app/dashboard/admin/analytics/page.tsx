"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  AlertTriangle,
  Activity,
  Eye,
  Heart,
  Bookmark,
  UserPlus,
  Target,
  Briefcase,
  BookOpen,
  Shield,
  Settings,
  Home,
  LayoutDashboard,
  FileText,
  RefreshCw,
  MoreVertical,
  Menu,
  X,
  Clock,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Zap,
  MessageCircle,
  Share2,
  Download,
  Filter
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
  ResponsiveContainer
} from "recharts"

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
  const router = useRouter()
  const pathname = usePathname()
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/60 mb-6">
            You need admin or super admin privileges to access this page.
          </p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 rounded-xl">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'super_admin'

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard/admin' },
    { id: 'users', label: 'Users', icon: Users, href: '/dashboard/admin/users' },
    { id: 'content', label: 'Content', icon: FileText, href: '/dashboard/admin/content' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard/admin/analytics' },
  ]

  const quickLinks = [
    { label: 'User Management', icon: Users, href: '/dashboard/admin/user-management', variant: 'default' as const },
    { label: 'Settings', icon: Settings, href: '/dashboard/admin/settings', variant: 'outline' as const },
    { label: 'Home', icon: Home, href: '/', variant: 'outline' as const },
  ]

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
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/[0.06] bg-[#0a0a0a] fixed left-0 top-0 bottom-0 h-screen overflow-y-auto">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Admin Hub</h1>
              <p className="text-xs text-white/50">Platform Management</p>
            </div>
          </div>
          
          {/* User Info */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-white truncate flex-1 min-w-0">
                {user?.firstName || user?.email?.split('@')[0]}
              </p>
              <Badge 
                variant={isSuperAdmin ? "destructive" : "secondary"} 
                className="text-xs ml-2 flex-shrink-0"
              >
                {isSuperAdmin ? "Super" : "Admin"}
              </Badge>
            </div>
            <p className="text-xs text-white/50 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.id === 'analytics' && pathname?.includes('/dashboard/admin/analytics'))
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive 
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" 
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-orange-400")} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-white/[0.06] space-y-2 flex-shrink-0">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Button
                key={link.label}
                asChild
                variant={link.variant}
                className={cn(
                  "w-full justify-start",
                  link.variant === 'default' 
                    ? "bg-orange-500 hover:bg-orange-600" 
                    : "border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                <Link href={link.href}>
                  <Icon className="w-4 h-4 mr-2" />
                  {link.label}
                </Link>
              </Button>
            )
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/dashboard/admin')}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-white/60"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Analytics</h1>
                <p className="text-xs text-white/50">Platform insights</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => fetchAnalytics()} 
                variant="ghost" 
                size="sm"
                disabled={loading}
                className="h-9 w-9 p-0 text-white/60"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 w-9 p-0 text-white/60"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 bg-[#141414] border-white/[0.08] rounded-xl p-2 shadow-xl"
                >
                  <DropdownMenuItem asChild className="text-white hover:bg-white/[0.08] rounded-lg cursor-pointer focus:bg-white/[0.08] focus:text-white">
                    <Link href="/dashboard/admin" className="flex items-center gap-3 w-full">
                      <Home className="h-4 w-4 text-orange-400" />
                      <span>Back to Admin</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/[0.05]"
                >
                  <Link href="/dashboard/admin">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to Admin
                  </Link>
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
                    <p className="text-sm text-white/50">Comprehensive insights and metrics</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                  <SelectTrigger className="w-32 bg-white/[0.03] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-white/10">
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
                  className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Mobile Time Range Selector */}
            <div className="lg:hidden mb-4">
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <SelectTrigger className="w-full bg-white/[0.03] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10">
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
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-white/60">Loading analytics data...</p>
              </div>
            )}

            {/* Analytics Content */}
            {stats && (
              <>
                {/* Key Metrics - Bento Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-xl border p-5 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-white/70">Total Users</p>
                      <Users className="w-5 h-5 text-blue-400/50" />
                    </div>
                    <p className="text-3xl font-bold text-blue-400 mb-1">{(stats?.totalUsers || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>+{userGrowth}% growth</span>
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-white/70">Daily Active Users</p>
                      <Activity className="w-5 h-5 text-emerald-400/50" />
                    </div>
                    <p className="text-3xl font-bold text-emerald-400 mb-1">{(stats?.dailyActiveUsers || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <span>Users who engaged today</span>
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-white/70">Pending Users</p>
                      <Clock className="w-5 h-5 text-yellow-400/50" />
                    </div>
                    <p className="text-3xl font-bold text-yellow-400 mb-1">{(stats?.pendingUsers || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <span>{pendingRate}% of total</span>
                    </div>
                  </div>

                  <div className="rounded-xl border p-5 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-white/70">New Registrations</p>
                      <UserPlus className="w-5 h-5 text-purple-400/50" />
                    </div>
                    <p className="text-3xl font-bold text-purple-400 mb-1">{(stats?.recentRegistrations || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <span>Last 30 days</span>
                    </div>
                  </div>
                </div>

                {/* Daily Activity Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl border p-5 bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 hover:opacity-90 transition-opacity">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-white/70">Daily Visitors</p>
                      <Eye className="w-5 h-5 text-indigo-400/50" />
                    </div>
                    <p className="text-3xl font-bold text-indigo-400 mb-1">{(stats?.dailyVisitors || 0).toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <span>Total visits today</span>
                    </div>
                  </div>
                </div>

                {/* User Growth Chart - Large Bento */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <Card className="bg-white/[0.02] border-white/[0.06] lg:col-span-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-white">
                          <TrendingUp className="h-5 w-5 text-orange-400" />
                          <span>User Growth Trend</span>
                        </CardTitle>
                        <Badge variant="outline" className="border-white/10 text-white/60">
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
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
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
                            <span className="text-sm text-white/70">{item.name}</span>
                            <span className="text-sm font-semibold text-white ml-auto">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* User Role Distribution */}
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Users className="h-5 w-5 text-blue-400" />
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
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
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
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
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
                            <span className="text-xs text-white/70">{item.name}</span>
                            <span className="text-xs font-semibold text-white ml-auto">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Content Performance - Large Bento */}
                <Card className="bg-white/[0.02] border-white/[0.06] mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
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
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-white/70">Opportunity Seekers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white mb-1">{(stats?.totalOpportunitySeekers || 0).toLocaleString()}</div>
                      <p className="text-xs text-white/50">Total seekers</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-white/70">Posters</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white mb-1">{(stats?.totalPosters || 0).toLocaleString()}</div>
                      <p className="text-xs text-white/50">Total posters</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-white/70">Total Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white mb-1">
                        {((stats?.totalOpportunities || 0) + (stats?.totalEvents || 0) + (stats?.totalJobs || 0) + (stats?.totalResources || 0)).toLocaleString()}
                      </div>
                      <p className="text-xs text-white/50">All content types</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-white/70">Platform Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-400 mb-1">{activationRate}%</div>
                      <p className="text-xs text-white/50">Activation rate</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/[0.06] z-30">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.id === 'analytics' && pathname?.includes('/dashboard/admin/analytics'))
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-0 flex-1",
                    isActive 
                      ? "text-orange-400" 
                      : "text-white/50"
                  )}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-orange-400")} />
                  <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
