"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
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
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import AuthGuard from "@/components/auth-guard"
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  ArrowRight,
  TrendingUp,
  Users,
  Target,
  Briefcase,
  Calendar,
  BookOpen,
  Settings,
  BarChart3,
  MapPin,
  Building,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Crown,
  Bookmark,
  Eye,
  Sparkles,
  ChevronRight,
  Plus
} from 'lucide-react'

// TypeScript Interfaces
interface DashboardStats {
  savedOpportunities: number
  savedJobs: number
  savedEvents: number
  savedResources: number
  completionPercentage: number
}

interface SavedItem {
  _id: string
  title: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  company?: string
  location?: { country?: string; province?: string; city?: string }
  savedAt: string
  tags?: string[]
}

interface Recommendation {
  _id: string
  title: string
  description: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  tags?: string[]
  location?: { country?: string; province?: string; city?: string }
  score?: number
  reasons?: string[]
}

const typeConfig = {
  opportunity: { icon: Target, color: 'orange', label: 'Opportunity' },
  job: { icon: Briefcase, color: 'blue', label: 'Job' },
  event: { icon: Calendar, color: 'emerald', label: 'Event' },
  resource: { icon: BookOpen, color: 'violet', label: 'Resource' }
}

function DashboardContent() {
  const { user, profile, isLoading: authLoading, isAuthenticated, isOnboardingCompleted, upgradeToProvider } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'provider'>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeForm, setUpgradeForm] = useState({ email: '', password: '' })
  
  const [stats, setStats] = useState<DashboardStats>({
    savedOpportunities: 0, savedJobs: 0, savedEvents: 0, savedResources: 0, completionPercentage: 0
  })
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

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

      for (const [res, type] of [[opportunitiesRes, 'opportunity'], [eventsRes, 'event'], [jobsRes, 'job'], [resourcesRes, 'resource']] as const) {
        if (res) {
          const data = await res.json()
          const items = data.data?.[type === 'opportunity' ? 'opportunities' : type === 'event' ? 'events' : type === 'job' ? 'jobs' : 'resources'] || []
          fallbackRecommendations.push(...items.map((item: any) => ({
            ...item, _id: item._id || item.id, type, description: item.description || '', score: item.score || 0, reasons: item.reasons || []
          })))
        }
      }

      return fallbackRecommendations
    } catch (error) {
      return []
    }
  }, [])

  const loadDashboardData = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    setError('')
    
    try {
      let completionPercentage = 0
      try {
        const profileData = await ApiClient.getUserProfile()
        completionPercentage = profileData?.profile?.completionPercentage || calculateProfileCompletion(profileData?.profile)
      } catch (e) {}
      
      const token = localStorage.getItem('accessToken')
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const [savedOpportunitiesRes, savedJobsRes, savedEventsRes, savedResourcesRes, recommendationsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/saved?limit=10`, { headers }).catch(() => ({ json: () => ({ success: false, data: { savedOpportunities: [] } }) })),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/jobs/saved?limit=10`, { headers }).catch(() => ({ json: () => ({ success: false, data: { savedJobs: [] } }) })),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/events/saved?limit=10`, { headers }).catch(() => ({ json: () => ({ success: false, data: { savedEvents: [] } }) })),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/engagement/resources/saved?limit=10`, { headers }).catch(() => ({ json: () => ({ success: false, data: { savedResources: [] } }) })),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/unified?limit=10&includeOpportunities=true&includeEvents=true&includeJobs=true&includeResources=true&minScore=0`, { headers }).catch(() => ({ json: () => ({ success: false, data: { content: [] } }) }))
      ])
      
      const [savedOpportunitiesData, savedJobsData, savedEventsData, savedResourcesData, recommendationsData] = await Promise.all([
        savedOpportunitiesRes.json(), savedJobsRes.json(), savedEventsRes.json(), savedResourcesRes.json(), recommendationsRes.json()
      ])
      
      const allSavedItems: SavedItem[] = []
      
      if (savedOpportunitiesData.success && savedOpportunitiesData.data.savedOpportunities) {
        savedOpportunitiesData.data.savedOpportunities.forEach((item: any) => {
          allSavedItems.push({ _id: item.opportunity._id || item.opportunity.id || '', title: item.opportunity.title, type: 'opportunity', company: item.opportunity.organization, location: item.opportunity.location, savedAt: new Date(item.savedAt).toLocaleDateString(), tags: item.opportunity.tags || [] })
        })
      }
      
      if (savedJobsData.success && savedJobsData.data.savedJobs) {
        savedJobsData.data.savedJobs.forEach((item: any) => {
          allSavedItems.push({ _id: item.job._id || item.job.id || '', title: item.job.title, type: 'job', company: item.job.company, location: item.job.location, savedAt: new Date(item.savedAt).toLocaleDateString(), tags: item.job.tags || [] })
        })
      }
      
      if (savedEventsData.success && savedEventsData.data.savedEvents) {
        savedEventsData.data.savedEvents.forEach((item: any) => {
          allSavedItems.push({ _id: item.event._id || item.event.id || '', title: item.event.title, type: 'event', company: item.event.organizer, location: item.event.location, savedAt: new Date(item.savedAt).toLocaleDateString(), tags: item.event.tags || [] })
        })
      }
      
      if (savedResourcesData.success && savedResourcesData.data.savedResources) {
        savedResourcesData.data.savedResources.forEach((item: any) => {
          allSavedItems.push({ _id: item.resource._id || item.resource.id || '', title: item.resource.title, type: 'resource', company: item.resource.author, location: undefined, savedAt: new Date(item.savedAt).toLocaleDateString(), tags: item.resource.tags || [] })
        })
      }
      
      let processedRecommendations: Recommendation[] = []
      
      if (recommendationsData.success && recommendationsData.data.content && recommendationsData.data.content.length > 0) {
        processedRecommendations = recommendationsData.data.content.slice(0, 10).map((item: any) => ({
          _id: item._id || item.id, title: item.title, description: item.description, type: item.contentType || item.type, tags: item.tags || [], location: item.location, score: item.score || 0, reasons: item.reasons || []
        }))
      } else {
        processedRecommendations = await fetchFallbackRecommendations()
      }
      
      setStats({
        savedOpportunities: savedOpportunitiesData.success ? (savedOpportunitiesData.data.savedOpportunities?.length || 0) : 0,
        savedJobs: savedJobsData.success ? (savedJobsData.data.savedJobs?.length || 0) : 0,
        savedEvents: savedEventsData.success ? (savedEventsData.data.savedEvents?.length || 0) : 0,
        savedResources: savedResourcesData.success ? (savedResourcesData.data.savedResources?.length || 0) : 0,
        completionPercentage: completionPercentage
      })
      setSavedItems(allSavedItems.slice(0, 10))
      setRecommendations(processedRecommendations)
      
    } catch (err: any) {
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setIsLoading(false)
      setIsRetrying(false)
    }
  }, [user, fetchFallbackRecommendations])

  useEffect(() => {
    if (user && !authLoading) {
      loadDashboardData()
    }
  }, [user, authLoading, loadDashboardData])

  const calculateProfileCompletion = (profile: any): number => {
    if (!profile) return 0
    const fields = ['country', 'province', 'careerStage', 'educationLevel', 'interests', 'industrySectors', 'aspirations', 'skills']
    const completedFields = fields.filter(field => {
      const value = profile[field]
      return value && (Array.isArray(value) ? value.length > 0 : value !== '')
    }).length
    return Math.round((completedFields / fields.length) * 100)
  }

  const handleUpgradeToProvider = () => {
    setShowUpgradeModal(true)
    setError('')
    setSuccess('')
  }

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
      setSuccess('Congratulations! You are now a provider. Redirecting...')
      setShowUpgradeModal(false)
      setTimeout(() => router.push('/dashboard/provider/onboarding'), 2000)
    } catch (error: any) {
      setError(error.message || 'Failed to upgrade. Please try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleRetry = () => {
    setIsRetrying(true)
    setError('')
    loadDashboardData()
  }

  const getLocationString = (location?: any): string => {
    if (!location) return 'Remote'
    const parts = [location.city, location.country].filter(Boolean)
    return parts.join(', ') || 'Remote'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'saved', label: 'Saved', icon: Bookmark },
    { id: 'provider', label: 'Become Provider', icon: Crown },
  ]

  const statCards = [
    { label: 'Opportunities', count: stats.savedOpportunities, icon: Target, color: 'orange' },
    { label: 'Jobs', count: stats.savedJobs, icon: Briefcase, color: 'blue' },
    { label: 'Events', count: stats.savedEvents, icon: Calendar, color: 'emerald' },
    { label: 'Resources', count: stats.savedResources, icon: BookOpen, color: 'violet' },
  ]

  return (
    <div className="min-h-screen pb-8">
      {/* Header Section */}
      <div className="mb-8">
        {/* Welcome Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Welcome back, {user?.firstName || user?.email?.split('@')[0]}!
                  </h1>
                  <p className="text-sm text-white/50">
                    {stats.completionPercentage === 100 
                      ? 'Your profile is complete. Explore new opportunities!' 
                      : 'Complete your profile for better recommendations'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white">
                  {stats.completionPercentage}%
                </div>
                <span className="text-xs text-white/50">Profile</span>
              </div>
            </div>
          </div>

          {/* Onboarding Prompt */}
          {!isOnboardingCompleted && stats.completionPercentage < 100 && (
            <div className="mt-4 pt-4 border-t border-orange-500/20">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.completionPercentage}%` }}
                    />
                  </div>
                </div>
                <Link href="/onboarding">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                    Complete Profile
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
              <Button onClick={handleRetry} variant="ghost" size="sm" className="mt-2 text-red-400 hover:text-red-300" disabled={isRetrying}>
                <RefreshCw className={cn("w-4 h-4 mr-2", isRetrying && "animate-spin")} />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                isActive 
                  ? "bg-white/10 text-white" 
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive && "text-orange-500")} />
              {tab.label}
            </button>
          )
        })}
        
        {(user?.role === 'opportunity_poster' || user?.role === 'admin' || user?.role === 'super_admin') && (
          <Link href="/dashboard/provider" className="ml-auto">
            <Button size="sm" variant="ghost" className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10">
              <Crown className="w-4 h-4 mr-2" />
              Provider Hub
            </Button>
          </Link>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center",
                      stat.color === 'orange' && "bg-orange-500/10",
                      stat.color === 'blue' && "bg-blue-500/10",
                      stat.color === 'emerald' && "bg-emerald-500/10",
                      stat.color === 'violet' && "bg-violet-500/10"
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        stat.color === 'orange' && "text-orange-500",
                        stat.color === 'blue' && "text-blue-500",
                        stat.color === 'emerald' && "text-emerald-500",
                        stat.color === 'violet' && "text-violet-500"
                      )} />
                    </div>
                    <span className="text-2xl font-bold text-white">{stat.count}</span>
                  </div>
                  <p className="text-xs text-white/40">Saved {stat.label}</p>
                </div>
              )
            })}
          </div>

          {/* Recommendations */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                </div>
                <h2 className="font-semibold text-white">Recommended For You</h2>
              </div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-white/50 hover:text-white">
                  See All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.05] animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/[0.05] rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-white/[0.05] rounded w-1/2 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))
              ) : recommendations.length > 0 ? (
                recommendations.slice(0, 5).map((item) => {
                  const config = typeConfig[item.type] || typeConfig.opportunity
                  const Icon = config.icon
                  const detailUrl = `/${getPluralType(item.type)}/${item._id}`
                  
                  return (
                    <Link key={item._id} href={detailUrl} className="block group">
                      <div className="p-5 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            config.color === 'orange' && "bg-orange-500/10",
                            config.color === 'blue' && "bg-blue-500/10",
                            config.color === 'emerald' && "bg-emerald-500/10",
                            config.color === 'violet' && "bg-violet-500/10"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5",
                              config.color === 'orange' && "text-orange-500",
                              config.color === 'blue' && "text-blue-500",
                              config.color === 'emerald' && "text-emerald-500",
                              config.color === 'violet' && "text-violet-500"
                            )} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "text-xs font-medium",
                                config.color === 'orange' && "text-orange-500",
                                config.color === 'blue' && "text-blue-500",
                                config.color === 'emerald' && "text-emerald-500",
                                config.color === 'violet' && "text-violet-500"
                              )}>
                                {config.label}
                              </span>
                              {item.score && item.score > 0 && (
                                <Badge variant="outline" className="border-0 bg-orange-500/10 text-orange-500 text-[10px] px-1.5 py-0">
                                  {Math.round(item.score)}% match
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="font-medium text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                              {item.title}
                            </h3>
                            
                            <p className="text-sm text-white/50 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                            
                            <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {getLocationString(item.location)}
                              </span>
                            </div>
                          </div>
                          
                          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-orange-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-white/30" />
                  </div>
                  <h3 className="font-medium text-white mb-1">No Recommendations Yet</h3>
                  <p className="text-sm text-white/50 mb-4">Complete your profile to get personalized recommendations</p>
                  <Link href="/onboarding">
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 rounded-xl">
                      Complete Profile
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Tab */}
      {activeTab === 'saved' && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          <div className="p-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Bookmark className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Saved Items</h2>
                <p className="text-sm text-white/40">{savedItems.length} items saved</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.05] animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/[0.05] rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-white/[0.05] rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : savedItems.length > 0 ? (
              savedItems.map((item) => {
                const config = typeConfig[item.type] || typeConfig.opportunity
                const Icon = config.icon
                const detailUrl = `/${getPluralType(item.type)}/${item._id}`
                
                return (
                  <Link key={item._id} href={detailUrl} className="block group">
                    <div className="p-5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          config.color === 'orange' && "bg-orange-500/10",
                          config.color === 'blue' && "bg-blue-500/10",
                          config.color === 'emerald' && "bg-emerald-500/10",
                          config.color === 'violet' && "bg-violet-500/10"
                        )}>
                          <Icon className={cn(
                            "w-5 h-5",
                            config.color === 'orange' && "text-orange-500",
                            config.color === 'blue' && "text-blue-500",
                            config.color === 'emerald' && "text-emerald-500",
                            config.color === 'violet' && "text-violet-500"
                          )} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "text-xs font-medium",
                            config.color === 'orange' && "text-orange-500",
                            config.color === 'blue' && "text-blue-500",
                            config.color === 'emerald' && "text-emerald-500",
                            config.color === 'violet' && "text-violet-500"
                          )}>
                            {config.label}
                          </span>
                          
                          <h3 className="font-medium text-white group-hover:text-orange-400 transition-colors line-clamp-1 mt-0.5">
                            {item.title}
                          </h3>
                          
                          {item.company && (
                            <p className="text-sm text-white/50 line-clamp-1 mt-0.5">
                              {item.company}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {getLocationString(item.location)}
                            </span>
                            <span>Saved {item.savedAt}</span>
                          </div>
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-orange-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
                  <Bookmark className="w-6 h-6 text-white/30" />
                </div>
                <h3 className="font-medium text-white mb-1">No Saved Items Yet</h3>
                <p className="text-sm text-white/50 mb-4">Start exploring to save items you're interested in</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/opportunities">
                    <Button size="sm" variant="outline" className="border-white/10 text-white/70 hover:text-white hover:border-white/20 rounded-xl">
                      <Target className="w-4 h-4 mr-1" />
                      Opportunities
                    </Button>
                  </Link>
                  <Link href="/jobs">
                    <Button size="sm" variant="outline" className="border-white/10 text-white/70 hover:text-white hover:border-white/20 rounded-xl">
                      <Briefcase className="w-4 h-4 mr-1" />
                      Jobs
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provider Tab */}
      {activeTab === 'provider' && (
        <div className="space-y-6">
          {/* Hero */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center mx-auto mb-5">
              <Crown className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Become an Opportunity Provider</h2>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              Share your opportunities with thousands of ambitious individuals
            </p>
            <Button onClick={handleUpgradeToProvider} size="lg" className="bg-orange-500 hover:bg-orange-600 rounded-xl" disabled={isUpgrading}>
              {isUpgrading ? 'Processing...' : 'Become a Provider'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Users, title: 'Reach More People', desc: 'Connect with thousands looking for opportunities' },
              { icon: Target, title: 'Targeted Audience', desc: 'Reach the right candidates with smart matching' },
              { icon: BarChart3, title: 'Analytics', desc: 'Track engagement and performance' },
            ].map((benefit) => (
              <div key={benefit.title} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                <p className="text-sm text-white/50">{benefit.desc}</p>
              </div>
            ))}
          </div>

          {/* How It Works */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <h3 className="font-semibold text-white mb-6">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: 1, title: 'Upgrade Account', desc: 'Click "Become a Provider" to upgrade' },
                { step: 2, title: 'Complete Onboarding', desc: 'Fill out your organization details' },
                { step: 3, title: 'Start Posting', desc: 'Create and publish opportunities' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-0.5">{item.title}</h4>
                    <p className="text-sm text-white/50">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-[#141414] border-white/[0.08] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Upgrade to Provider</DialogTitle>
            <DialogDescription className="text-white/50">
              Confirm your credentials to upgrade your account
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpgradeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upgrade-email" className="text-white/70">Email</Label>
              <Input
                id="upgrade-email"
                type="email"
                value={upgradeForm.email}
                onChange={(e) => setUpgradeForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                className="bg-white/[0.05] border-white/[0.08] text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="upgrade-password" className="text-white/70">Password</Label>
              <Input
                id="upgrade-password"
                type="password"
                value={upgradeForm.password}
                onChange={(e) => setUpgradeForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                className="bg-white/[0.05] border-white/[0.08] text-white"
                required
              />
            </div>
            
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowUpgradeModal(false)} disabled={isUpgrading} className="text-white/60">
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={isUpgrading}>
                {isUpgrading ? 'Upgrading...' : 'Upgrade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user?._id) {
      router.replace(`/profile/${user._id}`)
    }
  }, [user, router])

  return (
    <AuthGuard>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Redirecting to profile...</p>
        </div>
      </div>
    </AuthGuard>
  )
}
