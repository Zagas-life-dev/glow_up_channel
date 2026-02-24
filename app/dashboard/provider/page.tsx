"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import PromotionButton from '@/components/promotion/PromotionButton'
import PaymentDetails from '@/components/payment-details'
import { EditContentModal } from '@/components/edit-content-modal'
import { PromoteContentModal } from '@/components/promote-content-modal'
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
  CheckCircle,
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
  Menu,
  X,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  MoreVertical,
  DollarSign
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

export default function ProviderDashboard() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, profile, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'promotions' | 'analytics'>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
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
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading provider dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Please log in to access your provider dashboard</p>
          <Button asChild className="bg-primary hover:bg-primary/90 rounded-xl">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (user.role !== 'opportunity_poster' && user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="text-center max-w-md">
          <Crown className="h-12 w-12 text-orange-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Provider Access Required</h2>
          <p className="text-muted-foreground mb-4">You need to be an opportunity provider to access this dashboard</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 rounded-xl">
              <Link href="/profile/settings">Upgrade Account</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const avatarUrl =
    (profile as any)?.profileImage ||
    (user as any)?.profileImage ||
    null

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard/provider' },
    { id: 'content', label: 'Content', icon: FileText, href: '/dashboard/provider' },
    { id: 'promotions', label: 'Promotions', icon: Zap, href: '/dashboard/provider/promotions' },
    // Wallet is hidden from provider nav for now; page remains reachable via direct URL if needed
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard/provider' },
  ]

  const quickLinks = [
    { label: 'Post Content', icon: Plus, href: '/dashboard/posting', variant: 'default' as const },
    { label: 'Settings', icon: Settings, href: '/dashboard/provider/settings', variant: 'outline' as const },
    { label: 'Home', icon: Home, href: '/', variant: 'outline' as const },
  ]

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#020817] via-[#020817] to-black overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.16),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(147,51,234,0.16),_transparent_55%)]" />
      <div className="relative flex">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-border/60 bg-card/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.65)] sticky top-0 h-screen">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-border/60 bg-card/10 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/15 flex items-center justify-center border border-orange-500/30 shadow-inner">
                <Crown className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground">Provider Hub</h1>
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
            </div>
          
            {/* User Info */}
            <div className="p-3 rounded-xl bg-card/70 backdrop-blur-sm border border-border/70 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500/30 to-rose-500/20 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={user?.firstName || user?.email || 'Provider avatar'}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-orange-400">
                    {(user?.firstName || user?.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.firstName || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'wallet') {
                    router.push(item.href)
                    return
                  }
                  setActiveTab(item.id as any)
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive 
                    ? "bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-card/70 hover:border hover:border-border/60"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-orange-400")} />
                <span>{item.label}</span>
              </button>
            )
          })}
          </nav>

          {/* Quick Actions */}
          <div className="p-4 border-t border-border/60 space-y-2">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Button
                key={link.label}
                asChild
                variant={link.variant}
                className={cn(
                  "w-full justify-start",
                  link.variant === 'default' 
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30" 
                    : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-card/60"
                )}
              >
                <Link href={link.href}>
                  <Icon className="w-4 h-4 mr-2" />
                  {link.label}
                </Link>
              </Button>
            )
          })}
        </div>

        {/* Stats Summary */}
        <div className="p-4 border-t border-border/60">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Active Postings</span>
              <span className="text-lg font-bold text-orange-400">{stats.activePostings}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              {(() => {
                const totalPostings = stats.totalOpportunities + stats.totalEvents + stats.totalJobs + stats.totalResources
                const maxTotal = Math.max(totalPostings, 1)
                const percentage = Math.min((stats.activePostings / maxTotal) * 100, 100)
                return (
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                )
              })()}
            </div>
          </div>
        </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header - Only visible on mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-card/10 backdrop-blur-xl border-b border-border/60">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/15 flex items-center justify-center border border-orange-500/30">
                <Crown className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">Provider Hub</h1>
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
                    <Link href="/dashboard/posting" className="flex items-center gap-3 w-full">
                      <Plus className="h-4 w-4 text-orange-400" />
                      <span>Post Content</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-foreground hover:bg-muted rounded-lg cursor-pointer focus:bg-muted focus:text-foreground">
                    <Link href="/dashboard/provider/settings" className="flex items-center gap-3 w-full">
                      <Settings className="h-4 w-4 text-orange-400" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-muted my-1" />
                  <DropdownMenuItem asChild className="text-foreground hover:bg-muted rounded-lg cursor-pointer focus:bg-muted focus:text-foreground">
                    <Link href="/" className="flex items-center gap-3 w-full">
                      <Home className="h-4 w-4 text-orange-400" />
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

          {/* Mobile Sidebar Drawer */}
          {sidebarOpen && (
            <>
              <div 
                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="fixed left-0 top-14 bottom-20 w-64 bg-page border-r border-border z-40 overflow-y-auto lg:hidden">
                <div className="p-4 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any)
                          setSidebarOpen(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          isActive 
                            ? "bg-primary/10 text-orange-400 border border-orange-500/20" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", isActive && "text-orange-400")} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                  
                  <div className="pt-4 mt-4 border-t border-border space-y-2">
                    {quickLinks.map((link) => {
                      const Icon = link.icon
                      return (
                        <Button
                          key={link.label}
                          asChild
                          variant={link.variant}
                          className={cn(
                            "w-full justify-start",
                            link.variant === 'default' 
                              ? "bg-primary hover:bg-primary/90" 
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Link href={link.href}>
                            <Icon className="w-4 h-4 mr-2" />
                            {link.label}
                          </Link>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            {/* Error Message */}
            {error && (
              <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
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
                <Card className="border border-primary/30 bg-primary/10">
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
                      <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-foreground rounded-xl w-full sm:w-auto">
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
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm md:text-base text-muted-foreground">Loading dashboard data...</p>
              </div>
            )}

            {/* Overview Tab */}
            {!isLoading && activeTab === 'overview' && (
              <div className="space-y-4 md:space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <Card className="border border-border bg-card hover:bg-muted transition-all">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Total</p>
                          <p className="text-xl md:text-3xl font-bold text-orange-400 mt-1">
                            {stats.totalOpportunities + stats.totalEvents + stats.totalJobs + stats.totalResources}
                          </p>
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-xl flex items-center justify-center border border-orange-500/30 flex-shrink-0">
                          <FileText className="h-5 w-5 md:h-6 md:w-6 text-orange-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border bg-card hover:bg-muted transition-all">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Views</p>
                          <p className="text-xl md:text-3xl font-bold text-primary mt-1">{stats.totalViews}</p>
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-primary/20 to-primary/20 rounded-xl flex items-center justify-center border border-primary/30 flex-shrink-0">
                          <Eye className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border bg-card hover:bg-muted transition-all">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Applications</p>
                          <p className="text-xl md:text-3xl font-bold text-emerald-400 mt-1">{stats.totalApplications}</p>
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
                          <Send className="h-5 w-5 md:h-6 md:w-6 text-emerald-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border bg-card hover:bg-muted transition-all">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Pending</p>
                          <p className="text-xl md:text-3xl font-bold text-yellow-400 mt-1">{stats.pendingApprovals}</p>
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-xl flex items-center justify-center border border-yellow-500/30 flex-shrink-0">
                          <Clock className="h-5 w-5 md:h-6 md:w-6 text-yellow-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card className="border border-border bg-card">
                  <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                    <CardTitle className="flex items-center text-foreground text-base md:text-lg">
                      <Zap className="h-4 w-4 md:h-5 md:w-5 mr-2 text-orange-400" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      <Button asChild className="h-auto p-3 md:p-4 flex flex-col items-center space-y-2 bg-primary hover:bg-primary/90 rounded-xl">
                        <Link href="/dashboard/posting">
                          <Target className="h-5 w-5 md:h-6 md:w-6" />
                          <span className="text-xs md:text-sm">Opportunity</span>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-auto p-3 md:p-4 flex flex-col items-center space-y-2 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl">
                        <Link href="/dashboard/posting">
                          <Calendar className="h-5 w-5 md:h-6 md:w-6" />
                          <span className="text-xs md:text-sm">Event</span>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-auto p-3 md:p-4 flex flex-col items-center space-y-2 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl">
                        <Link href="/dashboard/posting">
                          <Briefcase className="h-5 w-5 md:h-6 md:w-6" />
                          <span className="text-xs md:text-sm">Job</span>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-auto p-3 md:p-4 flex flex-col items-center space-y-2 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl">
                        <Link href="/dashboard/posting">
                          <BookOpen className="h-5 w-5 md:h-6 md:w-6" />
                          <span className="text-xs md:text-sm">Resource</span>
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="border border-border bg-card">
                  <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                    <CardTitle className="flex items-center text-foreground text-base md:text-lg">
                      <Activity className="h-4 w-4 md:h-5 md:w-5 mr-2 text-orange-400" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    {postedItems.length > 0 ? (
                      <div className="space-y-3 md:space-y-4">
                        {postedItems.slice(0, 5).map((item) => {
                          const config = getTypeConfig(item.type)
                          const Icon = config.icon
                          
                          return (
                            <div key={item._id} className="p-3 md:p-4 rounded-xl bg-muted border border-border hover:bg-muted transition-all">
                              <div className="flex items-start gap-3">
                                <div className={cn("w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", config.bg, config.border)}>
                                  <Icon className={cn("h-4 w-4 md:h-5 md:w-5", config.text)} />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-foreground mb-1 line-clamp-1 text-sm md:text-base">{item.title}</h4>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                                    <span className="capitalize">{config.label}</span>
                                    <span>•</span>
                                    <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                                    <Badge className={cn("text-xs", getStatusColor(item.status, item.isApproved))}>
                                      {getStatusText(item.status, item.isApproved)}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>{item.metrics?.viewCount || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Heart className="h-3.5 w-3.5 text-red-400" />
                                      <span>{item.metrics?.likeCount || 0}</span>
                                    </div>
                                    {item.location && (
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span className="truncate max-w-[120px]">{getLocationString(item.location)}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {item.paymentStatus && item.paymentStatus !== 'not_required' && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <PaymentDetails
                                        contentId={item._id}
                                        contentType={item.type}
                                        paymentStatus={item.paymentStatus}
                                        paymentAmount={item.paymentAmount}
                                        paymentReference={item.paymentReference}
                                        paymentReceipt={item.paymentReceipt}
                                        paymentNotes={item.paymentNotes}
                                        onStatusUpdate={loadProviderData}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 md:py-12">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                          <FileText className="h-7 w-7 md:h-8 md:w-8 text-orange-400" />
                        </div>
                        <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">No Content Yet</h3>
                        <p className="text-xs md:text-sm text-muted-foreground mb-4 px-4">
                          Start by posting your first opportunity, event, or job
                        </p>
                        <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-foreground rounded-xl">
                          <Link href="/dashboard/posting">
                            Post Your First Content
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Content Tab */}
            {!isLoading && activeTab === 'content' && (
              <div className="space-y-4 md:space-y-6">
                <Card className="border border-border bg-card">
                  <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <CardTitle className="flex items-center text-foreground text-base md:text-lg">
                        <FileText className="h-4 w-4 md:h-5 md:w-5 mr-2 text-orange-400" />
                        My Content
                      </CardTitle>
                      <Button asChild size="sm" className="bg-primary hover:bg-primary/90 rounded-xl w-full sm:w-auto">
                        <Link href="/dashboard/posting">
                          <Plus className="h-4 w-4 mr-2" />
                          Post New
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    {postedItems.length > 0 ? (
                      <div className="space-y-3 md:space-y-4">
                        {postedItems.map((item) => {
                          const config = getTypeConfig(item.type)
                          const Icon = config.icon
                          
                          return (
                            <div key={item._id} className="p-3 md:p-4 rounded-xl bg-muted border border-border hover:bg-muted transition-all">
                              <div className="flex items-start gap-3">
                                <div className={cn("w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", config.bg, config.border)}>
                                  <Icon className={cn("h-4 w-4 md:h-5 md:w-5", config.text)} />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-foreground mb-1 line-clamp-2 text-sm md:text-base">{item.title}</h4>
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                                        <span className="capitalize">{config.label}</span>
                                        <span>•</span>
                                        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                                        <Badge className={cn("text-xs", getStatusColor(item.status, item.isApproved))}>
                                          {getStatusText(item.status, item.isApproved)}
                                        </Badge>
                                      </div>
                                      
                                      {item.tags && item.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                          {item.tags.slice(0, 3).map((tag, index) => (
                                            <Badge key={index} variant="outline" className="text-xs border-border text-muted-foreground">
                                              {tag}
                                            </Badge>
                                          ))}
                                          {item.tags.length > 3 && (
                                            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                              +{item.tags.length - 3}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handlePromoteContent(item)}
                                        className="h-8 w-8 p-0 text-primary/80 hover:text-primary hover:bg-primary/10"
                                        title="Promote"
                                      >
                                        <TrendingUp className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleEditContent(item)}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        title="Edit"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleViewContent(item)}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        title="View"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleDeleteContent(item)}
                                        className="h-8 w-8 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                                    <div className="flex items-center gap-1.5">
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>{item.metrics?.viewCount || 0} views</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Heart className="h-3.5 w-3.5 text-red-400" />
                                      <span>{item.metrics?.likeCount || 0} likes</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Bookmark className="h-3.5 w-3.5 text-primary" />
                                      <span>{item.metrics?.saveCount || 0} saves</span>
                                    </div>
                                    {item.location && (
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span className="truncate max-w-[120px]">{getLocationString(item.location)}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {item.paymentStatus && item.paymentStatus !== 'not_required' && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <PaymentDetails
                                        contentId={item._id}
                                        contentType={item.type}
                                        paymentStatus={item.paymentStatus}
                                        paymentAmount={item.paymentAmount}
                                        paymentReference={item.paymentReference}
                                        paymentReceipt={item.paymentReceipt}
                                        paymentNotes={item.paymentNotes}
                                        onStatusUpdate={loadProviderData}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 md:py-12">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                          <FileText className="h-7 w-7 md:h-8 md:w-8 text-orange-400" />
                        </div>
                        <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">No Content Yet</h3>
                        <p className="text-xs md:text-sm text-muted-foreground mb-4 px-4">
                          Start by posting your first opportunity, event, or job
                        </p>
                        <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-foreground rounded-xl">
                          <Link href="/dashboard/posting">
                            Post Your First Content
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Promotions Tab */}
            {!isLoading && activeTab === 'promotions' && (
              <div className="space-y-4 md:space-y-6">
                <Card className="border border-border bg-card">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="flex items-center text-foreground text-base md:text-lg">
                      <Zap className="h-4 w-4 md:h-5 md:w-5 mr-2 text-orange-400" />
                      Promotions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="text-center py-8 md:py-12">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                        <Zap className="h-7 w-7 md:h-8 md:w-8 text-orange-400" />
                      </div>
                      <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">Promote Your Content</h3>
                      <p className="text-xs md:text-sm text-muted-foreground mb-6 px-4">
                        Boost the visibility of your opportunities, events, jobs, and resources
                      </p>
                      <Button 
                        asChild
                        className="bg-primary hover:bg-primary/90 text-foreground rounded-xl"
                      >
                        <Link href="/dashboard/provider/promotions">
                          <Zap className="h-4 w-4 mr-2" />
                          Manage Promotions
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Analytics Tab */}
            {!isLoading && activeTab === 'analytics' && (
              <div className="space-y-4 md:space-y-6">
                <Card className="border border-border bg-card">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="flex items-center text-foreground text-base md:text-lg">
                      <BarChart3 className="h-4 w-4 md:h-5 md:w-5 mr-2 text-orange-400" />
                      Analytics & Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="text-center py-8 md:py-12">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                        <BarChart3 className="h-7 w-7 md:h-8 md:w-8 text-orange-400" />
                      </div>
                      <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">Analytics Coming Soon</h3>
                      <p className="text-xs md:text-sm text-muted-foreground mb-4 px-4">
                        Detailed analytics and insights for your content performance will be available here
                      </p>
                    </div>
                  </CardContent>
                </Card>
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

        {/* Mobile Bottom Navigation - Only visible on mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-page/95 backdrop-blur-xl border-t border-border safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'wallet') {
                      router.push(item.href)
                      return
                    }
                    setActiveTab(item.id as any)
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 px-2 transition-all",
                    isActive ? "text-orange-400" : "text-muted-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-orange-400")} />
                  <span
                    className={cn(
                      "text-[10px] font-medium truncate w-full text-center",
                      isActive && "text-orange-400"
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
    </div>
  )
}

