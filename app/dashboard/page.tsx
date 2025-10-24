"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
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
  LogOut,
  Bookmark,
  Eye,
  EyeOff
} from 'lucide-react'

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


export default function DashboardPage() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, profile, isLoading: authLoading, isOnboardingCompleted, logout, upgradeToProvider } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'provider'>('overview')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [userRole, setUserRole] = useState<'seeker' | 'provider'>('seeker')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeForm, setUpgradeForm] = useState({
    email: '',
    password: ''
  })
  
  // Handle upgrade to provider - show modal first
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
      const result = await upgradeToProvider(upgradeForm.email, upgradeForm.password)
      
      // User was immediately upgraded (no approval needed)
      setError('')
      setSuccess('Congratulations! You are now a provider. Redirecting to onboarding...')
      setShowUpgradeModal(false)
      
      // Redirect to provider onboarding after a short delay
      setTimeout(() => {
        router.push('/dashboard/provider/onboarding')
      }, 2000)
      
    } catch (error: any) {
      console.error('Error upgrading to provider:', error)
      setError(error.message || 'Failed to upgrade to provider. Please try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  
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

  // Hide navbar when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showMobileMenu && !target.closest('[data-mobile-menu]')) {
        setShowMobileMenu(false)
      }
    }

    if (showMobileMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showMobileMenu])

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return
      
      setIsLoading(true)
      setError('')
      
      try {
        // Load user profile to get completion percentage
        const profileData = await ApiClient.getUserProfile()
        const completionPercentage = profileData?.profile?.completionPercentage || calculateProfileCompletion(profileData?.profile)
        
        // Debug logging
        console.log('Profile data from API:', profileData)
        console.log('Profile from auth context:', profile)
        console.log('Completion percentage from API:', completionPercentage)
        console.log('Completion percentage from auth context:', profile?.completionPercentage)
        console.log('Profile data type:', typeof profileData)
        console.log('Profile data keys:', Object.keys(profileData || {}))
        
        // Load saved items from backend with better error handling
        console.log('Loading saved items from backend...')
        const [savedOpportunitiesRes, savedJobsRes, savedEventsRes, savedResourcesRes, recommendationsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/saved?limit=10`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch((err) => {
            console.error('Error fetching saved opportunities:', err)
            return { json: () => ({ success: false, data: { savedOpportunities: [] }, error: err.message }) }
          }),
          
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/jobs/saved?limit=10`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch((err) => {
            console.error('Error fetching saved jobs:', err)
            return { json: () => ({ success: false, data: { savedJobs: [] }, error: err.message }) }
          }),
          
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/events/saved?limit=10`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch((err) => {
            console.error('Error fetching saved events:', err)
            return { json: () => ({ success: false, data: { savedEvents: [] }, error: err.message }) }
          }),
          
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/resources/saved?limit=10`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch((err) => {
            console.error('Error fetching saved resources:', err)
            return { json: () => ({ success: false, data: { savedResources: [] }, error: err.message }) }
          }),
          
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/unified?limit=10&includeOpportunities=true&includeEvents=true&includeJobs=true&includeResources=true&minScore=30`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch((err) => {
            console.error('Error fetching recommendations:', err)
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
        
        // Debug logging for saved items
        console.log('Saved opportunities data:', savedOpportunitiesData)
        console.log('Saved jobs data:', savedJobsData)
        console.log('Saved events data:', savedEventsData)
        console.log('Saved resources data:', savedResourcesData)
        console.log('Recommendations data:', recommendationsData)
        
        // Process saved items
        const allSavedItems: SavedItem[] = []
        
        if (savedOpportunitiesData.success) {
          savedOpportunitiesData.data.savedOpportunities.forEach((item: any) => {
            allSavedItems.push({
              _id: item.opportunity._id || item.opportunity.id, // Use the opportunity's ID, not the saved item's ID
              title: item.opportunity.title,
              type: 'opportunity',
              company: item.opportunity.organization,
              location: item.opportunity.location,
              savedAt: new Date(item.savedAt).toLocaleDateString(),
              tags: item.opportunity.tags || []
            })
          })
        }
        
        if (savedJobsData.success) {
          savedJobsData.data.savedJobs.forEach((item: any) => {
            allSavedItems.push({
              _id: item.job._id || item.job.id, // Use the job's ID, not the saved item's ID
              title: item.job.title,
              type: 'job',
              company: item.job.company,
              location: item.job.location,
              savedAt: new Date(item.savedAt).toLocaleDateString(),
              tags: item.job.tags || []
            })
          })
        }
        
        if (savedEventsData.success) {
          savedEventsData.data.savedEvents.forEach((item: any) => {
            allSavedItems.push({
              _id: item.event._id || item.event.id, // Use the event's ID, not the saved item's ID
              title: item.event.title,
              type: 'event',
              company: item.event.organizer,
              location: item.event.location,
              savedAt: new Date(item.savedAt).toLocaleDateString(),
              tags: item.event.tags || []
            })
          })
        }
        
        if (savedResourcesData.success) {
          savedResourcesData.data.savedResources.forEach((item: any) => {
            allSavedItems.push({
              _id: item.resource._id || item.resource.id, // Use the resource's ID, not the saved item's ID
              title: item.resource.title,
              type: 'resource',
              company: item.resource.author,
              location: undefined,
              savedAt: new Date(item.savedAt).toLocaleDateString(),
              tags: item.resource.tags || []
            })
          })
        }
        
        // Process recommendations from unified endpoint
        const recommendations: Recommendation[] = []
        if (recommendationsData.success && recommendationsData.data.content) {
          recommendationsData.data.content.forEach((item: any) => {
            recommendations.push({
              _id: item._id || item.id, // Handle different ID field names
              title: item.title,
              description: item.description,
              type: item.contentType || item.type, // Handle different type field names
              tags: item.tags || [],
              location: item.location,
              score: item.score || 0,
              reasons: item.reasons || []
            })
          })
        }
        
        // Calculate stats
        const stats: DashboardStats = {
          savedOpportunities: savedOpportunitiesData.success ? savedOpportunitiesData.data.savedOpportunities.length : 0,
          savedJobs: savedJobsData.success ? savedJobsData.data.savedJobs.length : 0,
          savedEvents: savedEventsData.success ? savedEventsData.data.savedEvents.length : 0,
          savedResources: savedResourcesData.success ? savedResourcesData.data.savedResources.length : 0,
          totalViews: 0, // Would need separate endpoint
          totalApplications: 0, // Would need separate endpoint
          completionPercentage: completionPercentage
        }
        
        setStats(stats)
        setSavedItems(allSavedItems.slice(0, 10)) // Show latest 10
        setRecommendations(recommendations)
        
        // Debug logging for final state
        console.log('Final stats:', stats)
        console.log('Final saved items count:', allSavedItems.length)
        console.log('Final saved items:', allSavedItems)
        console.log('Final recommendations count:', recommendations.length)
        
        // Fallback: If no saved items found, try alternative endpoints for backward compatibility
        if (allSavedItems.length === 0) {
          console.log('No saved items found, trying fallback endpoints...')
          try {
            // Try alternative saved items endpoint
            const fallbackRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/saved-items`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            })
            
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json()
              console.log('Fallback saved items data:', fallbackData)
              
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
                
                console.log('Fallback items processed:', fallbackItems)
                setSavedItems(fallbackItems.slice(0, 10))
              }
            }
          } catch (fallbackErr) {
            console.log('Fallback endpoint also failed:', fallbackErr)
          }
        }
        
      } catch (err: any) {
        console.error('Error loading dashboard data:', err)
        setError('Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [user])

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access your dashboard</p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
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
              {/* Role Switch Button */}
              {user?.role === 'opportunity_poster' || user?.role === 'admin' || user?.role === 'super_admin' ? (
          <Button
                  onClick={() => {
                    setUserRole(userRole === 'seeker' ? 'provider' : 'seeker');
                    window.location.href = userRole === 'seeker' ? '/dashboard/provider' : '/dashboard';
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
                onClick={() => window.location.reload()} 
                  variant="outline"
                  size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

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
                  <Button 
                    onClick={() => {
                      window.location.reload()
                      setShowMobileMenu(false)
                    }} 
                    variant="outline" 
                    size="sm"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
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
                  Welcome back, {user.firstName || user.email.split('@')[0]}!
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
                <div className="text-3xl font-bold">{profile?.completionPercentage || 0}%</div>
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
        {userRole === 'seeker' && profile && !isOnboardingCompleted && (
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
                        style={{ width: `${profile.completionPercentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{profile.completionPercentage || 0}% Complete</span>
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

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard data...</p>
              </div>
        )}

        {/* Overview Tab */}
        {!isLoading && activeTab === 'overview' && (
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
                  <div className="text-center py-8">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Loading recommendations...</p>
                      </div>
                ) : recommendations.length > 0 ? (
                      <div className="space-y-4">
                    {recommendations.map((item) => {
                      const Icon = getTypeIcon(item.type)
                      // Handle different ID field names for backward compatibility
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
                                  {item.score && (
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
        {!isLoading && activeTab === 'saved' && (
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
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Saved Items List */}
            {savedItems.length > 0 ? (
              <div className="space-y-4">
                {savedItems.map((item) => {
                  const Icon = getTypeIcon(item.type)
                  // Handle different ID field names for backward compatibility
                  const itemId = item._id || (item as any).id || (item as any).opportunityId || (item as any).jobId || (item as any).eventId || (item as any).resourceId
                  const detailUrl = `/${getPluralType(item.type)}/${itemId}`
                  
                  // Debug logging for URL construction
                  console.log(`Constructing URL for ${item.type}:`, {
                    originalId: item._id,
                    resolvedId: itemId,
                    detailUrl: detailUrl,
                    item: item
                  })
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
        {!isLoading && activeTab === 'provider' && (
          <div className="space-y-8">
            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                <span className="text-red-700">{error}</span>
                          </div>
            )}
            
            {/* Success Display */}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-green-700">{success}</span>
                        </div>
            )}
            
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
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Upgrade to Provider
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Please confirm your email and password to upgrade your account to provider status.
            </p>
            
            <form onSubmit={handleUpgradeSubmit} className="space-y-4">
              <div>
                <label htmlFor="upgrade-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="upgrade-email"
                  type="email"
                  value={upgradeForm.email}
                  onChange={(e) => setUpgradeForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="upgrade-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="upgrade-password"
                  type="password"
                  value={upgradeForm.password}
                  onChange={(e) => setUpgradeForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
                  {success}
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1"
                  disabled={isUpgrading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isUpgrading}
                >
                  {isUpgrading ? 'Upgrading...' : 'Upgrade to Provider'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 
