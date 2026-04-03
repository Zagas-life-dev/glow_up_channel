"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { getPostingLimit } from "@/lib/posting-limits"
import { hasPremiumAccess } from "@/lib/roles"
import AuthGuard from "@/components/auth-guard"
import { cn } from "@/lib/utils"
import { toast } from 'sonner'
import PostTypeSelector, { PostTypeOption } from "@/components/posting/PostTypeSelector"
import TagInputWithSuggestions from "@/components/posting/TagInputWithSuggestions"
import ProviderDashboardSidebar from '@/components/provider/provider-dashboard-sidebar'
import ProviderDashboardBottomNav from '@/components/provider/provider-dashboard-bottom-nav'
import { 
  Target,
  Calendar,
  Briefcase,
  BookOpen,
  MapPin,
  Clock,
  DollarSign,
  Globe,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  Plus,
  Sparkles,
  Send,
  Loader2,
  Home,
  Menu,
  Settings,
  Zap,
  LayoutDashboard,
  MoreVertical,
  RefreshCw,
  Crown,
  FileText,
  BarChart3
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type PostType = 'opportunity' | 'event' | 'job' | 'resource'

const postTypes: PostTypeOption<PostType>[] = [
  { id: 'opportunity', title: 'Opportunity', icon: Target, color: 'orange', desc: 'Internships, scholarships, grants' },
  { id: 'job', title: 'Job', icon: Briefcase, color: 'primary', desc: 'Full-time, part-time positions' },
  { id: 'event', title: 'Event', icon: Calendar, color: 'emerald', desc: 'Workshops, conferences, meetups' },
  { id: 'resource', title: 'Resource', icon: BookOpen, color: 'violet', desc: 'Courses, guides, tools' },
]

const opportunityTypes = [
  'Internship', 'Scholarship', 'Grant', 'Fellowship', 'Volunteer Work',
  'Mentorship Program', 'Training Program', 'Workshop', 'Competition',
  'Research Opportunity', 'Startup Incubator', 'Accelerator Program',
  'Hackathon', 'Bootcamp', 'Exchange Program', 'Apprenticeship', 'Other',
]

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Remote', 'Other']

const eventTypes = ['Workshop', 'Conference', 'Webinar', 'Meetup', 'Hackathon', 'Networking', 'Bootcamp', 'Career Fair', 'Other']

const resourceCategories = ['Course', 'Tutorial', 'E-book', 'Tool', 'Template', 'Guide', 'Podcast', 'Video Series', 'Product', 'Other']

function PostingContent() {
  const router = useRouter()
  const pathname = usePathname()
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, profile, isAuthenticated } = useAuth()
  const [selectedType, setSelectedType] = useState<PostType | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const tagInputContainerRef = useRef<HTMLDivElement | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'
  
  // Permission state
  const [canPost, setCanPost] = useState(false)
  const [postingCount, setPostingCount] = useState<number | null>(null)
  const [onboardingStatus, setOnboardingStatus] = useState<{
    completionPercentage: number
    isCompleted: boolean
    reason: string
  } | null>(null)
  
  // Form states
  const [isPaid, setIsPaid] = useState(false)
  const [isRemote, setIsRemote] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Hide navbar when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // Check posting permission and current posting count (always fetch count so it matches dashboard)
  useEffect(() => {
    const checkPermission = async () => {
      if (!isAuthenticated || !user) return
      try {
        const [response, countResult] = await Promise.all([
          ApiClient.checkPostingPermission().catch(() => ({
            canPost: false,
            completionPercentage: 0,
            isCompleted: false,
            reason: 'Could not verify posting permission'
          })),
          ApiClient.getMyPostingCount().catch(() => ({ total: 0, opportunities: 0, events: 0, jobs: 0, resources: 0 }))
        ])
        setCanPost(response.canPost)
        setOnboardingStatus({
          completionPercentage: response.completionPercentage,
          isCompleted: response.isCompleted,
          reason: response.reason
        })
        setPostingCount(countResult.total)
      } catch (error) {
        setCanPost(false)
        setPostingCount(null)
        setOnboardingStatus({
          completionPercentage: 0,
          isCompleted: false,
          reason: 'Failed to verify onboarding status'
        })
      }
    }
    checkPermission()
  }, [isAuthenticated, user])

  const handleSelectType = (type: PostType) => {
    const limit = getPostingLimit(user?.isPremium, user?.role)
    // If limit is finite, enforce it; admins/super_admins get Infinity and bypass this check
    if (Number.isFinite(limit) && postingCount !== null && postingCount >= limit) {
      toast.error(
        user?.isPremium
          ? `You have reached your maximum of ${limit} posts. Remove an existing post to add more.`
          : `You have reached your maximum of ${limit} posts. Upgrade to Premium to post up to 20.`,
        { duration: 5000 }
      )
      return
    }
    setSelectedType(type)
    setIsSheetOpen(true)
    setSubmitStatus('idle')
    setErrorMessage('')
    setTags([])
    setTagInput('')
    setIsPaid(false)
    setIsRemote(false)
  }
  // Tag suggestions logic moved into shared TagInputWithSuggestions component

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType || !canPost) return

    const limit = getPostingLimit(user?.isPremium, user?.role)
    let currentTotal = postingCount ?? 0
    if (Number.isFinite(limit) && currentTotal >= limit) {
      try {
        const count = await ApiClient.getMyPostingCount()
        currentTotal = count.total
        setPostingCount(currentTotal)
      } catch (_) {}
      if (Number.isFinite(limit) && currentTotal >= limit) {
        toast.error(
          user?.isPremium
            ? `You have reached your maximum of ${limit} posts. Remove an existing post to add more.`
            : `You have reached your maximum of ${limit} posts. Upgrade to Premium to post up to 20.`,
          { duration: 5000 }
        )
        return
      }
    }
    
    setIsSubmitting(true)
    setSubmitStatus('idle')
    
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement)
      const data = Object.fromEntries(formData.entries())
      
      let submissionData: any = {}
      
      if (selectedType === 'opportunity') {
        submissionData = {
          title: data.title,
          company: data.company,
          type: data.type,
          description: data.description,
          url: data.url,
          requirements: data.requirements,
          tags: tags,
          location: {
            country: data.country,
            province: data.province,
            city: data.city,
            isRemote: isRemote
          },
          financial: { isPaid: isPaid, amount: data.amount, currency: 'NGN' },
          dates: { applicationDeadline: data.deadline }
        }
      } else if (selectedType === 'job') {
        submissionData = {
          title: data.title,
          company: data.company,
          type: data.type,
          description: data.description,
          url: data.url,
          tags: tags,
          location: {
            country: data.country,
            province: data.province,
            city: data.city,
            isRemote: isRemote
          },
          pay: { isPaid: isPaid, amount: data.salary, period: data.period, currency: 'NGN' },
          dates: { applicationDeadline: data.deadline }
        }
      } else if (selectedType === 'event') {
        const eventPrice = data.price ? Number(data.price) : undefined
        const capacityNum = data.capacity ? parseInt(String(data.capacity), 10) : undefined
        const startDate = data.startDate ? (data.startDate as string) : undefined
        const endDate = data.endDate ? (data.endDate as string) : undefined
        const regDeadline = data.deadline ? (data.deadline as string) : undefined

        submissionData = {
          title: data.title,
          organizer: data.organizer || undefined,
          eventType: data.type,
          description: data.description,
          url: data.url || undefined,
          tags: tags,
          isPaid: isPaid,
          ...(isPaid && eventPrice != null && !Number.isNaN(eventPrice) && { price: eventPrice }),
          currency: 'NGN',
          location: {
            ...(data.country && { country: data.country }),
            ...(data.province && { province: data.province }),
            ...(data.city && { city: data.city }),
            isRemote: isRemote
          },
          dates: {
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
            ...(regDeadline && { registrationDeadline: regDeadline })
          },
          ...(capacityNum != null && !Number.isNaN(capacityNum) && capacityNum >= 1 && { capacity: { maxAttendees: capacityNum } })
        }
      } else if (selectedType === 'resource') {
        const rawType = data.type ?? data.category ?? ''
        const rawUrl = data.url ?? ''
        const resourceCategory = typeof rawType === 'string' ? rawType.trim() : ''
        const resourceUrl = typeof rawUrl === 'string' ? rawUrl.trim() : ''
        submissionData = {
          title: typeof data.title === 'string' ? data.title : '',
          description: typeof data.description === 'string' ? data.description : '',
          // Reuse the same tag/hashtag selection so resources can be ranked by tags too
          tags,
          category: resourceCategory,
          ...(resourceUrl && { paymentLink: resourceUrl })
        }
      }
      
      let response
      switch (selectedType) {
        case 'opportunity':
          response = await ApiClient.createOpportunity(submissionData)
          break
        case 'job':
          response = await ApiClient.createJob(submissionData)
          break
        case 'event':
          response = await ApiClient.createEvent(submissionData)
          break
        case 'resource':
          response = await ApiClient.createResource(submissionData)
          break
      }
      
      setSubmitStatus('success')
      const count = await ApiClient.getMyPostingCount()
      setPostingCount(count.total)
      setTimeout(() => {
        setIsSheetOpen(false)
        setSelectedType(null)
      }, 2000)
      
    } catch (error: any) {
      setSubmitStatus('error')
      setErrorMessage(error.message || 'Failed to post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeConfig = (type: PostType) => postTypes.find(t => t.id === type)!

  const avatarUrl = (profile as any)?.profileImage ?? (user as any)?.profileImage ?? null

  // Provider sidebar nav (same as provider dashboard)
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard/provider' },
    { id: 'content', label: 'Content', icon: FileText, href: '/dashboard/provider' },
    { id: 'promotions', label: 'Promotions', icon: Zap, href: '/dashboard/provider/promotions' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard/provider' },
  ]

  const quickLinks = [
    { label: 'Post Content', icon: Plus, href: '/dashboard/provider/posting', variant: 'default' as const },
    { label: 'Settings', icon: Settings, href: '/dashboard/provider/settings', variant: 'outline' as const },
    { label: 'Home', icon: Home, href: '/', variant: 'outline' as const },
  ]
  const providerNavItems = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'content' as const, label: 'Content', icon: FileText },
    { id: 'promotions' as const, label: 'Promotions', icon: Zap },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ]
  const providerNavRouteMap = {
    overview: '/dashboard/provider',
    content: '/dashboard/provider/posting',
    promotions: '/dashboard/provider/promotions',
    analytics: '/dashboard/provider/settings',
  }
  const activeProviderTab: 'overview' | 'content' | 'promotions' | 'analytics' = pathname?.startsWith('/dashboard/provider/posting') ? 'content' : 'overview'

  const handleRefresh = () => {
    setLoading(true)
    const checkPermission = async () => {
      if (!isAuthenticated || !user) return
      try {
        const [response, countResult] = await Promise.all([
          ApiClient.checkPostingPermission().catch(() => ({
            canPost: false,
            completionPercentage: 0,
            isCompleted: false,
            reason: 'Could not verify posting permission'
          })),
          ApiClient.getMyPostingCount().catch(() => ({ total: 0, opportunities: 0, events: 0, jobs: 0, resources: 0 }))
        ])
        setCanPost(response.canPost)
        setOnboardingStatus({
          completionPercentage: response.completionPercentage,
          isCompleted: response.isCompleted,
          reason: response.reason
        })
        setPostingCount(countResult.total)
      } catch (error) {
        setCanPost(false)
        setPostingCount(null)
        setOnboardingStatus({
          completionPercentage: 0,
          isCompleted: false,
          reason: 'Failed to verify onboarding status'
        })
      } finally {
        setLoading(false)
      }
    }
    checkPermission()
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.16),transparent_58%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.08),transparent_55%)] font-sans flex">
      <ProviderDashboardSidebar
        user={user as any}
        profile={profile as any}
        navItems={providerNavItems}
        quickLinks={quickLinks}
        activeTab={activeProviderTab}
        onTabChange={(tab) => router.push(providerNavRouteMap[tab])}
        totalPostings={postingCount ?? 0}
        postingLimit={Number.isFinite(getPostingLimit(user?.isPremium, user?.role)) ? getPostingLimit(user?.isPremium, user?.role) : 999}
        hasPremium={hasPremiumAccess({ isPremium: user?.isPremium, role: user?.role })}
      />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 bg-page/80 backdrop-blur-xl border-b border-border/70">
          <div className="flex items-center justify-between h-14 px-4 pt-[max(0rem,env(safe-area-inset-top))]">
            <div>
              <p className="text-overline uppercase tracking-[0.14em] text-muted-foreground">Provider workspace</p>
              <h1 className="text-body font-semibold text-foreground">Post Content</h1>
            </div>
            <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={loading} className="h-9 w-9 p-0 text-muted-foreground">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">

      {/* Onboarding Warning */}
        {!canPost && onboardingStatus && (
        <div className="mb-8 p-5 rounded-2xl bg-primary/10 border border-orange-500/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Complete Onboarding</h3>
              <p className="text-sm text-muted-foreground mb-4">{onboardingStatus.reason}</p>
                  
                  {onboardingStatus.completionPercentage > 0 && (
                    <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{onboardingStatus.completionPercentage}%</span>
                      </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                      className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${onboardingStatus.completionPercentage}%` }}
                    />
                      </div>
                    </div>
                  )}
                  
                      <Link href="/dashboard/provider/onboarding">
                <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-xl">
                        Complete Onboarding
                    </Button>
                      </Link>
                  </div>
                </div>
              </div>
        )}

      {/* Post Type Selection */}
        <div className="mb-8">
        {postingCount !== null && (
          <p className="text-sm text-muted-foreground mb-4">
            You have <span className="font-semibold text-foreground">{postingCount}</span>{' '}
            {Number.isFinite(getPostingLimit(user?.isPremium, user?.role)) ? (
              <>
                of <span className="font-semibold text-foreground">{getPostingLimit(user?.isPremium, user?.role)}</span> posts
                (max for {hasPremiumAccess({ isPremium: user?.isPremium, role: user?.role }) ? 'Premium' : 'free'}).
              </>
            ) : (
              <>posts (no limit for admin users).</>
            )}
          </p>
        )}
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">What would you like to post?</h2>
        <PostTypeSelector<PostType>
          types={postTypes}
          selectedType={selectedType}
          onSelect={handleSelectType}
          disabled={!canPost}
        />
        </div>

      {/* Recent Posts Section */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-orange-500" />
                    </div>
          <h3 className="font-semibold text-foreground">Quick Start Guide</h3>
                    </div>
        <div className="space-y-3">
          {[
            { step: 1, text: 'Choose a post type above' },
            { step: 2, text: 'Fill in the required details' },
            { step: 3, text: 'Add relevant tags for better discovery' },
            { step: 4, text: 'Submit for review' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                {item.step}
                  </div>
              <span className="text-sm text-muted-foreground">{item.text}</span>
                              </div>
                            ))}
                          </div>
                      </div>
                      
      {/* Bottom Sheet Form */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[90vh] bg-page border-border rounded-t-3xl p-0 overflow-hidden">
          {selectedType && (
            <>
              {/* Sheet Header */}
              <div className="sticky top-0 z-10 bg-page border-b border-border px-6 py-4">
                    <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      getTypeConfig(selectedType).color === 'orange' && "bg-primary/10",
                      getTypeConfig(selectedType).color === 'primary' && "bg-primary/10",
                      getTypeConfig(selectedType).color === 'emerald' && "bg-emerald-500/10",
                      getTypeConfig(selectedType).color === 'violet' && "bg-violet-500/10"
                    )}>
                      {(() => {
                        const Icon = getTypeConfig(selectedType).icon
                        return <Icon className={cn(
                          "w-5 h-5",
                          getTypeConfig(selectedType).color === 'orange' && "text-orange-500",
                          getTypeConfig(selectedType).color === 'primary' && "text-primary",
                          getTypeConfig(selectedType).color === 'emerald' && "text-emerald-500",
                          getTypeConfig(selectedType).color === 'violet' && "text-violet-500"
                        )} />
                      })()}
                    </div>
                      <div>
                      <SheetTitle className="text-foreground">New {getTypeConfig(selectedType).title}</SheetTitle>
                      <SheetDescription className="text-muted-foreground text-xs">Fill in the details below</SheetDescription>
                      </div>
                    </div>
                  <button onClick={() => setIsSheetOpen(false)} className="p-2 rounded-lg hover:bg-muted">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                      </div>
                  </div>

              {/* Success/Error State */}
              {submitStatus === 'success' && (
                <div className="p-6">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Posted Successfully!</h3>
                    <p className="text-muted-foreground">Your {selectedType} has been submitted for review.</p>
                  </div>
                           </div>
                         )}

              {submitStatus === 'error' && (
                <div className="m-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400">{errorMessage}</p>
                    <button onClick={() => setSubmitStatus('idle')} className="text-xs text-red-500 mt-1 hover:underline">
                      Try again
                              </button>
                        </div>
                    </div>
              )}

              {/* Form Content */}
              {submitStatus !== 'success' && (
                <div className="overflow-y-auto h-[calc(90vh-80px)] px-6 py-6">
                  <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                    {/* Common Fields - Title & Company/Organizer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Title *</Label>
                      <Input
                          name="title"
                          placeholder={`${getTypeConfig(selectedType).title} title`}
                        required
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">
                          {selectedType === 'event' ? 'Organizer' : selectedType === 'resource' ? 'Creator' : 'Company'} 
                        </Label>
                      <Input
                          name={selectedType === 'event' ? 'organizer' : selectedType === 'resource' ? 'author' : 'company'}
                          placeholder={selectedType === 'event' ? 'Organizer name' : selectedType === 'resource' ? 'Creator name' : 'Company name'}
                        
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl"
                      />
                    </div>
                  </div>

                    {/* Type Selection */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Type *</Label>
                      <Select name="type" required>
                        <SelectTrigger className="bg-muted border-border text-foreground h-11 rounded-xl">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-border">
                          {(selectedType === 'opportunity' ? opportunityTypes :
                            selectedType === 'job' ? jobTypes :
                            selectedType === 'event' ? eventTypes :
                            resourceCategories
                          ).map((t) => (
                            <SelectItem key={t} value={t} className="text-foreground hover:bg-muted">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>

                    {/* Description */}
                        <div className="space-y-2">
                      <Label className="text-muted-foreground">Description *</Label>
                    <Textarea
                        name="description"
                        placeholder="Describe in detail..."
                      required
                        rows={4}
                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-none"
                      />
                  </div>

                    {/* URL */}
                  <div className="space-y-2">
                      <Label className="text-muted-foreground">External Link *</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          name="url"
                          type="url"
                          placeholder="https://..."
                          required
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl pl-10"
                        />
                              </div>
                          </div>

                    {/* Location (not for resource) */}
                    {selectedType !== 'resource' && (
                      <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Location</span>
                      </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Virtual</span>
                            <Switch checked={isRemote} onCheckedChange={setIsRemote} />
                    </div>
                  </div>

                        {!isRemote && (
                          <div className="grid grid-cols-3 gap-3">
                            <Input name="country" placeholder="Country" className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                            <Input name="province" placeholder="State/Province" className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                            <Input name="city" placeholder="City" className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm" />
                        </div>
                      )}
                  </div>
                    )}

                    {/* Financial (for opportunity, job) or Price (for event) */}
                    {(selectedType === 'opportunity' || selectedType === 'job' || selectedType === 'event') && (
                      <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {selectedType === 'event' ? 'Ticket Price' : 'Compensation'}
                            </span>
                </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{selectedType === 'event' ? 'Paid Event' : 'Paid'}</span>
                            <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                    </div>
                  </div>

                        {isPaid && (
                          <div className="flex gap-3">
                      <Input
                              name={selectedType === 'event' ? 'price' : selectedType === 'job' ? 'salary' : 'amount'}
                              placeholder="Amount"
                              className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm flex-1"
                            />
                            {selectedType === 'job' && (
                              <Select name="period">
                                <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg w-32">
                                  <SelectValue placeholder="Period" />
                        </SelectTrigger>
                                <SelectContent className="bg-surface border-border">
                                  <SelectItem value="hourly" className="text-foreground">Hourly</SelectItem>
                                  <SelectItem value="monthly" className="text-foreground">Monthly</SelectItem>
                                  <SelectItem value="yearly" className="text-foreground">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                            )}
                        </div>
                      )}
                    </div>
                    )}

                    {/* Dates */}
                    {selectedType !== 'resource' && (
                      <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Dates</span>
                    </div>
                    
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedType === 'event' ? (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Start Date *</Label>
                                <Input name="startDate" type="date" required className="bg-muted border-border text-foreground h-10 rounded-lg text-sm" />
                            </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">End Date</Label>
                                <Input name="endDate" type="date" className="bg-muted border-border text-foreground h-10 rounded-lg text-sm" />
                          </div>
                            </>
                          ) : (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Application Deadline</Label>
                              <Input name="deadline" type="date" className="bg-muted border-border text-foreground h-10 rounded-lg text-sm" />
                          </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    <div ref={tagInputContainerRef}>
                      <TagInputWithSuggestions
                        tags={tags}
                        onTagsChange={setTags}
                        label="Tags"
                        helperText="Add up to 10 tags for better discovery"
                      />
                    </div>

                    {/* Requirements (for opportunity) */}
                    {selectedType === 'opportunity' && (
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Requirements</Label>
                    <Textarea
                          name="requirements"
                          placeholder="List the requirements..."
                          rows={3}
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-none"
                        />
                      </div>
                    )}

                    {/* Capacity (for event) */}
                    {selectedType === 'event' && (
                  <div className="space-y-2">
                        <Label className="text-muted-foreground">Capacity</Label>
                         <Input
                          name="capacity"
                          type="number"
                          placeholder="Maximum attendees (optional)"
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl"
                        />
                           </div>
                         )}

                    {/* Submit Button */}
                    <div className="pt-4 pb-8">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-foreground font-semibold rounded-xl"
                      >
                      {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Submit {getTypeConfig(selectedType).title}
                          </>
                      )}
                    </Button>
                  </div>
                </form>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
          </div>
        </main>

        <ProviderDashboardBottomNav
          navItems={providerNavItems}
          activeTab={activeProviderTab}
          onTabChange={(tab) => router.push(providerNavRouteMap[tab])}
        />
      </div>
    </div>
  )
} 

export default function PostingDashboard() {
  return (
    <AuthGuard>
      <PostingContent />
    </AuthGuard>
  )
}
