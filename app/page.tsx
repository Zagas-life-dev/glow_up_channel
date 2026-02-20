"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import FeedContainer from "@/components/feed-container"
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

const landingStats = [
  { value: "10K+", label: "Youth Empowered", icon: RiGroupLine },
  { value: "500+", label: "Opportunities Posted", icon: RiFocus3Line },
  { value: "10+", label: "Partners", icon: RiGlobalLine },
  { value: "1K+", label: "Growth Stories", icon: RiArrowUpLine },
]

const landingPillars = [
  {
    title: "Access Over Excuses",
    description: "We remove barriers so talent can meet opportunity without friction.",
  },
  {
    title: "Community First",
    description: "We build pathways, not pipelines. Grow with mentors and peers.",
  },
  {
    title: "Real Impact",
    description: "Every listing, event, and resource is built to move you forward.",
  },
]

const landingTracks = [
  {
    title: "Opportunities",
    description: "Jobs, internships, freelance gigs, and scholarships.",
    icon: RiFocus3Line,
    accent: "from-orange-500/20 to-orange-600/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
  },
  {
    title: "Jobs",
    description: "Curated roles from trusted companies and founders.",
    icon: RiBriefcaseLine,
    accent: "from-primary/20 to-primary/10",
    border: "border-primary/30",
    text: "text-primary",
  },
  {
    title: "Events",
    description: "Networking, workshops, and live learning experiences.",
    icon: RiCalendarLine,
    accent: "from-emerald-500/20 to-emerald-600/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
  },
  {
    title: "Resources",
    description: "Courses, templates, and toolkits to build your edge.",
    icon: RiBookLine,
    accent: "from-violet-500/20 to-violet-600/10",
    border: "border-violet-500/30",
    text: "text-violet-400",
  },
]

const seekerSteps = [
  "Create a standout profile that shows your goals and skills.",
  "Discover opportunities tailored to your growth path.",
  "Apply, connect, and track progress in one place.",
]

const providerSteps = [
  "Verify your business and publish opportunities faster.",
  "Reach a vetted audience ready to take action.",
  "Track performance and build long-term brand trust.",
]

function LandingPage() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 sm:pt-24 pb-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.06),_transparent_50%)]" />
        <div className="relative">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border/70 shadow-sm mb-5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">GlowUp</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight mb-5">
                More than a platform.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">
                  A movement for access.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8">
                Brilliant African talent has always existed. What’s been missing is access.
                GlowUp bridges the gap with opportunities, resources, and deep focus tools
                like Locked In sessions to keep you moving.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-lg shadow-orange-500/25 font-semibold">
                  <Link href="/signup">
                    Get Started
                    <RiRightArrowAlt className="ml-2 h-5 w-5" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-border/70 hover:bg-muted/60 rounded-full backdrop-blur-sm">
                  <Link href="/submit">Become a Provider</Link>
                </Button>
              </div>
            </div>

            {/* Hero preview card */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/70 shadow-2xl rounded-2xl">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                      GlowUp session
                    </p>
                    <p className="text-sm text-foreground mt-1 font-medium">
                      Stay locked in on one goal at a time.
                    </p>
                  </div>
                  <div className="rounded-full px-3 py-1 bg-primary/10 border border-primary/30 text-[11px] text-primary font-medium">
                    In beta
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/50 border border-border/60 px-4 py-5 flex flex-col items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Example timer
                  </span>
                  <div className="text-4xl sm:text-5xl font-mono tabular-nums text-foreground font-bold">
                    25:00
                  </div>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground text-sm">
                    Design your glow up like a practice, not a one-off win.
                  </p>
                  <p>
                    Use sessions, playlists, and your dashboard to track how often you’re
                    really showing up for your goals.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {landingPillars.map((pillar) => (
              <Card key={pillar.title} className="bg-card/80 backdrop-blur-sm border border-border/70 hover:border-border hover:shadow-sm transition-all duration-200">
                <CardContent className="p-5">
                  <h3 className="text-base font-semibold text-foreground mb-2">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {landingStats.map((stat) => {
            const StatIcon = stat.icon
            return (
              <Card key={stat.label} className="bg-card/80 backdrop-blur-sm border border-border/70 hover:border-border transition-all duration-200">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/15 to-rose-500/10 border border-orange-500/20 flex items-center justify-center mb-3">
                    <StatIcon className="w-5 h-5 text-orange-400" aria-hidden />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Story */}
      <section className="py-12 sm:py-16">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Our story</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">The Story</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We built GlowUp for the ambitious and overlooked. Talent should never be
              limited by geography, access, or network. Our story is about removing those limits.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you are ready to build your career, launch a business, or find the right people
              to grow with — this is your home base.
            </p>
          </div>
          <Card className="bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl">
            <CardContent className="p-6 space-y-4">
              {[
                { title: "Discover", text: "Get curated opportunities built for growth." },
                { title: "Connect", text: "Meet the people and providers that matter." },
                { title: "Glow Up", text: "Track progress and build real momentum." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/20 to-rose-500/10 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                    <RiStarLine className="w-4 h-4 text-orange-400" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tracks */}
      <section className="py-12 sm:py-16">
        <div className="">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">What You’ll Find</h2>
              <p className="text-muted-foreground mt-2">Everything you need to move forward, in one place.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {landingTracks.map((track) => {
              const TrackIcon = track.icon
              return (
                <Card key={track.title} className={cn("border bg-gradient-to-br backdrop-blur-sm hover:shadow-sm transition-all duration-200", track.accent, track.border)}>
                  <CardContent className="p-5">
                    <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center mb-4", track.border)}>
                      <TrackIcon className={cn("w-5 h-5", track.text)} aria-hidden />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">{track.title}</h3>
                    <p className="text-sm text-muted-foreground">{track.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl hover:border-border transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/10 border border-orange-500/25 flex items-center justify-center">
                  <RiGroupLine className="w-5 h-5 text-orange-400" aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-foreground">For Opportunity Seekers</h3>
              </div>
              <div className="space-y-3 mb-6">
                {seekerSteps.map((step) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <RiCheckboxCircleLine className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" aria-hidden />
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
              <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-md shadow-orange-500/20">
                <Link href="/signup">Get Started</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl hover:border-border transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/10 border border-orange-500/25 flex items-center justify-center">
                  <RiFocus3Line className="w-5 h-5 text-orange-400" aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-foreground">For Providers</h3>
              </div>
              <div className="space-y-3 mb-6">
                {providerSteps.map((step) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <RiCheckboxCircleLine className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" aria-hidden />
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="border-border/70 hover:bg-muted/60 rounded-full">
                <Link href="/submit">List an Opportunity</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-gradient-to-br from-orange-500/15 via-card/80 to-rose-500/10 backdrop-blur-sm border border-orange-500/25 rounded-2xl shadow-xl">
            <CardContent className="p-8 sm:p-10 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/60 shadow-sm mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Join Now</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
                Ready to start your glow up?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm">
                Join a community built to connect you with the right people, tools, and opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-lg shadow-orange-500/25 font-semibold">
                  <Link href="/signup">Join the Community</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-border/70 hover:bg-muted/60 rounded-full">
                  <Link href="/contact">Talk to Us</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  )
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

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

        if (!response.ok) {
          console.warn(`Failed to fetch recommended ${type}:`, response.status, response.statusText)
          return { success: false, data: { [type]: [] } }
        }

        return await response.json()
      } catch (error) {
        console.error(`Error fetching recommended ${type}:`, error)
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

        if (!response.ok) {
          console.warn(`Failed to fetch promoted ${type}:`, response.status, response.statusText)
          return { success: false, data: { [type]: [] } }
        }

        return await response.json()
      } catch (error) {
        console.error(`Error fetching promoted ${type}:`, error)
        return { success: false, data: { [type]: [] } }
      }
    }

    // Fallback: fetch regular content if both promoted and recommended fail
    const fetchRegularContent = async (type: string) => {
      try {
        let url = `${backendUrl}/api/${type}?limit=20`
        if (lastId) {
          url += `&lastId=${lastId}`
        }
        const response = await fetch(url, { headers })

        if (!response.ok) {
          return { success: false, data: { [type]: [] } }
        }

        const data = await response.json()
        if (data.success) {
          return { success: true, data: { [type]: data.data?.[type] || [] } }
        }
        return { success: false, data: { [type]: [] } }
      } catch (error) {
        console.error(`Error fetching regular ${type}:`, error)
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

    // Helper to get items with fallback to regular content
    const getItemsWithFallback = async (
      type: string,
      promoted: any,
      recommended: any,
      typeKey: string
    ) => {
      const promotedItems = promoted.success ? (promoted.data?.[typeKey] || []) : []
      const recommendedItems = recommended.success ? (recommended.data?.[typeKey] || []) : []

      // If both promoted and recommended failed, try regular content as fallback
      if (promotedItems.length === 0 && recommendedItems.length === 0) {
        const regularContent = await fetchRegularContent(type)
        if (regularContent.success) {
          return regularContent.data?.[typeKey] || []
        }
      }

      // Combine promoted and recommended, removing duplicates
      const combined = [
        ...promotedItems,
        ...recommendedItems.filter((item: any) =>
          !promotedItems.some((p: any) => p._id === item._id)
        )
      ]

      return combined
    }

    // Fetch all items (with fallback if needed)
    const [oppsRaw, jobsRaw, eventsRaw, resourcesRaw] = await Promise.all([
      getItemsWithFallback('opportunities', promotedOpps, recommendedOpps, 'opportunities'),
      getItemsWithFallback('jobs', promotedJobs, recommendedJobs, 'jobs'),
      getItemsWithFallback('events', promotedEvents, recommendedEvents, 'events'),
      getItemsWithFallback('resources', promotedResources, recommendedResources, 'resources')
    ])

    const opps = oppsRaw.map((item: any) => ({ ...item, type: 'opportunity' }))
    const jobItems = jobsRaw.map((item: any) => ({ ...item, type: 'job' }))
    const eventItems = eventsRaw.map((item: any) => ({ ...item, type: 'event' }))
    const resourceItems = resourcesRaw.map((item: any) => ({ ...item, type: 'resource' }))

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
      console.warn('Backend URL not configured')
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

      if (!response.ok) {
        console.warn(`Failed to fetch ${type}:`, response.status, response.statusText)
        return { items: [], lastId: null, hasMore: false }
      }

      const data = await response.json()

      if (data.success) {
        const items = (data.data?.[type] || []).map((item: any) => ({ ...item, type: type.slice(0, -1) }))
        return {
          items,
          lastId: data.data?.pagination?.lastId || (items.length > 0 ? items[items.length - 1]._id : null),
          hasMore: data.data?.pagination?.hasMore || false
        }
      }

      console.warn(`API returned unsuccessful response for ${type}:`, data.message || 'Unknown error')
      return { items: [], lastId: null, hasMore: false }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error)
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

  // Reset when tab changes (only depend on activeTab to avoid infinite loop: resetContent identity changes after state update)
  useEffect(() => {
    resetContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run only when tab changes
  }, [activeTab])

  // Also reset when auth state changes (user logs in/out)
  useEffect(() => {
    if (!authLoading) {
      resetContent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run only when auth changes
  }, [isAuthenticated, authLoading])

  const getCurrentItems = () => {
    return allContent
  }

  if (authLoading) {
    return <PageSkeleton />
  }

  if (!isAuthenticated) {
    return <LandingPage />
  }

  return (
    <PageShell>
      {/* Tab bar: sticky, page bg, glass tab buttons */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 bg-page px-4 sm:px-6 lg:px-8 pt-3 pb-2">
        <div className="max-w-2xl mx-auto">
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
      <div className="max-w-2xl mx-auto py-6">
        {!isLoading && allContent.length > 0 && activeTab === "all" && (
          <SectionCard
            emphasized
            className="mb-6"
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
          />
        )}

        <FeedContainer
          items={getCurrentItems()}
          loading={isLoading}
          emptyMessage={
            activeTab === "all"
              ? "No content available yet. Check back soon!"
              : `No ${activeTab} found. Try another category!`
          }
        />

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
