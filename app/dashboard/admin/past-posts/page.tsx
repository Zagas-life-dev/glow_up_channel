"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Archive,
  Calendar,
  Briefcase,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Shield,
  Clock,
  Filter,
  X
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type CollectionType = 'opportunities' | 'events' | 'jobs'

export default function PastPostsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  
  const [activeTab, setActiveTab] = useState<CollectionType>('opportunities')
  const [stats, setStats] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [limit] = useState(20)
  const [searchQuery, setSearchQuery] = useState("")
  const [pastStatusFilter, setPastStatusFilter] = useState<string>("all")

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

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'super_admin')) {
      fetchPosts()
    }
  }, [activeTab, currentPage, pastStatusFilter, isAuthenticated, user])

  useEffect(() => {
    if (pastStatusFilter !== 'all') {
      setCurrentPage(1)
    }
  }, [pastStatusFilter])

  const fetchStats = async () => {
    try {
      const statsData = await ApiClient.getPastPostsStats()
      setStats(statsData)
    } catch (error: any) {
      console.error('Error fetching past posts stats:', error)
      toast.error('Failed to load past posts statistics')
    }
  }

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const skip = (currentPage - 1) * limit
      const filters: any = {}
      
      if (pastStatusFilter !== 'all') {
        filters.pastStatus = pastStatusFilter
      }

      const result = await ApiClient.getPastPosts(activeTab, {
        limit,
        skip,
        ...filters
      })
      
      // Filter by search query if provided
      let filteredPosts = result.posts
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filteredPosts = result.posts.filter((post: any) => {
          const title = post.title?.toLowerCase() || ''
          const description = post.description?.toLowerCase() || ''
          const reason = post.reason?.toLowerCase() || ''
          return title.includes(query) || description.includes(query) || reason.includes(query)
        })
      }

      setPosts(filteredPosts)
      setTotal(result.total)
    } catch (error: any) {
      console.error('Error fetching past posts:', error)
      setError(error.message || 'Failed to load past posts')
      toast.error('Failed to load past posts')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchPosts()
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setCurrentPage(1)
    fetchPosts()
  }

  const totalPages = Math.ceil(total / limit)

  if (isLoading && !posts.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Archive className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <p className="text-lg text-gray-600">Loading past posts...</p>
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

  const getCollectionIcon = (collection: CollectionType) => {
    switch (collection) {
      case 'opportunities':
        return <Briefcase className="h-5 w-5" />
      case 'events':
        return <Calendar className="h-5 w-5" />
      case 'jobs':
        return <FileText className="h-5 w-5" />
    }
  }

  const getCollectionName = (collection: CollectionType) => {
    switch (collection) {
      case 'opportunities':
        return 'Opportunities'
      case 'events':
        return 'Events'
      case 'jobs':
        return 'Jobs'
    }
  }

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Archive className="h-8 w-8 text-orange-600" />
                <h1 className="text-2xl font-bold text-gray-900">Past Posts</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/admin">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Past Opportunities</CardTitle>
                <Briefcase className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pastOpportunities || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Moved to past_opportunities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Past Events</CardTitle>
                <Calendar className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pastEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Moved to past_events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Past Jobs</CardTitle>
                <FileText className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pastJobs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Moved to past_jobs
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex space-x-2">
                {(['opportunities', 'events', 'jobs'] as CollectionType[]).map((collection) => (
                  <Button
                    key={collection}
                    variant={activeTab === collection ? "default" : "outline"}
                    onClick={() => {
                      setActiveTab(collection)
                      setCurrentPage(1)
                      setSearchQuery("")
                    }}
                    className="flex items-center space-x-2"
                  >
                    {getCollectionIcon(collection)}
                    <span>{getCollectionName(collection)}</span>
                    {stats && (
                      <Badge variant="secondary" className="ml-2">
                        {collection === 'opportunities' ? stats.pastOpportunities || 0 :
                         collection === 'events' ? stats.pastEvents || 0 :
                         stats.pastJobs || 0}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch()
                      }
                    }}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select value={pastStatusFilter} onValueChange={setPastStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="moved">Manually Moved</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Posts List */}
        {error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">Error</p>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchPosts}>Try Again</Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
                <Archive className="w-6 h-6 text-orange-600 animate-pulse" />
              </div>
              <p className="text-gray-600">Loading posts...</p>
            </CardContent>
          </Card>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">No Past Posts Found</p>
              <p className="text-gray-600">
                {searchQuery
                  ? `No ${getCollectionName(activeTab).toLowerCase()} match your search criteria.`
                  : `No past ${getCollectionName(activeTab).toLowerCase()} found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {posts.map((post: any) => (
                <Card key={post._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{post.title || 'Untitled'}</h3>
                          <Badge variant={post.pastStatus === 'expired' ? 'destructive' : 'secondary'}>
                            {post.pastStatus === 'expired' ? 'Expired' : 'Moved'}
                          </Badge>
                        </div>
                        {post.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {post.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Moved: {formatDate(post.movedToPastAt)}</span>
                          </div>
                          {post.reason && (
                            <div className="flex items-center space-x-1">
                              <Archive className="h-3 w-3" />
                              <span>{post.reason}</span>
                            </div>
                          )}
                          {activeTab === 'opportunities' && post.dates?.applicationDeadline && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Deadline was: {formatDate(post.dates.applicationDeadline)}</span>
                            </div>
                          )}
                          {activeTab === 'events' && post.dates?.endDate && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Ended: {formatDate(post.dates.endDate)}</span>
                            </div>
                          )}
                          {activeTab === 'jobs' && post.dates?.applicationDeadline && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Deadline was: {formatDate(post.dates.applicationDeadline)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)} of {total} posts
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

