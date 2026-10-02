"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Button } from "@/components/ui/button"
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
  AlertTriangle,
  Clock,
  Layers,
  Loader2,
  RotateCcw,
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
import { RestorePastPostDialog } from "@/components/admin/restore-past-post-dialog"

type CollectionType = 'opportunities' | 'events' | 'jobs'
type TabType = 'all' | CollectionType

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

const COLLECTION_LABEL: Record<CollectionType, string> = {
  opportunities: 'Opportunity',
  events: 'Event',
  jobs: 'Job',
}

const TAB_NAME: Record<TabType, string> = {
  all: 'past posts',
  opportunities: 'opportunities',
  events: 'events',
  jobs: 'jobs',
}

export default function PastPostsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()

  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [stats, setStats] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [pastStatusFilter, setPastStatusFilter] = useState<string>("all")
  /** The archived post open in the restore dialog, or null. */
  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  /**
   * Bumped on every fresh query. A response for an older query (the admin typed again or
   * switched tabs while it was in flight) is dropped rather than mixed into the new list.
   */
  const requestIdRef = useRef(0)

  const isAdmin = !!user && (user.role === 'admin' || user.role === 'super_admin')

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
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await ApiClient.getPastPostsStats()
      setStats(statsData)
    } catch (error: any) {
      console.error('Error fetching past posts stats:', error)
      toast.error('Failed to load past posts statistics')
    }
  }, [])

  /** Search runs on the server, so it covers the whole archive — not just what's scrolled in. */
  const queryOptions = useCallback(() => ({
    limit: PAGE_SIZE,
    q: debouncedSearch || undefined,
    pastStatus: pastStatusFilter !== 'all' ? (pastStatusFilter as 'expired' | 'moved') : undefined,
  }), [debouncedSearch, pastStatusFilter])

  const fetchFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current
    try {
      setLoading(true)
      setError(null)
      const result = await ApiClient.getPastPosts(activeTab, queryOptions())
      if (requestId !== requestIdRef.current) return
      setPosts(result.posts)
      setTotal(result.total ?? result.posts.length)
      setNextCursor(result.hasMore ? result.nextCursor : null)
    } catch (error: any) {
      if (requestId !== requestIdRef.current) return
      console.error('Error fetching past posts:', error)
      setError(error.message || 'Failed to load past posts')
      toast.error('Failed to load past posts')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [activeTab, queryOptions])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading || loadingMore) return
    const requestId = requestIdRef.current
    try {
      setLoadingMore(true)
      const result = await ApiClient.getPastPosts(activeTab, { ...queryOptions(), before: nextCursor })
      if (requestId !== requestIdRef.current) return
      setPosts((prev) => {
        const seen = new Set(prev.map((post: any) => `${post.collection}:${post._id}`))
        return [...prev, ...result.posts.filter((post: any) => !seen.has(`${post.collection}:${post._id}`))]
      })
      setNextCursor(result.hasMore ? result.nextCursor : null)
    } catch (error: any) {
      if (requestId !== requestIdRef.current) return
      console.error('Error loading more past posts:', error)
      toast.error('Failed to load more past posts')
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false)
    }
  }, [activeTab, queryOptions, nextCursor, loading, loadingMore])

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return
    if (!isAdmin) {
      setError('Access denied. Admin privileges required.')
      setLoading(false)
      return
    }
    fetchStats()
  }, [isLoading, isAuthenticated, user, isAdmin, fetchStats])

  useEffect(() => {
    if (isAuthenticated && isAdmin) fetchFirstPage()
  }, [isAuthenticated, isAdmin, fetchFirstPage])

  /** Infinite scroll: ask for the next page a screen before the end. */
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !nextCursor) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: "600px 0px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore, nextCursor, posts.length])

  /**
   * A restored post is no longer in `past_*`, so drop it locally. No refetch: the list is
   * already in the right order without it, and reloading would throw away the scroll.
   */
  const handleRestored = ({ restoredId }: { restoredId: string }) => {
    setPosts((prev) => prev.filter((post: any) => String(post._id) !== restoredId))
    setTotal((prev) => Math.max(0, prev - 1))
    setRestoreTarget(null)
    fetchStats()
  }

  const refresh = () => {
    fetchStats()
    fetchFirstPage()
  }

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

  if (!isAuthenticated || !isAdmin) {
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

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filtered = !!debouncedSearch || pastStatusFilter !== 'all'

  return (
    <AdminShell
      title="Past posts"
      description="Posts moved to past collections after expiry. Retained, never deleted, for legal compliance."
      onRefresh={refresh}
      refreshing={loading}
      width="wide"
    >
      <div className="space-y-5">
        {/* Counts double as the collection switcher */}
        {stats ? (
          <AdminStatGrid className="lg:grid-cols-4">
            <AdminStat
              label="All past posts"
              value={(stats.total || 0).toLocaleString()}
              hint="every archive"
              icon={Layers}
              emphasis={activeTab === 'all' ? 'attention' : 'none'}
            />
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
            onChange={(value) => setActiveTab(value as TabType)}
            options={[
              { value: 'all', label: 'All', count: stats?.total ?? 0 },
              { value: 'opportunities', label: 'Opportunities', count: stats?.pastOpportunities ?? 0 },
              { value: 'events', label: 'Events', count: stats?.pastEvents ?? 0 },
              { value: 'jobs', label: 'Jobs', count: stats?.pastJobs ?? 0 },
            ]}
          />

          <AdminToolbar
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={activeTab === 'all' ? 'Search all past posts…' : `Search past ${TAB_NAME[activeTab]}…`}
          >
            <Select value={pastStatusFilter} onValueChange={setPastStatusFilter}>
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

          {!loading && !error && filtered ? (
            <p className="text-xs text-muted-foreground">
              {total.toLocaleString()} {total === 1 ? 'match' : 'matches'}
            </p>
          ) : null}
        </div>

        {error ? (
          <AdminEmpty
            title="Could not load past posts"
            description={error}
            icon={AlertTriangle}
            action={<Button onClick={fetchFirstPage} className="h-10 rounded-xl">Try again</Button>}
          />
        ) : loading ? (
          <AdminSkeletonRows rows={5} />
        ) : posts.length === 0 ? (
          <AdminEmpty
            title={filtered ? "No matches" : `No ${TAB_NAME[activeTab]}`}
            description={
              filtered
                ? "Nothing in the archive matches. Try another search or switch to All."
                : "Nothing has been moved to this collection yet."
            }
            icon={Archive}
          />
        ) : (
          <>
            <ul className="space-y-2">
              {posts.map((post: any) => {
                const collection = post.collection as CollectionType
                return (
                  <li key={`${collection}:${post._id}`}>
                    <AdminCard className="p-4 transition-colors hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                          {post.title || 'Untitled'}
                        </h3>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {activeTab === 'all' && COLLECTION_LABEL[collection] ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {COLLECTION_LABEL[collection]}
                            </span>
                          ) : null}
                          <StatusPill status={post.pastStatus === 'expired' ? 'expired' : 'archived'} />
                        </div>
                      </div>

                      {post.description ? (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{post.description}</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Moved {formatDate(post.movedToPastAt)}
                        </span>
                        {post.restoreCount ? (
                          <span className="inline-flex items-center gap-1.5">
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restored {post.restoreCount}× before
                          </span>
                        ) : null}
                        {post.reason ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Archive className="h-3.5 w-3.5" />
                            {post.reason}
                          </span>
                        ) : null}
                        {collection === 'events' && post.dates?.endDate ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Ended {formatDate(post.dates.endDate)}
                          </span>
                        ) : null}
                        {collection !== 'events' && post.dates?.applicationDeadline ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Deadline was {formatDate(post.dates.applicationDeadline)}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex justify-end border-t border-border pt-3">
                        <Button
                          variant="outline"
                          onClick={() => setRestoreTarget(post)}
                          className="h-9 rounded-lg"
                        >
                          <RotateCcw className="mr-1.5 h-4 w-4" />
                          Restore &amp; edit
                        </Button>
                      </div>
                    </AdminCard>
                  </li>
                )
              })}
            </ul>

            <div ref={sentinelRef} className="flex justify-center py-4 text-xs text-muted-foreground">
              {loadingMore ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more…
                </span>
              ) : nextCursor ? (
                <Button variant="ghost" onClick={loadMore} className="h-8 rounded-lg text-xs">
                  Load more
                </Button>
              ) : (
                <span>
                  Showing all {posts.length.toLocaleString()}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <RestorePastPostDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => { if (!open) setRestoreTarget(null) }}
        post={restoreTarget}
        collection={(restoreTarget?.collection as CollectionType) ?? 'opportunities'}
        onRestored={handleRestored}
      />
    </AdminShell>
  )
}
