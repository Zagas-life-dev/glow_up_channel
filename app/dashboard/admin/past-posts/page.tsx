'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { usePage } from '@/contexts/page-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Archive, 
  Calendar, 
  Users, 
  Briefcase, 
  BookOpen,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface PastPost {
  _id: string
  title: string
  description: string
  movedToPastAt: string
  pastStatus: string
  reason: string
  originalCollection: string
  // Opportunity specific
  category?: string
  type?: string
  provider?: string
  // Event specific
  eventType?: string
  organizer?: string
  // Job specific
  jobType?: string
  company?: string
  // Common fields
  location?: {
    country?: string
    city?: string
  }
  dates?: {
    applicationDeadline?: string
    startDate?: string
    endDate?: string
  }
}

interface PastPostsStats {
  pastOpportunities: number
  pastEvents: number
  pastJobs: number
  total: number
}

interface PastPostsData {
  posts: PastPost[]
  total: number
  hasMore: boolean
}

export default function PastPostsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [stats, setStats] = useState<PastPostsStats | null>(null)
  const [activeTab, setActiveTab] = useState('opportunities')
  const [posts, setPosts] = useState<PastPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pastStatusFilter, setPastStatusFilter] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  const [pagination, setPagination] = useState({ skip: 0, limit: 20, hasMore: false })

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

  // Fetch past posts statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/past-posts/stats', {
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
        throw new Error(data.message || 'Failed to fetch past posts statistics')
      }
    } catch (error) {
      console.error('Error fetching past posts stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch past posts statistics')
    }
  }

  // Fetch past posts
  const fetchPastPosts = async (collection: string, reset = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const skip = reset ? 0 : pagination.skip
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        skip: skip.toString()
      })

      if (pastStatusFilter) params.append('pastStatus', pastStatusFilter)
      if (reasonFilter) params.append('reason', reasonFilter)

      const response = await fetch(`/api/admin/past-posts/${collection}?${params}`, {
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
        const newPosts = reset ? data.data.posts : [...posts, ...data.data.posts]
        setPosts(newPosts)
        setPagination(prev => ({
          ...prev,
          skip: skip + data.data.posts.length,
          hasMore: data.data.hasMore
        }))
      } else {
        throw new Error(data.message || 'Failed to fetch past posts')
      }
    } catch (error) {
      console.error('Error fetching past posts:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch past posts')
      toast.error('Failed to fetch past posts')
    } finally {
      setLoading(false)
    }
  }

  // Manually check and move expired posts
  const handleCheckExpiredPosts = async () => {
    try {
      setRefreshing(true)
      
      const response = await fetch('/api/admin/past-posts/check', {
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
        toast.success('Expired posts check completed successfully')
        // Refresh stats and posts
        await fetchStats()
        await fetchPastPosts(activeTab, true)
      } else {
        throw new Error(data.message || 'Failed to check expired posts')
      }
    } catch (error) {
      console.error('Error checking expired posts:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to check expired posts')
    } finally {
      setRefreshing(false)
    }
  }

  // Load data on component mount and tab change
  useEffect(() => {
    if (isAuthenticated && user && ['admin', 'super_admin'].includes(user.role)) {
      fetchStats()
      fetchPastPosts(activeTab, true)
    }
  }, [isAuthenticated, user, activeTab])

  // Filter posts based on search term
  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.provider && post.provider.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.organizer && post.organizer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.company && post.company.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesSearch
  })

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid Date'
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'moved':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get collection icon
  const getCollectionIcon = (collection: string) => {
    switch (collection) {
      case 'opportunities':
        return <BookOpen className="w-4 h-4" />
      case 'events':
        return <Calendar className="w-4 h-4" />
      case 'jobs':
        return <Briefcase className="w-4 h-4" />
      default:
        return <Archive className="w-4 h-4" />
    }
  }

  // Show loading state
  if (isLoading && !posts.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading past posts...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Past Posts Management</h1>
          <p className="mt-2 text-gray-600">
            View and manage posts that have been moved to past collections due to expiry
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Button 
            onClick={handleCheckExpiredPosts} 
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Checking...' : 'Check Expired Posts'}
          </Button>
          
          <Button 
            onClick={() => {
              fetchStats()
              fetchPastPosts(activeTab, true)
            }} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Past Opportunities</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pastOpportunities}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Past Events</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pastEvents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Briefcase className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Past Jobs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pastJobs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Archive className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Past Posts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <Select value={pastStatusFilter} onValueChange={setPastStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="moved">Moved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <Select value={reasonFilter} onValueChange={setReasonFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All reasons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All reasons</SelectItem>
                    <SelectItem value="Application deadline passed">Application deadline passed</SelectItem>
                    <SelectItem value="Event end date passed">Event end date passed</SelectItem>
                    <SelectItem value="Manually moved to past">Manually moved to past</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Past Posts Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value)
          setPosts([])
          setPagination({ skip: 0, limit: 20, hasMore: false })
        }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="opportunities" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Opportunities ({stats?.pastOpportunities || 0})
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Events ({stats?.pastEvents || 0})
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Jobs ({stats?.pastJobs || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {error ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <Button onClick={() => fetchPastPosts(activeTab, true)} variant="outline">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : filteredPosts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Past Posts Found</h3>
                  <p className="text-gray-600">
                    {searchTerm || pastStatusFilter || reasonFilter 
                      ? 'No posts match your current filters.' 
                      : 'No posts have been moved to past collections yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <Card key={post._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getCollectionIcon(post.originalCollection)}
                            <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                            <Badge className={getStatusColor(post.pastStatus)}>
                              {post.pastStatus}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 mb-3 line-clamp-2">{post.description}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Moved: {formatDate(post.movedToPastAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              {post.reason}
                            </div>
                            {post.location?.city && (
                              <div className="flex items-center gap-1">
                                <span>📍</span>
                                {post.location.city}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {pagination.hasMore && (
                  <div className="text-center mt-6">
                    <Button 
                      onClick={() => fetchPastPosts(activeTab, false)}
                      disabled={loading}
                      variant="outline"
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


