"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import { AuthRequiredCard } from '@/components/auth-required-card'
import ApiClient from "@/lib/api-client"
import {
  ArrowLeft,
  Target,
  Calendar,
  Briefcase,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react'
import { toast } from "sonner"
import { WalletTopUpModal } from "@/components/wallet/WalletTopUpModal"
import { PromoteContentModal } from "@/components/promote-content-modal"

// Types matching backend exactly
interface Promotion {
  _id: string
  contentId: string
  contentType: string
  packageType: string
  packageName: string
  investment: number
  duration: number
  status: string
  paymentStatus: string
  createdAt: string
  startDate?: string
  endDate?: string
  isActive?: boolean
  isExpired?: boolean
  remainingDays?: number
  // Wallet-budget specific fields (optional, only for wallet-based promotions)
  spendLimitNg?: number | null
  spentNg?: number | null
  content?: {
    _id: string
    title: string
    description: string
    image?: string
    isPaid?: boolean
    isPremium?: boolean
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

export default function PromotionsPage() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, isAuthenticated } = useAuth()
  
  // State
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [userContent, setUserContent] = useState<UserContent[]>([])
  const [loading, setLoading] = useState(true)

  // Promote modal: content selected for promotion (opens PromoteContentModal)
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

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  // Handle redirect back from Paystack after promotion payment
  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated) return
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('reference')
    if (params.get('promotion') === 'success' && ref) {
      ApiClient.verifyPromotionPayment(ref)
        .then(() => {
          fetchData()
          toast.success('Promotion started successfully')
        })
        .catch(() => {
          toast.error('Failed to verify payment. Please try again or contact support.')
        })
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname)
        })
    }
  }, [isAuthenticated])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch user promotions (authenticated)
      const promotionsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promotions/my-promotions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })
      const promotionsData = await promotionsResponse.json()
      console.log('Promotions response:', promotionsData)
      
      if (promotionsData.success) {
        setPromotions(promotionsData.data.promotions || [])
        console.log('Promotions loaded:', promotionsData.data.promotions)
      } else {
        console.error('Failed to fetch promotions:', promotionsData)
        
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
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/my/opportunities`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json()).catch(() => ({ success: false, data: { opportunities: [] } })),
        
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events/my/events`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json()).catch(() => ({ success: false, data: { events: [] } })),
        
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/jobs/my/jobs`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json()).catch(() => ({ success: false, data: { jobs: [] } }))
      ])

      console.log('Content responses:', { opportunitiesRes, eventsRes, jobsRes })

      // Combine all content
      const allContent: UserContent[] = []
      
      if (opportunitiesRes.success) {
        const opportunities = opportunitiesRes.data.opportunities || []
        allContent.push(...opportunities.map((item: any) => ({ ...item, contentType: 'opportunity' })))
      }
      
      if (eventsRes.success) {
        const events = eventsRes.data.events || []
        allContent.push(...events.map((item: any) => ({ ...item, contentType: 'event' })))
      }
      
      if (jobsRes.success) {
        const jobs = jobsRes.data.jobs || []
        allContent.push(...jobs.map((item: any) => ({ ...item, contentType: 'job' })))
      }
      
      setUserContent(allContent)
      console.log('Total user content loaded:', allContent.length)

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load promotions data')
    } finally {
      setLoading(false)
    }
  }

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-primary/10 text-foreground'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'event': return Calendar
      case 'job': return Briefcase
      case 'resource': return BookOpen
      default: return Target
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Display name for package column: wallet-based promotions show "Wallet", else package name or "—"
  const getPackageDisplayName = (p: Promotion) =>
    p.packageType === 'wallet_daily' || !p.packageName ? 'Wallet' : p.packageName || '—'

  // Filter promotions
  const activePromotions = promotions.filter(p => p.status === 'active' && p.paymentStatus === 'paid')
  const pendingPromotions = promotions.filter(p => p.status === 'pending')
  const completedPromotions = promotions.filter(p => p.status === 'completed' || p.status === 'expired')

  // Promotion Manager derived data
  const now = new Date()
  const currentManagerPromotions = promotions.filter(p =>
    p.status === 'active' ||
    p.status === 'pending' ||
    p.status === 'paused'
  )

  const pastManagerPromotions = promotions.filter(p => {
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
  })

  const totalUpfrontSpentNg = promotions.reduce((sum, p) => {
    if (p.packageType === 'wallet_daily') {
      return sum + p.duration * 100
    }
    return sum
  }, 0)

  // Total budget: upfront (₦100/day) + per-click budget limit for each promotion
  const totalBudgetNg = promotions.reduce((sum, p) => {
    const upfront = (p.duration ?? 0) * 100
    const budget = p.spendLimitNg ?? 0
    return sum + upfront + budget
  }, 0)

  const totalRemainingBudgetNg = promotions.reduce((sum, p) => {
    const limit = p.spendLimitNg ?? null
    if (limit != null && limit > 0) {
      const spent = p.spentNg ?? 0
      const remaining = Math.max(0, limit - spent)
      return sum + remaining
    }
    return sum
  }, 0)

  // Recommended content: no active promotion + good engagement / recency
  const activeContentIds = new Set(
    promotions
      .filter(p => p.status === 'active' && p.paymentStatus === 'paid')
      .map(p => p.contentId)
  )

  const unpromotedContent: UserContent[] = userContent.filter((c: any) => !activeContentIds.has(c._id))

  const recommendedContent: UserContent[] = userContent
    .filter((c: any) => !activeContentIds.has(c._id))
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

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading promotions...</p>
        </div>
      </div>
    )
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

  return (
    <div className="min-h-screen bg-page flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-page/95 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/provider" className="p-2 hover:bg-muted rounded-xl transition-colors">
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Promotion Manager</h1>
              <p className="text-sm lg:text-base text-muted-foreground">Track all your promotions, budgets, and recommendations in one place.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href="/dashboard/provider?tab=content">
                <Target className="h-4 w-4 mr-1.5" />
                Go to Content
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-6 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border border-border bg-card rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Totals spent</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBudgetNg)}</p>
                </div>
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center border border-border">
                  <TrendingUp className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total spent across all promotions</p>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Promotions</p>
                  <p className="text-2xl font-bold text-emerald-400">{activePromotions.length}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-border">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upfront Spend card hidden
          <Card className="border border-border bg-card rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upfront Spend (₦100/day)</p>
                  <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalUpfrontSpentNg)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-border">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          */}

          {/* Remaining Budget card hidden
          <Card className="border border-border bg-card rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Remaining Budget</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalRemainingBudgetNg)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-border">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          */}

          <Card className="border border-border bg-card rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Past Promotions</p>
                  <p className="text-2xl font-bold text-violet-400">{pastManagerPromotions.length}</p>
                </div>
                <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center border border-border">
                  <Target className="w-6 h-6 text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Promotion Manager Tabs */}
        <Tabs defaultValue="current" className="space-y-6 mb-10">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="current">Current ({currentManagerPromotions.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastManagerPromotions.length})</TabsTrigger>
            <TabsTrigger value="all-content">All content ({unpromotedContent.length})</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations ({recommendedContent.length})</TabsTrigger>
          </TabsList>

          {/* Current promotions: active + pending + paused */}
          <TabsContent value="current" className="space-y-4">
            {currentManagerPromotions.length === 0 ? (
              <Card className="border border-border bg-card rounded-xl">
                <CardContent className="p-8 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Current Promotions</h3>
                  <p className="text-muted-foreground">Pick content from the Recommendations or content list below and click Promote to start.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border bg-card rounded-xl">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-semibold text-foreground">Title</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Type</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Duration</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Status</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Budget (₦)</th>
                        {/* <th className="px-4 py-3 font-semibold text-foreground">Spent (₦)</th> */}
                        {/* <th className="px-4 py-3 font-semibold text-foreground">Remaining (₦)</th> */}
                        <th className="px-4 py-3 font-semibold text-foreground">End date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentManagerPromotions.map((promotion) => {
                        const budget = promotion.spendLimitNg ?? null
                        // const spent = promotion.spentNg ?? 0
                        // const remaining = budget != null && budget > 0 ? Math.max(0, budget - spent) : null
                        return (
                          <tr key={promotion._id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground line-clamp-1">
                                  {promotion.content?.title || getPackageDisplayName(promotion)}
                                </span>
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {getPackageDisplayName(promotion)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 capitalize text-foreground">
                              {promotion.contentType || '—'}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {promotion.duration} days
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={getStatusColor(promotion.status)}>
                                {promotion.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {budget != null && budget > 0 ? formatCurrency(budget) : 'No limit'}
                            </td>
                            {/* <td className="px-4 py-3">
                              {spent > 0 ? formatCurrency(spent) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {remaining != null ? formatCurrency(remaining) : '—'}
                            </td> */}
                            <td className="px-4 py-3 text-foreground">
                              {promotion.endDate ? new Date(promotion.endDate).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Past promotions: completed / expired / cancelled / ended */}
          <TabsContent value="past" className="space-y-4">
            {pastManagerPromotions.length === 0 ? (
              <Card className="border border-border bg-card rounded-xl">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Past Promotions</h3>
                  <p className="text-muted-foreground">Completed or expired promotions will appear here for your records.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border bg-card rounded-xl">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-semibold text-foreground">Title</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Type</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Duration</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Status</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Budget (₦)</th>
                        {/* <th className="px-4 py-3 font-semibold text-foreground">Spent (₦)</th> */}
                        <th className="px-4 py-3 font-semibold text-foreground">End date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastManagerPromotions.map((promotion) => {
                        const budget = promotion.spendLimitNg ?? null
                        // const spent = promotion.spentNg ?? 0
                        return (
                          <tr key={promotion._id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground line-clamp-1">
                                  {promotion.content?.title || getPackageDisplayName(promotion)}
                                </span>
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {getPackageDisplayName(promotion)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 capitalize text-foreground">
                              {promotion.contentType || '—'}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {promotion.duration} days
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={getStatusColor(promotion.status)}>
                                {promotion.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {budget != null && budget > 0 ? formatCurrency(budget) : 'No limit'}
                            </td>
                            {/* <td className="px-4 py-3">
                              {spent > 0 ? formatCurrency(spent) : '—'}
                            </td> */}
                            <td className="px-4 py-3 text-foreground">
                              {promotion.endDate ? new Date(promotion.endDate).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* All content (unpromoted) */}
          <TabsContent value="all-content" className="space-y-4">
            {unpromotedContent.length === 0 ? (
              <Card className="border border-border bg-card rounded-xl">
                <CardContent className="p-8 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No content to promote</h3>
                  <p className="text-muted-foreground">
                    All your content is already being promoted, or you have no content yet. Create content from your dashboard first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpromotedContent.map((content) => {
                  const ContentIcon = getContentIcon(content.contentType || 'opportunity')
                  return (
                    <Card key={content._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <ContentIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground line-clamp-2">{content.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{content.contentType}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-2 bg-primary hover:bg-primary/90"
                          onClick={() => {
                            setSelectedContent(content)
                            setShowPromoteModal(true)
                          }}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Promote
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Recommendations tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {recommendedContent.length === 0 ? (
              <Card className="border border-border bg-card rounded-xl">
                <CardContent className="p-8 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Recommendations Yet</h3>
                  <p className="text-muted-foreground">
                    Once you post more content and start getting engagement, we’ll recommend what to promote here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedContent.map((content) => {
                  const metrics: any = (content as any).metrics || {}
                  const views = metrics.viewCount || 0
                  const likes = metrics.likeCount || 0
                  const saves = metrics.saveCount || 0
                  const ContentIcon = getContentIcon(content.contentType || 'opportunity')
                  return (
                    <Card key={content._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <ContentIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground line-clamp-2">{content.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{content.contentType}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-2">
                            <span>{views} views</span>
                            <span>•</span>
                            <span>{likes} likes</span>
                            <span>•</span>
                            <span>{saves} saves</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-2 bg-primary hover:bg-primary/90"
                          onClick={() => {
                            setSelectedContent(content)
                            setShowPromoteModal(true)
                          }}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Promote this content
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Promotions Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active ({activePromotions.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingPromotions.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedPromotions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activePromotions.length === 0 ? (
              <Card className="border border-border bg-card rounded-xl">
                <CardContent className="p-8 text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Active Promotions</h3>
                  <p className="text-muted-foreground">Pick content from Recommendations or the content list above and click Promote to start.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activePromotions.map((promotion) => (
                  <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary flex items-center justify-center">
                          <Target className="w-5 h-5 text-foreground" />
                        </div>
                        <Badge className={getStatusColor(promotion.status)}>
                          {promotion.status}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{promotion.content?.title || getPackageDisplayName(promotion)}</h3>
                      <p className="text-xs text-muted-foreground mb-4">{getPackageDisplayName(promotion)} • {promotion.contentType}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Investment:</span>
                          <span className="font-semibold">{formatCurrency(promotion.investment)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-semibold">{promotion.duration} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Remaining:</span>
                          <span className="font-semibold text-green-600">{promotion.remainingDays} days</span>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingPromotions.length === 0 ? (
              <Card className="border border-border bg-card rounded-xl">
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Promotions</h3>
                  <p className="text-muted-foreground">All your promotions are either active or completed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingPromotions.map((promotion) => (
                  <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary flex items-center justify-center">
                          <Target className="w-5 h-5 text-foreground" />
                        </div>
                        <Badge className={getStatusColor(promotion.status)}>
                          {promotion.status}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{promotion.content?.title || getPackageDisplayName(promotion)}</h3>
                      <p className="text-xs text-muted-foreground mb-4">{getPackageDisplayName(promotion)} • {promotion.contentType}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Investment:</span>
                          <span className="font-semibold">{formatCurrency(promotion.investment)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-semibold">{promotion.duration} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Payment:</span>
                          <Badge className={getPaymentStatusColor(promotion.paymentStatus)}>
                            {promotion.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedPromotions.length === 0 ? (
              <Card className="border border-border bg-card rounded-xl">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Completed Promotions</h3>
                  <p className="text-muted-foreground">Your completed promotions will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedPromotions.map((promotion) => (
                  <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary flex items-center justify-center">
                          <Target className="w-5 h-5 text-foreground" />
                        </div>
                        <Badge className={getStatusColor(promotion.status)}>
                          {promotion.status}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{promotion.content?.title || getPackageDisplayName(promotion)}</h3>
                      <p className="text-xs text-muted-foreground mb-4">{getPackageDisplayName(promotion)} • {promotion.contentType}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Investment:</span>
                          <span className="font-semibold">{formatCurrency(promotion.investment)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-semibold">{promotion.duration} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Completed:</span>
                          <span className="font-semibold text-primary">
                            {new Date(promotion.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Wallet top-up modal kept for compatibility; not shown on this page (promotions use Paystack one-time payment) */}
      <WalletTopUpModal open={false} onOpenChange={() => {}} onCompleted={fetchData} />

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

    </div>
  )
}
