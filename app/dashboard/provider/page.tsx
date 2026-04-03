"use client"

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { hasPremiumAccess } from "@/lib/roles"
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import PromotionButton from '@/components/promotion/PromotionButton'
import PaymentDetails from '@/components/payment-details'
import { EditContentModal } from '@/components/edit-content-modal'
import { PromoteContentModal } from '@/components/promote-content-modal'
import { AuthRequiredCard } from '@/components/auth-required-card'
import ProviderDashboardSidebar from '@/components/provider/provider-dashboard-sidebar'
import ProviderDashboardBottomNav from '@/components/provider/provider-dashboard-bottom-nav'
import { 
  ArrowRight,
  TrendingUp,
  Eye,
  Calendar,
  Target,
  Briefcase,
  BookOpen,
  Plus,
  Settings,
  BarChart3,
  Zap,
  Heart,
  MapPin,
  Building,
  AlertCircle,
  RefreshCw,
  Crown,
  Bookmark,
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  Activity,
  FileText,
  Send,
  Home,
  LayoutDashboard,
  MoreVertical,
} from 'lucide-react'

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

interface Application {
  _id: string
  applicantName: string
  applicantEmail: string
  itemTitle: string
  itemType: 'opportunity' | 'job' | 'event'
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected'
  appliedAt: string
  notes?: string
}

type ProviderTab = 'overview' | 'content' | 'promotions' | 'analytics'

const DASHBOARD_PANEL_CLASS = "border border-border/60 bg-card/70 backdrop-blur-sm"
const DASHBOARD_PANEL_HEADER_CLASS = "p-4 md:p-6 pb-3 md:pb-4"

function DashboardPanel({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: any
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <Card className={DASHBOARD_PANEL_CLASS}>
      <CardHeader className={DASHBOARD_PANEL_HEADER_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center text-foreground text-base md:text-lg">
            <Icon className="mr-2 h-4 w-4 text-primary md:h-5 md:w-5" />
            {title}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">{children}</CardContent>
    </Card>
  )
}

function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  icon: any
  title: string
  description: string
  ctaHref?: string
  ctaLabel?: string
}) {
  return (
    <div className="py-8 text-center md:py-12">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-primary/10 md:h-16 md:w-16">
        <Icon className="h-7 w-7 text-primary md:h-8 md:w-8" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground md:text-lg">{title}</h3>
      <p className="mb-4 px-4 text-xs text-muted-foreground md:text-sm">{description}</p>
      {ctaHref && ctaLabel ? (
        <Button asChild className="min-h-11 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href={ctaHref}>
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}

function DashboardStatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
  iconWrapClassName,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon: any
  iconClassName?: string
  iconWrapClassName?: string
}) {
  return (
    <Card className="border border-border/60 bg-card/70 backdrop-blur-sm transition-all hover:border-primary/25 hover:bg-card">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-muted-foreground md:text-sm">{label}</p>
            <p className="mt-1 text-xl font-bold text-foreground md:text-3xl">{value}</p>
            {hint ? <p className="mt-0.5 text-[10px] text-muted-foreground md:text-xs">{hint}</p> : null}
          </div>
          <div
            className={cn(
              "h-10 w-10 shrink-0 rounded-xl border border-border flex items-center justify-center md:h-12 md:w-12",
              iconWrapClassName,
            )}
          >
            <Icon className={cn("h-5 w-5 md:h-6 md:w-6", iconClassName)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProviderContentCard({
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
  return (
    <div className="rounded-[1rem] border border-border/60 bg-card/70 p-3 transition-all hover:border-primary/20 hover:bg-card md:p-4">
      <div className="flex items-start gap-3">
        <div className={cn("h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center shrink-0 border", config.bg, config.border)}>
          <Icon className={cn("h-4 w-4 md:h-5 md:w-5", config.text)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className={cn("mb-1 font-medium text-foreground text-sm md:text-base", showActions ? "line-clamp-2" : "line-clamp-1")}>
                {item.title}
              </h4>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{config.label}</span>
                <span>•</span>
                <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                <Badge className={cn("text-xs", getStatusColor(item.status, item.isApproved))}>
                  {getStatusText(item.status, item.isApproved)}
                </Badge>
              </div>

              {showTags && item.tags && item.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="border-border text-xs text-muted-foreground">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 ? (
                    <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                      +{item.tags.length - 3}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>

            {showActions ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => onPromote?.(item)} className="h-8 w-8 p-0 text-primary/80 hover:bg-primary/10 hover:text-primary" title="Promote">
                  <TrendingUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit?.(item)} className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onView?.(item)} className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground" title="View">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete?.(item)} className="h-8 w-8 p-0 text-red-400/60 hover:bg-red-500/10 hover:text-red-400" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              <span>{item.metrics?.viewCount || 0}{showActions ? " views" : ""}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-red-400" />
              <span>{item.metrics?.likeCount || 0}{showActions ? " likes" : ""}</span>
            </div>
            {showSaves ? (
              <div className="flex items-center gap-1.5">
                <Bookmark className="h-3.5 w-3.5 text-primary" />
                <span>{item.metrics?.saveCount || 0} saves</span>
              </div>
            ) : null}
            {item.location ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="max-w-[120px] truncate">{getLocationString(item.location)}</span>
              </div>
            ) : null}
          </div>

          {item.paymentStatus && item.paymentStatus !== "not_required" ? (
            <div className="mt-3 border-t border-border pt-3">
              <PaymentDetails
                contentId={item._id}
                contentType={item.type}
                paymentStatus={item.paymentStatus}
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

export default function ProviderDashboard() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, profile, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<ProviderTab>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Dashboard data state
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
    activePostings: 0
  })
  const [postedItems, setPostedItems] = useState<PostedItem[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [onboardingStatus, setOnboardingStatus] = useState<{
    isCompleted: boolean
    completionPercentage: number
  } | null>(null)
  const   [editModalOpen, setEditModalOpen] = useState(false)
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
    if (!authLoading && user && user.role !== 'opportunity_poster' && user.role !== 'admin' && user.role !== 'super_admin') {
      toast.error('You need to be an opportunity provider to access this dashboard')
    }
  }, [authLoading, user])

  // Load provider dashboard data function
  const loadProviderData = useCallback(async () => {
    if (!user || (user.role !== 'opportunity_poster' && user.role !== 'admin' && user.role !== 'super_admin')) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // Check onboarding status
      try {
        const onboardingResponse = await ApiClient.getProviderOnboarding()
        setOnboardingStatus({
          isCompleted: onboardingResponse.onboarding?.isCompleted || false,
          completionPercentage: onboardingResponse.onboarding?.completionPercentage || 0
        })
      } catch (onboardingError) {
        console.log('No onboarding data found')
        setOnboardingStatus({
          isCompleted: false,
          completionPercentage: 0
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
      'event': { icon: Calendar, bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Event' },
      'opportunity': { icon: Target, bg: 'bg-primary/10', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Opportunity' },
      'resource': { icon: BookOpen, bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', label: 'Resource' }
    }
    return configs[type as keyof typeof configs] || configs.opportunity
  }

  const getStatusColor = (status: string, isApproved: boolean) => {
    if (status === 'draft' && !isApproved) return 'bg-primary/20 text-primary border border-primary/30'
    if (status === 'draft' && isApproved) return 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
    if (status === 'inactive' && !isApproved) return 'bg-red-500/20 text-red-400 border border-red-500/30'
    if (status === 'inactive' && isApproved) return 'bg-muted text-muted-foreground border border-border'
    if (status === 'active' && !isApproved) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
    if (status === 'active' && isApproved) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.16),transparent_58%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.08),transparent_55%)] px-4">
        <div className="text-center rounded-[1.25rem] border border-border/70 bg-card/80 p-8 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-body-sm">Loading provider dashboard...</p>
        </div>
      </div>
    )
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

  if (user.role !== 'opportunity_poster' && user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.16),transparent_58%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.08),transparent_55%)] px-4">
        <div className="text-center max-w-md rounded-[1.25rem] border border-border/70 bg-card/80 p-6 backdrop-blur-sm">
          <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Provider Access Required</h2>
          <p className="text-muted-foreground mb-4 text-body-sm">You need to be an opportunity provider to access this dashboard.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl min-h-11">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 rounded-2xl min-h-11 text-primary-foreground">
              <Link href="/profile/settings">Upgrade Account</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const navItems: { id: ProviderTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'promotions', label: 'Promotions', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  const quickLinks = [
    { label: 'Post Content', icon: Plus, href: '/dashboard/provider/posting', variant: 'default' as const },
    { label: 'Settings', icon: Settings, href: '/dashboard/provider/settings', variant: 'outline' as const },
    { label: 'Home', icon: Home, href: '/', variant: 'outline' as const },
  ]

  const totalPostings = stats.totalOpportunities + stats.totalEvents + stats.totalJobs + stats.totalResources
  const postingLimit = user ? getPostingLimit(user?.isPremium, user?.role) : 0
  const premiumPostingAccess = hasPremiumAccess({ isPremium: user?.isPremium, role: user?.role })

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.16),transparent_58%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.08),transparent_55%)] font-sans flex">
      <div className="flex flex-1 min-w-0">
        <ProviderDashboardSidebar
          user={user as any}
          profile={profile as any}
          navItems={navItems}
          quickLinks={quickLinks}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          totalPostings={totalPostings}
          postingLimit={postingLimit}
          hasPremium={premiumPostingAccess}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Mobile Header - Only visible on mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-page/80 backdrop-blur-xl border-b border-border/70">
          <div className="flex items-center justify-between h-14 px-4 pt-[max(0rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Crown className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-body-sm font-semibold text-foreground">Provider Hub</h1>
                <p className="text-caption text-muted-foreground">Workspace</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => loadProviderData()} 
                variant="ghost" 
                size="sm"
                disabled={isLoading}
                className="h-9 w-9 p-0 text-muted-foreground"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              
              {/* Quick Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 p-2"
                >
                  <DropdownMenuItem asChild className="text-foreground hover:bg-muted rounded-lg cursor-pointer focus:bg-muted focus:text-foreground">
                    <Link href="/dashboard/provider/posting" className="flex items-center gap-3 w-full">
                      <Plus className="h-4 w-4 text-primary" />
                      <span>Post Content</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-foreground hover:bg-muted rounded-lg cursor-pointer focus:bg-muted focus:text-foreground">
                    <Link href="/dashboard/provider/settings" className="flex items-center gap-3 w-full">
                      <Settings className="h-4 w-4 text-primary" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-muted my-1" />
                  <DropdownMenuItem asChild className="text-foreground hover:bg-muted rounded-lg cursor-pointer focus:bg-muted focus:text-foreground">
                    <Link href="/" className="flex items-center gap-3 w-full">
                      <Home className="h-4 w-4 text-primary" />
                      <span>Home</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* <Button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button> */}
            </div>
          </div>

        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:py-8 lg:px-8">
            <div className="mb-4 lg:hidden">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {navItems.map((item) => {
                  const active = activeTab === item.id
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-body-sm font-semibold transition-all",
                        active
                          ? "border-primary/30 bg-primary/12 text-primary"
                          : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="mb-4 rounded-[1.25rem] border border-border/70 bg-card/75 p-4 backdrop-blur-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-overline uppercase tracking-[0.14em] text-muted-foreground">Provider workspace</p>
                  <h1 className="mt-1 text-display-sm text-foreground sm:text-display-md">
                    Build and scale your listings
                  </h1>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    Publish faster, monitor engagement, and keep your funnel moving from one dashboard.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:w-[19rem]">
                  <div className="rounded-xl border border-border/60 bg-card/70 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Live</p>
                    <p className="text-body font-semibold text-foreground tabular-nums">{stats.activePostings}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/70 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Pending</p>
                    <p className="text-body font-semibold text-foreground tabular-nums">{stats.pendingApprovals}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/70 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Views</p>
                    <p className="text-body font-semibold text-foreground tabular-nums">{stats.totalViews}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Error Message */}
            {error && (
              <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-400 break-words">{error}</p>
                </div>
              </div>
            )}

            {/* Welcome Section */}
            {/* <div className="mb-4 md:mb-8">
              <div className="p-4 md:p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-lg md:text-xl font-bold text-foreground truncate">
                          Welcome back, {user?.firstName || user?.email?.split('@')[0]}!
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                          Manage your content and grow your reach
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold text-foreground">
                        {stats.activePostings}
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:inline">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div> */}

            {/* Onboarding Call-to-Action */}
            {onboardingStatus && !onboardingStatus.isCompleted && (
              <div className="mb-4 md:mb-8">
                <Card className="border border-primary/25 bg-gradient-to-br from-primary/12 to-primary/[0.06] backdrop-blur-sm">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 flex-shrink-0">
                          <Building className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold text-foreground mb-1">
                            Complete Your Provider Profile
                          </h3>
                          <p className="text-xs md:text-sm text-muted-foreground mb-2">
                            Set up your organization details to unlock full features
                          </p>
                          {onboardingStatus.completionPercentage > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>Progress</span>
                                <span>{onboardingStatus.completionPercentage}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div 
                                  className="bg-primary/100 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${onboardingStatus.completionPercentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-11 w-full sm:w-auto">
                        <Link href="/dashboard/provider/onboarding">
                          <Building className="h-4 w-4 mr-2" />
                          {onboardingStatus.completionPercentage > 0 ? 'Continue' : 'Start Setup'}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
                    
            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-12 md:py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm md:text-base text-muted-foreground">Loading dashboard data...</p>
              </div>
            )}

            {/* Overview Tab */}
            {!isLoading && activeTab === 'overview' && (
              <div className="space-y-4 md:space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                  <DashboardStatCard
                    label="Posts"
                    value={
                      <span className="text-primary">
                        {totalPostings} of {postingLimit}
                      </span>
                    }
                    hint={premiumPostingAccess ? "20 max (Premium)" : "5 max (Free)"}
                    icon={FileText}
                    iconWrapClassName="border-primary/20 bg-primary/10"
                    iconClassName="text-primary"
                  />
                  <DashboardStatCard
                    label="Views"
                    value={<span className="text-primary">{stats.totalViews}</span>}
                    icon={Eye}
                    iconWrapClassName="bg-primary/10"
                    iconClassName="text-primary"
                  />
                  <DashboardStatCard
                    label="Applications"
                    value={<span className="text-emerald-400">{stats.totalApplications}</span>}
                    icon={Send}
                    iconWrapClassName="bg-emerald-500/10"
                    iconClassName="text-emerald-400"
                  />
                  <DashboardStatCard
                    label="Pending"
                    value={<span className="text-yellow-400">{stats.pendingApprovals}</span>}
                    icon={Clock}
                    iconWrapClassName="bg-yellow-500/10"
                    iconClassName="text-yellow-400"
                  />
                </div>

                {/* Quick Actions */}
                <DashboardPanel icon={Zap} title="Quick Actions">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      <Button asChild className="h-auto min-h-11 p-3 md:p-4 flex flex-col items-center space-y-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl">
                        <Link href="/dashboard/provider/posting">
                          <Target className="h-5 w-5 md:h-6 md:w-6" />
                          <span className="text-xs md:text-sm">Opportunity</span>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-auto min-h-11 p-3 md:p-4 flex flex-col items-center space-y-2 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl">
                        <Link href="/dashboard/provider/posting">
                          <Calendar className="h-5 w-5 md:h-6 md:w-6" />
                          <span className="text-xs md:text-sm">Event</span>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-auto min-h-11 p-3 md:p-4 flex flex-col items-center space-y-2 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl">
                        <Link href="/dashboard/provider/posting">
                          <Briefcase className="h-5 w-5 md:h-6 md:w-6" />
                          <span className="text-xs md:text-sm">Job</span>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-auto min-h-11 p-3 md:p-4 flex flex-col items-center space-y-2 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl">
                        <Link href="/dashboard/provider/posting">
                          <BookOpen className="h-5 w-5 md:h-6 md:w-6" />
                          <span className="text-xs md:text-sm">Resource</span>
                        </Link>
                      </Button>
                    </div>
                </DashboardPanel>

                {/* Recent Activity */}
                <DashboardPanel icon={Activity} title="Recent Activity">
                    {postedItems.length > 0 ? (
                      <div className="space-y-3 md:space-y-4">
                        {postedItems.slice(0, 5).map((item) => {
                          const config = getTypeConfig(item.type)
                          return (
                            <ProviderContentCard
                              key={item._id}
                              item={item}
                              config={config}
                              getStatusColor={getStatusColor}
                              getStatusText={getStatusText}
                              getLocationString={getLocationString}
                              onStatusUpdate={loadProviderData}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <DashboardEmptyState
                        icon={FileText}
                        title="No Content Yet"
                        description="Start by posting your first opportunity, event, or job"
                        ctaHref="/dashboard/provider/posting"
                        ctaLabel="Post Your First Content"
                      />
                    )}
                </DashboardPanel>
              </div>
            )}

            {/* Content Tab */}
            {!isLoading && activeTab === 'content' && (
              <div className="space-y-4 md:space-y-6">
                <DashboardPanel
                  icon={FileText}
                  title="My Content"
                  action={
                    <Button asChild size="sm" className="w-full rounded-xl bg-primary hover:bg-primary/90 sm:w-auto">
                      <Link href="/dashboard/provider/posting">
                        <Plus className="mr-2 h-4 w-4" />
                        Post New
                      </Link>
                    </Button>
                  }
                >
                    {postedItems.length > 0 ? (
                      <div className="space-y-3 md:space-y-4">
                        {postedItems.map((item) => {
                          const config = getTypeConfig(item.type)
                          return (
                            <ProviderContentCard
                              key={item._id}
                              item={item}
                              config={config}
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
                          )
                        })}
                      </div>
                    ) : (
                      <DashboardEmptyState
                        icon={FileText}
                        title="No Content Yet"
                        description="Start by posting your first opportunity, event, or job"
                        ctaHref="/dashboard/provider/posting"
                        ctaLabel="Post Your First Content"
                      />
                    )}
                </DashboardPanel>
              </div>
            )}

            {/* Promotions Tab */}
            {!isLoading && activeTab === 'promotions' && (
              <div className="space-y-4 md:space-y-6">
                <DashboardPanel icon={Zap} title="Promotions">
                  <DashboardEmptyState
                    icon={Zap}
                    title="Promote Your Content"
                    description="Boost the visibility of your opportunities, events, jobs, and resources"
                  />
                  <div className="-mt-4 flex justify-center">
                    <Button asChild className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                      <Link href="/dashboard/provider/promotions">
                        <Zap className="mr-2 h-4 w-4" />
                        Manage Promotions
                      </Link>
                    </Button>
                  </div>
                </DashboardPanel>
              </div>
            )}

            {/* Analytics Tab */}
            {!isLoading && activeTab === 'analytics' && (
              <div className="space-y-4 md:space-y-6">
                <DashboardPanel icon={BarChart3} title="Analytics & Insights">
                  <DashboardEmptyState
                    icon={BarChart3}
                    title="Analytics Coming Soon"
                    description="Detailed analytics and insights for your content performance will be available here"
                  />
                </DashboardPanel>
              </div>
            )}
          </div>
        </main>

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

        <ProviderDashboardBottomNav navItems={navItems} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
    </div>
  )
}

