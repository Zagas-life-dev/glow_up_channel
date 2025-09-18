"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import { toast } from 'sonner'
import PromotionButton from '@/components/promotion/PromotionButton'
import PaymentDetails from '@/components/payment-details'
import { 
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Eye,
  Users,
  Calendar,
  Target,
  Briefcase,
  BookOpen,
  Star,
  Plus,
  Settings,
  BarChart3,
  Zap,
  Heart,
  MapPin,
  GraduationCap,
  User,
  Mail,
  Building,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  MoreVertical,
  Crown,
  DollarSign,
  Globe,
  Award,
  Lightbulb,
  Bookmark,
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  Activity,
  TrendingDown,
  FileText,
  Send,
  UserCheck,
  Download
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
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'applications' | 'analytics'>('overview')
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
    const loadProviderData = async () => {
      if (!user || (user.role !== 'opportunity_poster' && user.role !== 'admin' && user.role !== 'super_admin')) return
      
      setIsLoading(true)
      setError('')
      
      try {
        // Check onboarding status
        {
          try {
            const onboardingResponse = await ApiClient.getProviderOnboarding()
            setOnboardingStatus({
              isCompleted: onboardingResponse.onboarding?.isCompleted || false,
              completionPercentage: onboardingResponse.onboarding?.completionPercentage || 0
            })
          } catch (onboardingError) {
            console.log('No onboarding data found, user needs to complete onboarding')
            setOnboardingStatus({
              isCompleted: false,
              completionPercentage: 0
            })
          }
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
              location: undefined,
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
    }

  // Load provider dashboard data
  useEffect(() => {
    loadProviderData()
  }, [user])

  const getLocationString = (location?: any): string => {
    if (!location) return 'TBD'
    const parts = [location.city, location.province, location.country].filter(Boolean)
    return parts.join(', ') || 'TBD'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'job': return Briefcase
      case 'event': return Calendar
      case 'opportunity': return Target
      case 'resource': return BookOpen
      default: return Star
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'job': return 'from-blue-500 to-blue-600'
      case 'event': return 'from-green-500 to-green-600'
      case 'opportunity': return 'from-orange-500 to-orange-600'
      case 'resource': return 'from-purple-500 to-purple-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getStatusColor = (status: string, isApproved: boolean) => {
    // 6-State Content Management System - Color coding
    if (status === 'draft' && !isApproved) return 'bg-blue-100 text-blue-800' // True Draft - Blue
    if (status === 'draft' && isApproved) return 'bg-purple-100 text-purple-800' // Hidden - Purple
    if (status === 'inactive' && !isApproved) return 'bg-red-100 text-red-800' // Inactive (Not Approved) - Red
    if (status === 'inactive' && isApproved) return 'bg-gray-100 text-gray-800' // Inactive (Approved) - Gray
    if (status === 'active' && !isApproved) return 'bg-yellow-100 text-yellow-800' // Pending - Yellow
    if (status === 'active' && isApproved) return 'bg-green-100 text-green-800' // Live - Green
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string, isApproved: boolean) => {
    // 6-State Content Management System
    if (status === 'draft' && !isApproved) return 'True Draft' // State 5: Draft not yet submitted
    if (status === 'draft' && isApproved) return 'Hidden' // State 6: Draft approved but hidden
    if (status === 'inactive' && !isApproved) return 'Inactive (Not Approved)' // State 1: Inactive + Not Approved
    if (status === 'inactive' && isApproved) return 'Inactive (Approved)' // State 2: Inactive + Approved
    if (status === 'active' && !isApproved) return 'Pending' // State 3: Active + Not Approved
    if (status === 'active' && isApproved) return 'Live' // State 4: Active + Approved (Live)
    return 'Unknown'
  }

  // Promotion handlers
  const handlePromoteContent = (contentId: string) => {
    // Navigate to promotions management page
    router.push('/dashboard/provider/promotions')
  }


  // Content management handlers
  const handleEditContent = (item: any) => {
    // Navigate to edit page or open edit modal
    console.log('Edit content:', item)
    
    // For now, show a toast message
    toast.info(`Edit functionality for ${item.type} "${item.title}" will be available soon!`)
    
    // TODO: Implement edit functionality
    // This could navigate to an edit page or open an edit modal
    // Example: router.push(`/dashboard/posting/edit/${item.type}/${item._id}`)
  }

  const handleViewContent = (item: any) => {
    // Open content in new tab or navigate to view page
    console.log('View content:', item)
    
    // Check if item has a URL field
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    } else {
      // If no URL, show a toast with the content details
      toast.info(`Viewing ${item.type}: "${item.title}"`)
      
      // TODO: Implement view functionality
      // This could navigate to a view page or open a modal
      // Example: router.push(`/content/${item.type}/${item._id}`)
    }
  }

  const handleDeleteContent = async (item: any) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.title}"? This action cannot be undone.`
    )
    
    if (!confirmed) return
    
    try {
      console.log('Deleting content:', item)
      
      // Call the appropriate delete API based on content type
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
      
      // Refresh the content list
      loadProviderData()
      
    } catch (error) {
      console.error('Error deleting content:', error)
      toast.error('Failed to delete content. Please try again.')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading provider dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access your provider dashboard</p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (user.role !== 'opportunity_poster' && user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Provider Access Required</h2>
          <p className="text-gray-600 mb-4">You need to be an opportunity provider to access this dashboard</p>
          <div className="flex space-x-4 justify-center">
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/settings">Upgrade Account</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Link href="/" className="flex items-center">
                  <Image
                    src="/images/logo-transparent.svg"
                    alt="Glow Up Channel"
                    width={120}
                    height={0}
                    className="h-16 w-32 sm:h-20 sm:w-40 md:h-24 md:w-48 lg:h-28 lg:w-56 xl:h-32 xl:w-64 w-auto"
                  />
                </Link>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <Button asChild className="bg-orange-500 hover:bg-orange-600">
                <Link href="/dashboard/posting">
                  <Plus className="h-4 w-4 mr-2" />
                  Post Content
                </Link>
              </Button>
              
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/provider/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Provider Settings
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Link href="/dashboard/posting">
                  <Plus className="h-4 w-4 mr-2" />
                  Post
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Welcome back, {user.email.split('@')[0]}!
                </h2>
                <p className="text-orange-100 mb-3">
                  Manage your content and grow your reach as an opportunity provider.
                </p>
                <Link href="/dashboard/provider/promotions">
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <Zap className="w-4 h-4 mr-2" />
                    Manage Promotions
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{stats.activePostings}</div>
                <div className="text-orange-100 text-sm">Active Postings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Homepage Button */}
        <div className="mb-6">
          <Link href="/">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Homepage
            </Button>
          </Link>
        </div>

        {/* Onboarding Call-to-Action - Only show if not completed */}
        {onboardingStatus && !onboardingStatus.isCompleted && (
        <div className="mb-8">
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Complete Your Provider Profile
                    </h3>
                    <p className="text-sm text-gray-600">
                      Set up your organization details and verification to start posting opportunities with full features.
                    </p>
                      {onboardingStatus.completionPercentage > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{onboardingStatus.completionPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${onboardingStatus.completionPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
                <Button asChild className="bg-blue-500 hover:bg-blue-600 text-white">
                  <Link href="/dashboard/provider/onboarding">
                    <Building className="h-4 w-4 mr-2" />
                      {onboardingStatus.completionPercentage > 0 ? 'Continue Setup' : 'Complete Setup'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        )}
                
        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'content'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Content
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'applications'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Applications
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
          </nav>
        </div>
                
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading provider dashboard data...</p>
          </div>
        )}

        {/* Overview Tab */}
        {!isLoading && activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Postings</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {stats.totalOpportunities + stats.totalEvents + stats.totalJobs + stats.totalResources}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Views</p>
                      <p className="text-3xl font-bold text-blue-600">{stats.totalViews}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Applications</p>
                      <p className="text-3xl font-bold text-green-600">{stats.totalApplications}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <Send className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-3xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-orange-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button asChild className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Link href="/dashboard/posting">
                      <Target className="h-6 w-6" />
                      <span>Post Opportunity</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Link href="/dashboard/posting">
                      <Calendar className="h-6 w-6" />
                      <span>Post Event</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Link href="/dashboard/posting">
                      <Briefcase className="h-6 w-6" />
                      <span>Post Job</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Link href="/dashboard/posting">
                      <BookOpen className="h-6 w-6" />
                      <span>Post Resource</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-orange-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {postedItems.length > 0 ? (
                  <div className="space-y-4">
                    {postedItems.slice(0, 5).map((item) => {
                      const Icon = getTypeIcon(item.type)
                      return (
                        <div key={item._id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                          <div className={`w-10 h-10 bg-gradient-to-r ${getTypeColor(item.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="capitalize">{item.type}</span>
                              <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                              <Badge className={getStatusColor(item.status, item.isApproved)}>
                                {getStatusText(item.status, item.isApproved)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{item.metrics?.viewCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="h-3 w-3 text-red-500" />
                              <span>{item.metrics?.likeCount || 0}</span>
                            </div>
                          </div>
                          
                          {/* Payment Details */}
                          {item.paymentStatus && item.paymentStatus !== 'not_required' && (
                            <PaymentDetails
                              contentId={item._id}
                              contentType={item.type}
                              paymentStatus={item.paymentStatus}
                              paymentAmount={item.paymentAmount}
                              paymentReference={item.paymentReference}
                              paymentReceipt={item.paymentReceipt}
                              paymentNotes={item.paymentNotes}
                              onStatusUpdate={fetchPostedItems}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Content Yet</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Start by posting your first opportunity, event, or job
                    </p>
                    <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
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
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-orange-600" />
                    My Content
                  </div>
                  <Button asChild className="bg-orange-500 hover:bg-orange-600">
                    <Link href="/dashboard/posting">
                      <Plus className="h-4 w-4 mr-2" />
                      Post New Content
                    </Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {postedItems.length > 0 ? (
                  <div className="space-y-4">
                    {postedItems.map((item) => {
                      const Icon = getTypeIcon(item.type)
                      return (
                        <div key={item._id} className="space-y-4">
                          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className={`w-10 h-10 bg-gradient-to-r ${getTypeColor(item.type)} rounded-full flex items-center justify-center flex-shrink-0`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="capitalize">{item.type}</span>
                              <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                              <Badge className={getStatusColor(item.status, item.isApproved)}>
                                {getStatusText(item.status, item.isApproved)}
                              </Badge>
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.slice(0, 3).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{item.metrics?.viewCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="h-3 w-3 text-red-500" />
                              <span>{item.metrics?.likeCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Bookmark className="h-3 w-3 text-blue-500" />
                              <span>{item.metrics?.saveCount || 0}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <PromotionButton
                              onClick={() => handlePromoteContent(item._id)}
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditContent(item)}
                              title="Edit Content"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewContent(item)}
                              title="View Content"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteContent(item)}
                              title="Delete Content"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Content Yet</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Start by posting your first opportunity, event, or job
                    </p>
                    <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
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

        {/* Applications Tab */}
        {!isLoading && activeTab === 'applications' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCheck className="h-5 w-5 mr-2 text-orange-600" />
                  Applications & Registrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Applications Coming Soon</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This feature will show all applications and registrations for your posted content
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Tab */}
        {!isLoading && activeTab === 'analytics' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-orange-600" />
                  Analytics & Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Coming Soon</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Detailed analytics and insights for your content performance will be available here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

    </div>
  )
}

