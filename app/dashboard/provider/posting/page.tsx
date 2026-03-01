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

const postTypes = [
  { id: 'opportunity' as PostType, title: 'Opportunity', icon: Target, color: 'orange', desc: 'Internships, scholarships, grants' },
  { id: 'job' as PostType, title: 'Job', icon: Briefcase, color: 'primary', desc: 'Full-time, part-time positions' },
  { id: 'event' as PostType, title: 'Event', icon: Calendar, color: 'emerald', desc: 'Workshops, conferences, meetups' },
  { id: 'resource' as PostType, title: 'Resource', icon: BookOpen, color: 'violet', desc: 'Courses, guides, tools' },
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [isTagLoading, setIsTagLoading] = useState(false)
  const [tagSelectedIndex, setTagSelectedIndex] = useState(0)
  const tagDebounceRef = useRef<NodeJS.Timeout | null>(null)
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
    if (postingCount !== null && postingCount >= limit) {
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
  const handleSelectTagSuggestion = (tag: string) => {
    const cleanTag = tag.trim()
    if (!cleanTag) return
    if (tags.includes(cleanTag) || tags.length >= 10) {
      setShowTagSuggestions(false)
      return
    }
    setTags([...tags, cleanTag])
    setTagInput('')
    setShowTagSuggestions(false)
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // When suggestions are visible, use keyboard to navigate/select them
    if (showTagSuggestions && tagSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setTagSelectedIndex((prev) => (prev + 1) % tagSuggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setTagSelectedIndex((prev) => (prev - 1 + tagSuggestions.length) % tagSuggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = tagSuggestions[tagSelectedIndex] || tagSuggestions[0]
        if (selected) {
          handleSelectTagSuggestion(selected)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowTagSuggestions(false)
        return
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const cleanTag = tagInput.trim()
      if (cleanTag && !tags.includes(cleanTag) && tags.length < 10) {
        setTags([...tags, cleanTag])
        setTagInput('')
        setShowTagSuggestions(false)
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  // Fetch tag suggestions from the backend based on current input
  useEffect(() => {
    const query = tagInput.trim()

    if (!query) {
      setTagSuggestions([])
      setShowTagSuggestions(false)
      setIsTagLoading(false)
      if (tagDebounceRef.current) {
        clearTimeout(tagDebounceRef.current)
      }
      return
    }

    if (tagDebounceRef.current) {
      clearTimeout(tagDebounceRef.current)
    }

    tagDebounceRef.current = setTimeout(async () => {
      try {
        setIsTagLoading(true)

        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        // Use existing hashtag + skills suggestion endpoints as tag source
        const [hashtagResponse, skillsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/hashtags/suggestions?q=${encodeURIComponent(query)}`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/skills/suggestions?q=${encodeURIComponent(query)}`, { headers }).catch(() => null),
        ])

        let hashtagSuggestions: string[] = []
        if (hashtagResponse && hashtagResponse.ok) {
          const hashtagData = await hashtagResponse.json()
          if (hashtagData?.success && Array.isArray(hashtagData.suggestions)) {
            hashtagSuggestions = hashtagData.suggestions
          }
        }

        let skillSuggestions: string[] = []
        if (skillsResponse && skillsResponse.ok) {
          const skillsData = await skillsResponse.json()
          if (skillsData?.success && Array.isArray(skillsData.suggestions)) {
            skillSuggestions = skillsData.suggestions
          }
        }

        const allSuggestions = new Set<string>([
          ...hashtagSuggestions,
          ...skillSuggestions,
        ])

        const combined = Array.from(allSuggestions)
          .map((s) => s.trim())
          .filter((s) => {
            if (!s) return false
            const normalized = s.toLowerCase()
            return normalized.includes(query.toLowerCase()) && !tags.includes(s)
          })
          .slice(0, 8)

        setTagSuggestions(combined)
        setShowTagSuggestions(combined.length > 0)
        setTagSelectedIndex(0)
      } catch (err) {
        console.error('Failed to fetch tag suggestions', err)
        setTagSuggestions([])
        setShowTagSuggestions(false)
      } finally {
        setIsTagLoading(false)
      }
    }, 300)

    return () => {
      if (tagDebounceRef.current) {
        clearTimeout(tagDebounceRef.current)
      }
    }
  }, [tagInput, API_BASE_URL, tags])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType || !canPost) return

    const limit = getPostingLimit(user?.isPremium, user?.role)
    let currentTotal = postingCount ?? 0
    if (currentTotal >= limit) {
      try {
        const count = await ApiClient.getMyPostingCount()
        currentTotal = count.total
        setPostingCount(currentTotal)
      } catch (_) {}
      if (currentTotal >= limit) {
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
    <div className="min-h-screen bg-page flex">
      {/* Desktop Sidebar - Provider Hub (same as provider dashboard) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-page sticky top-0 h-screen">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="relative w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden">
              <Image
                src="/images/Yellow and Black Modern Media Company Logo (14).png"
                alt="GlowUp"
                fill
                className="object-contain"
              />
            </Link>
            <div>
              <h1 className="text-base font-bold text-foreground">Provider Hub</h1>
              <p className="text-xs text-muted-foreground">Post Content</p>
            </div>
          </div>
          
          {/* User Info */}
          <div className="p-3 rounded-xl bg-muted border border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={user?.firstName || user?.email || 'Provider'} width={36} height={36} className="w-full h-full object-cover" />
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

        {/* Navigation - same as provider dashboard */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive ? "bg-primary/10 text-orange-400 border border-orange-500/20" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-orange-400")} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-border space-y-2">
          {quickLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Button
                key={link.label}
                asChild
                variant={link.variant}
                className={cn(
                  "w-full justify-start rounded-xl",
                  link.variant === 'default' 
                    ? "bg-primary hover:bg-primary/90" 
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                  isActive && "ring-2 ring-primary/30"
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

        {/* Posts count - always show when we have a value (matches dashboard) */}
        <div className="p-4 border-t border-border">
          <div className="p-3 rounded-xl bg-muted border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Your posts</span>
              <span className="text-lg font-bold text-orange-400">
                {postingCount !== null ? postingCount : '—'} of {getPostingLimit(user?.isPremium, user?.role)} max
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              {hasPremiumAccess({ isPremium: user?.isPremium, role: user?.role }) ? 'Premium: 20 posts max' : 'Free: 5 posts max (all statuses count)'}
            </p>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              {(() => {
                const total = postingCount ?? 0
                const limit = getPostingLimit(user?.isPremium, user?.role)
                const pct = limit > 0 ? Math.min((total / limit) * 100, 100) : 0
                return <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              })()}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header - Only visible on mobile (Provider Hub) */}
        <header className="lg:hidden sticky top-0 z-20 bg-page/95 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                <Crown className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">Provider Hub · Post</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRefresh} 
                variant="ghost" 
                size="sm"
                disabled={loading}
                className="h-9 w-9 p-0 text-muted-foreground"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
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
                    <Link href="/dashboard/provider" className="flex items-center gap-3 w-full">
                      <LayoutDashboard className="h-4 w-4 text-orange-400" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem asChild className="text-foreground hover:bg-muted rounded-lg cursor-pointer focus:bg-muted focus:text-foreground">
                    <Link href="/dashboard/provider/promotions" className="flex items-center gap-3 w-full">
                      <Zap className="h-4 w-4 text-orange-400" />
                      <span>Promotions</span>
                    </Link>
                  </DropdownMenuItem> */}
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
                    const isActive = pathname === item.href
                    
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          isActive 
                            ? "bg-primary/10 text-orange-400 border border-orange-500/20" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", isActive && "text-orange-400")} />
                        <span>{item.label}</span>
                      </Link>
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
            You have <span className="font-semibold text-foreground">{postingCount} of {getPostingLimit(user?.isPremium, user?.role)}</span> posts (max for {hasPremiumAccess({ isPremium: user?.isPremium, role: user?.role }) ? 'Premium' : 'free'}).
          </p>
        )}
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">What would you like to post?</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {postTypes.map((type) => {
            const Icon = type.icon
              return (
                <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                disabled={!canPost}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all duration-200 group",
                  "bg-card border-border",
                  "hover:bg-muted hover:border-border",
                  !canPost && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center mb-3",
                  type.color === 'orange' && "bg-primary/10",
                  type.color === 'primary' && "bg-primary/10",
                  type.color === 'emerald' && "bg-emerald-500/10",
                  type.color === 'violet' && "bg-violet-500/10"
                )}>
                  <Icon className={cn(
                    "w-5 h-5",
                    type.color === 'orange' && "text-orange-500",
                    type.color === 'primary' && "text-primary",
                    type.color === 'emerald' && "text-emerald-500",
                    type.color === 'violet' && "text-violet-500"
                  )} />
                    </div>
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-orange-400 transition-colors">
                  {type.title}
                    </h3>
                <p className="text-xs text-muted-foreground">{type.desc}</p>
                </button>
              )
            })}
          </div>
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
                    <div className="space-y-3">
                      <Label className="text-muted-foreground">Tags</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-sm">
                              {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-foreground">
                              <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      <div ref={tagInputContainerRef} className="relative">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          placeholder="Type to search tags (press Enter to add)"
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-xl"
                        />
                        {showTagSuggestions && (isTagLoading || tagSuggestions.length > 0) && (
                          <div
                            className="absolute z-50 top-full left-0 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-border bg-card/90 backdrop-blur-sm shadow-md shadow-black/20"
                          >
                            {isTagLoading && tagSuggestions.length === 0 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                Searching tags...
                              </div>
                            )}
                            {tagSuggestions.map((suggestion, index) => (
                              <button
                                key={`${suggestion}-${index}`}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  handleSelectTagSuggestion(suggestion)
                                }}
                                className={cn(
                                  "w-full px-3 py-2 text-left text-sm text-foreground hover:bg-white/10 focus:bg-white/10 focus:outline-none rounded-lg",
                                  index === tagSelectedIndex && "bg-white/10"
                                )}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Add up to 10 tags for better discovery</p>
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

        {/* Mobile Bottom Navigation - Only visible on mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-page/95 backdrop-blur-xl border-t border-border safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 px-2 transition-all",
                    isActive 
                      ? "text-orange-400" 
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-orange-400")} />
                  <span className={cn(
                    "text-[10px] font-medium truncate w-full text-center",
                    isActive && "text-orange-400"
                  )}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
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
