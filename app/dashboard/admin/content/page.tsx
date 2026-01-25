"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  FileText, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  DollarSign,
  CreditCard,
  Upload,
  Shield,
  User,
  MapPin,
  Calendar,
  RefreshCw,
  Settings,
  Home,
  LayoutDashboard,
  BarChart3,
  Users,
  MoreVertical,
  Target,
  Briefcase,
  BookOpen,
  Sparkles,
  Zap,
  Ban,
  CheckCircle2,
  X,
  ExternalLink,
  Edit,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface ContentItem {
  _id: string
  title: string
  description: string
  type: 'opportunity' | 'event' | 'job' | 'resource'
  status: 'active' | 'inactive' | 'draft'
  isApproved: boolean
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
  paymentStatus?: 'not_required' | 'pending' | 'awaiting_payment' | 'payment_uploaded' | 'verified' | 'failed'
  paymentAmount?: number
  providerId?: string
  organizerId?: string
  provider?: string
  organizer?: string
  location?: {
    country?: string
    city?: string
    isRemote?: boolean
  }
  poster?: {
    name?: string
    email?: string
  }
  [key: string]: any
}

type StatusFilter = 'all' | 'live' | 'pending' | 'true_draft' | 'hidden' | 'inactive_not_approved' | 'inactive_approved'
type TypeFilter = 'all' | 'opportunity' | 'event' | 'job' | 'resource'
type PaymentFilter = 'all' | 'not_required' | 'awaiting_payment' | 'payment_uploaded' | 'verified'

export default function AdminContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const router = useRouter()
  const pathname = usePathname()
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Dialogs
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [rejectionReason, setRejectionReason] = useState('')
  const [bypassPayment, setBypassPayment] = useState(false)
  const [paymentAmountInput, setPaymentAmountInput] = useState(5000)
  const [paymentVerification, setPaymentVerification] = useState<'verify' | 'reject'>('verify')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Hide navbar and footer when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  const fetchContent = useCallback(async () => {
    if (!isAuthenticated || !user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const result = await ApiClient.getContentForModeration(currentPage, itemsPerPage, {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        payment: paymentFilter !== 'all' ? paymentFilter : undefined,
        search: searchQuery || undefined
      })

      // Fetch poster information for each content item
      const contentWithPosters = await Promise.all(
        result.content.map(async (item: any) => {
          try {
            const posterInfo = await ApiClient.getPosterInfo(item.providerId || item.organizerId)
            return {
              ...item,
              poster: posterInfo
            }
          } catch (error) {
            console.error(`Failed to fetch poster info for ${item._id}:`, error)
            return {
              ...item,
              poster: { name: 'Unknown', email: 'N/A' }
            }
          }
        })
      )

      setContent(contentWithPosters)
      setTotalCount(result.pagination.totalCount)
      setTotalPages(result.pagination.totalPages)
      
    } catch (error: any) {
      console.error('Error fetching content:', error)
      setError(error.message || 'Failed to load content')
      toast.error('Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, typeFilter, statusFilter, paymentFilter, searchQuery, isAuthenticated, user])

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        setError('Access denied. Admin privileges required.')
        setLoading(false)
        return
      }
      fetchContent()
    }
  }, [authLoading, isAuthenticated, user, fetchContent])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter, statusFilter, paymentFilter, searchQuery])

  const handleReview = async () => {
    if (!selectedContent) return

    try {
      setActionLoading(selectedContent._id)
      
      if (reviewAction === 'approve') {
        await ApiClient.approveContent(selectedContent._id, selectedContent.type, {
          bypassPayment: bypassPayment
        })
        
        if (bypassPayment) {
          toast.success('Content approved and published without requiring payment.')
        } else {
          toast.success('Content approved. You can now request payment from the "Approved" tab.')
        }
      } else if (reviewAction === 'reject') {
        if (!rejectionReason.trim()) {
          toast.error('Please provide a rejection reason')
          return
        }
        await ApiClient.rejectContent(selectedContent._id, selectedContent.type, rejectionReason)
        toast.success('Content rejected successfully')
      }
      
      setShowReviewDialog(false)
      setRejectionReason("")
      setBypassPayment(false)
      setSelectedContent(null)
      fetchContent()
    } catch (error: any) {
      console.error('Error reviewing content:', error)
      toast.error(error.message || 'Failed to review content')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRequestPayment = async (content: ContentItem) => {
    setSelectedContent(content)
    setPaymentAmountInput(content.paymentAmount || 5000)
    setShowPaymentDialog(true)
  }

  const handleConfirmPaymentRequest = async () => {
    if (!selectedContent) return

    try {
      setActionLoading(selectedContent._id)
      
      await ApiClient.requestPayment(
        selectedContent._id, 
        selectedContent.type, 
        paymentAmountInput, 
        'Payment requested by admin for content approval'
      )
      toast.success(`Payment request sent for ₦${paymentAmountInput.toLocaleString()}`)
      setShowPaymentDialog(false)
      setSelectedContent(null)
      fetchContent()
    } catch (error: any) {
      console.error('Error requesting payment:', error)
      toast.error(error.message || 'Failed to request payment')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePaymentVerification = async () => {
    if (!selectedContent) return

    try {
      setActionLoading(selectedContent._id)
      
      const verified = paymentVerification === 'verify'
      await ApiClient.verifyPayment(
        selectedContent._id, 
        selectedContent.type, 
        verified, 
        paymentNotes
      )
      
      toast.success(verified ? 'Payment verified and content approved' : 'Payment rejected')
      setShowPaymentDialog(false)
      setPaymentNotes("")
      setSelectedContent(null)
      fetchContent()
    } catch (error: any) {
      console.error('Error verifying payment:', error)
      toast.error(error.message || 'Failed to verify payment')
    } finally {
      setActionLoading(null)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return Target
      case 'event': return Calendar
      case 'job': return Briefcase
      case 'resource': return BookOpen
      default: return FileText
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'event': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'job': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'resource': return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
      default: return 'text-white/60 bg-white/5 border-white/10'
    }
  }

  const getStatusBadge = (item: ContentItem) => {
    const isLive = item.status === 'active' && item.isApproved
    const isPending = item.status === 'active' && !item.isApproved
    const isDraft = item.status === 'draft'
    const isInactive = item.status === 'inactive'

    if (isLive) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Live</Badge>
    } else if (isPending) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>
    } else if (isDraft) {
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Draft</Badge>
    } else if (isInactive) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Inactive</Badge>
    }
    return null
  }

  const getPaymentBadge = (item: ContentItem) => {
    if (!item.paymentStatus || item.paymentStatus === 'not_required') {
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">No Payment</Badge>
    } else if (item.paymentStatus === 'awaiting_payment') {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Awaiting Payment</Badge>
    } else if (item.paymentStatus === 'payment_uploaded') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Receipt Uploaded</Badge>
    } else if (item.paymentStatus === 'verified') {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Verified</Badge>
    } else if (item.paymentStatus === 'failed') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>
    }
    return null
  }

  // Calculate stats
  const stats = useMemo(() => {
    const live = content.filter(item => item.status === 'active' && item.isApproved).length
    const pending = content.filter(item => item.status === 'active' && !item.isApproved).length
    const drafts = content.filter(item => item.status === 'draft').length
    const inactive = content.filter(item => item.status === 'inactive').length
    
    return { live, pending, drafts, inactive, total: content.length }
  }, [content])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading content...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/60 mb-6">
            You need admin or super admin privileges to access this page.
          </p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 rounded-xl">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'super_admin'

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard/admin' },
    { id: 'users', label: 'Users', icon: Users, href: '/dashboard/admin/users' },
    { id: 'content', label: 'Content', icon: FileText, href: '/dashboard/admin/content' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard/admin/analytics' },
  ]

  const quickLinks = [
    { label: 'User Management', icon: Users, href: '/dashboard/admin/users', variant: 'default' as const },
    { label: 'Settings', icon: Settings, href: '/dashboard/admin/settings', variant: 'outline' as const },
    { label: 'Home', icon: Home, href: '/', variant: 'outline' as const },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/[0.06] bg-[#0a0a0a] fixed left-0 top-0 bottom-0 h-screen overflow-y-auto">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Admin Hub</h1>
              <p className="text-xs text-white/50">Platform Management</p>
            </div>
          </div>
          
          {/* User Info */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-white truncate flex-1 min-w-0">
                {user?.firstName || user?.email?.split('@')[0]}
              </p>
              <Badge 
                variant={isSuperAdmin ? "destructive" : "secondary"} 
                className="text-xs ml-2 flex-shrink-0"
              >
                {isSuperAdmin ? "Super" : "Admin"}
              </Badge>
            </div>
            <p className="text-xs text-white/50 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.id === 'content' && pathname?.includes('/dashboard/admin/content'))
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive 
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" 
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-orange-400")} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-white/[0.06] space-y-2 flex-shrink-0">
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
                    ? "bg-orange-500 hover:bg-orange-600" 
                    : "border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
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
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/dashboard/admin')}
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-white/60"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Content</h1>
                <p className="text-xs text-white/50">Manage content</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => fetchContent()} 
                variant="ghost" 
                size="sm"
                disabled={loading}
                className="h-9 w-9 p-0 text-white/60"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 w-9 p-0 text-white/60"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 bg-[#141414] border-white/[0.08] rounded-xl p-2 shadow-xl"
                >
                  <DropdownMenuItem asChild className="text-white hover:bg-white/[0.08] rounded-lg cursor-pointer focus:bg-white/[0.08] focus:text-white">
                    <Link href="/dashboard/admin" className="flex items-center gap-3 w-full">
                      <Home className="h-4 w-4 text-orange-400" />
                      <span>Back to Admin</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/[0.05]"
                >
                  <Link href="/dashboard/admin">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to Admin
                  </Link>
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Content Management</h1>
                    <p className="text-sm text-white/50">Moderate and manage all platform content</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => fetchContent()}
                disabled={loading}
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-400 break-words">{error}</p>
                </div>
              </div>
            )}

            {/* Stats - Bento Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-white/70">Live Content</p>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400/50" />
                </div>
                <p className="text-2xl font-bold text-emerald-400">{stats.live}</p>
                <p className="text-xs text-white/50 mt-1">Active & approved</p>
              </div>

              <div className="rounded-xl border p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-white/70">Pending</p>
                  <Clock className="w-5 h-5 text-yellow-400/50" />
                </div>
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                <p className="text-xs text-white/50 mt-1">Awaiting review</p>
              </div>

              <div className="rounded-xl border p-4 bg-gradient-to-br from-gray-500/20 to-gray-600/10 border-gray-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-white/70">Drafts</p>
                  <FileText className="w-5 h-5 text-gray-400/50" />
                </div>
                <p className="text-2xl font-bold text-gray-400">{stats.drafts}</p>
                <p className="text-xs text-white/50 mt-1">Unpublished</p>
              </div>

              <div className="rounded-xl border p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-white/70">Total</p>
                  <BarChart3 className="w-5 h-5 text-blue-400/50" />
                </div>
                <p className="text-2xl font-bold text-blue-400">{totalCount.toLocaleString()}</p>
                <p className="text-xs text-white/50 mt-1">All content</p>
              </div>
            </div>

            {/* Filters */}
            <Card className="bg-white/[0.02] border-white/[0.06] mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        placeholder="Search content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white/[0.03] border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  {/* Type Filter */}
                  <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
                    <SelectTrigger className="w-full lg:w-40 bg-white/[0.03] border-white/10 text-white">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-white/10">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="opportunity">Opportunities</SelectItem>
                      <SelectItem value="event">Events</SelectItem>
                      <SelectItem value="job">Jobs</SelectItem>
                      <SelectItem value="resource">Resources</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <SelectTrigger className="w-full lg:w-40 bg-white/[0.03] border-white/10 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-white/10">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="true_draft">Draft</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                      <SelectItem value="inactive_not_approved">Inactive (Not Approved)</SelectItem>
                      <SelectItem value="inactive_approved">Inactive (Approved)</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Payment Filter */}
                  <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentFilter)}>
                    <SelectTrigger className="w-full lg:w-40 bg-white/[0.03] border-white/10 text-white">
                      <SelectValue placeholder="Payment" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-white/10">
                      <SelectItem value="all">All Payment</SelectItem>
                      <SelectItem value="not_required">Not Required</SelectItem>
                      <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                      <SelectItem value="payment_uploaded">Receipt Uploaded</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {loading && content.length === 0 && (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-white/60">Loading content...</p>
              </div>
            )}

            {/* Content List */}
            {!loading && content.length === 0 && (
              <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No content found</h3>
                  <p className="text-sm text-white/60">Try adjusting your filters or search query.</p>
                </CardContent>
              </Card>
            )}

            {/* Content Cards */}
            {content.length > 0 && (
              <div className="space-y-4 mb-6">
                {content.map((item) => {
                  const TypeIcon = getTypeIcon(item.type)
                  
                  return (
                    <Card key={item._id} className="bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row gap-4">
                          {/* Left: Content Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-3">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", getTypeColor(item.type))}>
                                <TypeIcon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h3 className="text-base font-semibold text-white line-clamp-2">{item.title}</h3>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {getStatusBadge(item)}
                                    {getPaymentBadge(item)}
                                  </div>
                                </div>
                                <p className="text-sm text-white/60 line-clamp-2 mb-3">{item.description}</p>
                                
                                {/* Meta Info */}
                                <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
                                  {item.poster && (
                                    <div className="flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5" />
                                      <span>{item.poster.name || 'Unknown'}</span>
                                    </div>
                                  )}
                                  {item.location?.city && (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      <span>{item.location.city}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-col gap-2 lg:w-48">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedContent(item)
                                  setShowDetailsDialog(true)
                                }}
                                className="flex-1 border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                              {!item.isApproved && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedContent(item)
                                    setReviewAction('approve')
                                    setShowReviewDialog(true)
                                  }}
                                  disabled={actionLoading === item._id}
                                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                              )}
                              {item.isApproved && item.paymentStatus === 'awaiting_payment' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRequestPayment(item)}
                                  disabled={actionLoading === item._id}
                                  className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                                >
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  Request Payment
                                </Button>
                              )}
                              {item.paymentStatus === 'payment_uploaded' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedContent(item)
                                    setShowPaymentDialog(true)
                                  }}
                                  disabled={actionLoading === item._id}
                                  className="flex-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                                >
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Verify Payment
                                </Button>
                              )}
                            </div>
                            {!item.isApproved && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedContent(item)
                                  setReviewAction('reject')
                                  setShowReviewDialog(true)
                                }}
                                disabled={actionLoading === item._id}
                                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={loading}
                          className={cn(
                            currentPage === pageNum
                              ? "bg-orange-500 hover:bg-orange-600"
                              : "border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                          )}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/[0.06] z-30">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.id === 'content' && pathname?.includes('/dashboard/admin/content'))
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-0 flex-1",
                    isActive 
                      ? "text-orange-400" 
                      : "text-white/50"
                  )}
                >
                  <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-orange-400")} />
                  <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="bg-[#141414] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {reviewAction === 'approve' ? 'Approve Content' : 'Reject Content'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {reviewAction === 'approve' 
                ? 'This content will be approved and made available on the platform.'
                : 'Please provide a reason for rejecting this content.'}
            </DialogDescription>
          </DialogHeader>
          
          {reviewAction === 'approve' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bypassPayment"
                  checked={bypassPayment}
                  onChange={(e) => setBypassPayment(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/[0.03] text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="bypassPayment" className="text-sm text-white/70">
                  Approve without requiring payment
                </label>
              </div>
            </div>
          )}
          
          {reviewAction === 'reject' && (
            <div className="space-y-4">
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/40 min-h-[100px]"
              />
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewDialog(false)
                setRejectionReason("")
                setBypassPayment(false)
                setSelectedContent(null)
              }}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={actionLoading === selectedContent?._id || (reviewAction === 'reject' && !rejectionReason.trim())}
              className={cn(
                reviewAction === 'approve'
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-red-500 hover:bg-red-600"
              )}
            >
              {reviewAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-[#141414] border-white/[0.08] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedContent?.paymentStatus === 'payment_uploaded' 
                ? 'Verify Payment' 
                : 'Request Payment'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedContent?.paymentStatus === 'payment_uploaded'
                ? 'Review the payment receipt and verify or reject the payment.'
                : 'Set the payment amount for this content.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedContent?.paymentStatus === 'payment_uploaded' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">Verification</label>
                <Select value={paymentVerification} onValueChange={(value: any) => setPaymentVerification(value)}>
                  <SelectTrigger className="bg-white/[0.03] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-white/10">
                    <SelectItem value="verify">Verify Payment</SelectItem>
                    <SelectItem value="reject">Reject Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">Notes</label>
                <Textarea
                  placeholder="Add verification notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/40 min-h-[100px]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">Payment Amount (₦)</label>
                <Input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                  className="bg-white/[0.03] border-white/10 text-white"
                  placeholder="5000"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false)
                setPaymentNotes("")
                setSelectedContent(null)
              }}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
            >
              Cancel
            </Button>
            <Button
              onClick={selectedContent?.paymentStatus === 'payment_uploaded' ? handlePaymentVerification : handleConfirmPaymentRequest}
              disabled={actionLoading === selectedContent?._id}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {selectedContent?.paymentStatus === 'payment_uploaded' ? 'Verify' : 'Request Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="bg-[#141414] border-white/[0.08] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedContent?.title}</DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedContent?.type} • {formatDistanceToNow(new Date(selectedContent?.createdAt || new Date()), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedContent && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-2">Description</h4>
                <p className="text-sm text-white/90">{selectedContent.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-2">Status</h4>
                  {getStatusBadge(selectedContent)}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white/70 mb-2">Payment Status</h4>
                  {getPaymentBadge(selectedContent)}
                </div>
                {selectedContent.poster && (
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-2">Poster</h4>
                    <p className="text-sm text-white/90">{selectedContent.poster.name}</p>
                    <p className="text-xs text-white/60">{selectedContent.poster.email}</p>
                  </div>
                )}
                {selectedContent.location && (
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-2">Location</h4>
                    <p className="text-sm text-white/90">
                      {selectedContent.location.city || 'N/A'}
                      {selectedContent.location.isRemote && ' (Remote)'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDetailsDialog(false)
                setSelectedContent(null)
              }}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
