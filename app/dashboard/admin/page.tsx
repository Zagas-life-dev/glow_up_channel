"use client"

import { useState, useEffect, useCallback } from "react"
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
  Users, 
  UserCheck, 
  TrendingUp, 
  Shield, 
  Settings,
  BarChart3,
  AlertTriangle,
  Clock,
  Eye,
  MoreVertical,
  FileText,
  FolderOpen,
  Timer,
  Archive,
  Calendar,
  RefreshCw,
  Home,
  LayoutDashboard,
  DollarSign,
  Receipt,
  Target,
  Briefcase,
  BookOpen,
  Menu,
  X
} from "lucide-react"
import { toast } from "sonner"
import { cn } from '@/lib/utils'

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
  const router = useRouter()
  const pathname = usePathname()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading admin dashboard...</p>
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

  // Calculate pending poster approvals from userStats
  const pendingPosterApprovals = stats?.userStats?.['opportunity_poster_pending'] || 0

  const statBanners = [
    { 
      label: 'Total Users', 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      gradient: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-400'
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
      gradient: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-400'
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
    {
      title: 'User Management',
      description: 'Manage user accounts, approve registrations, and handle user status.',
      icon: Users,
      color: 'orange',
      actions: [
        { label: 'Manage Users', href: '/dashboard/admin/users', icon: Users },
        { label: 'Pending', href: '/dashboard/admin/users/pending', icon: Clock, variant: 'outline' as const },
      ]
    },
    {
      title: 'Content Moderation',
      description: 'Review and approve content submissions, manage payment verification.',
      icon: FileText,
      color: 'blue',
      actions: [
        { label: 'Moderate Content', href: '/dashboard/admin/content', icon: FileText },
      ]
    },
    {
      title: 'Posters Details',
      description: 'View all opportunity posters, their onboarding status, uploaded documents, and approval status.',
      icon: UserCheck,
      color: 'orange',
      actions: [
        { label: 'View Posters Details', href: '/dashboard/admin/business-upload', icon: Users },
      ]
    },
    {
      title: 'Promotion Expiry',
      description: 'Monitor and manage promotion expiry status, view statistics and manually expire promotions.',
      icon: Timer,
      color: 'orange',
      actions: [
        { label: 'Manage Expiry', href: '/dashboard/admin/promotion-expiry', icon: Timer },
      ]
    },
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
      color: 'blue',
      actions: [
        { label: 'View Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
      ]
    },
    {
      title: 'Promotion Management',
      description: 'Manage content promotions, track revenue, and handle promotion requests.',
      icon: TrendingUp,
      color: 'green',
      actions: [
        { label: 'Manage Promotions', href: '/dashboard/admin/promotions', icon: TrendingUp },
        { label: 'Revenue', href: '/dashboard/admin/promotions/revenue', icon: DollarSign, variant: 'outline' as const },
        { label: 'Receipts', href: '/dashboard/admin/receipts', icon: Receipt, variant: 'outline' as const },
      ]
    },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { icon: string; bg: string; border: string; gradient: string }> = {
      orange: { icon: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', gradient: 'from-orange-500/20 to-orange-600/10' },
      blue: { icon: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', gradient: 'from-blue-500/20 to-blue-600/10' },
      emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', gradient: 'from-emerald-500/20 to-emerald-600/10' },
      violet: { icon: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20', gradient: 'from-violet-500/20 to-violet-600/10' },
      green: { icon: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', gradient: 'from-green-500/20 to-green-600/10' },
      purple: { icon: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', gradient: 'from-purple-500/20 to-purple-600/10' },
      yellow: { icon: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', gradient: 'from-yellow-500/20 to-yellow-600/10' },
    }
    return colors[color] || colors.orange
  }

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
            const isActive = pathname === item.href || (item.id === 'overview' && pathname === '/dashboard/admin')
            
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
                onClick={() => setSidebarOpen(!sidebarOpen)}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-white/60"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Admin Hub</h1>
                <p className="text-xs text-white/50">{isSuperAdmin ? 'Super Admin' : 'Admin'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => fetchStats()} 
                variant="ghost" 
                size="sm"
                disabled={loading}
                className="h-9 w-9 p-0 text-white/60"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              
              {/* Quick Actions Dropdown */}
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
                    <Link href="/dashboard/admin/user-management" className="flex items-center gap-3 w-full">
                      <Users className="h-4 w-4 text-orange-400" />
                      <span>User Management</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-white hover:bg-white/[0.08] rounded-lg cursor-pointer focus:bg-white/[0.08] focus:text-white">
                    <Link href="/dashboard/admin/settings" className="flex items-center gap-3 w-full">
                      <Settings className="h-4 w-4 text-orange-400" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
                  <DropdownMenuItem asChild className="text-white hover:bg-white/[0.08] rounded-lg cursor-pointer focus:bg-white/[0.08] focus:text-white">
                    <Link href="/" className="flex items-center gap-3 w-full">
                      <Home className="h-4 w-4 text-orange-400" />
                      <span>Home</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Sidebar Drawer */}
          {sidebarOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="fixed left-0 top-14 bottom-20 w-64 bg-[#0a0a0a] border-r border-white/[0.06] z-40 overflow-y-auto lg:hidden">
                <div className="p-4 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || (item.id === 'overview' && pathname === '/dashboard/admin')
                    
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
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
                  
                  <div className="pt-4 mt-4 border-t border-white/[0.06] space-y-2">
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
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Link href={link.href}>
                            <Icon className="w-4 h-4 mr-2" />
                            {link.label}
                          </Link>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
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
                    <h1 className="text-2xl font-bold text-white mb-1">
                      Welcome back, {user?.firstName || user?.email?.split('@')[0]}!
                    </h1>
                    <p className="text-white/60">Manage your platform and monitor activity</p>
                  </div>
                  <Button 
                    onClick={() => fetchStats()} 
                    variant="outline"
                    disabled={loading}
                    className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Refresh Stats
                  </Button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && !stats && (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-white/60">Loading dashboard data...</p>
              </div>
            )}

            {/* Stats Overview - Bento Grid Design */}
            {stats && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {/* Total Users - Large Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-blue-500/20 to-blue-600/10",
                    "border-blue-500/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-2 lg:col-span-2"
                  )}>
                    <div className="flex items-start justify-between h-full">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white/70 mb-2">Total Users</p>
                        <p className="text-5xl font-bold text-blue-400 mb-2">
                          {(stats?.totalUsers || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-white/50">All registered users</p>
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                        <Users className="w-8 h-8 text-blue-400" />
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
                      <p className="text-sm font-medium text-white/70 mb-2">Pending Users</p>
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
                      <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-4">
                        <UserCheck className="w-6 h-6 text-orange-400" />
                      </div>
                      <p className="text-sm font-medium text-white/70 mb-2">Pending Poster Approvals</p>
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
                      <p className="text-sm font-medium text-white/70 mb-2">Opportunity Seekers</p>
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
                      <p className="text-sm font-medium text-white/70 mb-2">Posters</p>
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
                      <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-4">
                        <Target className="w-6 h-6 text-orange-400" />
                      </div>
                      <p className="text-sm font-medium text-white/70 mb-2">Opportunities</p>
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
                      <p className="text-sm font-medium text-white/70 mb-2">Events</p>
                      <p className="text-3xl font-bold text-emerald-400">
                        {(stats?.totalEvents || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Jobs - Medium Panel */}
                  <div className={cn(
                    "rounded-2xl border p-6 bg-gradient-to-br",
                    "from-blue-500/20 to-blue-600/10",
                    "border-blue-500/30",
                    "hover:opacity-90 transition-opacity",
                    "sm:col-span-1 lg:col-span-1"
                  )}>
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-4">
                        <Briefcase className="w-6 h-6 text-blue-400" />
                      </div>
                      <p className="text-sm font-medium text-white/70 mb-2">Jobs</p>
                      <p className="text-3xl font-bold text-blue-400">
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
                      <p className="text-sm font-medium text-white/70 mb-2">Resources</p>
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
                      <Card key={card.title} className="bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-white">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg, colors.border, "border")}>
                              <Icon className={cn("h-5 w-5", colors.icon)} />
                            </div>
                            <span>{card.title}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-white/60">{card.description}</p>
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
                                      ? "border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                                      : "bg-orange-500 hover:bg-orange-600",
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
                    <Card className="bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Settings className="h-5 w-5 text-purple-500" />
                          </div>
                          <span>System Settings</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-white/60">
                          Configure system settings, manage admins, and platform configuration.
                        </p>
                        <Button asChild size="sm" className="w-full bg-orange-500 hover:bg-orange-600">
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
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/[0.06] z-30">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.id === 'overview' && pathname === '/dashboard/admin')
              
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
