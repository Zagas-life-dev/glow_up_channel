"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import FeedContainer from "@/components/feed-container"
import { Target, Briefcase, Calendar, BookOpen, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { Loader2 } from "lucide-react"

type TabType = 'all' | 'opportunities' | 'jobs' | 'events' | 'resources'

const tabs: { id: TabType; label: string; icon: any }[] = [
  { id: 'all', label: 'For You', icon: Sparkles },
  { id: 'opportunities', label: 'Opportunities', icon: Target },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'resources', label: 'Resources', icon: BookOpen },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const { user, isAuthenticated } = useAuth()

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

  // Storage key based on active tab
  const storageKey = useMemo(() => `home_${activeTab}`, [activeTab])

  // Fetch function for "all" tab (combined promoted + recommended)
  const fetchAllContent = useCallback(async (lastId: string | null) => {
    if (!backendUrl) {
      return { items: [], lastId: null, hasMore: false }
    }

    const token = isAuthenticated && user ? localStorage.getItem('accessToken') : null
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {}

    const fetchRecommended = async (type: string) => {
      if (!isAuthenticated || !token) {
        return { success: false, data: { [type]: [] } }
      }
      try {
        let url = `${backendUrl}/api/recommended/${type}?limit=20`
        if (lastId) {
          // For recommendations, we need to track lastId per type
          // For simplicity, we'll fetch all and filter client-side
          url += `&lastId=${lastId}`
        }
        const response = await fetch(url, { headers })
        return await response.json()
      } catch {
        return { success: false, data: { [type]: [] } }
      }
    }

    const fetchPromoted = async (type: string) => {
      try {
        let url = `${backendUrl}/api/promoted/${type}?limit=20`
        if (lastId) {
          url += `&lastId=${lastId}`
        }
        const response = await fetch(url)
        return await response.json()
      } catch {
        return { success: false, data: { [type]: [] } }
      }
    }

    const [
      promotedOpps, recommendedOpps,
      promotedJobs, recommendedJobs,
      promotedEvents, recommendedEvents,
      promotedResources, recommendedResources
    ] = await Promise.all([
      fetchPromoted('opportunities'), fetchRecommended('opportunities'),
      fetchPromoted('jobs'), fetchRecommended('jobs'),
      fetchPromoted('events'), fetchRecommended('events'),
      fetchPromoted('resources'), fetchRecommended('resources')
    ])

    const opps = [
      ...(promotedOpps.success ? (promotedOpps.data?.opportunities || []) : []),
      ...(recommendedOpps.success ? (recommendedOpps.data?.opportunities || []).filter((item: any) => 
        !promotedOpps.success || !(promotedOpps.data?.opportunities || []).some((p: any) => p._id === item._id)
      ) : [])
    ].map((item: any) => ({ ...item, type: 'opportunity' }))

    const jobItems = [
      ...(promotedJobs.success ? (promotedJobs.data?.jobs || []) : []),
      ...(recommendedJobs.success ? (recommendedJobs.data?.jobs || []).filter((item: any) => 
        !promotedJobs.success || !(promotedJobs.data?.jobs || []).some((p: any) => p._id === item._id)
      ) : [])
    ].map((item: any) => ({ ...item, type: 'job' }))

    const eventItems = [
      ...(promotedEvents.success ? (promotedEvents.data?.events || []) : []),
      ...(recommendedEvents.success ? (recommendedEvents.data?.events || []).filter((item: any) => 
        !promotedEvents.success || !(promotedEvents.data?.events || []).some((p: any) => p._id === item._id)
      ) : [])
    ].map((item: any) => ({ ...item, type: 'event' }))

    const resourceItems = [
      ...(promotedResources.success ? (promotedResources.data?.resources || []) : []),
      ...(recommendedResources.success ? (recommendedResources.data?.resources || []).filter((item: any) => 
        !promotedResources.success || !(promotedResources.data?.resources || []).some((p: any) => p._id === item._id)
      ) : [])
    ].map((item: any) => ({ ...item, type: 'resource' }))

    const combined = [...opps, ...jobItems, ...eventItems, ...resourceItems]
      .sort((a, b) => {
        const aPromoted = a.packageType ? 1 : 0
        const bPromoted = b.packageType ? 1 : 0
        if (aPromoted !== bPromoted) return bPromoted - aPromoted
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      })

    // Get lastId from the last item
    const lastItemId = combined.length > 0 ? combined[combined.length - 1]._id : null

    return {
      items: combined,
      lastId: lastItemId,
      hasMore: combined.length >= 20
    }
  }, [backendUrl, isAuthenticated, user])

  // Fetch function for individual content types
  const fetchContentByType = useCallback(async (type: string, lastId: string | null) => {
    if (!backendUrl) {
      return { items: [], lastId: null, hasMore: false }
    }

    const token = isAuthenticated && user ? localStorage.getItem('accessToken') : null
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {}

    try {
      let url = `${backendUrl}/api/${type}?limit=20`
      if (lastId) {
        url += `&lastId=${lastId}`
      }

      const response = await fetch(url, { headers })
      const data = await response.json()

      if (data.success) {
        const items = (data.data?.[type] || []).map((item: any) => ({ ...item, type: type.slice(0, -1) }))
        return {
          items,
          lastId: data.data?.pagination?.lastId || (items.length > 0 ? items[items.length - 1]._id : null),
          hasMore: data.data?.pagination?.hasMore || false
        }
      }
      return { items: [], lastId: null, hasMore: false }
    } catch {
      return { items: [], lastId: null, hasMore: false }
    }
  }, [backendUrl, isAuthenticated, user])

  // Get fetch function based on active tab
  const getFetchFunction = useCallback(() => {
    if (activeTab === 'all') {
      return fetchAllContent
    }
    const typeMap: Record<string, string> = {
      'opportunities': 'opportunities',
      'jobs': 'jobs',
      'events': 'events',
      'resources': 'resources'
    }
    return (lastId: string | null) => fetchContentByType(typeMap[activeTab], lastId)
  }, [activeTab, fetchAllContent, fetchContentByType])

  // Use cursor pagination hook
  const {
    items: allContent,
    isLoading,
    hasMore,
    loadMore,
    reset: resetContent
  } = useCursorPagination<any>({
    fetchFunction: getFetchFunction(),
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
    estimatedItemHeight: 350 // Estimated height of each feed card
  })

  // Reset when tab changes
  useEffect(() => {
    resetContent()
  }, [activeTab])

  const getCurrentItems = () => {
    return allContent
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <nav className="flex overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap relative transition-all",
                    isActive 
                      ? "text-white" 
                      : "text-white/50 hover:text-white/80"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4",
                    isActive && tab.id === 'opportunities' && "text-orange-500",
                    isActive && tab.id === 'jobs' && "text-blue-500",
                    isActive && tab.id === 'events' && "text-emerald-500",
                    isActive && tab.id === 'resources' && "text-violet-500",
                    isActive && tab.id === 'all' && "text-orange-500"
                  )} />
                  <span>{tab.label}</span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-orange-500 rounded-full" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Welcome Section (only when not loading and has content) */}
        {!isLoading && allContent.length > 0 && activeTab === 'all' && (
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {isAuthenticated ? `Hey${user?.firstName ? `, ${user.firstName}` : ''}!` : 'Discover Opportunities'}
                </h2>
                <p className="text-sm text-white/50">
                  {isAuthenticated 
                    ? "Here are personalized picks just for you" 
                    : "Sign in to get personalized recommendations"}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <FeedContainer 
          items={getCurrentItems()} 
          loading={isLoading}
          emptyMessage={
            activeTab === 'all' 
              ? "No content available yet. Check back soon!" 
              : `No ${activeTab} found. Try another category!`
          }
        />

        {/* Infinite scroll sentinel */}
        <div
          ref={sentinelRef}
          style={{
            height: '1px',
            width: '100%',
            marginTop: `${threshold}px`
          }}
        />

        {/* Loading indicator */}
        {isLoading && allContent.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
        )}

        {/* End of feed message */}
        {!hasMore && allContent.length > 0 && (
          <div className="text-center py-8 text-white/40 text-sm">
            You've reached the end
          </div>
        )}
      </div>
    </div>
  )
}
