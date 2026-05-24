"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getPageState, savePageState } from "@/lib/page-state-session"
import { getContentCache, setContentCache, type ContentCacheType } from "@/lib/content-cache-session"
import { fetchHomeListPage, type HomeListType } from "@/lib/fetch-home-list-page"
import FeedContainer from "@/components/feed-container"
import FeedCard from "@/components/feed-card"
import FeedSponsoredSlot from "@/components/feed-sponsored-slot"
import { buildFeedWithSponsored } from "@/lib/feed-ads"
import { applyVarietyOrder } from "@/lib/feed-variety-order"
import { getOrCreateAnonId } from "@/lib/anon-id"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import PageSkeleton from "@/components/skeletons/page-skeleton"
import {
  RiStarLine,
  RiFocus3Line,
  RiBriefcaseLine,
  RiCalendarLine,
  RiBookLine,
  RiGroupLine,
  RiGlobalLine,
  RiArrowUpLine,
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiArrowRightLine as RiRightArrowAlt,
} from "react-icons/ri"
import { FeedCardSkeleton } from "@/components/skeletons/feed-card-skeleton"
import { cn } from "@/lib/utils"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { PageShell } from "@/components/layout/page-shell"
import { SectionCard } from "@/components/layout/section-card"
import { TabStrip } from "@/components/layout/tab-strip"
import { canViewPremiumPlaylist } from "@/lib/roles"

type TabType = 'all' | 'opportunities' | 'jobs' | 'events' | 'resources'

const tabIcons = {
  all: RiStarLine,
  opportunities: RiFocus3Line,
  jobs: RiBriefcaseLine,
  events: RiCalendarLine,
  resources: RiBookLine,
} as const
const tabs: { id: TabType; label: string }[] = [
  { id: 'all', label: 'For You' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'events', label: 'Events' },
  { id: 'resources', label: 'Resources' },
]

type PromotedFeedItem = {
  _id: string
  title: string
  type: "opportunity" | "job" | "event" | "resource"
  [key: string]: unknown
}

const HOME_PATH = '/'

export default function Home() {
  const pathname = usePathname()
  const prevPathnameRef = useRef<string | null>(null)
  const scrollRestoredRef = useRef(false)

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window === 'undefined') return 'all'
    const s = getPageState(HOME_PATH)
    return ((s?.state?.activeTab as TabType) || 'all')
  })
  const [initialFeed] = useState<{ items: any[], lastId: string | null } | null>(() => {
    if (typeof window === 'undefined') return null
    const s = getPageState(HOME_PATH)
    const tab = (s?.state?.activeTab as TabType) || 'all'
    // Prefer page-state restore (exact tab + scroll). For "all" tab don't use content cache here so
    // signed-in users never get anonymous cached feed as initial state; they'll get recommendations from API.
    if (s?.feed && s.feed.storageKey === `home_${tab}`) {
      return { items: (s.feed.items || []) as any[], lastId: s.feed.lastId ?? null }
    }
    if (tab !== 'all' && (tab === 'opportunities' || tab === 'jobs' || tab === 'events' || tab === 'resources')) {
      const cached = getContentCache(tab)
      if (cached?.items?.length) return { items: cached.items as any[], lastId: cached.lastId }
    }
    return null
  })
  const restoredFromCacheRef = useRef(Boolean(initialFeed?.items?.length))
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const s = getPageState(HOME_PATH)
    return (s?.state?.expandedId as string | null) ?? null
  })
  const [promotedFeed, setPromotedFeed] = useState<PromotedFeedItem[]>([])
  const { user, normalizedUser, isAuthenticated, isLoading: authLoading } = useAuth()

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

  // Storage key based on active tab
  const storageKey = useMemo(() => `home_${activeTab}`, [activeTab])

  // Fetch function for "all" tab (personalized unified recommendations or anonymous public feed)
  const fetchAllContent = useCallback(async (lastId: string | null) => {
    if (!backendUrl) {
      return { items: [], lastId: null, hasMore: false }
    }

    // First page: use session cache for instant load (anon: unified, auth: unified_auth so we never serve anon cache to signed-in users)
    if (!lastId) {
      if (!isAuthenticated || !user) {
        const cached = getContentCache('unified')
        if (cached?.items?.length) {
          return { items: cached.items as any[], lastId: cached.lastId, hasMore: true }
        }
      } else {
        const cached = getContentCache('unified_auth')
        if (cached?.items?.length) {
          return { items: cached.items as any[], lastId: cached.lastId, hasMore: true }
        }
      }
    }

    // Anonymous users: use public feed API (cached 100-item interleaved feed)
    if (!isAuthenticated || !user) {
      const anonId = getOrCreateAnonId()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (anonId) headers['X-Anon-Id'] = anonId
      try {
        const response = await fetch(`${backendUrl}/api/feed/anonymous`, { headers })
        if (!response.ok) return { items: [], lastId: null, hasMore: false }
        const data = await response.json()
        const feed = Array.isArray(data?.data?.feed) ? data.data.feed : []
        if (feed.length) setContentCache('unified', { items: feed, lastId: null })
        return { items: feed, lastId: null, hasMore: false }
      } catch (err) {
        console.error('Anonymous feed fetch error:', err)
        return { items: [], lastId: null, hasMore: false }
      }
    }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      return { items: [], lastId: null, hasMore: false }
    }

    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    try {
      let response: Response
      if (normalizedUser) {
        // Send frontend merged normalized user so the algo uses the same data (fixes 50% fallback for users without backend profile/onboarding)
        const payload = {
          normalizedUser: {
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
          },
          includeOpportunities: true,
          includeEvents: true,
          includeJobs: true,
          includeResources: true,
          minScore: 0,
          limit: lastId ? 20 : 15,
          ...(lastId && { lastId }),
        }
        response = await fetch(`${backendUrl}/api/recommended/unified`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
      } else {
        const url = new URL(`${backendUrl}/api/recommended/unified`)
        url.searchParams.set('includeOpportunities', 'true')
        url.searchParams.set('includeEvents', 'true')
        url.searchParams.set('includeJobs', 'true')
        url.searchParams.set('includeResources', 'true')
        url.searchParams.set('minScore', '0')
        url.searchParams.set('limit', lastId ? '20' : '15')
        if (lastId) {
          url.searchParams.set('lastId', lastId)
        }
        response = await fetch(url.toString(), { headers })
      }

      if (!response.ok) {
        console.warn('Failed to fetch unified recommendations:', response.status, response.statusText)
        return { items: [], lastId: null, hasMore: false }
      }

      const data = await response.json()
      if (!data?.success || !data?.data?.content) {
        return { items: [], lastId: null, hasMore: false }
      }

      const unifiedItems = (data.data.content as any[]).map((item) => ({
        ...item,
        // Normalize type field for feed-card
        type: item.contentType
      }))

      // Variety ordering: score buckets + skewed random start, then surrounding pool, mid, low (under 2000ms)
      const sorted = applyVarietyOrder(unifiedItems)

      const lastItemId = sorted.length > 0 ? sorted[sorted.length - 1]._id : null
      const resultLastId = data.data?.pagination?.lastId ?? lastItemId
      const pageLimit = lastId ? 20 : 15
      const hasMore = (data.data?.pagination?.hasMore ?? (data.data?.total > sorted.length)) && sorted.length >= pageLimit
      if (sorted.length) setContentCache('unified_auth', { items: sorted, lastId: resultLastId })

      return {
        items: sorted,
        lastId: resultLastId,
        hasMore
      }
    } catch (error) {
      console.error('Error fetching unified recommendations:', error)
      return { items: [], lastId: null, hasMore: false }
    }
  }, [backendUrl, isAuthenticated, user, normalizedUser])

  // Fetch function for individual content types (same lastId pagination as Opportunities/Jobs)
  const fetchContentByType = useCallback(
    async (type: HomeListType, cursorLastId: string | null) => {
      if (!backendUrl) {
        console.warn("Backend URL not configured")
        return { items: [], lastId: null, hasMore: false }
      }

      const token = isAuthenticated && user ? localStorage.getItem("accessToken") : null
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

      return fetchHomeListPage({
        type,
        cursorLastId,
        backendUrl,
        headers,
      })
    },
    [backendUrl, isAuthenticated, user],
  )

  // Single stable fetch for cursor pagination (same pattern as community page)
  const fetchFeedContent = useCallback(
    async (lastId: string | null) => {
      if (activeTab === 'all') {
        return fetchAllContent(lastId)
      }
      const typeMap: Record<TabType, HomeListType> = {
        all: "opportunities", // unused when activeTab is all
        opportunities: "opportunities",
        jobs: "jobs",
        events: "events",
        resources: "resources",
      }
      return fetchContentByType(typeMap[activeTab], lastId)
    },
    [activeTab, fetchAllContent, fetchContentByType]
  )

  // Use cursor pagination hook (stable fetchFunction like community page); session-restored feed when returning to page.
  // Defer first fetch until auth is ready (enabled={!authLoading}) so we call the correct endpoint and avoid double fetch.
  const {
    items: allContent,
    isLoading,
    isRefreshing,
    hasMore,
    loadMore,
    reset: resetContent,
    getLastId,
  } = useCursorPagination<any>({
    fetchFunction: fetchFeedContent,
    storageKey,
    resetOnMount: false,
    limit: 20,
    initialItems: initialFeed?.items,
    initialLastId: initialFeed?.lastId,
    enabled: !authLoading,
  })

  // Use infinite scroll hook (same options as community page)
  const { sentinelRef, threshold } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    itemsBeforeLoad: 5,
    estimatedItemHeight: 350,
  })

  // Reset when tab changes (same pattern as community: reset when filters/tab change)
  useEffect(() => {
    resetContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run only when tab changes
  }, [activeTab])

  // Reset feed only when user actually logs in/out, not when auth first settles (avoids double fetch with enabled defer)
  const prevAuthRef = useRef<boolean | undefined>(undefined)
  useEffect(() => {
    if (authLoading) return
    if (prevAuthRef.current !== undefined && prevAuthRef.current !== isAuthenticated) {
      resetContent()
    }
    prevAuthRef.current = isAuthenticated
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when auth state changes
  }, [isAuthenticated, authLoading])

  // Save scroll, state, and feed when navigating away from home (session-scoped; works for all users)
  useEffect(() => {
    const prev = prevPathnameRef.current
    prevPathnameRef.current = pathname ?? null
    if (prev === HOME_PATH && pathname !== HOME_PATH) {
      savePageState(HOME_PATH, {
        scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
        state: { activeTab, expandedId: expandedId ?? undefined },
        feed: {
          storageKey,
          items: allContent,
          lastId: getLastId?.() ?? null,
        },
      })
    }
  }, [pathname, activeTab, storageKey, allContent, getLastId, expandedId])

  // Restore scroll only for cache/session-restored feed, never for API-only initial loads.
  useEffect(() => {
    if (scrollRestoredRef.current) return
    if (!restoredFromCacheRef.current) return
    const s = getPageState(HOME_PATH)
    if (!s?.feed || s.feed.storageKey !== storageKey) return
    const scrollY = s?.scrollY
    if (typeof scrollY !== 'number' || scrollY <= 0 || allContent.length === 0) return
    // Wait for content to be in DOM and laid out (double rAF + brief delay for list layout)
    let timeoutId: ReturnType<typeof setTimeout>
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        timeoutId = setTimeout(() => {
          window.scrollTo(0, scrollY)
          scrollRestoredRef.current = true
        }, 80)
      })
    })
    return () => {
      cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [allContent.length, storageKey])

  // Defer promoted feed until after main feed has priority (next tick) to avoid competing for bandwidth
  useEffect(() => {
    if (!backendUrl) return
    const id = setTimeout(() => {
      fetch(`${backendUrl}/api/promoted/feed?limit=20`)
        .then((res) => (res.ok ? res.json() : { success: false }))
        .then((data) => {
          if (data?.success && Array.isArray(data?.data?.feed)) {
            setPromotedFeed(data.data.feed)
          }
        })
        .catch(() => {})
    }, 0)
    return () => clearTimeout(id)
  }, [backendUrl])

  const getCurrentItems = () => {
    return allContent
  }

  const feedLoading = false

  return (
    <PageShell
      fullWidth
      className="relative font-sans bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.12),transparent_60%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.08),transparent_55%)]"
    >
      {/* Tab bar: sticky, glass tab buttons */}
      <div className="sticky top-0 z-30 -mx-4 bg-page/80 px-4 pt-[max(0.25rem,env(safe-area-inset-top)+0.25rem)] pb-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <TabStrip
            tabs={tabs.map((tab) => ({
              id: tab.id,
              label: tab.label,
              icon: tabIcons[tab.id],
            }))}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as TabType)}
          />
        </div>
      </div>

      {/* Feed Content */}
      <div className="mx-auto max-w-2xl pb-[max(5rem,env(safe-area-inset-bottom)+4.5rem)] pt-4 sm:pb-10 sm:pt-6">
        {!feedLoading && activeTab === "all" && (allContent.length > 0 || !isAuthenticated) && (
          <>
            <SectionCard
              emphasized
              className="mb-4"
              title={
                isAuthenticated
                  ? `Hey${user?.firstName ? `, ${user.firstName}` : ""}!`
                  : "Discover Opportunities"
              }
              description={
                isAuthenticated
                  ? "Here are picks to help you Glow Up."
                  : "Sign in to get personalized recommendations."
              }
              icon={<RiStarLine className="w-5 h-5 text-orange-500" aria-hidden />}
              actions={
                isAuthenticated && canViewPremiumPlaylist(normalizedUser?.isPremium ?? user?.isPremium, user?.role) ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/playlists?tab=premium">Get premium playlist</Link>
                  </Button>
                ) : undefined
              }
            />
          </>
        )}

        {activeTab === "all" && allContent.length > 0 ? (
          <div className="space-y-5 w-full max-w-full">
            {buildFeedWithSponsored(allContent, promotedFeed, { postsBetween: 4 }).map((item) =>
              item.type === "post" ? (
                <FeedCard key={item.post._id} item={item.post} />
              ) : (
                <FeedSponsoredSlot
                  key={item.key}
                  kind={item.kind}
                  content={item.kind === "promoted" ? item.content : undefined}
                  adKey={item.key}
                  slotId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT || ""}
                />
              )
            )}
          </div>
        ) : (
          <FeedContainer
            items={getCurrentItems()}
            loading={feedLoading}
            emptyMessage={
              activeTab === "all"
                ? (isAuthenticated ? "No content available yet. Check back soon!" : "Sign in to get personalized recommendations.")
                : `No ${activeTab} found. Try another category!`
            }
            initialExpandedId={expandedId}
            onExpandedIdChange={setExpandedId}
          />
        )}

        {/* Infinite scroll sentinel */}
        <div
          ref={sentinelRef}
          style={{
            height: "1px",
            width: "100%",
            marginTop: `${threshold}px`,
          }}
        />

        {/* Loading more: show skeleton cards */}
        {isLoading && allContent.length > 0 && (
          <div className="space-y-4 pt-4">
            <FeedCardSkeleton />
            <FeedCardSkeleton />
          </div>
        )}

        {/* End of feed message */}
        {!hasMore && allContent.length > 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            You've reached the end
          </div>
        )}
      </div>
    </PageShell>
  )
}
