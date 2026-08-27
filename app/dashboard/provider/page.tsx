"use client"

import { useState, useEffect, useCallback } from 'react'
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
import PaymentDetails from '@/components/payment-details'
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

interface ProviderStats {
  totalOpportunities: number
  totalEvents: number
  totalJobs: number
  totalResources: number
  totalViews: number
  totalApplications: number
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
    applicationCount?: number
    registrationCount?: number
    downloadCount?: number
  }
  location?: {
    country?: string
    province?: string
    city?: string
  }
  tags?: string[]
  paymentStatus?: string
  paymentAmount?: number
  paymentReference?: string
  paymentReceipt?: string
  paymentNotes?: string
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
  onStatusUpdate,
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
  onStatusUpdate: () => void
}) {
  const Icon = config.icon
  const showPayment = Boolean(item.paymentStatus && item.paymentStatus !== "not_required")

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-3 transition-colors hover:border-primary/20 hover:bg-card/80">
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", config.bg, config.border)}>
          <Icon className={cn("h-4 w-4", config.text)} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-body-sm font-semibold text-foreground">{item.title}</h3>
            <Badge className={cn("shrink-0 rounded-md px-1.5 py-0 text-[10px] font-semibold", getStatusColor(item.status, item.isApproved))}>
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
                    <TrendingUp className="mr-2 h-4 w-4 text-primary" />
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
                    className="cursor-pointer rounded-lg text-red-500 focus:bg-red-500/10 focus:text-red-500"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/70">{config.label}</span>
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
              <Heart className="h-3 w-3 text-red-400" />
              {item.metrics?.likeCount || 0}
            </span>
            {showSaves ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Bookmark className="h-3 w-3 text-primary" />
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

          {showPayment ? (
            <div className="mt-2.5 border-t border-border/50 pt-2.5">
              <PaymentDetails
                contentId={item._id}
                contentType={item.type}
                paymentStatus={item.paymentStatus as string}
                paymentAmount={item.paymentAmount}
                paymentReference={item.paymentReference}
                paymentReceipt={item.paymentReceipt}
                paymentNotes={item.paymentNotes}
                onStatusUpdate={onStatusUpdate}
              />
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
    totalApplications: 0,
    totalRegistrations: 0,
    totalLikes: 0,
    totalSaves: 0,
    pendingApprovals: 0,
    activePostings: 0,
  })
  const [postedItems, setPostedItems] = useState<PostedItem[]>([])
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
            tags: item.tags,
            paymentStatus: item.paymentStatus,
            paymentAmount: item.paymentAmount,
            paymentReference: item.paymentReference,
            paymentReceipt: item.paymentReceipt,
            paymentNotes: item.paymentNotes
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
        totalApplications: allPostedItems.reduce((sum, item) => sum + (item.metrics?.applicationCount || 0), 0),
        totalRegistrations: allPostedItems.reduce((sum, item) => sum + (item.metrics?.registrationCount || 0), 0),
        totalLikes: allPostedItems.reduce((sum, item) => sum + (item.metrics?.likeCount || 0), 0),
        totalSaves: allPostedItems.reduce((sum, item) => sum + (item.metrics?.saveCount || 0), 0),
        pendingApprovals: allPostedItems.filter(item => !item.isApproved).length,
        activePostings: allPostedItems.filter(item => item.status === 'active' && item.isApproved).length
      }

      setStats(stats)
      setPostedItems(allPostedItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))

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
      'job': { icon: Briefcase, bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary', label: 'Job' },
      'event': { icon: Calendar, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500 dark:text-emerald-400', label: 'Event' },
      'opportunity': { icon: Target, bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500 dark:text-orange-400', label: 'Opportunity' },
      'resource': { icon: BookOpen, bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-500 dark:text-violet-400', label: 'Resource' }
    }
    return configs[type as keyof typeof configs] || configs.opportunity
  }

  const getStatusColor = (status: string, isApproved: boolean) => {
    if (status === 'draft' && !isApproved) return 'bg-primary/15 text-primary border border-primary/25'
    if (status === 'draft' && isApproved) return 'bg-violet-500/15 text-violet-500 dark:text-violet-400 border border-violet-500/25'
    if (status === 'inactive' && !isApproved) return 'bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/25'
    if (status === 'inactive' && isApproved) return 'bg-muted text-muted-foreground border border-border'
    if (status === 'active' && !isApproved) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
    if (status === 'active' && isApproved) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
    return 'bg-muted text-muted-foreground border border-border'
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
        <div className="max-w-md rounded-2xl border border-border/70 bg-card/80 p-6 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Provider Access Required</h2>
          <p className="mb-5 text-body-sm text-muted-foreground">You need to be an opportunity provider to access this dashboard.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline" className="min-h-11 rounded-xl border-border text-muted-foreground hover:bg-muted hover:text-foreground">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild className="min-h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/profile/settings">Upgrade Account</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const createTypes = [
    { label: 'Opportunity', icon: Target, tone: 'text-orange-500 dark:text-orange-400', ring: 'border-orange-500/25 bg-orange-500/10' },
    { label: 'Event', icon: Calendar, tone: 'text-emerald-500 dark:text-emerald-400', ring: 'border-emerald-500/25 bg-emerald-500/10' },
    { label: 'Job', icon: Briefcase, tone: 'text-primary', ring: 'border-primary/25 bg-primary/10' },
    { label: 'Resource', icon: BookOpen, tone: 'text-violet-500 dark:text-violet-400', ring: 'border-violet-500/25 bg-violet-500/10' },
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
    { label: 'Views', value: stats.totalViews, icon: Eye, tone: 'primary' as Tone },
    { label: 'Likes', value: stats.totalLikes, icon: Heart, tone: 'amber' as Tone },
    { label: 'Saves', value: stats.totalSaves, icon: Bookmark, tone: 'violet' as Tone },
    { label: 'Registrations', value: stats.totalRegistrations, icon: Users, tone: 'emerald' as Tone },
  ]

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
            <StatTile label="Live" value={stats.activePostings} icon={CheckCircle2} tone="emerald" />
            <StatTile label="Views" value={stats.totalViews} icon={Eye} tone="primary" />
            <StatTile label="Applications" value={stats.totalApplications} icon={Send} tone="violet" />
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
                  className="flex min-h-11 items-center gap-2.5 rounded-xl border border-border/50 bg-card/40 px-3 py-2.5 text-body-sm font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-card"
                >
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border", ring)}>
                    <Icon className={cn("h-3.5 w-3.5", tone)} />
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
                  className="h-8 shrink-0 rounded-lg px-2 text-xs text-primary hover:bg-primary/10"
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
                    onStatusUpdate={loadProviderData}
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
            <Button asChild size="sm" className="h-9 shrink-0 rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90">
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
                  onStatusUpdate={loadProviderData}
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
            description="Put budget behind an opportunity, event, job, or resource to get it in front of more people."
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

          <Panel icon={TrendingUp} title="Deeper insights">
            <div className="px-1 py-4 text-center">
              <p className="text-body-sm text-muted-foreground">
                Per-listing trends, traffic sources, and conversion reporting are on the way.
              </p>
            </div>
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
        open={promoteModalOpen}
        onOpenChange={setPromoteModalOpen}
        item={promotingItem}
        onSuccess={loadProviderData}
      />
    </ProviderShell>
  )
}
