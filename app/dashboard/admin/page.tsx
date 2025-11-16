"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Shield, 
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  MoreVertical,
  FileText,
  FolderOpen,
  Timer,
  Archive,
  Calendar
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [stats, setStats] = useState<any>(null)
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
    if (!isLoading && isAuthenticated && user) {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        setError('Access denied. Admin privileges required.')
        setLoading(false)
        return
      }
      fetchStats()
    }
  }, [isLoading, isAuthenticated, user])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const statsData = await ApiClient.getPlatformStats()
      setStats(statsData)
    } catch (error: any) {
      console.error('Error fetching admin stats:', error)
      setError(error.message || 'Failed to load admin dashboard')
      toast.error('Failed to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <p className="text-lg text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need admin or super admin privileges to access this page.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={fetchStats}>Try Again</Button>
        </div>
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'super_admin'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-orange-600" />
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              </div>
              <Badge variant={isSuperAdmin ? "destructive" : "secondary"}>
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={fetchStats}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  <Eye className="h-4 w-4 mr-2" />
                  User View
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opportunity Seekers</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.totalOpportunitySeekers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total seekers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posters</CardTitle>
              <UserCheck className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.totalPosters || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total posters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.totalOpportunities || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active (past excluded)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.totalEvents || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active (past excluded)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jobs</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.totalJobs || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active (past excluded)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resources</CardTitle>
              <FolderOpen className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.totalResources || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total resources
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-orange-600" />
                <span>User Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Manage user accounts, approve registrations, and handle user status.
              </p>
              <div className="flex space-x-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href="/dashboard/admin/users">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href="/dashboard/admin/users/pending">
                    <Clock className="h-4 w-4 mr-2" />
                    Pending
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Content Moderation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Review and approve content submissions, manage payment verification.
              </p>
              <Button asChild size="sm" className="w-full">
                <Link href="/dashboard/admin/content">
                  <FileText className="h-4 w-4 mr-2" />
                  Moderate Content
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-orange-600" />
                <span>Posters Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                View all opportunity posters, their onboarding status, uploaded documents, and approval status.
              </p>
              <Button asChild size="sm" className="w-full">
                <Link href="/dashboard/admin/business-upload">
                  <Users className="h-4 w-4 mr-2" />
                  View Posters Details
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Timer className="h-5 w-5 text-orange-600" />
                <span>Promotion Expiry</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Monitor and manage promotion expiry status, view statistics and manually expire promotions.
              </p>
              <Button asChild size="sm" className="w-full">
                <Link href="/dashboard/admin/promotion-expiry">
                  <Timer className="h-4 w-4 mr-2" />
                  Manage Expiry
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Archive className="h-5 w-5 text-purple-600" />
                <span>Past Posts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                View and manage posts that have been moved to past collections due to expiry. Never deleted for legal compliance.
              </p>
              <Button asChild size="sm" className="w-full">
                <Link href="/dashboard/admin/past-posts">
                  <Archive className="h-4 w-4 mr-2" />
                  View Past Posts
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                View platform statistics, user engagement, and content performance.
              </p>
              <Button asChild size="sm" className="w-full">
                <Link href="/dashboard/admin/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Promotion Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Manage content promotions, track revenue, and handle promotion requests.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href="/dashboard/admin/promotions">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Manage Promotions
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href="/dashboard/admin/promotions/revenue">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Revenue
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href="/dashboard/admin/receipts">
                    <FileText className="h-4 w-4 mr-2" />
                    Receipts
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {isSuperAdmin && (
            <>
              {/*  */}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    <span>System Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Configure system settings, manage admins, and platform configuration.
                  </p>
                  <Button asChild size="sm" className="w-full">
                    <Link href="/dashboard/admin/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      System Settings
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* User Statistics Breakdown
        {stats?.userStats && (
          <Card>
            <CardHeader>
              <CardTitle>User Statistics by Role & Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(stats.userStats).map(([key, count]) => {
                  const [role, status] = key.split('_')
                  const roleDisplay = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  const statusDisplay = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  
                  return (
                    <div key={key} className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-600">{roleDisplay}</div>
                      <div className="text-lg font-bold text-gray-900">{count as number}</div>
                      <div className="text-xs text-gray-500">{statusDisplay}</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )} */}
      </div>
    </div>
  )
}
