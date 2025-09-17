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
  Calendar
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
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_payment'>('approve')
  const [rejectionReason, setRejectionReason] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(5000)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentVerification, setPaymentVerification] = useState<'verify' | 'reject'>('verify')
  const [paymentNotes, setPaymentNotes] = useState("")

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
      
      console.log('Fetching content for moderation using admin endpoint...')
      
      // Use the proper admin endpoint that returns ALL content regardless of approval status
      const result = await ApiClient.getContentForModeration(currentPage, itemsPerPage, {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        payment: paymentFilter !== 'all' ? paymentFilter : undefined,
        search: searchQuery || undefined
      })

      console.log('Admin API response:', result)

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
        await ApiClient.approveContent(selectedContent._id, selectedContent.type)
        toast.success('Content approved successfully')
      } else if (reviewAction === 'reject') {
        if (!rejectionReason.trim()) {
          toast.error('Please provide a rejection reason')
          return
        }
        await ApiClient.rejectContent(selectedContent._id, selectedContent.type, rejectionReason)
        toast.success('Content rejected successfully')
      } else if (reviewAction === 'request_payment') {
        await ApiClient.requestPayment(selectedContent._id, selectedContent.type, paymentAmount)
        toast.success('Payment request sent successfully')
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

  const handlePaymentVerification = async () => {
    if (!selectedContent) return

    try {
      setActionLoading(selectedContent._id)
      
      const verified = paymentVerification === 'verify'
      await ApiClient.verifyPayment(selectedContent._id, selectedContent.type, verified, paymentNotes)
      
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

  const getStatusBadge = (item: ContentItem) => {
    // Check payment status first
    if (item.paymentStatus === 'awaiting_payment') {
      return <Badge variant="outline" className="bg-orange-100 text-orange-800"><DollarSign className="h-3 w-3 mr-1" />Awaiting Payment</Badge>
    }
    if (item.paymentStatus === 'payment_uploaded') {
      return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Upload className="h-3 w-3 mr-1" />Payment Uploaded</Badge>
    }
    if (item.paymentStatus === 'verified') {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Payment Verified</Badge>
    }
    if (item.paymentStatus === 'failed') {
      return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Payment Failed</Badge>
    }

    // 6-State Content Management System
    if (item.status === 'draft' && !item.isApproved) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />True Draft</Badge>
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
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Live</Badge>
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
    const price = item.price || item.financial?.amount || 0
    const currency = item.currency || item.financial?.currency || 'NGN'
    
    return { isPaid, price, currency }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <FileText className="w-8 h-8 text-orange-600 animate-pulse" />
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
              <Button variant="outline" size="sm" onClick={fetchContent}>
                <FileText className="h-4 w-4 mr-2" />
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

        {/* Results Summary */}
        <div className="mb-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          </div>
          <p className="text-sm text-gray-600">
            Showing {content.length} content items (all statuses)
          </p>
        </div>

        {/* Content Table */}
        <Card>
          <CardContent className="p-0">
            {content.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
                <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Content
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {content.map((item) => {
                      const { isPaid, price, currency } = getPaymentInfo(item)
                      return (
                        <tr key={item._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.title}</div>
                              <div className="text-sm text-gray-500 line-clamp-2">
                                {item.description?.substring(0, 100)}...
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getTypeBadge(item.type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {item.provider || item.organizer || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(item)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {isPaid ? (
                                <>
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-gray-900">{price} {currency}</span>
                                </>
                              ) : (
                                <span className="text-sm text-gray-500">Free</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                              
                              {/* Payment Verification Button */}
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
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
                    return isPaid ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {price} {currency}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">Free</Badge>
                    )
                  })()}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedContent.description}</p>
              </div>

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

              {/* Location Information */}
              {selectedContent.location && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Location Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedContent.location.country && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Country</label>
                        <p className="text-sm text-gray-900">{selectedContent.location.country}</p>
                      </div>
                    )}
                    {selectedContent.location.province && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Province/State</label>
                        <p className="text-sm text-gray-900">{selectedContent.location.province}</p>
                      </div>
                    )}
                    {selectedContent.location.city && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">City</label>
                        <p className="text-sm text-gray-900">{selectedContent.location.city}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type</label>
                      <p className="text-sm text-gray-900">
                        {selectedContent.location.isVirtual ? 'Virtual' : 
                         selectedContent.location.isRemote ? 'Remote' :
                         selectedContent.location.isHybrid ? 'Hybrid' : 'Physical Location'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date Information */}
              {selectedContent.dates && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Date Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedContent.dates.startDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Start Date</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedContent.dates.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedContent.dates.endDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">End Date</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedContent.dates.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedContent.dates.applicationDeadline && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Application Deadline</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedContent.dates.applicationDeadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedContent.dates.registrationDeadline && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Registration Deadline</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedContent.dates.registrationDeadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags and Categories */}
              {(selectedContent.tags?.length || selectedContent.industrySectors?.length || selectedContent.targetAudience?.length) && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Tags & Categories</h4>
                  <div className="space-y-3">
                    {selectedContent.tags?.length && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Tags</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedContent.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedContent.industrySectors?.length && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Industry Sectors</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedContent.industrySectors.map((sector, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-blue-100 text-blue-800">
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedContent.targetAudience?.length && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Target Audience</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedContent.targetAudience.map((audience, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-green-100 text-green-800">
                              {audience}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submission Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Submission Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedContent.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Updated</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedContent.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  {selectedContent.approvedBy && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Approved By</label>
                      <p className="text-sm text-gray-900">{selectedContent.approvedBy}</p>
                    </div>
                  )}
                  {selectedContent.approvedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Approved At</label>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedContent.approvedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
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
                        <SelectItem value="request_payment">💰 Request for Payment</SelectItem>
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

                  {reviewAction === 'request_payment' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Payment Amount (₦)
                      </label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        placeholder="Enter payment amount"
                        className="mb-3"
                      />
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800">
                          <strong>Payment Request:</strong> This will notify the user to make payment before content approval.
                        </p>
                      </div>
                    </div>
                  )}

                  {reviewAction === 'approve' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Ready to Approve:</strong> This content will be published and made visible to users.
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
              disabled={actionLoading === selectedContent?._id || (reviewAction === 'reject' && !rejectionReason.trim())}
              className={
                reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 
                reviewAction === 'request_payment' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-red-600 hover:bg-red-700'
              }
            >
              {actionLoading === selectedContent?._id ? 'Processing...' : 
               reviewAction === 'approve' ? 'Approve Content' : 
               reviewAction === 'request_payment' ? 'Request Payment' :
               'Reject Content'}
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
    </div>
  )
}