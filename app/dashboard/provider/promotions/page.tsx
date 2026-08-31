"use client"

import { useState, useEffect, useCallback } from 'react'
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
  Clock,
  BarChart3,
  Sparkles,
  Layers,
} from 'lucide-react'
import { toast } from "sonner"
import { PromoteContentModal } from "@/components/promote-content-modal"
import { ProviderShell, providerTabForPath, PROVIDER_NAV_ROUTES } from '@/components/provider/provider-shell'
import {
  Panel,
  EmptyState,
  StatTile,
  SegmentedTabs,
  ProviderLoading,
  statusToneClass,
} from '@/components/provider/provider-ui'

// Types matching backend exactly
interface Promotion {
  _id: string
  contentId: string
  contentType: string
  packageType: string
  packageName: string
  duration: number
  status: string
  createdAt: string
  startDate?: string
  endDate?: string
  isActive?: boolean
  isExpired?: boolean
  remainingDays?: number
  content?: {
    _id: string
    title: string
    description: string
    image?: string
  }
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

type PromoTab = 'active' | 'pending' | 'past' | 'recommended' | 'all-content'

/** Static map, not a factory — the icon is looked up, never constructed. */
const CONTENT_ICONS: Record<string, any> = {
  event: Calendar,
  job: Briefcase,
  resource: BookOpen,
  opportunity: Target,
}

/** Display name for a promotion. Every promotion is free, so there is no tier to name. */
const getPackageDisplayName = (p: Promotion) =>
  p.packageType === 'wallet_daily' || !p.packageName ? 'Promotion' : p.packageName || '—'

/* ------------------------------------------------------------------ */

/**
 * One promotion: package, type, duration, start and end dates, remaining days.
 * Nothing here is priced — promotion is free for providers.
 */
function PromotionRow({ promotion }: { promotion: Promotion }) {
  const Icon = CONTENT_ICONS[promotion.contentType] ?? Target

  const facts: { label: string; value: string }[] = [
    { label: 'Duration', value: `${promotion.duration ?? 0} days` },
    {
      label: 'Started',
      value: promotion.startDate ? new Date(promotion.startDate).toLocaleDateString() : '—',
    },
    {
      label: 'Ends',
      value: promotion.endDate ? new Date(promotion.endDate).toLocaleDateString() : '—',
    },
  ]

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-3 transition-colors hover:border-primary/20 hover:bg-card/80">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-body-sm font-semibold text-foreground">
              {promotion.content?.title || getPackageDisplayName(promotion)}
            </h3>
            <Badge className={cn("shrink-0 rounded-md px-1.5 py-0 text-[10px] font-semibold capitalize", statusToneClass(promotion.status))}>
              {promotion.status}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/70">{getPackageDisplayName(promotion)}</span>
            <span className="opacity-40">·</span>
            <span className="capitalize">{promotion.contentType || '—'}</span>
            <span className="opacity-40">·</span>
            <span>Created {new Date(promotion.createdAt).toLocaleDateString()}</span>
          </div>

          <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/50 pt-2.5 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="truncate text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{fact.label}</dt>
                <dd className="truncate text-body-sm font-semibold tabular-nums text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {typeof promotion.remainingDays === 'number' && promotion.remainingDays > 0 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" />
                {promotion.remainingDays} days remaining
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** A piece of content the provider can put budget behind. */
function PromotableContentRow({
  content,
  showMetrics = false,
  onPromote,
}: {
  content: UserContent
  showMetrics?: boolean
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
        <p className="truncate text-body-sm font-semibold text-foreground">{content.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="capitalize">{content.contentType}</span>
          {showMetrics ? (
            <>
              <span className="opacity-40">·</span>
              <span className="tabular-nums">{metrics.viewCount || 0} views</span>
              <span className="opacity-40">·</span>
              <span className="tabular-nums">{metrics.likeCount || 0} likes</span>
              <span className="opacity-40">·</span>
              <span className="tabular-nums">{metrics.saveCount || 0} saves</span>
            </>
          ) : null}
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
  const { user, profile, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [userContent, setUserContent] = useState<UserContent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<PromoTab>('active')

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

      // Fetch user content (authenticated)
      const [opportunitiesRes, eventsRes, jobsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/my/opportunities`, { headers: authHeaders })
          .then(res => res.json())
          .catch(() => ({ success: false, data: { opportunities: [] } })),

        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events/my/events`, { headers: authHeaders })
          .then(res => res.json())
          .catch(() => ({ success: false, data: { events: [] } })),

        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/jobs/my/jobs`, { headers: authHeaders })
          .then(res => res.json())
          .catch(() => ({ success: false, data: { jobs: [] } })),
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

      setUserContent(allContent)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load promotions data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user, fetchData])

  const handlePromote = (content: UserContent) => {
    setSelectedContent(content)
    setShowPromoteModal(true)
  }

  if (loading) {
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

  /* -------- derived data (unchanged rules, one bucket per tab) -------- */

  const now = new Date()

  // Finished: explicitly closed, or the end date has already passed.
  const isPast = (p: Promotion) => {
    if (p.status === 'completed' || p.status === 'expired' || p.status === 'cancelled') return true
    if (p.endDate) {
      try {
        const end = new Date(p.endDate)
        if (!isNaN(end.getTime()) && end < now) return true
      } catch {
        // ignore parse errors
      }
    }
    return false
  }

  // Three mutually exclusive, exhaustive buckets — every promotion lands in
  // exactly one, so nothing can hide the way it did across the old tab groups.
  const pastPromotions = promotions.filter(isPast)
  const livePromotions = promotions.filter(p => !isPast(p))
  const isRunning = (p: Promotion) => p.status === 'active'
  const activePromotions = livePromotions.filter(isRunning)
  const pendingPromotions = livePromotions.filter(p => !isRunning(p))

  // Content with no live promotion behind it
  const activeContentIds = new Set(activePromotions.map(p => p.contentId))
  const unpromotedContent: UserContent[] = userContent.filter((c: any) => !activeContentIds.has(c._id))

  // Recommended: unpromoted content ranked by engagement + recency
  const recommendedContent: UserContent[] = unpromotedContent
    .map((c: any) => {
      const metrics = c.metrics || {}
      const views = metrics.viewCount || 0
      const likes = metrics.likeCount || 0
      const saves = metrics.saveCount || 0
      const createdAt = c.createdAt ? new Date(c.createdAt).getTime() : 0
      const ageDays = createdAt ? (Date.now() - createdAt) / (1000 * 60 * 60 * 24) : 0
      const recencyBoost = ageDays ? Math.max(0, 30 - ageDays) : 0
      const score = views * 0.1 + likes * 3 + saves * 2 + recencyBoost
      return { content: c as UserContent, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(r => r.content)

  const sections: { id: PromoTab; label: string; icon: any; count: number }[] = [
    { id: 'active', label: 'Active', icon: CheckCircle2, count: activePromotions.length },
    { id: 'pending', label: 'Pending', icon: Clock, count: pendingPromotions.length },
    { id: 'past', label: 'Past', icon: BarChart3, count: pastPromotions.length },
    { id: 'recommended', label: 'Recommended', icon: Sparkles, count: recommendedContent.length },
    { id: 'all-content', label: 'All content', icon: Layers, count: unpromotedContent.length },
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
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-4">
        <StatTile
          label="Total promotions"
          value={promotions.length}
          hint="Promotion is free — no fees, no budget"
          icon={TrendingUp}
          tone="primary"
        />
        <StatTile label="Active" value={activePromotions.length} icon={CheckCircle2} tone="emerald" />
        <StatTile label="Pending" value={pendingPromotions.length} icon={Clock} tone="amber" />
        <StatTile label="Past" value={pastPromotions.length} icon={BarChart3} tone="violet" />
      </div>

      <SegmentedTabs items={sections} value={activeSection} onChange={setActiveSection} />

      {activeSection === 'active' && (
        <Panel icon={CheckCircle2} title="Active promotions" subtitle="Currently boosted" bodyClassName={activePromotions.length ? undefined : "p-0"}>
          {activePromotions.length > 0 ? (
            <div className="space-y-2">
              {activePromotions.map((promotion) => <PromotionRow key={promotion._id} promotion={promotion} />)}
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="No active promotions"
              description="Pick something from Recommended or All content and promote it — it is free."
              ctaLabel="See recommendations"
              onCta={() => setActiveSection('recommended')}
            />
          )}
        </Panel>
      )}

      {activeSection === 'pending' && (
        <Panel icon={Clock} title="Pending promotions" subtitle="Paused or not yet running" bodyClassName={pendingPromotions.length ? undefined : "p-0"}>
          {pendingPromotions.length > 0 ? (
            <div className="space-y-2">
              {pendingPromotions.map((promotion) => <PromotionRow key={promotion._id} promotion={promotion} />)}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="Nothing pending"
              description="All of your promotions are either running or finished."
            />
          )}
        </Panel>
      )}

      {activeSection === 'past' && (
        <Panel icon={BarChart3} title="Past promotions" subtitle="Completed, expired or cancelled" bodyClassName={pastPromotions.length ? undefined : "p-0"}>
          {pastPromotions.length > 0 ? (
            <div className="space-y-2">
              {pastPromotions.map((promotion) => <PromotionRow key={promotion._id} promotion={promotion} />)}
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No past promotions"
              description="Finished promotions will stay here for your records."
            />
          )}
        </Panel>
      )}

      {activeSection === 'recommended' && (
        <Panel
          icon={Sparkles}
          title="Recommended to promote"
          subtitle="Ranked by engagement and how recently you posted"
          bodyClassName={recommendedContent.length ? undefined : "p-0"}
        >
          {recommendedContent.length > 0 ? (
            <div className="space-y-2">
              {recommendedContent.map((content) => (
                <PromotableContentRow key={content._id} content={content} showMetrics onPromote={handlePromote} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No recommendations yet"
              description="Once you post more content and it starts getting engagement, the best candidates show up here."
              ctaHref="/dashboard/provider/posting"
              ctaLabel="Post content"
            />
          )}
        </Panel>
      )}

      {activeSection === 'all-content' && (
        <Panel
          icon={Layers}
          title="All content"
          subtitle="Everything without a live promotion"
          bodyClassName={unpromotedContent.length ? undefined : "p-0"}
        >
          {unpromotedContent.length > 0 ? (
            <div className="space-y-2">
              {unpromotedContent.map((content) => (
                <PromotableContentRow key={content._id} content={content} onPromote={handlePromote} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="No content to promote"
              description="Everything you have is already being promoted, or you have not posted anything yet."
              ctaHref="/dashboard/provider/posting"
              ctaLabel="Post content"
            />
          )}
        </Panel>
      )}

      <PromoteContentModal
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
