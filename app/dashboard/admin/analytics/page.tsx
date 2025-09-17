"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Calendar,
  ChevronLeft,
  AlertTriangle,
  Activity,
  Eye,
  Heart,
  Bookmark,
  UserPlus
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function AdminAnalytics() {
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
      fetchAnalytics()
    }
  }, [isLoading, isAuthenticated, user])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const statsData = await ApiClient.getPlatformStats()
      setStats(statsData)
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      setError(error.message || 'Failed to load analytics')
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <BarChart3 className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <p className="text-lg text-gray-600">Loading analytics...</p>
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
          <Button onClick={fetchAnalytics}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/admin">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={fetchAnalytics}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                All registered users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.activeUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats?.pendingUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.recentRegistrations || 0}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Statistics Breakdown */}
        {stats?.userStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  <span>Users by Role</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.userStats).map(([key, count]) => {
                    const [role, status] = key.split('_')
                    if (status !== 'approved') return null
                    
                    const roleDisplay = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    const percentage = stats.totalUsers > 0 ? Math.round((count as number / stats.totalUsers) * 100) : 0
                    
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">{roleDisplay}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{percentage}%</span>
                          <Badge variant="outline">{count as number}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span>Users by Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.userStats).map(([key, count]) => {
                    const [role, status] = key.split('_')
                    if (role !== 'opportunity_seeker') return null
                    
                    const statusDisplay = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    const percentage = stats.totalUsers > 0 ? Math.round((count as number / stats.totalUsers) * 100) : 0
                    
                    const statusColors = {
                      'approved': 'bg-green-500',
                      'pending': 'bg-orange-500',
                      'rejected': 'bg-red-500'
                    }
                    
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}`}></div>
                          <span className="text-sm font-medium text-gray-700">{statusDisplay}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{percentage}%</span>
                          <Badge variant="outline">{count as number}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Platform Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Platform Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {stats?.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                </div>
                <p className="text-sm text-gray-600">User Activation Rate</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.activeUsers || 0} of {stats?.totalUsers || 0} users are active
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {stats?.totalUsers > 0 ? Math.round((stats.pendingUsers / stats.totalUsers) * 100) : 0}%
                </div>
                <p className="text-sm text-gray-600">Pending Approval Rate</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.pendingUsers || 0} users awaiting review
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {stats?.recentRegistrations || 0}
                </div>
                <p className="text-sm text-gray-600">Monthly Growth</p>
                <p className="text-xs text-gray-500 mt-1">
                  New registrations in the last 30 days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button asChild variant="outline" className="h-auto p-4">
                  <Link href="/dashboard/admin/users/pending">
                    <div className="text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                      <div className="font-medium">Review Pending Users</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {stats?.pendingUsers || 0} users need approval
                      </div>
                    </div>
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="h-auto p-4">
                  <Link href="/dashboard/admin/users">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="font-medium">Manage All Users</div>
                      <div className="text-sm text-gray-500 mt-1">
                        View and manage user accounts
                      </div>
                    </div>
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="h-auto p-4">
                  <Link href="/dashboard/admin">
                    <div className="text-center">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <div className="font-medium">Admin Dashboard</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Return to main admin panel
                      </div>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
