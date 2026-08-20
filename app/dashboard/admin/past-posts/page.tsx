"use client"

import { useState, useEffect, useMemo } from "react"
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
import { AdminShell } from "@/components/admin/admin-shell"
import {
  AdminStat,
  AdminStatGrid,
  AdminToolbar,
  AdminTabs,
  AdminEmpty,
  AdminCard,
  AdminSkeletonRows,
  StatusPill,
} from "@/components/admin/ui"

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

  const totalPages = Math.ceil(total / limit)

  /**
   * Search narrows the page already loaded rather than re-querying: the API paginates the
   * unfiltered set, so a server round-trip per keystroke would still only ever search one page.
   */
  const visiblePosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return posts
    return posts.filter((post: any) =>
      [post.title, post.description, post.reason]
        .some((field: string | undefined) => (field || '').toLowerCase().includes(query))
    )
  }, [posts, searchQuery])

  if (isLoading && !posts.length) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Archive className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <p className="text-lg text-muted-foreground">Loading past posts...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
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
    <AdminShell
      title="Past posts"
      description="Posts moved to past collections after expiry. Retained, never deleted, for legal compliance."
      onRefresh={fetchPosts}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-5">
        {/* Counts double as the collection switcher */}
        {stats ? (
          <AdminStatGrid className="lg:grid-cols-3">
            <AdminStat
              label="Past opportunities"
              value={(stats.pastOpportunities || 0).toLocaleString()}
              hint="past_opportunities"
              icon={Briefcase}
              emphasis={activeTab === 'opportunities' ? 'attention' : 'none'}
            />
            <AdminStat
              label="Past events"
              value={(stats.pastEvents || 0).toLocaleString()}
              hint="past_events"
              icon={Calendar}
              emphasis={activeTab === 'events' ? 'attention' : 'none'}
            />
            <AdminStat
              label="Past jobs"
              value={(stats.pastJobs || 0).toLocaleString()}
              hint="past_jobs"
              icon={FileText}
              emphasis={activeTab === 'jobs' ? 'attention' : 'none'}
            />
          </AdminStatGrid>
        ) : null}

        <div className="space-y-3">
          <AdminTabs
            value={activeTab}
            onChange={(value) => {
              setActiveTab(value as CollectionType)
              setCurrentPage(1)
              setSearchQuery("")
            }}
            options={[
              { value: 'opportunities', label: 'Opportunities', count: stats?.pastOpportunities ?? 0 },
              { value: 'events', label: 'Events', count: stats?.pastEvents ?? 0 },
              { value: 'jobs', label: 'Jobs', count: stats?.pastJobs ?? 0 },
            ]}
          />

          <AdminToolbar
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={`Search these ${getCollectionName(activeTab).toLowerCase()}…`}
          >
            <Select value={pastStatusFilter} onValueChange={(value) => { setPastStatusFilter(value); setCurrentPage(1) }}>
              <SelectTrigger className="h-10 w-[170px] rounded-xl">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="moved">Manually moved</SelectItem>
              </SelectContent>
            </Select>
          </AdminToolbar>
        </div>

        {error ? (
          <AdminEmpty
            title="Could not load past posts"
            description={error}
            icon={AlertTriangle}
            action={<Button onClick={fetchPosts} className="h-10 rounded-xl">Try again</Button>}
          />
        ) : loading ? (
          <AdminSkeletonRows rows={5} />
        ) : visiblePosts.length === 0 ? (
          <AdminEmpty
            title={searchQuery ? "No matches on this page" : `No past ${getCollectionName(activeTab).toLowerCase()}`}
            description={
              searchQuery
                ? "Search looks at the posts currently loaded. Try another page or clear the search."
                : "Nothing has been moved to this collection yet."
            }
            icon={Archive}
          />
        ) : (
          <>
            <ul className="space-y-2">
              {visiblePosts.map((post: any) => (
                <li key={post._id}>
                  <AdminCard className="p-4 transition-colors hover:bg-muted/40">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                        {post.title || 'Untitled'}
                      </h3>
                      <StatusPill status={post.pastStatus === 'expired' ? 'expired' : 'archived'} />
                    </div>

                    {post.description ? (
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{post.description}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Moved {formatDate(post.movedToPastAt)}
                      </span>
                      {post.reason ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Archive className="h-3.5 w-3.5" />
                          {post.reason}
                        </span>
                      ) : null}
                      {activeTab === 'events' && post.dates?.endDate ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Ended {formatDate(post.dates.endDate)}
                        </span>
                      ) : null}
                      {activeTab !== 'events' && post.dates?.applicationDeadline ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Deadline was {formatDate(post.dates.applicationDeadline)}
                        </span>
                      ) : null}
                    </div>
                  </AdminCard>
                </li>
              ))}
            </ul>

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-9 rounded-lg"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-9 rounded-lg"
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  )
}
