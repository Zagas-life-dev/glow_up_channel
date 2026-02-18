"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from "@/components/ui/button"
import PostCard from '@/components/post-card'
import PostComposer from '@/components/post-composer'
import FeedAd from '@/components/feed-ad'
import { cn } from '@/lib/utils'
import { buildFeedWithAds } from '@/lib/feed-ads'
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

export default function CommunityPage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<'connections' | 'explore'>('explore')
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([])
  const [sortBy, setSortBy] = useState<'trending' | 'recent'>('trending')
  const [filterHashtag, setFilterHashtag] = useState<string | null>(null)

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

  // Fetch function for cursor-based pagination
  const fetchPosts = useCallback(async (lastId: string | null) => {
    try {
      let url = ''
      
      if (activeTab === 'connections' && isAuthenticated) {
        url = `${API_BASE_URL}/api/posts/feed?limit=20`
        if (lastId) url += `&lastId=${lastId}`
      } else {
        url = `${API_BASE_URL}/api/posts/explore?limit=20&sort=${sortBy}`
        if (lastId) url += `&lastId=${lastId}`
        if (filterHashtag) {
          url += `&hashtag=${filterHashtag}`
        }
        // Add personalized=false if user wants to bypass personalized feed
        // For now, always try personalized first, it will fallback automatically
      }

      const response = await fetch(url, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        // If response is not ok, return empty results
        console.warn('Failed to fetch posts:', response.status, response.statusText)
        return { items: [], lastId: null, hasMore: false }
      }

      const data = await response.json()
      if (data.success) {
        return {
          items: data.data.posts || [],
          lastId: data.data.lastId || null,
          hasMore: data.data.hasMore || false
        }
      }
      return { items: [], lastId: null, hasMore: false }
    } catch (error) {
      // Handle network errors, CORS errors, etc.
      console.error('Error fetching posts:', error)
      // Return empty results instead of throwing
      return { items: [], lastId: null, hasMore: false }
    }
  }, [activeTab, isAuthenticated, sortBy, filterHashtag, getAuthHeaders])

  // Use cursor pagination hook
  const {
    items: posts,
    isLoading,
    isRefreshing,
    hasMore,
    loadMore,
    reset: resetPosts,
    updateItem: updatePost
  } = useCursorPagination<Post>({
    fetchFunction: fetchPosts,
    storageKey,
    resetOnMount: false,
    limit: 20
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
    resetPosts()
    fetchTrendingHashtags()
  }, [activeTab, sortBy, filterHashtag])

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
      {/* Sticky Header + tabs */}
      <div className="max-w-2xl mx-auto">
        <PageHeader
          sticky
          title="Community"
          description="Share what you’re building and discover what others are working on."
          icon={<Users className="w-5 h-5 text-orange-400" />}
          actions={
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          }
          className="pt-2 pb-2"
        />

        <div className="border-b border-border pb-1">
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

        {/* Sort Options - Only for Explore */}
        {activeTab === "explore" && (
          <div className="py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => {
                setSortBy("trending")
                setFilterHashtag(null)
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                sortBy === "trending" && !filterHashtag
                  ? "bg-primary/20 text-orange-400 border border-orange-500/30"
                  : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              )}
            >
              <Flame className="w-3 h-3" />
              Trending
            </button>
            <button
              onClick={() => {
                setSortBy("recent")
                setFilterHashtag(null)
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                sortBy === "recent" && !filterHashtag
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              )}
            >
              <Sparkles className="w-3 h-3" />
              Recent
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {/* Post Composer - At Top */}
        {isAuthenticated && (
          <div className="pt-6 pb-4 border-b border-border px-4">
            <PostComposer onPostCreated={handlePostCreated} />
          </div>
        )}

        {/* Trending Hashtags - Horizontal Scroll */}
        {trendingHashtags.length > 0 && activeTab === 'explore' && (
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trending Now</h3>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
              {trendingHashtags.slice(0, 10).map((tag) => (
                <button
                  key={tag.hashtag}
                  onClick={() => {
                    setFilterHashtag(filterHashtag === tag.hashtag ? null : tag.hashtag)
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                    filterHashtag === tag.hashtag
                      ? "bg-primary text-foreground shadow-lg shadow-primary/30"
                      : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                  )}
                >
                  <Hash className="w-3 h-3 inline mr-1" />
                  {tag.hashtag}
                  <span className="ml-1.5 text-muted-foreground">({tag.count})</span>
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
                <div key={i} className="w-full max-w-full rounded-2xl bg-card border border-border overflow-hidden">
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
            // Posts List with spacing like home page (ads every 5 posts)
            <div className="space-y-4">
              {buildFeedWithAds(posts, { adEvery: 5 }).map((item) =>
                item.type === 'post' ? (
                  <PostCard
                    key={item.post._id}
                    post={item.post}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                  />
                ) : (
                  <FeedAd key={item.key} slotId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT || ''} />
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
                    <div key={i} className="w-full rounded-2xl bg-card border border-border overflow-hidden animate-pulse">
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
