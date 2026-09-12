"use client"

/**
 * Provider promotions.
 *
 * The screen used to have five tabs — Active, Pending, Past, Recommended, All
 * content — which sounds thorough and read as a filing cabinet. Three problems
 * came out of that shape:
 *
 *   1. **The main action was two tabs away.** A provider with nothing promoted
 *      landed on an empty "Active" and had to work out that promoting something
 *      lived under a different tab. The thing you came here to do should be a
 *      destination, not a detour.
 *   2. **"Pending" was almost always empty.** Promotions are free and start
 *      immediately, so the bucket exists for a state the product barely
 *      produces. It is folded into Live, where a not-yet-running campaign shows
 *      its own status badge.
 *   3. **"Recommended" and "All content" were the same list twice**, one
 *      sorted. They are now one list with the recommended few marked, so
 *      nothing is hidden behind a tab switch.
 *
 * What is left is Live / Promote / Past: what is running, how to start
 * something, and what is finished.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import { AuthRequiredCard } from '@/components/auth-required-card'
import { getPostingLimit } from "@/lib/posting-limits"
import { cn } from "@/lib/utils"
import {
  Target,
  Calendar,
  Briefcase,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  BarChart3,
  Sparkles,
  Rocket,
  Zap,
} from 'lucide-react'
import { toast } from "sonner"
import { PromoteContentModal } from "@/components/promote-content-modal"
import { PromotionRow, type PromotionRowData } from "@/components/provider/promotion-row"
import { ProviderShell, providerTabForPath, PROVIDER_NAV_ROUTES } from '@/components/provider/provider-shell'
import {
  Panel,
  EmptyState,
  StatTile,
  SegmentedTabs,
  ProviderLoading,
} from '@/components/provider/provider-ui'

interface Promotion extends PromotionRowData {
  isActive?: boolean
  isExpired?: boolean
}

interface UserContent {
  _id: string
  title: string
  description: string
  contentType: string
  image?: string
  status?: string
  createdAt: string
}

type PromoTab = 'live' | 'promote' | 'past'

/** Static map, not a factory — the icon is looked up, never constructed. */
const CONTENT_ICONS: Record<string, any> = {
  event: Calendar,
  job: Briefcase,
  resource: BookOpen,
  opportunity: Target,
}

/* ------------------------------------------------------------------ */

/** A piece of content the provider can promote. */
function PromotableContentRow({
  content,
  recommended = false,
  onPromote,
}: {
  content: UserContent
  recommended?: boolean
  onPromote: (content: UserContent) => void
}) {
  const Icon = CONTENT_ICONS[content.contentType] ?? Target
  const metrics: any = (content as any).metrics || {}

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3 transition-colors hover:border-primary/20 hover:bg-card/80">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 truncate text-body-sm font-semibold text-foreground">
            {content.title}
          </p>
          {recommended && (
            <Badge className="shrink-0 rounded-md bg-primary/12 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wide text-primary">
              Suggested
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="capitalize">{content.contentType}</span>
          <span className="opacity-40">·</span>
          <span className="tabular-nums">{metrics.viewCount || 0} views</span>
          <span className="opacity-40">·</span>
          <span className="tabular-nums">{metrics.likeCount || 0} likes</span>
          <span className="opacity-40">·</span>
          <span className="tabular-nums">{metrics.saveCount || 0} saves</span>
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => onPromote(content)}
        className="h-9 shrink-0 rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90"
      >
        <TrendingUp className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">Promote</span>
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function PromotionsPage() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, profile, isAuthenticated, isLoading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [userContent, setUserContent] = useState<UserContent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<PromoTab>('live')

  /**
   * The clock, read once per load rather than during render.
   *
   * Progress bars and the deadline ranking below both need "now", and reading
   * it while rendering makes the whole tree impure — the server and the first
   * client render would disagree, which is a hydration mismatch on every row.
   * Stamping it here, inside the async fetch, gives one consistent answer for
   * the data being displayed and re-stamps it on every refresh.
   */
  const [loadedAt, setLoadedAt] = useState(0)

  // Promote modal: content selected for promotion
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [selectedContent, setSelectedContent] = useState<UserContent | null>(null)

  // Hide navbar when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const authHeaders = {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      }

      // Fetch user promotions (authenticated)
      const promotionsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promotions/my-promotions`, {
        headers: authHeaders,
      })
      const promotionsData = await promotionsResponse.json()

      if (promotionsData.success) {
        setPromotions(promotionsData.data.promotions || [])
      } else {
        if (promotionsResponse.status === 401) {
          toast.error('Please log in again to continue')
        } else if (promotionsResponse.status === 403) {
          toast.error('You do not have permission to access promotions')
        } else {
          toast.error('Failed to load promotions')
        }
        setPromotions([])
      }

      // Fetch user content (authenticated).
      //
      // All four promotable types. Resources were missing here while the rest
      // of the pipeline supported them end to end — the Promotion model lists
      // `resource` in its content types, the backend validates it, there is a
      // `/api/promoted/resources` rail and the promote modal already renders a
      // "Resource" label. The only thing absent was the fetch, so a provider
      // with a resource simply never saw it in the list and could not promote
      // it from anywhere in the product.
      const [opportunitiesRes, eventsRes, jobsRes, resourcesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/my/opportunities`, { headers: authHeaders })
          .then(res => res.json())
          .catch(() => ({ success: false, data: { opportunities: [] } })),

        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events/my/events`, { headers: authHeaders })
          .then(res => res.json())
          .catch(() => ({ success: false, data: { events: [] } })),

        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/jobs/my/jobs`, { headers: authHeaders })
          .then(res => res.json())
          .catch(() => ({ success: false, data: { jobs: [] } })),

        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources/my/resources`, { headers: authHeaders })
          .then(res => res.json())
          .catch(() => ({ success: false, data: { resources: [] } })),
      ])

      const allContent: UserContent[] = []

      if (opportunitiesRes.success) {
        allContent.push(...(opportunitiesRes.data.opportunities || []).map((item: any) => ({ ...item, contentType: 'opportunity' })))
      }
      if (eventsRes.success) {
        allContent.push(...(eventsRes.data.events || []).map((item: any) => ({ ...item, contentType: 'event' })))
      }
      if (jobsRes.success) {
        allContent.push(...(jobsRes.data.jobs || []).map((item: any) => ({ ...item, contentType: 'job' })))
      }
      if (resourcesRes.success) {
        allContent.push(...(resourcesRes.data.resources || []).map((item: any) => ({ ...item, contentType: 'resource' })))
      }

      setUserContent(allContent)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load promotions data')
    } finally {
      // In `finally`, so a fetch that threw part-way still leaves a usable
      // clock behind. At zero every progress bar would read as complete.
      setLoadedAt(Date.now())
      setLoading(false)
    }
  }, [])

  // Fetch data when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return
    let cancelled = false
    const run = () => {
      if (cancelled) return
      void fetchData()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user, fetchData])

  const handlePromote = (content: UserContent) => {
    setSelectedContent(content)
    setShowPromoteModal(true)
  }

  /* -------- derived data: two buckets, live and finished -------- */

  const { livePromotions, pastPromotions, promotableContent, suggestedIds } = useMemo(() => {
    const nowMs = loadedAt || 0
    const now = new Date(nowMs)

    // Finished: explicitly closed, or the end date has already passed.
    const isPast = (p: Promotion) => {
      if (p.status === 'completed' || p.status === 'expired' || p.status === 'cancelled') return true
      if (p.endDate) {
        const end = new Date(p.endDate)
        if (!Number.isNaN(end.getTime()) && end < now) return true
      }
      return false
    }

    const past = promotions.filter(isPast)
    const live = promotions.filter((p) => !isPast(p))

    // Content with no live promotion behind it is what can be promoted.
    const liveContentIds = new Set(live.map((p) => p.contentId))
    const promotable = userContent.filter((c) => !liveContentIds.has(c._id))

    // The few worth promoting first: engagement, with a nudge for recency.
    // Marked inline rather than split into their own tab — it is the same list.
    const ranked = promotable
      .map((c: any) => {
        const metrics = c.metrics || {}
        const createdAt = c.createdAt ? new Date(c.createdAt).getTime() : 0
        const ageDays = createdAt ? (nowMs - createdAt) / (1000 * 60 * 60 * 24) : 0
        const recencyBoost = ageDays ? Math.max(0, 30 - ageDays) : 0
        const score =
          (metrics.viewCount || 0) * 0.1 +
          (metrics.likeCount || 0) * 3 +
          (metrics.saveCount || 0) * 2 +
          recencyBoost
        return { content: c as UserContent, score }
      })
      .sort((a, b) => b.score - a.score)

    const suggested = new Set(ranked.slice(0, 3).map((r) => r.content._id))

    return {
      livePromotions: live,
      pastPromotions: past,
      promotableContent: ranked.map((r) => r.content),
      suggestedIds: suggested,
    }
  }, [promotions, userContent, loadedAt])

  const liveExtreme = livePromotions.filter((p) => p.packageType === 'extreme').length

  if (authLoading) {
    return <ProviderLoading label="Loading promotions..." />
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredCard
        title="Authentication required"
        description="Please sign in to access your promotions."
        icon={Target}
        signInLabel="Sign in"
      />
    )
  }

  if (loading) {
    return <ProviderLoading label="Loading promotions..." />
  }

  const sections: { id: PromoTab; label: string; icon: any; count: number }[] = [
    { id: 'live', label: 'Live', icon: CheckCircle2, count: livePromotions.length },
    { id: 'promote', label: 'Promote', icon: Rocket, count: promotableContent.length },
    { id: 'past', label: 'Past', icon: BarChart3, count: pastPromotions.length },
  ]

  const postingLimit = getPostingLimit(user?.role)

  return (
    <ProviderShell
      user={user}
      profile={profile}
      activeTab={providerTabForPath(pathname)}
      onTabChange={(tab) => router.push(PROVIDER_NAV_ROUTES[tab])}
      title="Promotions"
      totalPostings={userContent.length}
      postingLimit={postingLimit}
      onRefresh={() => fetchData()}
      refreshing={loading}
    >
      {/* Stats. "Total promotions" is gone — it was the sum of the tiles beside
          it, so it took a quarter of the row to say nothing new. */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-4">
        <StatTile
          label="Running now"
          value={livePromotions.length}
          hint="Promotion is free — no fees, no budget"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatTile
          label="Extreme"
          value={liveExtreme}
          hint={liveExtreme ? 'With announcements' : 'None running'}
          icon={Zap}
          tone="primary"
        />
        <StatTile
          label="Ready to promote"
          value={promotableContent.length}
          hint="Content with nothing running"
          icon={Rocket}
          tone="amber"
        />
        <StatTile label="Finished" value={pastPromotions.length} icon={BarChart3} tone="violet" />
      </div>

      <SegmentedTabs items={sections} value={activeSection} onChange={setActiveSection} />

      {activeSection === 'live' && (
        <Panel
          icon={CheckCircle2}
          title="Running promotions"
          subtitle="Extend, shorten or stop any of them"
          bodyClassName={livePromotions.length ? undefined : "p-0"}
        >
          {livePromotions.length > 0 ? (
            <div className="space-y-2">
              {livePromotions.map((promotion) => (
                <PromotionRow
                  key={promotion._id}
                  promotion={promotion}
                  now={loadedAt}
                  onChanged={fetchData}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Rocket}
              title="Nothing is being promoted"
              description="Promotion is free. Pick something you have posted and give it a boost — it starts right away."
              ctaLabel="Promote something"
              onCta={() => setActiveSection('promote')}
            />
          )}
        </Panel>
      )}

      {activeSection === 'promote' && (
        <Panel
          icon={Rocket}
          title="Promote something"
          subtitle="Everything without a promotion running, best candidates first"
          bodyClassName={promotableContent.length ? undefined : "p-0"}
        >
          {promotableContent.length > 0 ? (
            <div className="space-y-2">
              {promotableContent.map((content) => (
                <PromotableContentRow
                  key={content._id}
                  content={content}
                  recommended={suggestedIds.has(content._id)}
                  onPromote={handlePromote}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Everything is already promoted"
              description="Every listing you have posted has a promotion running. Post something new to promote it too."
              ctaHref="/dashboard/provider/posting"
              ctaLabel="Post content"
            />
          )}
        </Panel>
      )}

      {activeSection === 'past' && (
        <Panel
          icon={BarChart3}
          title="Past promotions"
          subtitle="Completed, expired or stopped"
          bodyClassName={pastPromotions.length ? undefined : "p-0"}
        >
          {pastPromotions.length > 0 ? (
            <div className="space-y-2">
              {pastPromotions.map((promotion) => (
                <PromotionRow
                  key={promotion._id}
                  promotion={promotion}
                  now={loadedAt}
                  onChanged={fetchData}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No past promotions"
              description="Finished promotions stay here for your records."
            />
          )}
        </Panel>
      )}

      <PromoteContentModal
        key={selectedContent?._id ?? 'none'}
        open={showPromoteModal}
        onOpenChange={setShowPromoteModal}
        item={selectedContent ? {
          _id: selectedContent._id,
          title: selectedContent.title,
          type: (selectedContent.contentType === 'job' || selectedContent.contentType === 'event' || selectedContent.contentType === 'resource'
            ? selectedContent.contentType
            : 'opportunity') as 'opportunity' | 'job' | 'event' | 'resource',
        } : null}
        onSuccess={fetchData}
      />
    </ProviderShell>
  )
}
