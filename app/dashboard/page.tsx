"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import AuthGuard from "@/components/auth-guard"
import { useRouter } from 'next/navigation'
import { 
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Briefcase,
  BookOpen,
  Settings,
  BarChart3,
  MapPin,
  Building,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Crown,
  LogOut,
  Bookmark,
  Eye,
  User
} from 'lucide-react'

// TypeScript Interfaces
interface DashboardStats {
  savedOpportunities: number
  savedJobs: number
  savedEvents: number
  savedResources: number
  totalViews: number
  totalApplications: number
  completionPercentage: number
}

interface SavedItem {
  _id: string
  id?: string
  opportunityId?: string
  jobId?: string
  eventId?: string
  resourceId?: string
  title: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  company?: string
  location?: {
    country?: string
    province?: string
    city?: string
  }
  savedAt: string
  tags?: string[]
  metrics?: {
    viewCount?: number
    likeCount?: number
    saveCount?: number
    applicationCount?: number
    registrationCount?: number
    downloadCount?: number
  }
}

interface Recommendation {
  _id: string
  id?: string
  opportunityId?: string
  jobId?: string
  eventId?: string
  resourceId?: string
  title: string
  description: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  tags?: string[]
  location?: {
    country?: string
    province?: string
    city?: string
  }
  score?: number
  reasons?: string[]
}

interface SavedOpportunityResponse {
  _id: string
  savedAt: string
  notes?: string
  opportunity: {
    _id: string
    id?: string
    title: string
    organization?: string
    location?: {
      country?: string
      province?: string
      city?: string
    }
    tags?: string[]
  }
}

interface SavedJobResponse {
  _id: string
  savedAt: string
  notes?: string
  job: {
    _id: string
    id?: string
    title: string
    company?: string
    location?: {
      country?: string
      province?: string
      city?: string
    }
    tags?: string[]
  }
}

interface SavedEventResponse {
  _id: string
  savedAt: string
  notes?: string
  event: {
    _id: string
    id?: string
    title: string
    organizer?: string
    location?: {
      country?: string
      province?: string
      city?: string
    }
    tags?: string[]
  }
}

interface SavedResourceResponse {
  _id: string
  savedAt: string
  resource: {
    _id: string
    id?: string
    title: string
    author?: string
    tags?: string[]
  }
}

// Skeleton Loading Component
function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, profile, isLoading: authLoading, isOnboardingCompleted, logout, upgradeToProvider } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'provider'>('overview')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [userRole, setUserRole] = useState<'seeker' | 'provider'>('seeker')
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeForm, setUpgradeForm] = useState({
    email: '',
    password: ''
  })
  
  // Dashboard data state
  const [stats, setStats] = useState<DashboardStats>({
    savedOpportunities: 0,
    savedJobs: 0,
    savedEvents: 0,
    savedResources: 0,
    totalViews: 0,
    totalApplications: 0,
    completionPercentage: 0
  })
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  // Auto-clear success/error messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error && !isRetrying) {
      const timer = setTimeout(() => setError(''), 8000)
      return () => clearTimeout(timer)
    }
  }, [error, isRetrying])

  // Hide navbar when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // Close mobile menu when clicking outside - optimized with useCallback
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Element
    if (showMobileMenu && !target.closest('[data-mobile-menu]')) {
      setShowMobileMenu(false)
    }
  }, [showMobileMenu])

  useEffect(() => {
    if (showMobileMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showMobileMenu, handleClickOutside])

  // Fallback function for recommendations - stable function
  const fetchFallbackRecommendations = useCallback(async (): Promise<Recommendation[]> => {
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const [opportunitiesRes, eventsRes, jobsRes, resourcesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/opportunities?limit=3`, { headers }).catch(() => null),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/events?limit=3`, { headers }).catch(() => null),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/jobs?limit=2`, { headers }).catch(() => null),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/resources?limit=2`, { headers }).catch(() => null)
      ])

      const fallbackRecommendations: Recommendation[] = []

      if (opportunitiesRes) {
        const data = await opportunitiesRes.json()
        if (data.success && data.data && Array.isArray(data.data.opportunities)) {
          fallbackRecommendations.push(...data.data.opportunities.map((item: any) => ({
            ...item,
            _id: item._id || item.id,
            type: 'opportunity' as const,
            description: item.description || '',
            score: item.score || 0,
            reasons: item.reasons || []
          })))
        }
      }

      if (eventsRes) {
        const data = await eventsRes.json()
        if (data.success && data.data && Array.isArray(data.data.events)) {
          fallbackRecommendations.push(...data.data.events.map((item: any) => ({
            ...item,
            _id: item._id || item.id,
            type: 'event' as const,
            description: item.description || '',
            score: item.score || 0,
            reasons: item.reasons || []
          })))
        }
      }

      if (jobsRes) {
        const data = await jobsRes.json()
        if (data.success && data.data && Array.isArray(data.data.jobs)) {
          fallbackRecommendations.push(...data.data.jobs.map((item: any) => ({
            ...item,
            _id: item._id || item.id,
            type: 'job' as const,
            description: item.description || '',
            score: item.score || 0,
            reasons: item.reasons || []
          })))
        }
      }

      if (resourcesRes) {
        const data = await resourcesRes.json()
        if (data.success && data.data && Array.isArray(data.data.resources)) {
          fallbackRecommendations.push(...data.data.resources.map((item: any) => ({
            ...item,
            _id: item._id || item.id,
            type: 'resource' as const,
            description: item.description || '',
            score: item.score || 0,
            reasons: item.reasons || []
          })))
        }
      }

      return fallbackRecommendations
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching fallback recommendations:', error)
      }
      return []
    }
  }, [])

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // Load user profile to get completion percentage
      let completionPercentage = 0
      try {
        const profileData = await ApiClient.getUserProfile()
        completionPercentage = profileData?.profile?.completionPercentage || calculateProfileCompletion(profileData?.profile)
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Profile completion percentage:', completionPercentage)
        }
      } catch (profileErr) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error loading profile:', profileErr)
        }
        // Continue without profile data
      }
      
      // Load saved items from backend with better error handling
      const token = localStorage.getItem('accessToken')
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const [savedOpportunitiesRes, savedJobsRes, savedEventsRes, savedResourcesRes, recommendationsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/saved?limit=10`, { headers })
          .catch((err) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching saved opportunities:', err)
            }
            return { json: () => ({ success: false, data: { savedOpportunities: [] }, error: err.message }) }
          }),
        
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/jobs/saved?limit=10`, { headers })
          .catch((err) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching saved jobs:', err)
            }
            return { json: () => ({ success: false, data: { savedJobs: [] }, error: err.message }) }
          }),
        
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/events/saved?limit=10`, { headers })
          .catch((err) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching saved events:', err)
            }
            return { json: () => ({ success: false, data: { savedEvents: [] }, error: err.message }) }
          }),
        
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/resources/saved?limit=10`, { headers })
          .catch((err) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching saved resources:', err)
            }
            return { json: () => ({ success: false, data: { savedResources: [] }, error: err.message }) }
          }),
        
        // Fetch top 10 recommendations (already sorted by score on backend)
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/unified?limit=10&includeOpportunities=true&includeEvents=true&includeJobs=true&includeResources=true&minScore=0`, { headers })
          .catch((err) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching recommendations:', err)
            }
            return { json: () => ({ success: false, data: { content: [] }, error: err.message }) }
          })
      ])
      
      const [savedOpportunitiesData, savedJobsData, savedEventsData, savedResourcesData, recommendationsData] = await Promise.all([
        savedOpportunitiesRes.json(),
        savedJobsRes.json(),
        savedEventsRes.json(),
        savedResourcesRes.json(),
        recommendationsRes.json()
      ])
      
      // Process saved items
      const allSavedItems: SavedItem[] = []
      
      if (savedOpportunitiesData.success && savedOpportunitiesData.data.savedOpportunities) {
        savedOpportunitiesData.data.savedOpportunities.forEach((item: SavedOpportunityResponse) => {
          allSavedItems.push({
            _id: item.opportunity._id || item.opportunity.id || '',
            title: item.opportunity.title,
            type: 'opportunity',
            company: item.opportunity.organization,
            location: item.opportunity.location,
            savedAt: new Date(item.savedAt).toLocaleDateString(),
            tags: item.opportunity.tags || []
          })
        })
      }
      
      if (savedJobsData.success && savedJobsData.data.savedJobs) {
        savedJobsData.data.savedJobs.forEach((item: SavedJobResponse) => {
          allSavedItems.push({
            _id: item.job._id || item.job.id || '',
            title: item.job.title,
            type: 'job',
            company: item.job.company,
            location: item.job.location,
            savedAt: new Date(item.savedAt).toLocaleDateString(),
            tags: item.job.tags || []
          })
        })
      }
      
      if (savedEventsData.success && savedEventsData.data.savedEvents) {
        savedEventsData.data.savedEvents.forEach((item: SavedEventResponse) => {
          allSavedItems.push({
            _id: item.event._id || item.event.id || '',
            title: item.event.title,
            type: 'event',
            company: item.event.organizer,
            location: item.event.location,
            savedAt: new Date(item.savedAt).toLocaleDateString(),
            tags: item.event.tags || []
          })
        })
      }
      
      if (savedResourcesData.success && savedResourcesData.data.savedResources) {
        savedResourcesData.data.savedResources.forEach((item: SavedResourceResponse) => {
          allSavedItems.push({
            _id: item.resource._id || item.resource.id || '',
            title: item.resource.title,
            type: 'resource',
            company: item.resource.author,
            location: undefined,
            savedAt: new Date(item.savedAt).toLocaleDateString(),
            tags: item.resource.tags || []
          })
        })
      }
      
      // Process recommendations from unified endpoint with fallback
      // Take top 10 as returned by API (already sorted by score on backend)
      let processedRecommendations: Recommendation[] = []
      
      if (recommendationsData.success && recommendationsData.data.content && recommendationsData.data.content.length > 0) {
        // Take first 10 items as returned by API (no additional sorting/segregation)
        processedRecommendations = recommendationsData.data.content.slice(0, 10).map((item: any) => ({
          _id: item._id || item.id,
          title: item.title,
          description: item.description,
          type: item.contentType || item.type,
          tags: item.tags || [],
          location: item.location,
          score: item.score || 0,
          reasons: item.reasons || []
        }))
      } else {
        // Fallback to individual content type APIs
        if (process.env.NODE_ENV === 'development') {
          console.log('Unified recommendations failed or empty, trying fallback...')
        }
        processedRecommendations = await fetchFallbackRecommendations()
      }
      
      // Calculate stats
      const newStats: DashboardStats = {
        savedOpportunities: savedOpportunitiesData.success ? (savedOpportunitiesData.data.savedOpportunities?.length || 0) : 0,
        savedJobs: savedJobsData.success ? (savedJobsData.data.savedJobs?.length || 0) : 0,
        savedEvents: savedEventsData.success ? (savedEventsData.data.savedEvents?.length || 0) : 0,
        savedResources: savedResourcesData.success ? (savedResourcesData.data.savedResources?.length || 0) : 0,
        totalViews: 0,
        totalApplications: 0,
        completionPercentage: completionPercentage
      }
      
      setStats(newStats)
      setSavedItems(allSavedItems.slice(0, 10))
      setRecommendations(processedRecommendations)
      
      // Fallback for saved items if empty
      if (allSavedItems.length === 0) {
        try {
          const fallbackRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/saved-items`, { headers })
          
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json()
            
            if (fallbackData.success && fallbackData.data && fallbackData.data.length > 0) {
              const fallbackItems: SavedItem[] = fallbackData.data.map((item: any) => ({
                _id: item._id || item.id,
                title: item.title,
                type: item.type || item.contentType,
                company: item.company || item.organization || item.author,
                location: item.location,
                savedAt: new Date(item.savedAt || item.createdAt).toLocaleDateString(),
                tags: item.tags || [],
                metrics: item.metrics
              }))
              
              setSavedItems(fallbackItems.slice(0, 10))
            }
          }
        } catch (fallbackErr) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Fallback endpoint also failed:', fallbackErr)
          }
        }
      }
      
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading dashboard data:', err)
      }
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setIsLoading(false)
      setIsRetrying(false)
    }
  }, [user, fetchFallbackRecommendations])

  // Load data on mount
  useEffect(() => {
    if (user && !authLoading) {
      loadDashboardData()
    }
  }, [user, authLoading, loadDashboardData])

  // Calculate profile completion
  const calculateProfileCompletion = (profile: any): number => {
    if (!profile) return 0
    
    const fields = [
      'country', 'province', 'careerStage', 'educationLevel',
      'interests', 'industrySectors', 'aspirations', 'skills'
    ]
    
    const completedFields = fields.filter(field => {
      const value = profile[field]
      return value && (Array.isArray(value) ? value.length > 0 : value !== '')
    }).length
    
    return Math.round((completedFields / fields.length) * 100)
  }

  // Handle upgrade to provider
  const handleUpgradeToProvider = () => {
    setShowUpgradeModal(true)
    setError('')
    setSuccess('')
  }

  // Handle upgrade form submission
  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!upgradeForm.email || !upgradeForm.password) {
      setError('Please enter both email and password')
      return
    }
    
    try {
      setIsUpgrading(true)
      await upgradeToProvider(upgradeForm.email, upgradeForm.password)
      
      setError('')
      setSuccess('Congratulations! You are now a provider. Redirecting to onboarding...')
      setShowUpgradeModal(false)
      
      setTimeout(() => {
        router.push('/dashboard/provider/onboarding')
      }, 2000)
      
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error upgrading to provider:', error)
      }
      setError(error.message || 'Failed to upgrade to provider. Please try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  // Handle retry
  const handleRetry = () => {
    setIsRetrying(true)
    setError('')
    loadDashboardData()
  }

  // Helper functions
  const getLocationString = (location?: any): string => {
    if (!location) return 'Remote'
    const parts = [location.city, location.province, location.country].filter(Boolean)
    return parts.join(', ') || 'Remote'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'job': return Briefcase
      case 'event': return Calendar
      case 'opportunity': return Target
      case 'resource': return BookOpen
      default: return Target
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

  const getPluralType = (type: string) => {
    switch (type) {
      case 'opportunity': return 'opportunities'
      case 'job': return 'jobs'
      case 'event': return 'events'
      case 'resource': return 'resources'
      default: return `${type}s`
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
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
                    className="h-16 w-auto sm:h-20 md:h-24 lg:h-28 xl:h-32"
                  />
                </Link>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Role Switch Button */}
              {user?.role === 'opportunity_poster' || user?.role === 'admin' || user?.role === 'super_admin' ? (
                <Button
                  onClick={() => {
                    setUserRole(userRole === 'seeker' ? 'provider' : 'seeker')
                    window.location.href = userRole === 'seeker' ? '/dashboard/provider' : '/dashboard'
                  }}
                  variant="outline"
                  size="sm"
                  className="min-w-[140px]"
                >
                  {userRole === 'seeker' ? (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Switch to Provider
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Switch to Seeker
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setActiveTab('provider')}
                  variant="outline"
                  size="sm"
                  className="min-w-[140px]"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Become a Provider
                </Button>
              )}

              <Button 
                onClick={logout} 
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden" data-mobile-menu>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200 py-4 space-y-4" data-mobile-menu>
              {/* Role Switch Button */}
              {user?.role === 'opportunity_poster' || user?.role === 'admin' || user?.role === 'super_admin' ? (
                <Button
                  onClick={() => {
                    setUserRole(userRole === 'seeker' ? 'provider' : 'seeker')
                    setShowMobileMenu(false)
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {userRole === 'seeker' ? (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Switch to Provider
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Switch to Seeker
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setActiveTab('provider')
                    setShowMobileMenu(false)
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Become a Provider
                </Button>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href="/dashboard/settings" onClick={() => setShowMobileMenu(false)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </Button>
                </div>
                
                <Button 
                  onClick={() => {
                    logout()
                    setShowMobileMenu(false)
                  }} 
                  variant="outline" 
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message with Retry */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
                <p className="text-sm text-red-700 mb-3">{error}</p>
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                  disabled={isRetrying}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Welcome back, {user?.firstName || user?.email?.split('@')[0]}!
                </h2>
                <p className="text-orange-100">
                  {userRole === 'seeker' 
                    ? (profile?.completionPercentage === 100
                        ? 'Your profile is complete. Discover new opportunities!'
                        : 'Complete your profile to get personalized recommendations.')
                    : 'Manage your postings and grow your reach as an opportunity provider.'
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{stats.completionPercentage}%</div>
                <div className="text-orange-100 text-sm">Profile Complete</div>
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
        
        {/* Onboarding Prompt for Incomplete Profiles */}
        {userRole === 'seeker' && profile && !isOnboardingCompleted && stats.completionPercentage < 100 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Complete Your Profile</h3>
                  <p className="text-blue-100 mb-4">
                    Finish setting up your profile to get personalized recommendations and unlock all features.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-blue-400/30 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{stats.completionPercentage}% Complete</span>
                  </div>
                </div>
                <div className="ml-6">
                  <Link href="/onboarding">
                    <Button className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-6 py-3 rounded-xl transition-colors duration-200">
                      Complete Profile
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
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
              onClick={() => setActiveTab('saved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Saved Items
            </button>
            <button
              onClick={() => setActiveTab('provider')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'provider'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Become a Provider
            </button>
            {user?.role === 'opportunity_poster' || user?.role === 'admin' || user?.role === 'super_admin' ? (
              <Button asChild variant="outline" size="sm" className="ml-4">
                <Link href="/dashboard/provider">
                  <Crown className="h-4 w-4 mr-2" />
                  Provider Dashboard
                </Link>
              </Button>
            ) : null}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {userRole === 'seeker' ? (
                // Seeker Stats
                <>
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Saved Opportunities</p>
                          <p className="text-3xl font-bold text-orange-600">{stats.savedOpportunities}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                          <Target className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Saved Jobs</p>
                          <p className="text-3xl font-bold text-blue-600">{stats.savedJobs}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                          <Briefcase className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Saved Events</p>
                          <p className="text-3xl font-bold text-green-600">{stats.savedEvents}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Saved Resources</p>
                          <p className="text-3xl font-bold text-purple-600">{stats.savedResources}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                // Provider Stats
                <>
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Posted Opportunities</p>
                          <p className="text-3xl font-bold text-orange-600">0</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                          <Target className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Posted Jobs</p>
                          <p className="text-3xl font-bold text-blue-600">0</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                          <Briefcase className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Posted Events</p>
                          <p className="text-3xl font-bold text-green-600">0</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Views</p>
                          <p className="text-3xl font-bold text-purple-600">{stats.totalViews}</p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Recommendations */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
                  Recommended For You
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.map((item) => {
                      const Icon = getTypeIcon(item.type)
                      const itemId = item._id || (item as any).id || (item as any).opportunityId || (item as any).jobId || (item as any).eventId || (item as any).resourceId
                      const detailUrl = `/${getPluralType(item.type)}/${itemId}`
                      return (
                        <Link key={item._id} href={detailUrl} className="block">
                          <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group">
                            <div className={`w-10 h-10 bg-gradient-to-r ${getTypeColor(item.type)} rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{item.title}</h4>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{getLocationString(item.location)}</span>
                                </span>
                                <span className="capitalize">{item.type}</span>
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
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center space-x-3">
                                  <span className="text-xs text-orange-600 font-medium group-hover:text-orange-700">
                                    View Details
                                  </span>
                                  {item.score && item.score > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <span className={`text-xs font-medium ${item.score >= 80 ? 'text-green-600' : item.score >= 60 ? 'text-yellow-600' : 'text-gray-600'}`}>
                                        {Math.round(item.score)}%
                                      </span>
                                      <span className="text-xs text-gray-500">match</span>
                                    </div>
                                  )}
                                </div>
                                <ArrowRight className="h-4 w-4 text-orange-600 group-hover:translate-x-1 transition-transform" />
                              </div>
                              {item.reasons && item.reasons.length > 0 && (
                                <div className="mt-2 text-xs text-gray-500">
                                  <strong>Why recommended:</strong> {item.reasons.slice(0, 2).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recommendations Yet</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Complete your profile to get personalized recommendations
                    </p>
                    <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                      <Link href="/onboarding">
                        Complete Profile
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Saved Items Tab */}
        {activeTab === 'saved' && (
          <div className="space-y-8">
            {/* Saved Items Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Saved Items</h2>
                <p className="text-gray-600 mt-1">
                  {savedItems.length > 0 
                    ? `You have ${savedItems.length} saved item${savedItems.length === 1 ? '' : 's'}`
                    : 'No saved items yet'
                  }
                </p>
              </div>
            </div>

            {/* Saved Items List */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : savedItems.length > 0 ? (
              <div className="space-y-4">
                {savedItems.map((item) => {
                  const Icon = getTypeIcon(item.type)
                  const itemId = item._id || (item as any).id || (item as any).opportunityId || (item as any).jobId || (item as any).eventId || (item as any).resourceId
                  const detailUrl = `/${getPluralType(item.type)}/${itemId}`
                  
                  return (
                    <Link key={item._id} href={detailUrl} className="block">
                      <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group">
                        <div className={`w-10 h-10 bg-gradient-to-r ${getTypeColor(item.type)} rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{item.title}</h4>
                          {item.company && (
                            <p className="text-sm text-gray-600 mb-2">{item.company}</p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{getLocationString(item.location)}</span>
                            </span>
                            <span className="capitalize">{item.type}</span>
                            <span className="flex items-center space-x-1">
                              <Bookmark className="h-3 w-3" />
                              <span>Saved {item.savedAt}</span>
                            </span>
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
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-orange-600 font-medium group-hover:text-orange-700">
                              View Details
                            </span>
                            <ArrowRight className="h-4 w-4 text-orange-600 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bookmark className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Items Yet</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Start exploring opportunities, jobs, events, and resources to save items you're interested in.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                    <Link href="/opportunities">
                      <Target className="h-4 w-4 mr-2" />
                      Browse Opportunities
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/jobs">
                      <Briefcase className="h-4 w-4 mr-2" />
                      Find Jobs
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/events">
                      <Calendar className="h-4 w-4 mr-2" />
                      Discover Events
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/resources">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Explore Resources
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Become a Provider Tab */}
        {activeTab === 'provider' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white text-center">
              <div className="max-w-3xl mx-auto">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Become an Opportunity Provider</h2>
                <p className="text-xl text-orange-100 mb-6">
                  Share your opportunities with thousands of ambitious individuals and help them grow their careers
                </p>
                <Button 
                  size="lg" 
                  className="bg-white text-orange-600 hover:bg-orange-50 font-semibold"
                  onClick={handleUpgradeToProvider}
                  disabled={isUpgrading}
                >
                  {isUpgrading ? 'Processing...' : 'Become a Provider'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>

            {/* Benefits Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Reach More People</h3>
                  <p className="text-gray-600 text-sm">
                    Connect with thousands of ambitious individuals looking for opportunities to grow their careers
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Targeted Audience</h3>
                  <p className="text-gray-600 text-sm">
                    Reach the right candidates with our advanced filtering and recommendation system
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Insights</h3>
                  <p className="text-gray-600 text-sm">
                    Track engagement, applications, and performance of your posted opportunities
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* How It Works Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Become a Provider</h4>
                      <p className="text-gray-600 text-sm">
                        Click the "Become a Provider" button above to instantly upgrade your account
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Complete Onboarding</h4>
                      <p className="text-gray-600 text-sm">
                        Fill out your organization details and verification information
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Start Posting</h4>
                      <p className="text-gray-600 text-sm">
                        Create and publish opportunities, events, jobs, and resources
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-orange-50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-2">Ready to Start?</h4>
                  <p className="text-gray-600 text-sm mb-4">
                    Join thousands of organizations already using Glow Up Channel to find amazing talent
                  </p>
                  <div className="flex space-x-4">
                    <Button 
                      onClick={handleUpgradeToProvider}
                      disabled={isUpgrading}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {isUpgrading ? 'Processing...' : 'Become a Provider'}
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/dashboard/settings">Update Profile</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Onboarding Call-to-Action for Existing Providers */}
            {user?.role === 'opportunity_poster' && (
              <Card className="mt-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
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
                          Set up your organization details and verification to unlock full provider features.
                        </p>
                      </div>
                    </div>
                    <Button asChild className="bg-blue-500 hover:bg-blue-600 text-white">
                      <Link href="/dashboard/provider/onboarding">
                        <Building className="h-4 w-4 mr-2" />
                        Complete Setup
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Upgrade to Provider Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to Provider</DialogTitle>
            <DialogDescription>
              Please confirm your email and password to upgrade your account to provider status.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpgradeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upgrade-email">Email Address</Label>
              <Input
                id="upgrade-email"
                type="email"
                value={upgradeForm.email}
                onChange={(e) => setUpgradeForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="upgrade-password">Password</Label>
              <Input
                id="upgrade-password"
                type="password"
                value={upgradeForm.password}
                onChange={(e) => setUpgradeForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                required
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUpgradeModal(false)}
                disabled={isUpgrading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isUpgrading}
              >
                {isUpgrading ? 'Upgrading...' : 'Upgrade to Provider'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
