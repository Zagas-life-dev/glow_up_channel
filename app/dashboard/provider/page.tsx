"use client"

import { useState, useEffect, useCallback } from 'react'
import { UP_KIND } from '@/components/up/kind'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import { getPostingLimit } from "@/lib/posting-limits"
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EditContentModal } from '@/components/edit-content-modal'
import { PromoteContentModal } from '@/components/promote-content-modal'
import { AuthRequiredCard } from '@/components/auth-required-card'
import { ProviderShell, PROVIDER_NAV_ITEMS, PROVIDER_PAGE_BACKGROUND } from '@/components/provider/provider-shell'
import {
  Panel,
  EmptyState,
  StatTile,
  QuotaMeter,
  ErrorBanner,
  OnboardingBanner,
  InlineLoading,
  ProviderLoading,
  type ProviderTab,
  type Tone,
} from '@/components/provider/provider-ui'
import {
  ArrowRight,
  TrendingUp,
  Eye,
  Calendar,
  Target,
  Briefcase,
  BookOpen,
  Plus,
  Zap,
  Heart,
  MapPin,
  AlertCircle,
  Crown,
  Bookmark,
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  Activity,
  FileText,
  Send,
  BarChart3,
  MoreVertical,
  CheckCircle2,
  Users,
} from 'lucide-react'
import { canPublishContent } from '@/lib/roles'
import { ListingAnalyticsCard, ListingAnalyticsSummary } from '@/components/analytics/listing-analytics'
import {
  EMPTY_TOTALS,
  fetchListingAnalytics,
  formatRate,
  type ListingAnalyticsRow,
  type ListingAnalyticsTotals,
} from '@/lib/analytics/listing-analytics'

interface ProviderStats {
  totalOpportunities: number
  totalEvents: number
  totalJobs: number
  totalResources: number
  totalViews: number
  totalRegistrations: number
  totalLikes: number
  totalSaves: number
  pendingApprovals: number
  activePostings: number
}

interface PostedItem {
  _id: string
  title: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  company?: string
  organizer?: string
  status: 'active' | 'inactive' | 'draft' | 'pending'
  isApproved: boolean
  createdAt: string
  updatedAt: string
  metrics?: {
    viewCount?: number
    likeCount?: number
    saveCount?: number
    registrationCount?: number
    downloadCount?: number
  }
  location?: {
    country?: string
    province?: string
    city?: string
  }
  tags?: string[]
}

/* ------------------------------------------------------------------ */

function ContentRow({
  item,
  config,
  getStatusColor,
  getStatusText,
  getLocationString,
  showActions = false,
  showTags = false,
  showSaves = false,
  onPromote,
  onEdit,
  onView,
  onDelete,
}: {
  item: PostedItem
  config: { icon: any; bg: string; border: string; text: string; label: string }
  getStatusColor: (status: string, isApproved: boolean) => string
  getStatusText: (status: string, isApproved: boolean) => string
  getLocationString: (location?: any) => string
  showActions?: boolean
  showTags?: boolean
  showSaves?: boolean
  onPromote?: (item: PostedItem) => void
  onEdit?: (item: PostedItem) => void
  onView?: (item: PostedItem) => void
  onDelete?: (item: PostedItem) => void
}) {
  const Icon = config.icon

  return (
    <div className="rounded-up-lg border border-border bg-card px-4 py-3.5 transition-colors hover:border-up-border-hover">
      <div className="flex items-start gap-3.5">
        <span className={cn("grid h-[34px] w-[34px] shrink-0 place-items-center rounded-up-sm", config.bg, config.border)}>
          <Icon className={cn("h-[18px] w-[18px]", config.text)} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-foreground">{item.title}</h3>
            <Badge className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold hover:bg-inherit", getStatusColor(item.status, item.isApproved))}>
              {getStatusText(item.status, item.isApproved)}
            </Badge>
            {showActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-mr-1 -mt-1 h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Actions for ${item.title}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 p-1">
                  <DropdownMenuItem onClick={() => onPromote?.(item)} className="cursor-pointer rounded-lg">
                    <TrendingUp className="mr-2 h-4 w-4 text-up-orange-ink" />
                    Promote
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(item)} className="cursor-pointer rounded-lg">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onView?.(item)} className="cursor-pointer rounded-lg">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete?.(item)}
                    className="cursor-pointer rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            <span className="font-bold text-foreground">{config.label}</span>
            <span className="opacity-40">·</span>
            <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
            {item.location ? (
              <span className="inline-flex max-w-[140px] items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{getLocationString(item.location)}</span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye className="h-3 w-3" />
              {item.metrics?.viewCount || 0}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Heart className="h-3 w-3" />
              {item.metrics?.likeCount || 0}
            </span>
            {showSaves ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Bookmark className="h-3 w-3" />
                {item.metrics?.saveCount || 0}
              </span>
            ) : null}
          </div>

          {showTags && item.tags && item.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="rounded-md border-border/60 px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                  {tag}
                </Badge>
              ))}
              {item.tags.length > 3 ? (
                <Badge variant="outline" className="rounded-md border-border/60 px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                  +{item.tags.length - 3}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function ProviderDashboard() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, profile, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<ProviderTab>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [stats, setStats] = useState<ProviderStats>({
    totalOpportunities: 0,
    totalEvents: 0,
    totalJobs: 0,
    totalResources: 0,
    totalViews: 0,
    totalRegistrations: 0,
    totalLikes: 0,
    totalSaves: 0,
    pendingApprovals: 0,
    activePostings: 0,
  })
  const [postedItems, setPostedItems] = useState<PostedItem[]>([])
  /**
   * Real per-listing analytics, including the apply funnel from the tracker.
   *
   * The four /my/* endpoints above only return each listing's stored metrics —
   * they have never carried an application count, which is why "Applications"
   * read zero for everyone. This is where that number actually comes from.
   */
  const [analytics, setAnalytics] = useState<{
    listings: ListingAnalyticsRow[]
    totals: ListingAnalyticsTotals
  }>({ listings: [], totals: EMPTY_TOTALS })
  const [onboardingStatus, setOnboardingStatus] = useState<{
    isCompleted: boolean
    completionPercentage: number
  } | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PostedItem | null>(null)
  const [promoteModalOpen, setPromoteModalOpen] = useState(false)
  const [promotingItem, setPromotingItem] = useState<PostedItem | null>(null)

  // Hide navbar when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // Check if user has provider permissions
  useEffect(() => {
    if (!authLoading && user && !canPublishContent(user.role)) {
      toast.error('You need to be an opportunity provider to access this dashboard')
    }
  }, [authLoading, user])

  // Load provider dashboard data function
  const loadProviderData = useCallback(async () => {
    if (!user || (!canPublishContent(user.role))) return

    setIsLoading(true)
    setError('')

    try {
      // Check onboarding status
      try {
        const onboardingResponse = await ApiClient.getProviderOnboarding()
        setOnboardingStatus({
          isCompleted: onboardingResponse.onboarding?.isCompleted || false,
          completionPercentage: onboardingResponse.onboarding?.completionPercentage || 0,
        })
      } catch (onboardingError) {
        console.log('No onboarding data found')
        setOnboardingStatus({
          isCompleted: false,
          completionPercentage: 0,
        })
      }

      // Load user's posted content
      const [opportunitiesRes, eventsRes, jobsRes, resourcesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/my/opportunities?limit=50`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).catch(() => ({ json: () => ({ success: false, data: { opportunities: [] } }) })),

        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events/my/events?limit=50`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).catch(() => ({ json: () => ({ success: false, data: { events: [] } }) })),

        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/jobs/my/jobs?limit=50`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).catch(() => ({ json: () => ({ success: false, data: { jobs: [] } }) })),

        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources/my/resources?limit=50`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }).catch(() => ({ json: () => ({ success: false, data: { resources: [] } }) }))
      ])

      const [opportunitiesData, eventsData, jobsData, resourcesData] = await Promise.all([
        opportunitiesRes.json(),
        eventsRes.json(),
        jobsRes.json(),
        resourcesRes.json()
      ])

      // Process posted items
      const allPostedItems: PostedItem[] = []

      if (opportunitiesData.success) {
        opportunitiesData.data.opportunities.forEach((item: any) => {
          allPostedItems.push({
            _id: item._id,
            title: item.title,
            type: 'opportunity',
            company: item.provider,
            status: item.status,
            isApproved: item.isApproved,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            metrics: item.metrics,
            location: item.location,
            tags: item.tags
          })
        })
      }

      if (eventsData.success) {
        eventsData.data.events.forEach((item: any) => {
          allPostedItems.push({
            _id: item._id,
            title: item.title,
            type: 'event',
            organizer: item.organizer,
            status: item.status,
            isApproved: item.isApproved,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            metrics: item.metrics,
            location: item.location,
            tags: item.tags
          })
        })
      }

      if (jobsData.success) {
        jobsData.data.jobs.forEach((item: any) => {
          allPostedItems.push({
            _id: item._id,
            title: item.title,
            type: 'job',
            company: item.company,
            status: item.status,
            isApproved: item.isApproved,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            metrics: item.metrics,
            location: item.location,
            tags: item.tags
          })
        })
      }

      if (resourcesData.success) {
        resourcesData.data.resources.forEach((item: any) => {
          allPostedItems.push({
            _id: item._id,
            title: item.title,
            type: 'resource',
            company: item.author,
            status: item.status,
            isApproved: item.isApproved,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            metrics: item.metrics,
            tags: item.tags
          })
        })
      }

      // Calculate stats
      const stats: ProviderStats = {
        totalOpportunities: opportunitiesData.success ? opportunitiesData.data.opportunities.length : 0,
        totalEvents: eventsData.success ? eventsData.data.events.length : 0,
        totalJobs: jobsData.success ? jobsData.data.jobs.length : 0,
        totalResources: resourcesData.success ? resourcesData.data.resources.length : 0,
        totalViews: allPostedItems.reduce((sum, item) => sum + (item.metrics?.viewCount || 0), 0),
        totalRegistrations: allPostedItems.reduce((sum, item) => sum + (item.metrics?.registrationCount || 0), 0),
        totalLikes: allPostedItems.reduce((sum, item) => sum + (item.metrics?.likeCount || 0), 0),
        totalSaves: allPostedItems.reduce((sum, item) => sum + (item.metrics?.saveCount || 0), 0),
        pendingApprovals: allPostedItems.filter(item => !item.isApproved).length,
        activePostings: allPostedItems.filter(item => item.status === 'active' && item.isApproved).length
      }

      setStats(stats)
      setPostedItems(allPostedItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))

      // Analytics are a bonus on this screen, not a prerequisite — a failure
      // here must not blank out a dashboard that already has its content.
      try {
        const result = await fetchListingAnalytics()
        setAnalytics({ listings: result.listings, totals: result.totals })
      } catch (analyticsError) {
        console.error('Error loading listing analytics:', analyticsError)
      }

    } catch (err: any) {
      console.error('Error loading provider dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Load provider dashboard data
  useEffect(() => {
    loadProviderData()
  }, [loadProviderData])

  const getLocationString = (location?: any): string => {
    if (!location) return 'Remote'
    const parts = [location.city, location.province, location.country].filter(Boolean)
    return parts.join(', ') || 'Remote'
  }

  const getTypeConfig = (type: string) => {
    const configs = {
      // UP type chips: opportunity orange tint, job navy, event lime tint, resource outlined.
      'job': { icon: Briefcase, bg: UP_KIND.job.chip, border: '', text: '', label: 'Job' },
      'event': { icon: Calendar, bg: UP_KIND.event.chip, border: '', text: '', label: 'Event' },
      'opportunity': { icon: Target, bg: UP_KIND.opportunity.chip, border: '', text: '', label: 'Opportunity' },
      'resource': { icon: BookOpen, bg: UP_KIND.resource.chip, border: '', text: '', label: 'Resource' }
    }
    return configs[type as keyof typeof configs] || configs.opportunity
  }

  const getStatusColor = (status: string, isApproved: boolean) => {
    if (status === 'draft' && !isApproved) return 'bg-up-fill text-muted-foreground border border-transparent'
    if (status === 'draft' && isApproved) return 'bg-up-fill text-foreground border border-transparent'
    if (status === 'inactive' && !isApproved) return 'bg-destructive/10 text-destructive border border-transparent'
    if (status === 'inactive' && isApproved) return 'bg-up-fill text-muted-foreground border border-transparent'
    if (status === 'active' && !isApproved) return 'bg-up-orange-tint text-up-orange-ink border border-transparent'
    if (status === 'active' && isApproved) return 'bg-up-lime-tint text-foreground border border-transparent'
    return 'bg-up-fill text-muted-foreground border border-transparent'
  }

  const getStatusText = (status: string, isApproved: boolean) => {
    if (status === 'draft' && !isApproved) return 'Draft'
    if (status === 'draft' && isApproved) return 'Hidden'
    if (status === 'inactive' && !isApproved) return 'Inactive'
    if (status === 'inactive' && isApproved) return 'Inactive'
    if (status === 'active' && !isApproved) return 'Pending'
    if (status === 'active' && isApproved) return 'Live'
    return 'Unknown'
  }

  const handleEditContent = (item: PostedItem) => {
    setEditingItem(item)
    setEditModalOpen(true)
  }

  const handlePromoteContent = (item: PostedItem) => {
    setPromotingItem(item)
    setPromoteModalOpen(true)
  }

  const handleViewContent = (item: any) => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    } else {
      toast.info(`Viewing ${item.type}: "${item.title}"`)
    }
  }

  const handleDeleteContent = async (item: any) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.title}"? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      switch (item.type) {
        case 'opportunity':
          await ApiClient.deleteOpportunity(item._id)
          break
        case 'job':
          await ApiClient.deleteJob(item._id)
          break
        case 'event':
          await ApiClient.deleteEvent(item._id)
          break
        case 'resource':
          await ApiClient.deleteResource(item._id)
          break
        default:
          throw new Error(`Unknown content type: ${item.type}`)
      }

      toast.success(`${item.type} "${item.title}" deleted successfully!`)
      loadProviderData()

    } catch (error) {
      console.error('Error deleting content:', error)
      toast.error('Failed to delete content. Please try again.')
    }
  }

  if (authLoading) {
    return <ProviderLoading label="Loading provider dashboard..." />
  }

  if (!user) {
    return (
      <AuthRequiredCard
        title="Access denied"
        description="Please log in to access your provider dashboard."
        icon={AlertCircle}
        signInLabel="Sign in"
      />
    )
  }

  if (!canPublishContent(user.role)) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center px-4", PROVIDER_PAGE_BACKGROUND)}>
        <div className="max-w-md rounded-up-xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-up-md bg-up-orange-tint text-up-orange-ink">
            <Crown className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Provider Access Required</h2>
          <p className="mb-5 text-body-sm text-muted-foreground">You need to be an opportunity provider to access this dashboard.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild className="min-h-11">
              <Link href="/profile/settings">Upgrade Account</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const createTypes = [
    { label: 'Opportunity', icon: Target, tone: '', ring: UP_KIND.opportunity.chip },
    { label: 'Job', icon: Briefcase, tone: '', ring: UP_KIND.job.chip },
    { label: 'Event', icon: Calendar, tone: '', ring: UP_KIND.event.chip },
    { label: 'Resource', icon: BookOpen, tone: '', ring: UP_KIND.resource.chip },
  ]

  const totalPostings = stats.totalOpportunities + stats.totalEvents + stats.totalJobs + stats.totalResources
  const postingLimit = user ? getPostingLimit(user?.role) : 0
  const activeNav = PROVIDER_NAV_ITEMS.find((item) => item.id === activeTab) ?? PROVIDER_NAV_ITEMS[0]

  const breakdown = [
    { label: 'Opportunities', value: stats.totalOpportunities, icon: Target, tone: 'amber' as Tone },
    { label: 'Events', value: stats.totalEvents, icon: Calendar, tone: 'emerald' as Tone },
    { label: 'Jobs', value: stats.totalJobs, icon: Briefcase, tone: 'primary' as Tone },
    { label: 'Resources', value: stats.totalResources, icon: BookOpen, tone: 'violet' as Tone },
  ]

  const engagement = [
    { label: 'Views', value: stats.totalViews, icon: Eye, tone: 'navy' as Tone },
    { label: 'Likes', value: stats.totalLikes, icon: Heart, tone: 'amber' as Tone },
    { label: 'Saves', value: stats.totalSaves, icon: Bookmark, tone: 'violet' as Tone },
    { label: 'Registrations', value: stats.totalRegistrations, icon: Users, tone: 'emerald' as Tone },
  ]

  const funnel = analytics.totals.funnel

  return (
    <ProviderShell
      user={user}
      profile={profile}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={activeNav.label}
      totalPostings={totalPostings}
      postingLimit={postingLimit}
      onRefresh={() => loadProviderData()}
      refreshing={isLoading}
    >
      {error && <ErrorBanner message={error} onRetry={() => loadProviderData()} />}

      {onboardingStatus && !onboardingStatus.isCompleted && (
        <OnboardingBanner percentage={onboardingStatus.completionPercentage} />
      )}

      {isLoading && <InlineLoading label="Loading dashboard data..." />}

      {/* ---------------- Overview ---------------- */}
      {!isLoading && activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-4">
            <StatTile label="Live" value={stats.activePostings} icon={CheckCircle2} tone="navy" />
            <StatTile label="Views" value={stats.totalViews} icon={Eye} tone="primary" />
            <StatTile
              label="Applied"
              value={funnel.applied}
              icon={Send}
              tone="violet"
              hint={funnel.started > 0 ? `${funnel.started} still applying` : undefined}
            />
            <StatTile label="Pending" value={stats.pendingApprovals} icon={Clock} tone="amber" />
          </div>

          {/* Quota lives in the sidebar on desktop */}
          <QuotaMeter used={totalPostings} limit={postingLimit} className="lg:hidden" />

          <Panel icon={Plus} title="Create" subtitle="Start a new listing">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {createTypes.map(({ label, icon: Icon, tone, ring }) => (
                <Link
                  key={label}
                  href="/dashboard/provider/posting"
                  className="flex min-h-14 items-center gap-2.5 rounded-up-lg border-[1.5px] border-border bg-card p-3 text-sm font-bold text-foreground transition-colors hover:border-up-border-hover"
                >
                  <span className={cn("grid h-[34px] w-[34px] shrink-0 place-items-center rounded-up-sm", ring)}>
                    <Icon className={cn("h-[18px] w-[18px]", tone)} />
                  </span>
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel
            icon={Activity}
            title="Recent activity"
            subtitle={postedItems.length > 0 ? `${postedItems.length} total listing${postedItems.length === 1 ? '' : 's'}` : undefined}
            action={
              postedItems.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('content')}
                  className="h-8 shrink-0 px-3 text-xs text-up-orange-ink hover:bg-up-orange-tint hover:text-up-orange-ink"
                >
                  View all
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              ) : undefined
            }
            bodyClassName={postedItems.length > 0 ? undefined : "p-0"}
          >
            {postedItems.length > 0 ? (
              <div className="space-y-2">
                {postedItems.slice(0, 5).map((item) => (
                  <ContentRow
                    key={item._id}
                    item={item}
                    config={getTypeConfig(item.type)}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                    getLocationString={getLocationString}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No content yet"
                description="Post your first opportunity, event, job, or resource to start tracking performance."
                ctaHref="/dashboard/provider/posting"
                ctaLabel="Create your first post"
              />
            )}
          </Panel>
        </div>
      )}

      {/* ---------------- Content ---------------- */}
      {!isLoading && activeTab === 'content' && (
        <Panel
          icon={FileText}
          title="My content"
          subtitle={
            postedItems.length > 0
              ? `${stats.activePostings} live · ${stats.pendingApprovals} pending · ${postedItems.length} total`
              : undefined
          }
          action={
            <Button asChild size="sm" className="h-9 shrink-0 px-3.5">
              <Link href="/dashboard/provider/posting">
                <Plus className="mr-1.5 h-4 w-4" />
                New post
              </Link>
            </Button>
          }
          bodyClassName={postedItems.length > 0 ? undefined : "p-0"}
        >
          {postedItems.length > 0 ? (
            <div className="space-y-2">
              {postedItems.map((item) => (
                <ContentRow
                  key={item._id}
                  item={item}
                  config={getTypeConfig(item.type)}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  getLocationString={getLocationString}
                  showActions
                  showTags
                  showSaves
                  onPromote={handlePromoteContent}
                  onEdit={handleEditContent}
                  onView={handleViewContent}
                  onDelete={handleDeleteContent}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No content yet"
              description="Post your first opportunity, event, job, or resource to start tracking performance."
              ctaHref="/dashboard/provider/posting"
              ctaLabel="Create your first post"
            />
          )}
        </Panel>
      )}

      {/* ---------------- Promotions ---------------- */}
      {!isLoading && activeTab === 'promotions' && (
        <Panel icon={Zap} title="Promotions" subtitle="Boost reach on any listing" bodyClassName="p-0">
          <EmptyState
            icon={Zap}
            title="Promote your content"
            description="Pick an opportunity, event, job, or resource and get it in front of more people."
            ctaHref="/dashboard/provider/promotions"
            ctaLabel="Manage promotions"
          />
        </Panel>
      )}

      {/* ---------------- Analytics ---------------- */}
      {!isLoading && activeTab === 'analytics' && (
        <div className="space-y-4">
          <Panel icon={BarChart3} title="Engagement" subtitle="Across all your listings">
            <div className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-4">
              {engagement.map(({ label, value, icon, tone }) => (
                <StatTile key={label} label={label} value={value} icon={icon} tone={tone} />
              ))}
            </div>
          </Panel>

          <Panel icon={FileText} title="Content mix" subtitle={`${totalPostings} listing${totalPostings === 1 ? '' : 's'} published`}>
            <div className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-4">
              {breakdown.map(({ label, value, icon, tone }) => (
                <StatTile key={label} label={label} value={value} icon={icon} tone={tone} />
              ))}
            </div>
          </Panel>

          {/*
            The apply funnel. Views and saves say a listing was noticed; this
            says whether anyone actually went after it — which is the question
            a provider is really asking.
          */}
          <Panel
            icon={Send}
            title="Applications"
            subtitle={
              funnel.tracked > 0
                ? `${formatRate(analytics.totals.rates.submitRate)} of people who clicked through said they applied`
                : 'Nobody has clicked through to apply yet'
            }
          >
            <ListingAnalyticsSummary totals={analytics.totals} />
          </Panel>

          <Panel
            icon={TrendingUp}
            title="Per listing"
            subtitle="Open a listing for its full breakdown"
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/provider/analytics">
                  Full analytics
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            }
            bodyClassName="space-y-3"
          >
            {analytics.listings.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="Nothing to measure yet"
                description="Once a listing is live and people start opening it, its numbers appear here."
                ctaHref="/dashboard/provider/posting"
                ctaLabel="Post content"
              />
            ) : (
              analytics.listings
                .slice(0, 5)
                .map((row) => <ListingAnalyticsCard key={`${row.contentType}-${row._id}`} row={row} />)
            )}
          </Panel>
        </div>
      )}

      <EditContentModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        item={editingItem}
        onSaved={loadProviderData}
      />
      <PromoteContentModal
        key={promotingItem?._id ?? 'none'}
        open={promoteModalOpen}
        onOpenChange={setPromoteModalOpen}
        item={promotingItem}
        onSuccess={loadProviderData}
      />
    </ProviderShell>
  )
}
