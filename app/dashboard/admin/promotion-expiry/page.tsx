'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { usePage } from '@/contexts/page-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  Calendar,
  RefreshCw,
  TrendingUp,
  Users,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'

interface ExpiryStats {
  statusBreakdown: Array<{
    _id: string
    count: number
    totalInvestment: number
  }>
  activeCount: number
  expiringToday: number
  expiringThisWeek: number
  totalActiveInvestment: number
}

export default function PromotionExpiryPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [stats, setStats] = useState<ExpiryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
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

  // Auth check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/auth/login'
      return
    }
    
    if (!isLoading && user && !['admin', 'super_admin'].includes(user.role)) {
      window.location.href = '/dashboard'
      return
    }
  }, [isAuthenticated, isLoading, user])

  // Fetch expiry statistics
  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/promotions/expiry/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      } else {
        throw new Error(data.message || 'Failed to fetch expiry statistics')
      }
    } catch (error) {
      console.error('Error fetching expiry stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch expiry statistics')
      toast.error('Failed to fetch expiry statistics')
    } finally {
      setLoading(false)
    }
  }

  // Manually check and expire promotions
  const handleCheckExpiry = async () => {
    try {
      setRefreshing(true)
      
      const response = await fetch('/api/admin/promotions/expiry/check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success('Promotion expiry check completed successfully')
        // Refresh stats after checking
        await fetchStats()
      } else {
        throw new Error(data.message || 'Failed to check promotion expiry')
      }
    } catch (error) {
      console.error('Error checking promotion expiry:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to check promotion expiry')
    } finally {
      setRefreshing(false)
    }
  }

  // Load stats on component mount
  useEffect(() => {
    if (isAuthenticated && user && ['admin', 'super_admin'].includes(user.role)) {
      fetchStats()
    }
  }, [isAuthenticated, user])

  // Show loading state
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading promotion expiry data...</p>
        </div>
      </div>
    )
  }

  // Show access denied
  if (!isAuthenticated || !user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchStats} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Promotion Expiry Management</h1>
          <p className="mt-2 text-gray-600">
            Monitor and manage promotion expiry status and statistics
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Button 
            onClick={handleCheckExpiry} 
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Checking...' : 'Check & Expire Now'}
          </Button>
          
          <Button 
            onClick={fetchStats} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Refresh Stats
          </Button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Promotions</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Expiring Today</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.expiringToday}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Expiring This Week</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.expiringThisWeek}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Active Investment</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats.totalActiveInvestment)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status Breakdown */}
        {stats && stats.statusBreakdown && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Promotion Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.statusBreakdown.map((status) => (
                  <div key={status._id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getStatusColor(status._id)}>
                        {status._id.charAt(0).toUpperCase() + status._id.slice(1)}
                      </Badge>
                      <span className="text-2xl font-bold text-gray-900">
                        {status.count}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Investment: {formatCurrency(status.totalInvestment)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {stats && stats.expiringToday > 0 && (
          <Alert className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{stats.expiringToday}</strong> promotion{stats.expiringToday !== 1 ? 's' : ''} 
              {' '}expiring today. Consider checking for any that need manual review.
            </AlertDescription>
          </Alert>
        )}

        {stats && stats.expiringThisWeek > 0 && (
          <Alert className="mb-8">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>{stats.expiringThisWeek}</strong> promotion{stats.expiringThisWeek !== 1 ? 's' : ''} 
              {' '}expiring this week. Monitor these closely.
            </AlertDescription>
          </Alert>
        )}

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              How Promotion Expiry Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Automatic Expiry</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Promotions automatically expire after their duration period</li>
                  <li>• System checks every hour for expired promotions</li>
                  <li>• Expired promotions are marked as 'completed'</li>
                  <li>• No manual intervention required</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Manual Management</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use "Check & Expire Now" for immediate processing</li>
                  <li>• Monitor expiring promotions in the dashboard</li>
                  <li>• View detailed statistics and investment tracking</li>
                  <li>• Get alerts for promotions expiring soon</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


