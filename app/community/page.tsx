"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getPageState, savePageState } from '@/lib/page-state-session'
import { setContentCache, getContentCache } from '@/lib/content-cache-session'
import { Button } from "@/components/ui/button"
import PostCard from '@/components/post-card'
import PostComposer from '@/components/post-composer'
import FeedSponsoredSlot from '@/components/feed-sponsored-slot'
import { cn } from '@/lib/utils'
import { buildFeedWithSponsored } from '@/lib/feed-ads'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { trackCommunityEngagement } from '@/lib/tracking'
import {
  Users,
  Compass,
  TrendingUp,
  Hash,
  Loader2,
  RefreshCw,
  Sparkles,
  Flame
} from 'lucide-react'
import { PageShell } from "@/components/layout/page-shell"
import { PageHeader } from "@/components/layout/page-header"
import { SectionCard } from "@/components/layout/section-card"
import { TabStrip } from "@/components/layout/tab-strip"

interface Post {
  _id: string
  author: {
    _id: string
    email: string
    firstName?: string
    profileImage?: string
  }
  content: {
    text: string
    images: { url: string; publicId?: string }[]
    playlist?: {
      _id: string
      name: string
      description: string
      itemCount: number
      items: { _id: string; title: string; contentType: string }[]
    }
    contentReference?: {
      type: 'opportunity' | 'job' | 'event' | 'resource'
      contentId: string
      title: string
      description?: string
      organization?: string
      location?: {
        country?: string
        province?: string
        city?: string
        isRemote?: boolean
      }
      dates?: {
        applicationDeadline?: string
        startDate?: string
        endDate?: string
        registrationDeadline?: string
      }
      financial?: {
        isPaid?: boolean
        amount?: string
        currency?: string
      }
    }
  }
  hashtags: string[]
  mentions: { userId: string; username: string }[]
  visibility: 'public' | 'private'
  likeCount: number
  replyCount: number
  repostCount: number
  bookmarkCount: number
  isRepost: boolean
  originalPost?: string
  repostedBy?: { _id: string; email: string; firstName?: string }
  createdAt: string
  updatedAt: string
  isEdited: boolean
  hasLiked?: boolean
  hasBookmarked?: boolean
  hasReposted?: boolean
}

interface TrendingHashtag {
  hashtag: string
  count: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

type PromotedFeedItem = {
  _id: string
  title: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  [key: string]: unknown
}

export type CommunitySort = 'trending' | 'fresh' | 'forYou'

const COMMUNITY_PATH = '/community'

function getCommunityStorageKey(activeTab: string, sortBy: string, filterHashtag: string | null): string {
  const parts = ['community', activeTab, sortBy]
  if (filterHashtag) parts.push(`hashtag-${filterHashtag}`)
  return parts.join('_')
}

export default function CommunityPage() {
  const pathname = usePathname()
  const prevPathnameRef = useRef<string | null>(null)
  const { user, isAuthenticated, normalizedUser } = useAuth()

  const [activeTab, setActiveTab] = useState<'connections' | 'explore'>(() => {
    if (typeof window === 'undefined') return 'explore'
    const s = getPageState(COMMUNITY_PATH)
    return (s?.state?.activeTab as 'connections' | 'explore') || 'explore'
  })
  const [sortBy, setSortBy] = useState<CommunitySort>(() => {
    if (typeof window === 'undefined') return 'forYou'
    const s = getPageState(COMMUNITY_PATH)
    return (s?.state?.sortBy as CommunitySort) || 'forYou'
  })
  const [filterHashtag, setFilterHashtag] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const s = getPageState(COMMUNITY_PATH)
    return (s?.state?.filterHashtag as string | null) ?? null
  })
  const [initialFeed] = useState<{ items: Post[], lastId: string | null } | null>(() => {
    if (typeof window === 'undefined') return null
    const s = getPageState(COMMUNITY_PATH)
    const tab = (s?.state?.activeTab as 'connections' | 'explore') || 'explore'
    const sort = (s?.state?.sortBy as CommunitySort) || 'forYou'
    const tag = (s?.state?.filterHashtag as string | null) ?? null
    const key = getCommunityStorageKey(tab, sort, tag)
    if (s?.feed && s.feed.storageKey === key) {
      return { items: (s.feed.items || []) as Post[], lastId: s.feed.lastId ?? null }
    }
    const cached = getContentCache('posts')
    if (cached?.items?.length) return { items: cached.items as Post[], lastId: cached.lastId }
    return null
  })
  const scrollRestoredRef = useRef(false)
  const restoredFromCacheRef = useRef(Boolean(initialFeed))
  const didInitFiltersRef = useRef(false)
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([])
  const [promotedFeed, setPromotedFeed] = useState<PromotedFeedItem[]>([])

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }, [])

  // Create storage key based on current filters
  const storageKey = useMemo(() => {
    const parts = ['community', activeTab, sortBy]
    if (filterHashtag) parts.push(`hashtag-${filterHashtag}`)
    return parts.join('_')
  }, [activeTab, sortBy, filterHashtag])

  // Build normalizedUser payload for backend (same shape as home unified recommendations)
  const normalizedUserPayload = useMemo(() => {
    if (!normalizedUser) return null
    return {
      id: normalizedUser.id,
      interests: Array.isArray(normalizedUser.interests) ? normalizedUser.interests : [],
      industrySectors: Array.isArray(normalizedUser.industrySectors) ? normalizedUser.industrySectors : [],
      skills: Array.isArray(normalizedUser.skills) ? normalizedUser.skills : [],
      aspirations: Array.isArray(normalizedUser.aspirations) ? normalizedUser.aspirations : [],
      country: normalizedUser.country ?? null,
      province: normalizedUser.province ?? null,
      city: normalizedUser.city ?? null,
      careerStage: normalizedUser.careerStage ?? null,
      dateOfBirth: normalizedUser.dateOfBirth ?? null,
    }
  }, [normalizedUser])

  // Fetch function for cursor-based pagination
  const fetchPosts = useCallback(async (lastId: string | null) => {
    try {
      // First page: use cache if available to avoid API call
      if (!lastId) {
        const cached = getContentCache('posts')
        if (cached?.items?.length) {
          return { items: cached.items as Post[], lastId: cached.lastId, hasMore: true }
        }
      }

      const limit = 20
      const headers = getAuthHeaders()

      if (activeTab === 'connections' && isAuthenticated) {
        const url = `${API_BASE_URL}/api/posts/feed?limit=${limit}${lastId ? `&lastId=${lastId}` : ''}`
        const response = await fetch(url, { headers })
        if (!response.ok) {
          console.warn('Failed to fetch posts:', response.status, response.statusText)
          return { items: [], lastId: null, hasMore: false }
        }
        const data = await response.json()
        if (data.success) {
          const items = data.data.posts || []
          const lastId = data.data.lastId || null
          setContentCache('posts', { items, lastId })
          return { items, lastId, hasMore: data.data.hasMore || false }
        }
        return { items: [], lastId: null, hasMore: false }
      }

      // Explore: use POST when sending normalizedUser for sort=forYou, else GET
      const usePostForExplore = sortBy === 'forYou' && normalizedUserPayload && isAuthenticated
      if (usePostForExplore) {
        const body = {
          sort: sortBy,
          limit,
          ...(lastId && { lastId }),
          ...(filterHashtag && { hashtag: filterHashtag }),
          normalizedUser: normalizedUserPayload
        }
        const response = await fetch(`${API_BASE_URL}/api/posts/explore`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        })
        if (!response.ok) {
          console.warn('Failed to fetch explore posts:', response.status, response.statusText)
          return { items: [], lastId: null, hasMore: false }
        }
        const data = await response.json()
        if (data.success) {
          const items = data.data.posts || []
          const lastId = data.data.lastId || null
          setContentCache('posts', { items, lastId })
          return { items, lastId, hasMore: data.data.hasMore || false }
        }
        return { items: [], lastId: null, hasMore: false }
      }

      let url = `${API_BASE_URL}/api/posts/explore?limit=${limit}&sort=${sortBy}`
      if (lastId) url += `&lastId=${lastId}`
      if (filterHashtag) url += `&hashtag=${encodeURIComponent(filterHashtag)}`

      const response = await fetch(url, { headers })
      if (!response.ok) {
        console.warn('Failed to fetch posts:', response.status, response.statusText)
        return { items: [], lastId: null, hasMore: false }
      }
      const data = await response.json()
      if (data.success) {
        const items = data.data.posts || []
        const lastId = data.data.lastId || null
        setContentCache('posts', { items, lastId })
        return { items, lastId, hasMore: data.data.hasMore || false }
      }
      return { items: [], lastId: null, hasMore: false }
    } catch (error) {
      console.error('Error fetching posts:', error)
      return { items: [], lastId: null, hasMore: false }
    }
  }, [activeTab, isAuthenticated, sortBy, filterHashtag, getAuthHeaders, normalizedUserPayload])

  // Use cursor pagination hook; session-restored feed when returning to page
  const {
    items: posts,
    isLoading,
    isRefreshing,
    hasMore,
    loadMore,
    reset: resetPosts,
    updateItem: updatePost,
    getLastId,
  } = useCursorPagination<Post>({
    fetchFunction: fetchPosts,
    storageKey,
    resetOnMount: false,
    limit: 20,
    initialItems: initialFeed?.items,
    initialLastId: initialFeed?.lastId,
  })

  // Use infinite scroll hook
  const { sentinelRef, threshold } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    itemsBeforeLoad: 5, // Start loading when 5 items from the end
    estimatedItemHeight: 450 // Estimated height of each post card
  })

  const fetchTrendingHashtags = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/trending-hashtags`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setTrendingHashtags(data.data.hashtags || [])
      }
    } catch (error) {
      // Silently fail - don't break the UI if backend is unavailable
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error fetching trending hashtags:', error)
      }
    }
  }, [getAuthHeaders])

  // Reset posts when filters change
  useEffect(() => {
    // Keep restored cached/page-state feed on first mount.
    // Only reset when user actually changes tab/sort/filter afterward.
    if (!didInitFiltersRef.current) {
      didInitFiltersRef.current = true
      fetchTrendingHashtags()
      return
    }
    resetPosts()
    fetchTrendingHashtags()
  }, [activeTab, sortBy, filterHashtag])

  // Save scroll, state, and feed when navigating away from community
  useEffect(() => {
    const prev = prevPathnameRef.current
    prevPathnameRef.current = pathname ?? null
    if (prev === COMMUNITY_PATH && pathname !== COMMUNITY_PATH) {
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
      const scrollableHeight = typeof window !== 'undefined'
        ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        : 0
      const scrollRatio = scrollableHeight > 0 ? Math.min(1, Math.max(0, scrollY / scrollableHeight)) : 0
      savePageState(COMMUNITY_PATH, {
        scrollY,
        state: { activeTab, sortBy, filterHashtag, scrollRatio },
        feed: {
          storageKey,
          items: posts,
          lastId: getLastId?.() ?? null,
        },
      })
    }
  }, [pathname, activeTab, sortBy, filterHashtag, storageKey, posts, getLastId])

  // Keep shared posts cache as full accumulated list (from top), not just the latest fetched page.
  useEffect(() => {
    if (!posts.length) return
    setContentCache('posts', {
      items: posts,
      lastId: getLastId?.() ?? null,
    })
  }, [posts, getLastId])

  // Restore scroll only when feed came from cache/session restore and list is rendered.
  useEffect(() => {
    if (scrollRestoredRef.current) return
    if (!restoredFromCacheRef.current) return
    const s = getPageState(COMMUNITY_PATH)
    if (!s?.feed || s.feed.storageKey !== storageKey) return
    const scrollY = s?.scrollY
    const rawRatio = s?.state?.scrollRatio
    const scrollRatio = typeof rawRatio === 'number' && Number.isFinite(rawRatio)
      ? Math.min(1, Math.max(0, rawRatio))
      : null
    if ((typeof scrollY !== 'number' || scrollY <= 0) && scrollRatio === null) return
    if (posts.length === 0) return
    let timeoutId: ReturnType<typeof setTimeout>
    let timeoutId2: ReturnType<typeof setTimeout>
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        timeoutId = setTimeout(() => {
          const maxScrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
          const targetY = scrollRatio !== null
            ? Math.round(maxScrollable * scrollRatio)
            : (scrollY as number)
          window.scrollTo(0, Math.max(0, targetY))
          // Re-apply once more after late content (e.g., images/sponsored slots) finishes layout.
          timeoutId2 = setTimeout(() => {
            const nextMaxScrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
            const nextTargetY = scrollRatio !== null
              ? Math.round(nextMaxScrollable * scrollRatio)
              : (scrollY as number)
            window.scrollTo(0, Math.max(0, nextTargetY))
          }, 700)
          scrollRestoredRef.current = true
        }, 500)
      })
    })
    return () => {
      cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
      if (timeoutId2) clearTimeout(timeoutId2)
    }
  }, [posts.length, storageKey])

  useEffect(() => {
    const url = `${API_BASE_URL}/api/promoted/feed?limit=20`
    fetch(url)
      .then((res) => (res.ok ? res.json() : { success: false }))
      .then((data) => {
        if (data?.success && Array.isArray(data?.data?.feed)) {
          setPromotedFeed(data.data.feed)
        }
      })
      .catch(() => {})
  }, [])

  const handlePostCreated = (newPost: Post) => {
    // Reset to show new post at top
    resetPosts()
  }

  const handlePostUpdate = (updatedPost: Post) => {
    // Update the specific post in the list without refreshing the entire feed
    // This prevents feed refresh on engagement (like, bookmark, etc.)
    updatePost(updatedPost._id, updatedPost)
  }

  const handlePostDelete = (postId: string) => {
    // Delete would need to modify items array - for now just reset
    resetPosts()
  }

  const handleRefresh = () => {
    resetPosts()
    fetchTrendingHashtags()
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 sm:p-5 mb-4">
          <PageHeader
          title="Community"
          description="Share what you’re building and discover what others are working on."
          icon={<Users className="w-5 h-5 text-orange-400" />}
          actions={
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-card/80 hover:backdrop-blur-sm border border-transparent hover:border-border/50 transition-all disabled:opacity-50 shrink-0"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
            </button>
          }
          />
        </div>

        <div className="mb-3">
          <TabStrip
            tabs={[
              ...(isAuthenticated
                ? [
                  {
                    id: "connections",
                    label: "Partnering",
                    icon: Users,
                  } as const,
                ]
                : []),
              {
                id: "explore",
                label: "Explore",
                icon: Compass,
              } as const,
            ]}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as "connections" | "explore")}
          />
        </div>

        {activeTab === "explore" && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide mb-4">
            <button
              onClick={() => { setSortBy("trending"); setFilterHashtag(null) }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border",
                sortBy === "trending" && !filterHashtag ? "bg-card/80 backdrop-blur-sm border-border/60 text-foreground shadow-sm" : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-card/60"
              )}
            >
              <Flame className="w-3 h-3" />
              Trending
            </button>
            <button
              onClick={() => { setSortBy("forYou"); setFilterHashtag(null) }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border",
                sortBy === "forYou" && !filterHashtag ? "bg-card/80 backdrop-blur-sm border-border/60 text-foreground shadow-sm" : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-card/60"
              )}
            >
              <Sparkles className="w-3 h-3" />
              For You
            </button>
            <button
              onClick={() => { setSortBy("fresh"); setFilterHashtag(null) }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border",
                sortBy === "fresh" && !filterHashtag ? "bg-card/80 backdrop-blur-sm border-border/60 text-foreground shadow-sm" : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-card/60"
              )}
            >
              <RefreshCw className="w-3 h-3" />
              Latest
            </button>
            
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {isAuthenticated && (
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 mb-4">
            <PostComposer onPostCreated={handlePostCreated} />
          </div>
        )}

        {trendingHashtags.length > 0 && activeTab === "explore" && (
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 mb-4">
            <div className="flex items-center gap-2 mb-2.5">
              <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Trending Now</h3>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {trendingHashtags.slice(0, 10).map((tag) => (
                <button
                  key={tag.hashtag}
                  onClick={() => {
                    setFilterHashtag(filterHashtag === tag.hashtag ? null : tag.hashtag)
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border",
                    filterHashtag === tag.hashtag ? "bg-primary/15 text-orange-400 border-primary/30 shadow-sm" : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-card/60"
                  )}
                >
                  <Hash className="w-3 h-3 inline mr-0.5" />
                  {tag.hashtag}
                  <span className={cn("ml-1.5 text-[10px]", filterHashtag === tag.hashtag ? "text-orange-400/80" : "text-muted-foreground")}>({tag.count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Posts Feed */}
        <div className="px-4 pt-6 pb-10 lg:pb-14">
          {(isLoading && posts.length === 0) || (isRefreshing && posts.length === 0) ? (
            // Loading Skeletons - Show when initial loading or refreshing with no posts
            <div className="space-y-4 w-full max-w-full">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-full max-w-full rounded-2xl bg-card/80 border border-border/70 overflow-hidden">
                  <div className="p-4 w-full max-w-full overflow-hidden">
                    <div className="animate-pulse space-y-3">
                      {/* Author Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-4 bg-muted rounded w-24" />
                            <div className="h-3 bg-muted rounded w-20" />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-full" />
                        <div className="h-4 bg-muted rounded w-5/6" />
                        <div className="h-4 bg-muted rounded w-4/6" />
                      </div>

                      {/* Image Skeleton */}
                      <div className="h-64 bg-muted rounded-xl" />

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 sm:gap-1 pt-3 border-t border-border">
                        <div className="h-8 w-16 bg-muted rounded-lg" />
                        <div className="h-8 w-16 bg-muted rounded-lg" />
                        <div className="h-8 w-16 bg-muted rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 && !isLoading && !isRefreshing ? (
            // Empty State styled like dashboard cards
            <SectionCard
              className="mt-10 text-center"
              icon={
                <Sparkles className="w-5 h-5 text-orange-500" aria-hidden />
              }
              title={
                activeTab === "connections"
                  ? "No posts from people you partner with"
                  : "No posts found"
              }
              description={
                activeTab === "connections"
                  ? "Start partnering with people to see their posts here, or explore trending content."
                  : filterHashtag
                    ? `No posts found for #${filterHashtag}. Try another hashtag!`
                    : "Be the first to share something with the community!"
              }
            >
              {filterHashtag && (
                <Button
                  onClick={() => setFilterHashtag(null)}
                  variant="outline"
                  className="mt-4 border-border text-muted-foreground hover:text-foreground rounded-full"
                >
                  Clear Filter
                </Button>
              )}
            </SectionCard>
          ) : (
            // Posts list with sponsored slots (promoted + ads) every 4 posts, 3-slot cycle
            <div className="space-y-4">
              {buildFeedWithSponsored(posts, promotedFeed, { postsBetween: 4 }).map((item) =>
                item.type === 'post' ? (
                  <PostCard
                    key={item.post._id}
                    post={item.post}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                  />
                ) : (
                  <FeedSponsoredSlot
                    key={item.key}
                    kind={item.kind}
                    content={item.kind === 'promoted' ? item.content : undefined}
                    adKey={item.key}
                    slotId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT || ''}
                  />
                )
              )}

              {/* Infinite scroll sentinel */}
              <div
                ref={sentinelRef}
                style={{
                  height: '1px',
                  width: '100%',
                  marginTop: `${threshold}px`
                }}
              />

              {/* Loading more: skeleton cards */}
              {isLoading && posts.length > 0 && (
                <div className="space-y-4 pt-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="w-full rounded-2xl bg-card/80 border border-border/70 overflow-hidden animate-pulse">
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-muted" />
                          <div className="h-4 bg-muted rounded w-24" />
                          <div className="h-3 bg-muted rounded w-20" />
                        </div>
                        <div className="h-4 bg-muted rounded w-full mb-2" />
                        <div className="h-4 bg-muted rounded w-5/6" />
                        <div className="h-48 bg-muted rounded-xl mt-3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* End of feed message */}
              {!hasMore && posts.length > 0 && (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  You've reached the end of the feed
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
