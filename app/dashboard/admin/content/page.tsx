"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Settings
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

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
  
  // Payment information
  paymentStatus?: 'not_required' | 'pending' | 'awaiting_payment' | 'payment_uploaded' | 'verified' | 'failed'
  paymentAmount?: number
  paymentReference?: string
  paymentReceipt?: string
  paymentCode?: string
  paymentRequestedBy?: string
  paymentRequestedAt?: string
  paymentUploadedAt?: string
  paymentVerifiedAt?: string
  paymentVerifiedBy?: string
  paymentNotes?: string
  paymentVerificationNotes?: string
  
  // Financial information
  isPaid?: boolean
  price?: number
  currency?: string
  financial?: {
    amount?: number
    currency?: string
    isPaid?: boolean
  }
  
  // Provider information
  providerId?: string
  provider?: string
  organizer?: string
  organizerId?: string
  
  // Location information
  location?: {
    country?: string
    province?: string
    city?: string
    address?: string
    isRemote?: boolean
    isHybrid?: boolean
    isVirtual?: boolean
  }
  
  // Date information
  dates?: {
    startDate?: string
    endDate?: string
    applicationDeadline?: string
    registrationDeadline?: string
  }
  
  // Content metadata
  tags?: string[]
  industrySectors?: string[]
  targetAudience?: string[]
  
  // Metrics
  metrics?: {
    viewCount?: number
    likeCount?: number
    saveCount?: number
    applicationCount?: number
    registrationCount?: number
  }
  
  // Poster details
  poster?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    company?: string
    role: string
    createdAt: string
  }
}

export default function ContentModeration() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage] = useState(10)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  
  // Actions
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [rejectionReason, setRejectionReason] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(5000)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentVerification, setPaymentVerification] = useState<'verify' | 'reject'>('verify')
  const [paymentNotes, setPaymentNotes] = useState("")
  const [activeTab, setActiveTab] = useState('all')
  
  // Admin controls
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showStateDialog, setShowStateDialog] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [newState, setNewState] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [disableReason, setDisableReason] = useState('')
  const [paymentAmountInput, setPaymentAmountInput] = useState(5000)

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
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching content for moderation...')
      
      const result = await ApiClient.getContentForModeration(currentPage, itemsPerPage, {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        payment: paymentFilter !== 'all' ? paymentFilter : undefined,
        search: searchQuery || undefined
      })

      console.log('Content API response:', result)

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
      
      console.log('Content loaded:', contentWithPosters.length)
      
    } catch (error: any) {
      console.error('Error fetching content:', error)
      setError(error.message || 'Failed to load content')
      toast.error('Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, typeFilter, statusFilter, paymentFilter, searchQuery])

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        setError('Access denied. Admin privileges required.')
        setLoading(false)
        return
      }
      fetchContent()
    }
  }, [isLoading, isAuthenticated, user, fetchContent])

  const handleReview = async () => {
    if (!selectedContent) return

    try {
      setActionLoading(selectedContent._id)
      
      if (reviewAction === 'approve') {
        // Validate payment amount for paid content
        if (hasPaidSection(selectedContent)) {
          if (!paymentAmount || paymentAmount <= 0) {
            toast.error('Please enter a valid payment amount for paid content')
            return
          }
        }
        
        await ApiClient.approveContent(selectedContent._id, selectedContent.type)
        
        toast.success('Content approved. You can now request payment from the "Approved" tab.')
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
      
      console.log('Requesting payment:', {
        contentId: selectedContent._id,
        contentType: selectedContent.type,
        amount: paymentAmountInput
      })
      
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

  // Admin control functions
  const handleEditContent = async () => {
    if (!selectedContent) return

    try {
      setActionLoading(selectedContent._id)
      
      // Update content based on type
      const updateMethod = `update${selectedContent.type.charAt(0).toUpperCase() + selectedContent.type.slice(1)}` as keyof typeof ApiClient
      await (ApiClient[updateMethod] as any)(selectedContent._id, editData)
      
      toast.success('Content updated successfully')
      setShowEditDialog(false)
      setEditData({})
      setSelectedContent(null)
      fetchContent()
    } catch (error: any) {
      console.error('Error updating content:', error)
      toast.error(error.message || 'Failed to update content')
    } finally {
      setActionLoading(null)
    }
  }

  const handleChangeState = async () => {
    if (!selectedContent) return

    try {
      setActionLoading(selectedContent._id)
      
      const updateData: any = { status: newState }
      if (newState === 'inactive') {
        updateData.disableReason = disableReason
      }
      
      const updateMethod = `update${selectedContent.type.charAt(0).toUpperCase() + selectedContent.type.slice(1)}` as keyof typeof ApiClient
      await (ApiClient[updateMethod] as any)(selectedContent._id, updateData)
      
      toast.success(`Content state changed to ${newState}`)
      setShowStateDialog(false)
      setNewState('')
      setDisableReason('')
      setSelectedContent(null)
      fetchContent()
    } catch (error: any) {
      console.error('Error changing content state:', error)
      toast.error(error.message || 'Failed to change content state')
    } finally {
      setActionLoading(null)
    }
  }

  const handleScheduleReview = async () => {
    if (!selectedContent) return

    try {
      setActionLoading(selectedContent._id)
      
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`)
      const updateData = { 
        scheduledReviewAt: scheduledDateTime.toISOString(),
        status: 'draft' // Move to draft until scheduled time
      }
      
      const updateMethod = `update${selectedContent.type.charAt(0).toUpperCase() + selectedContent.type.slice(1)}` as keyof typeof ApiClient
      await (ApiClient[updateMethod] as any)(selectedContent._id, updateData)
      
      toast.success(`Content scheduled for review on ${scheduledDateTime.toLocaleString()}`)
      setShowScheduleDialog(false)
      setScheduleDate('')
      setScheduleTime('')
      setSelectedContent(null)
      fetchContent()
    } catch (error: any) {
      console.error('Error scheduling content review:', error)
      toast.error(error.message || 'Failed to schedule content review')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDisablePost = async (content: ContentItem) => {
    try {
      setActionLoading(content._id)
      
      const updateData = { 
        status: 'inactive',
        disableReason: disableReason || 'Disabled by admin'
      }
      
      const updateMethod = `update${content.type.charAt(0).toUpperCase() + content.type.slice(1)}` as keyof typeof ApiClient
      await (ApiClient[updateMethod] as any)(content._id, updateData)
      
      toast.success('Post disabled successfully')
      setDisableReason('')
      fetchContent()
    } catch (error: any) {
      console.error('Error disabling post:', error)
      toast.error(error.message || 'Failed to disable post')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (item: ContentItem) => {
    // Unified Workflow - All content goes through the same process
    
    // Check payment status first
    if (item.paymentStatus === 'awaiting_payment') {
      return <Badge variant="outline" className="bg-orange-100 text-orange-800"><DollarSign className="h-3 w-3 mr-1" />Awaiting Payment</Badge>
    }
    if (item.paymentStatus === 'payment_uploaded') {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Upload className="h-3 w-3 mr-1" />Payment Uploaded</Badge>
    }
    if (item.paymentStatus === 'verified') {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Live</Badge>
    }
    if (item.paymentStatus === 'failed') {
      return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Payment Failed</Badge>
    }

    // Basic status checks
    if (item.status === 'draft' && !item.isApproved) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Draft</Badge>
    }
    if (item.status === 'draft' && item.isApproved) {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800"><Eye className="h-3 w-3 mr-1" />Hidden</Badge>
    }
    if (item.status === 'inactive' && !item.isApproved) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Inactive (Not Approved)</Badge>
    }
    if (item.status === 'inactive' && item.isApproved) {
      return <Badge variant="destructive" className="bg-gray-100 text-gray-800"><XCircle className="h-3 w-3 mr-1" />Inactive (Approved)</Badge>
    }
    if (item.status === 'active' && !item.isApproved) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
    }
    if (item.status === 'active' && item.isApproved) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Approved (Awaiting Payment)</Badge>
    }
    
    return <Badge variant="outline" className="bg-gray-100 text-gray-800"><Clock className="h-3 w-3 mr-1" />Unknown</Badge>
  }

  const getTypeBadge = (type: string) => {
    const typeColors = {
      'opportunity': 'bg-blue-100 text-blue-800',
      'event': 'bg-green-100 text-green-800',
      'job': 'bg-purple-100 text-purple-800',
      'resource': 'bg-orange-100 text-orange-800'
    }
    
    const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1)
    return (
      <Badge variant="outline" className={typeColors[type as keyof typeof typeColors] || ''}>
        {typeDisplay}
      </Badge>
    )
  }

  const getPaymentInfo = (item: ContentItem) => {
    const isPaid = item.isPaid || item.financial?.isPaid || false
    const price = item.price || item.financial?.amount || item.paymentAmount || 0
    const currency = item.currency || item.financial?.currency || 'NGN'
    
    return { isPaid, price, currency }
  }

  // Helper function to check if content has paid section
  const hasPaidSection = (item: ContentItem) => {
    return item.isPaid || item.financial?.isPaid || item.paymentAmount || item.price || false
  }

  // Categorize content by status - Unified Workflow
  const categorizedContent = {
    all: content, // All content regardless of status
    pending: content.filter(item => item.status === 'active' && !item.isApproved),
    approved: content.filter(item => {
      // Show as approved if approved but still awaiting payment processing
      return item.isApproved && item.paymentStatus === 'awaiting_payment'
    }),
    awaitingPayment: content.filter(item => item.paymentStatus === 'awaiting_payment'),
    paymentUploaded: content.filter(item => item.paymentStatus === 'payment_uploaded'),
    verified: content.filter(item => item.paymentStatus === 'verified'),
    rejected: content.filter(item => item.status === 'inactive' && !item.isApproved)
  }

  // Debug logging
  console.log('Content categorization debug:', {
    totalContent: content.length,
    pending: categorizedContent.pending.length,
    approved: categorizedContent.approved.length,
    awaitingPayment: categorizedContent.awaitingPayment.length,
    paymentUploaded: categorizedContent.paymentUploaded.length,
    verified: categorizedContent.verified.length,
    rejected: categorizedContent.rejected.length,
    sampleContent: content.slice(0, 3).map(item => ({
      id: item._id,
      title: item.title,
      isApproved: item.isApproved,
      status: item.status,
      paymentStatus: item.paymentStatus,
      publishedAt: (item as any).publishedAt,
      hasPaidSection: hasPaidSection(item)
    }))
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
          </div>
          <p className="text-lg text-gray-600">Loading content...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Content</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={fetchContent} className="mr-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/admin">Back to Admin</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need admin or super admin privileges to access this page.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
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
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/admin">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-orange-600" />
                <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={fetchContent} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="resource">Resource</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="live">Live (Active + Approved)</SelectItem>
                    <SelectItem value="pending">Pending (Active + Not Approved)</SelectItem>
                    <SelectItem value="true_draft">True Draft (Draft + Not Approved)</SelectItem>
                    <SelectItem value="hidden">Hidden (Draft + Approved)</SelectItem>
                    <SelectItem value="inactive_not_approved">Inactive (Not Approved)</SelectItem>
                    <SelectItem value="inactive_approved">Inactive (Approved)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Payment</label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All payment types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payment types</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                    <SelectItem value="payment_uploaded">Payment Uploaded</SelectItem>
                    <SelectItem value="verified">Payment Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("")
                    setTypeFilter("all")
                    setStatusFilter("all")
                    setPaymentFilter("all")
                    setCurrentPage(1)
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-gray-200">
              <div className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'all'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Content ({categorizedContent.all.length})
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pending'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pending Review ({categorizedContent.pending.length})
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'approved'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Approved ({categorizedContent.approved.length})
                </button>
                <button
                  onClick={() => setActiveTab('awaitingPayment')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'awaitingPayment'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Awaiting Payment ({categorizedContent.awaitingPayment.length})
                </button>
                <button
                  onClick={() => setActiveTab('paymentUploaded')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'paymentUploaded'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Payment Uploaded ({categorizedContent.paymentUploaded.length})
                </button>
                <button
                  onClick={() => setActiveTab('verified')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'verified'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Verified ({categorizedContent.verified.length})
                </button>
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'rejected'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Rejected ({categorizedContent.rejected.length})
                </button>
          </div>
        </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'all' && (
                <div className="space-y-4">
                  {/* Content Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-900">{categorizedContent.pending.length}</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{categorizedContent.approved.length}</div>
                      <div className="text-sm text-green-600">Approved</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-600">{categorizedContent.awaitingPayment.length}</div>
                      <div className="text-sm text-orange-600">Awaiting Payment</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{categorizedContent.paymentUploaded.length}</div>
                      <div className="text-sm text-blue-600">Payment Uploaded</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{categorizedContent.verified.length}</div>
                      <div className="text-sm text-green-600">Verified</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">{categorizedContent.rejected.length}</div>
                      <div className="text-sm text-red-600">Rejected</div>
                    </div>
                  </div>

                  {categorizedContent.all.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Found</h3>
                      <p className="text-gray-600">No content has been submitted yet</p>
              </div>
            ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {categorizedContent.all.map((item) => (
                        <Card key={item._id} className="border border-gray-200 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                                  {getTypeBadge(item.type)}
                                  {hasPaidSection(item) && (
                                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      Paid
                                    </Badge>
                                  )}
                                  {getStatusBadge(item)}
                              </div>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>Provider: {item.provider || item.organizer || 'Unknown'}</span>
                                  <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                                  {item.paymentAmount && (
                                    <span>Amount: ₦{item.paymentAmount.toLocaleString()}</span>
                                  )}
                            </div>
                            </div>
                              <div className="flex items-center space-x-2">
                                {/* Show appropriate action based on content status */}
                                {item.status === 'active' && !item.isApproved && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedContent(item)
                                      setShowReviewDialog(true)
                                    }}
                                    disabled={actionLoading === item._id}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Review
                                  </Button>
                                )}
                                
                                {item.isApproved && !item.paymentStatus && hasPaidSection(item) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRequestPayment(item)}
                                    disabled={actionLoading === item._id}
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Request Payment
                                  </Button>
                                )}
                                
                                {item.paymentStatus === 'payment_uploaded' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    onClick={() => {
                                      setSelectedContent(item)
                                      setShowPaymentDialog(true)
                                    }}
                                    disabled={actionLoading === item._id}
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Verify Payment
                                  </Button>
                                )}
                                
                                {item.paymentStatus === 'verified' && (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Live
                                  </Badge>
                                )}
                                
                                {item.status === 'inactive' && !item.isApproved && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedContent(item)
                                      setShowReviewDialog(true)
                                    }}
                                    disabled={actionLoading === item._id}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Details
                                  </Button>
                                )}

                                {/* Admin Controls */}
                                <div className="flex items-center space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedContent(item)
                                      setEditData({
                                        title: item.title,
                                        description: item.description,
                                        tags: item.tags || [],
                                        industrySectors: item.industrySectors || [],
                                        targetAudience: item.targetAudience || [],
                                        // Content-specific fields
                                        ...(item.type === 'event' && {
                                          startDate: item.dates?.startDate,
                                          endDate: item.dates?.endDate,
                                          location: item.location,
                                          isRemote: (item as any).isRemote
                                        }),
                                        ...(item.type === 'job' && {
                                          company: (item as any).company,
                                          location: item.location,
                                          salary: (item as any).salary,
                                          employmentType: (item as any).employmentType
                                        }),
                                        // Payment fields
                                        isPaid: item.isPaid,
                                        paymentAmount: item.paymentAmount,
                                        paymentStatus: item.paymentStatus,
                                        paymentReference: item.paymentReference,
                                        // Status fields
                                        status: item.status,
                                        isApproved: item.isApproved
                                      })
                                      setShowEditDialog(true)
                                    }}
                                    disabled={actionLoading === item._id}
                                    title="Edit Content"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedContent(item)
                                      setNewState(item.status)
                                      setShowStateDialog(true)
                                    }}
                                    disabled={actionLoading === item._id}
                                    title="Change State"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedContent(item)
                                      setShowScheduleDialog(true)
                                    }}
                                    disabled={actionLoading === item._id}
                                    title="Schedule Review"
                                  >
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                  
                                  {item.status === 'active' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedContent(item)
                                        setDisableReason('')
                                        if (confirm('Are you sure you want to disable this post?')) {
                                          handleDisablePost(item)
                                        }
                                      }}
                                      disabled={actionLoading === item._id}
                                      title="Disable Post"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="space-y-4">
                  {categorizedContent.pending.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Content</h3>
                      <p className="text-gray-600">All content has been reviewed</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {categorizedContent.pending.map((item) => (
                        <Card key={item._id} className="border border-gray-200 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                                  {getTypeBadge(item.type)}
                            {getStatusBadge(item)}
                                </div>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>Provider: {item.provider || item.organizer || 'Unknown'}</span>
                                  <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedContent(item)
                                    setShowReviewDialog(true)
                                  }}
                                  disabled={actionLoading === item._id}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'approved' && (
                <div className="space-y-4">
                  {categorizedContent.approved.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Approved Content</h3>
                      <p className="text-gray-600">No content has been approved yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {categorizedContent.approved.map((item) => (
                        <Card key={item._id} className="border border-gray-200 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                                  {getTypeBadge(item.type)}
                                  {getStatusBadge(item)}
                                </div>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>Provider: {item.provider || item.organizer || 'Unknown'}</span>
                                  <span>Approved: {item.approvedAt ? new Date(item.approvedAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRequestPayment(item)}
                                  disabled={actionLoading === item._id}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Request Payment
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                              )}
                            </div>
              )}

              {activeTab === 'awaitingPayment' && (
                <div className="space-y-4">
                  {categorizedContent.awaitingPayment.length === 0 ? (
                    <div className="text-center py-12">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Awaiting Payment</h3>
                      <p className="text-gray-600">No payment requests are pending</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {categorizedContent.awaitingPayment.map((item) => (
                        <Card key={item._id} className="border border-orange-200 bg-orange-50 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                                  {getTypeBadge(item.type)}
                                  {getStatusBadge(item)}
                                </div>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>Provider: {item.provider || item.organizer || 'Unknown'}</span>
                                  <span>Amount: ₦{item.paymentAmount?.toLocaleString()}</span>
                                  <span>Ref: {item.paymentReference}</span>
                                </div>
                              </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedContent(item)
                                  setShowReviewDialog(true)
                                }}
                                disabled={actionLoading === item._id}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                  View Details
                              </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'paymentUploaded' && (
                <div className="space-y-4">
                  {categorizedContent.paymentUploaded.length === 0 ? (
                    <div className="text-center py-12">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Receipts Uploaded</h3>
                      <p className="text-gray-600">No payment receipts are waiting for verification</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {categorizedContent.paymentUploaded.map((item) => (
                        <Card key={item._id} className="border border-blue-200 bg-blue-50 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                                  {getTypeBadge(item.type)}
                                  {getStatusBadge(item)}
                                </div>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>Provider: {item.provider || item.organizer || 'Unknown'}</span>
                                  <span>Amount: ₦{item.paymentAmount?.toLocaleString()}</span>
                                  <span>Ref: {item.paymentReference}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  onClick={() => {
                                    setSelectedContent(item)
                                    setShowPaymentDialog(true)
                                  }}
                                  disabled={actionLoading === item._id}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Verify Payment
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                              )}
                            </div>
              )}

              {activeTab === 'verified' && (
                <div className="space-y-4">
                  {categorizedContent.verified.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Verified Payments</h3>
                      <p className="text-gray-600">No payments have been verified yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {categorizedContent.verified.map((item) => (
                        <Card key={item._id} className="border border-green-200 bg-green-50 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                                  {getTypeBadge(item.type)}
                                  {getStatusBadge(item)}
                                </div>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>Provider: {item.provider || item.organizer || 'Unknown'}</span>
                                  <span>Verified: {item.paymentVerifiedAt ? new Date(item.paymentVerifiedAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Live
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
              </div>
            )}
                </div>
              )}

              {activeTab === 'rejected' && (
                <div className="space-y-4">
                  {categorizedContent.rejected.length === 0 ? (
                    <div className="text-center py-12">
                      <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Rejected Content</h3>
                      <p className="text-gray-600">No content has been rejected</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {categorizedContent.rejected.map((item) => (
                        <Card key={item._id} className="border border-red-200 bg-red-50 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                                  {getTypeBadge(item.type)}
                                  {getStatusBadge(item)}
                                </div>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>Provider: {item.provider || item.organizer || 'Unknown'}</span>
                                  <span>Rejected: {new Date(item.updatedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedContent(item)
                                    setShowReviewDialog(true)
                                  }}
                                  disabled={actionLoading === item._id}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={loading}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <span>Content Review & Moderation</span>
            </DialogTitle>
            <DialogDescription>
              Review content details and take moderation action.
            </DialogDescription>
          </DialogHeader>
          
          {selectedContent && (
            <div className="space-y-6">
              {/* Content Overview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedContent.title}</h3>
                <div className="flex items-center space-x-4 mb-3">
                  {getTypeBadge(selectedContent.type)}
                  {getStatusBadge(selectedContent)}
                  {(() => {
                    const { isPaid, price, currency } = getPaymentInfo(selectedContent)
                    return isPaid || selectedContent.paymentAmount ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {selectedContent.paymentAmount || price} {currency}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">Free</Badge>
                    )
                  })()}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedContent.description}</p>
              </div>

              {/* Content-Specific Details */}
              {selectedContent.type === 'event' && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Event Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Start Date</label>
                      <p className="text-sm text-gray-900">{selectedContent.dates?.startDate || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">End Date</label>
                      <p className="text-sm text-gray-900">{selectedContent.dates?.endDate || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Location</label>
                      <p className="text-sm text-gray-900">
                        {selectedContent.location ? 
                          (typeof selectedContent.location === 'string' ? selectedContent.location : 
                           selectedContent.location.isRemote ? 'Remote' : 
                           `${selectedContent.location.city || ''}${selectedContent.location.country ? `, ${selectedContent.location.country}` : ''}`) : 
                          'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Event Type</label>
                      <p className="text-sm text-gray-900 capitalize">{(selectedContent as any).type || (selectedContent as any).eventType || 'Not specified'}</p>
                    </div>
                    {(selectedContent as any).equipment && (selectedContent as any).equipment.length > 0 && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Required Equipment</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {(selectedContent as any).equipment.map((item: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">{item}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedContent.type === 'job' && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Job Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Company</label>
                      <p className="text-sm text-gray-900">{(selectedContent as any).company || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Location</label>
                      <p className="text-sm text-gray-900">
                        {selectedContent.location ? 
                          (typeof selectedContent.location === 'string' ? selectedContent.location : 
                           selectedContent.location.isRemote ? 'Remote' : 
                           `${selectedContent.location.city || ''}${selectedContent.location.country ? `, ${selectedContent.location.country}` : ''}`) : 
                          'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Salary</label>
                      <p className="text-sm text-gray-900">{(selectedContent as any).salary || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Job Type</label>
                      <p className="text-sm text-gray-900 capitalize">{(selectedContent as any).type || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Employment Type</label>
                      <p className="text-sm text-gray-900 capitalize">{(selectedContent as any).employmentType || 'Not specified'}</p>
                    </div>
                    {(selectedContent as any).benefits && (selectedContent as any).benefits.length > 0 && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Benefits</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {(selectedContent as any).benefits.map((benefit: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">{benefit}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedContent.type === 'opportunity' && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Opportunity Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Category</label>
                      <p className="text-sm text-gray-900 capitalize">{(selectedContent as any).category || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type</label>
                      <p className="text-sm text-gray-900 capitalize">{(selectedContent as any).type || (selectedContent as any).opportunityType || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Location</label>
                      <p className="text-sm text-gray-900">
                        {selectedContent.location ? 
                          (typeof selectedContent.location === 'string' ? selectedContent.location : 
                           selectedContent.location.isRemote ? 'Remote' : 
                           `${selectedContent.location.city || ''}${selectedContent.location.country ? `, ${selectedContent.location.country}` : ''}`) : 
                          'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Application Deadline</label>
                      <p className="text-sm text-gray-900">
                        {(selectedContent as any).dates?.applicationDeadline || (selectedContent as any).deadline || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Provider/Contact</label>
                      <p className="text-sm text-gray-900">{(selectedContent as any).provider || 'Not specified'}</p>
                    </div>
                    {(selectedContent as any).requirements && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Requirements</label>
                        <div className="mt-1 space-y-2">
                          {(selectedContent as any).requirements.educationLevel && (
                            <p className="text-sm text-gray-900"><strong>Education:</strong> {(selectedContent as any).requirements.educationLevel}</p>
                          )}
                          {(selectedContent as any).requirements.careerStage && (
                            <p className="text-sm text-gray-900"><strong>Career Stage:</strong> {(selectedContent as any).requirements.careerStage}</p>
                          )}
                          {(selectedContent as any).requirements.skills && (selectedContent as any).requirements.skills.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">Required Skills:</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {(selectedContent as any).requirements.skills.map((skill: any, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedContent.type === 'resource' && (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-indigo-900 mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Resource Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Resource Type</label>
                      <p className="text-sm text-gray-900 capitalize">{(selectedContent as any).type || (selectedContent as any).resourceType || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">File URL</label>
                      <p className="text-sm text-gray-900 break-all">
                        {(selectedContent as any).fileUrl ? (
                          <a href={(selectedContent as any).fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {(selectedContent as any).fileUrl}
                          </a>
                        ) : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Price</label>
                      <p className="text-sm text-gray-900">
                        {(selectedContent as any).price ? `₦${(selectedContent as any).price.toLocaleString()}` : 'Free'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Is Premium</label>
                      <p className="text-sm text-gray-900">
                        {(selectedContent as any).isPremium ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags and Categories */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Tags & Categories
                </h4>
                <div className="space-y-4">
                  {selectedContent.tags && selectedContent.tags.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedContent.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedContent.industrySectors && selectedContent.industrySectors.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Industry Sectors</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedContent.industrySectors.map((sector, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-blue-100">{sector}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedContent.targetAudience && selectedContent.targetAudience.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Target Audience</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedContent.targetAudience.map((audience, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-green-100">{audience}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Metadata */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Content Metadata
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created At</label>
                    <p className="text-sm text-gray-900">{new Date(selectedContent.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Updated At</label>
                    <p className="text-sm text-gray-900">{new Date(selectedContent.updatedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedContent.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Is Approved</label>
                    <p className="text-sm text-gray-900">{selectedContent.isApproved ? 'Yes' : 'No'}</p>
                  </div>
                  {selectedContent.publishedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Published At</label>
                      <p className="text-sm text-gray-900">{new Date(selectedContent.publishedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {(selectedContent as any).scheduledReviewAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Scheduled Review</label>
                      <p className="text-sm text-gray-900">{new Date((selectedContent as any).scheduledReviewAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              {selectedContent.paymentStatus && selectedContent.paymentStatus !== 'not_required' && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Payment Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedContent.paymentStatus.replace('_', ' ')}</p>
                  </div>
                    {selectedContent.paymentAmount && (
                  <div>
                        <label className="text-sm font-medium text-gray-600">Amount</label>
                        <p className="text-sm text-gray-900">₦{selectedContent.paymentAmount.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedContent.paymentReference && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Reference</label>
                        <p className="text-sm text-gray-900 font-mono">{selectedContent.paymentReference}</p>
                      </div>
                    )}
                    {selectedContent.paymentCode && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Payment Code</label>
                        <p className="text-sm text-gray-900 font-mono">{selectedContent.paymentCode}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Provider Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Provider Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                    <label className="text-sm font-medium text-gray-600">Provider</label>
                        <p className="text-sm text-gray-900">
                      {selectedContent.provider || selectedContent.organizer || 'Unknown'}
                        </p>
                      </div>
                      <div>
                    <label className="text-sm font-medium text-gray-600">Provider ID</label>
                        <p className="text-sm text-gray-900">
                      {selectedContent.providerId || selectedContent.organizerId || 'N/A'}
                        </p>
                      </div>
                      </div>
              </div>

              {/* Moderation Actions */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Moderation Action</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Select Action</label>
                    <Select value={reviewAction} onValueChange={(value: any) => setReviewAction(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approve">✅ Approve Content</SelectItem>
                        <SelectItem value="reject">❌ Reject Content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {reviewAction === 'reject' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Rejection Reason *
                      </label>
                      <Textarea
                        placeholder="Please provide a clear reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                        className="border-red-200 focus:border-red-400"
                      />
                    </div>
                  )}

            {reviewAction === 'approve' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 mb-2">
                  <strong>Content Approval:</strong> This content will be approved and moved to the payment processing stage.
                </p>
                <p className="text-sm text-orange-800">
                  After approval, you can request payment from the "Approved" tab. Free content will be auto-approved, paid content will require user payment.
                </p>
              </div>
            )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewDialog(false)
                setRejectionReason("")
                setSelectedContent(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={
                actionLoading === selectedContent?._id || 
                (reviewAction === 'reject' && !rejectionReason.trim())
              }
              className={
                reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }
            >
              {actionLoading === selectedContent?._id ? 'Processing...' : 
               reviewAction === 'approve' ? 'Approve Content' : 'Reject Content'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Verification Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <span>Payment Verification</span>
            </DialogTitle>
            <DialogDescription>
              Verify the uploaded payment receipt and approve or reject the content.
            </DialogDescription>
          </DialogHeader>
          
          {selectedContent && (
            <div className="space-y-6">
              {/* Content Details */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{selectedContent.title}</h4>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="capitalize">{selectedContent.type}</span>
                  <span>Amount: ₦{selectedContent.paymentAmount?.toLocaleString()}</span>
                  <span>Ref: {selectedContent.paymentReference}</span>
                </div>
              </div>

              {/* Payment Receipt */}
              {selectedContent.paymentReceipt && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Payment Receipt
                  </label>
                  <div className="border rounded-lg p-4">
                    <a
                      href={selectedContent.paymentReceipt}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Receipt Image
                    </a>
                  </div>
                </div>
              )}

              {/* Verification Action */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Verification Action
                </label>
                <Select value={paymentVerification} onValueChange={(value: any) => setPaymentVerification(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verify">✅ Verify Payment & Approve Content</SelectItem>
                    <SelectItem value="reject">❌ Reject Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add any notes about the payment verification..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Action Info */}
              {paymentVerification === 'verify' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Verify Payment:</strong> This will approve the payment and publish the content.
                  </p>
                </div>
              )}

              {paymentVerification === 'reject' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Reject Payment:</strong> This will mark the payment as failed and notify the user.
                  </p>
                </div>
              )}
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
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentVerification}
              disabled={actionLoading === selectedContent?._id}
              className={
                paymentVerification === 'verify' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }
            >
              {actionLoading === selectedContent?._id ? 'Processing...' : 
               paymentVerification === 'verify' ? 'Verify Payment' : 'Reject Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Edit Content Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <span>Edit Content - Full Admin Access</span>
            </DialogTitle>
            <DialogDescription>
              Complete editing capabilities for all content fields and metadata.
            </DialogDescription>
          </DialogHeader>
          
          {selectedContent && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Title *</label>
                    <Input
                      value={editData.title || selectedContent.title || ''}
                      onChange={(e) => setEditData({...editData, title: e.target.value})}
                      placeholder="Enter content title"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Content Type</label>
                    <Input
                      value={selectedContent.type?.charAt(0).toUpperCase() + selectedContent.type?.slice(1) || ''}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Description *</label>
                  <Textarea
                    value={editData.description || selectedContent.description || ''}
                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                    placeholder="Enter content description"
                    rows={4}
                  />
                </div>
              </div>

              {/* Content-Specific Fields */}
              {selectedContent.type === 'event' && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900 mb-4">Event Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Start Date</label>
                      <Input
                        type="date"
                        value={editData.startDate || selectedContent.dates?.startDate || ''}
                        onChange={(e) => setEditData({...editData, startDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">End Date</label>
                      <Input
                        type="date"
                        value={editData.endDate || selectedContent.dates?.endDate || ''}
                        onChange={(e) => setEditData({...editData, endDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
                      <Input
                        value={editData.location || selectedContent.location || ''}
                        onChange={(e) => setEditData({...editData, location: e.target.value})}
                        placeholder="Event location"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Is Remote</label>
                      <Select
                        value={editData.isRemote?.toString() || (selectedContent as any).isRemote?.toString() || 'false'}
                        onValueChange={(value) => setEditData({...editData, isRemote: value === 'true'})}
                      >
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {selectedContent.type === 'job' && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4">Job Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Company</label>
                      <Input
                        value={editData.company || (selectedContent as any).company || ''}
                        onChange={(e) => setEditData({...editData, company: e.target.value})}
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
                      <Input
                        value={editData.location || selectedContent.location || ''}
                        onChange={(e) => setEditData({...editData, location: e.target.value})}
                        placeholder="Job location"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Salary</label>
                      <Input
                        value={editData.salary || (selectedContent as any).salary || ''}
                        onChange={(e) => setEditData({...editData, salary: e.target.value})}
                        placeholder="Salary range"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Employment Type</label>
                      <Select
                        value={editData.employmentType || (selectedContent as any).employmentType || ''}
                        onValueChange={(value) => setEditData({...editData, employmentType: value})}
                      >
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900 mb-4">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Is Paid</label>
                    <Select
                      value={editData.isPaid?.toString() || selectedContent.isPaid?.toString() || 'false'}
                      onValueChange={(value) => setEditData({...editData, isPaid: value === 'true'})}
                    >
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Amount</label>
                    <Input
                      type="number"
                      value={editData.paymentAmount || selectedContent.paymentAmount || ''}
                      onChange={(e) => setEditData({...editData, paymentAmount: parseFloat(e.target.value) || 0})}
                      placeholder="Payment amount"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Status</label>
                    <Select
                      value={editData.paymentStatus || selectedContent.paymentStatus || ''}
                      onValueChange={(value) => setEditData({...editData, paymentStatus: value})}
                    >
                      <SelectItem value="not_required">Not Required</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Reference</label>
                    <Input
                      value={editData.paymentReference || selectedContent.paymentReference || ''}
                      onChange={(e) => setEditData({...editData, paymentReference: e.target.value})}
                      placeholder="Payment reference"
                    />
                  </div>
                </div>
              </div>

              {/* Status and Metadata */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Metadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                    <Select
                      value={editData.status || selectedContent.status || ''}
                      onValueChange={(value) => setEditData({...editData, status: value})}
                    >
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Is Approved</label>
                    <Select
                      value={editData.isApproved?.toString() || selectedContent.isApproved?.toString() || 'false'}
                      onValueChange={(value) => setEditData({...editData, isApproved: value === 'true'})}
                    >
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Tags and Categories */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-4">Tags & Categories</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Tags (comma-separated)</label>
                    <Input
                      value={editData.tags?.join(', ') || selectedContent.tags?.join(', ') || ''}
                      onChange={(e) => setEditData({...editData, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)})}
                      placeholder="Enter tags separated by commas"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Industry Sectors (comma-separated)</label>
                    <Input
                      value={editData.industrySectors?.join(', ') || selectedContent.industrySectors?.join(', ') || ''}
                      onChange={(e) => setEditData({...editData, industrySectors: e.target.value.split(',').map(sector => sector.trim()).filter(sector => sector)})}
                      placeholder="Enter industry sectors separated by commas"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Target Audience (comma-separated)</label>
                    <Input
                      value={editData.targetAudience?.join(', ') || selectedContent.targetAudience?.join(', ') || ''}
                      onChange={(e) => setEditData({...editData, targetAudience: e.target.value.split(',').map(audience => audience.trim()).filter(audience => audience)})}
                      placeholder="Enter target audience separated by commas"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="bg-gray-50 p-4 rounded-lg">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false)
                setEditData({})
                setSelectedContent(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditContent}
              disabled={actionLoading === selectedContent?._id}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading === selectedContent?._id ? 'Updating...' : 'Update Content'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change State Dialog */}
      <Dialog open={showStateDialog} onOpenChange={setShowStateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-orange-600" />
              <span>Change Content State</span>
            </DialogTitle>
            <DialogDescription>
              Change the status of this content item.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">New State</label>
              <Select value={newState} onValueChange={setNewState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newState === 'inactive' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Disable Reason</label>
                <Textarea
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  placeholder="Enter reason for disabling this content"
                  rows={3}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStateDialog(false)
                setNewState('')
                setDisableReason('')
                setSelectedContent(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeState}
              disabled={actionLoading === selectedContent?._id || !newState}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {actionLoading === selectedContent?._id ? 'Updating...' : 'Change State'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Review Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span>Schedule Future Review</span>
            </DialogTitle>
            <DialogDescription>
              Schedule this content for future review and approval.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Review Date</label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Review Time</label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
            
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>Note:</strong> Content will be moved to draft status until the scheduled review time.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowScheduleDialog(false)
                setScheduleDate('')
                setScheduleTime('')
                setSelectedContent(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleReview}
              disabled={actionLoading === selectedContent?._id || !scheduleDate || !scheduleTime}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading === selectedContent?._id ? 'Scheduling...' : 'Schedule Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Amount Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Payment</DialogTitle>
            <DialogDescription>
              Set the payment amount for this content. The user will need to pay this amount before the content goes live.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Payment Amount (₦)
              </label>
              <Input
                type="number"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                placeholder="Enter payment amount"
                min="1"
                step="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set the amount the user needs to pay for this content to go live
              </p>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              <p className="text-sm text-orange-800">
                <strong>Payment Amount:</strong> ₦{paymentAmountInput.toLocaleString()}
              </p>
              <p className="text-xs text-orange-700 mt-1">
                This amount will be requested from the content creator
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false)
                setSelectedContent(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPaymentRequest}
              disabled={actionLoading === selectedContent?._id || !paymentAmountInput || paymentAmountInput <= 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {actionLoading === selectedContent?._id ? 'Sending...' : 'Request Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
