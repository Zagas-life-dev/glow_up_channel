"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getPageState, savePageState } from "@/lib/page-state-session"
import { setContentCache, getContentCache, type ContentCacheType } from "@/lib/content-cache-session"
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

const landingStats = [
  { value: "10K+", label: "Youth Empowered", icon: RiGroupLine },
  { value: "500+", label: "Opportunities Posted", icon: RiFocus3Line },
  { value: "10+", label: "Partners", icon: RiGlobalLine },
  { value: "1K+", label: "Growth Stories", icon: RiArrowUpLine },
]

const landingPillars = [
  {
    title: "Access over excuses",
    description: "We remove barriers so talent can meet opportunity without friction.",
  },
  {
    title: "Community first",
    description: "Grow with mentors, peers, and providers who care about the same things.",
  },
  {
    title: "Real impact",
    description: "Every listing, event, and resource is built to move you forward.",
  },
]

const landingTracks = [
  {
    title: "Opportunities",
    description: "Jobs, internships, freelance gigs, and scholarships.",
    icon: RiFocus3Line,
    accent: "from-primary/18 to-primary/8",
    border: "border-primary/30",
    text: "text-primary",
  },
  {
    title: "Jobs",
    description: "Curated roles from trusted companies and founders.",
    icon: RiBriefcaseLine,
    accent: "from-primary/18 to-primary/8",
    border: "border-primary/30",
    text: "text-primary",
  },
  {
    title: "Events",
    description: "Networking, workshops, and live learning experiences.",
    icon: RiCalendarLine,
    accent: "from-primary/18 to-primary/8",
    border: "border-primary/30",
    text: "text-primary",
  },
  {
    title: "Resources",
    description: "Courses, templates, and toolkits to build your edge.",
    icon: RiBookLine,
    accent: "from-primary/18 to-primary/8",
    border: "border-primary/30",
    text: "text-primary",
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
    <PageShell
      fullWidth
      className="relative font-sans bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.12),transparent_60%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.08),transparent_55%)]"
    >
      {/* Hero */}
      <section className="relative overflow-hidden pb-10 pt-[max(4rem,env(safe-area-inset-top)+3.5rem)] sm:pb-12 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -top-32 right-0 h-80 w-80 rounded-full opacity-[0.18] blur-3xl dark:opacity-[0.22]"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
          />
          <div
            className="absolute left-0 top-1/3 h-72 w-72 -translate-x-1/3 rounded-full opacity-[0.08] blur-3xl dark:opacity-[0.14]"
            style={{ background: "radial-gradient(circle, hsl(222 41% 38%) 0%, transparent 68%)" }}
          />
        </div>
        <div className="relative">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] items-center">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-overline font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>GlowUp</span>
              </div>
              <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                More than a platform.
                <span className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  A movement for access.
                </span>
              </h1>
              <p className="mb-8 max-w-xl text-body text-muted-foreground sm:text-body-lg">
                Brilliant African talent has always existed. What’s been missing is access. GlowUp stitches
                opportunities, resources, and deep-focus tools into one place so you can move with intention.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-11 rounded-2xl bg-primary px-6 text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
                >
                  <Link href="/signup">
                    Get started
                    <RiRightArrowAlt className="ml-2 h-5 w-5" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-2xl border-border/70 bg-card/80 px-6 text-body-sm font-semibold hover:bg-card"
                >
                  <Link href="/submit">Become a provider</Link>
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

  // Fetch function for individual content types
  const fetchContentByType = useCallback(async (type: string, lastId: string | null) => {
    if (!backendUrl) {
      console.warn('Backend URL not configured')
      return { items: [], lastId: null, hasMore: false }
    }

    // First page: use cache if available to avoid API call
    if (!lastId && (type === 'opportunities' || type === 'events' || type === 'jobs' || type === 'resources')) {
      const cached = getContentCache(type as ContentCacheType)
      if (cached?.items?.length) {
        return { items: cached.items as any[], lastId: cached.lastId, hasMore: true }
      }
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
        const singularType: Record<string, string> = {
          opportunities: 'opportunity',
          jobs: 'job',
          events: 'event',
          resources: 'resource',
        }
        const contentType = singularType[type] ?? type.slice(0, -1)
        const items = (data.data?.[type] || []).map((item: any) => ({ ...item, type: contentType }))
        const lastId = data.data?.pagination?.lastId || (items.length > 0 ? items[items.length - 1]._id : null)
        if (type === 'opportunities' || type === 'events' || type === 'jobs' || type === 'resources') {
          setContentCache(type as ContentCacheType, { items, lastId })
        }
        return {
          items,
          lastId,
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

  // Single stable fetch for cursor pagination (same pattern as community page)
  const fetchFeedContent = useCallback(
    async (lastId: string | null) => {
      if (activeTab === 'all') {
        return fetchAllContent(lastId)
      }
      const typeMap: Record<TabType, string> = {
        all: 'opportunities', // unused when activeTab is all
        opportunities: 'opportunities',
        jobs: 'jobs',
        events: 'events',
        resources: 'resources',
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
    enabled: isAuthenticated && !authLoading,
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

  // Show landing for guests; feed only for signed-in users.
  const feedLoading = authLoading || (isLoading && allContent.length === 0)

  if (!authLoading && !isAuthenticated) {
    return <LandingPage />
  }

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
