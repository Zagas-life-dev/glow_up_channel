"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePage } from "@/contexts/page-context"
import { ApiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { 
  ArrowLeft,
  Star,
  TrendingUp,
  Target,
  Calendar,
  Briefcase,
  Eye,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  Zap,
  Crown,
  Settings,
  Plus,
  X,
  BarChart3,
  MousePointer,
  MoreHorizontal,
  ExternalLink,
  Check,
  BookOpen,
  Plane,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pause,
  Play
} from "lucide-react"

interface Promotion {
  _id: string
  contentId: string
  contentType: string
  packageType: string
  packageName: string
  price: number
  investment: number
  duration: number
  status: string
  paymentStatus: string
  startDate: string
  endDate: string
  createdAt: string
  providerId: string
  provider: {
    _id: string
    email: string
    firstName?: string
    lastName?: string
  }
  analytics: {
    views: number
    likes: number
    saves: number
    applications: number
    registrations: number
    engagementRate: number
    performanceScore: number
  }
  content: {
    _id: string
    title: string
    description: string
    image?: string
  }
  remainingDays: number
  isActive: boolean
  isHero: boolean
  isFeatured: boolean
  customDuration?: number
  notes?: string
  paymentReference?: string
  paymentReceipt?: string
  paymentMethod?: string
  paymentAmount?: number
}

export default function AdminPromotionsPage() {
  const { setHideNavbar, setHideFooter } = usePage()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [packageFilter, setPackageFilter] = useState("all")
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Hide navbar when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    try {
      setLoading(true)
      // This would be an admin-specific API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/promotions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      })
      const data = await response.json()
      
      if (data.success) {
        setPromotions(data.data.promotions || [])
      } else {
        toast.error('Failed to load promotions')
      }
    } catch (error) {
      console.error('Error fetching promotions:', error)
      toast.error('Failed to load promotions')
    } finally {
      setLoading(false)
    }
  }

  const handlePromotionAction = async (promotionId: string, action: string, notes?: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/promotions/${promotionId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ notes })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(`Promotion ${action}ed successfully`)
        fetchPromotions()
        setShowDetailsDialog(false)
        setSelectedPromotion(null)
      } else {
        toast.error(data.message || `Failed to ${action} promotion`)
      }
    } catch (error) {
      console.error(`Error ${action}ing promotion:`, error)
      toast.error(`Failed to ${action} promotion`)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'awaiting_payment': return 'bg-orange-100 text-orange-800'
      case 'awaiting_verification': return 'bg-blue-100 text-blue-800'
      case 'verified': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPackageIcon = (packageType: string) => {
    switch (packageType) {
      case 'spotlight': return Target
      case 'feature': return Star
      case 'launch': return Crown
      default: return Zap
    }
  }

  const getPackageColor = (packageType: string) => {
    switch (packageType) {
      case 'spotlight': return 'from-blue-500 to-blue-600'
      case 'feature': return 'from-green-500 to-green-600'
      case 'launch': return 'from-purple-500 to-purple-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'event': return Calendar
      case 'job': return Briefcase
      case 'resource': return BookOpen
      case 'opportunity': return Plane
      default: return Target
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = promotion.content?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         promotion.provider?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || promotion.status === statusFilter
    const matchesPackage = packageFilter === 'all' || promotion.packageType === packageFilter
    
    return matchesSearch && matchesStatus && matchesPackage
  })

  const activePromotions = filteredPromotions.filter(p => p.status === 'active' && p.paymentStatus === 'paid')
  const pendingPromotions = filteredPromotions.filter(p => p.status === 'pending')
  const awaitingPaymentPromotions = filteredPromotions.filter(p => p.status === 'active' && p.paymentStatus === 'pending')
  const awaitingVerificationPromotions = filteredPromotions.filter(p => p.status === 'active' && p.paymentStatus === 'awaiting_verification')
  const completedPromotions = filteredPromotions.filter(p => p.status === 'completed' || p.status === 'expired')
  const rejectedPromotions = filteredPromotions.filter(p => p.status === 'rejected' || p.status === 'cancelled')

  const totalRevenue = promotions
    .filter(p => p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + (p.investment || p.price || 0), 0)
  const totalActive = activePromotions.length
  const totalPending = pendingPromotions.length
  const totalAwaitingPayment = awaitingPaymentPromotions.length
  const totalAwaitingVerification = awaitingVerificationPromotions.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/admin" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Promotion Management</h1>
              <p className="text-sm lg:text-base text-gray-600">Manage all promotion requests and active promotions</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={fetchPromotions}
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Promotions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{promotions.length}</div>
              <p className="text-xs text-muted-foreground">
                {totalActive} active, {totalPending} pending
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awaiting Payment</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{totalAwaitingPayment}</div>
              <p className="text-xs text-muted-foreground">
                Payment pending
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awaiting Verification</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalAwaitingVerification}</div>
              <p className="text-xs text-muted-foreground">
                Payment uploaded
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl mb-8 overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search content or provider..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                    <SelectItem value="awaiting_verification">Awaiting Verification</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="package">Package</Label>
                <Select value={packageFilter} onValueChange={setPackageFilter}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Filter by package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Packages</SelectItem>
                    <SelectItem value="spotlight">Spotlight</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="launch">Launch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setPackageFilter("all")
                  }}
                  variant="outline"
                  className="w-full rounded-xl"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promotions Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="pending">Pending ({pendingPromotions.length})</TabsTrigger>
            <TabsTrigger value="awaiting_payment">Awaiting Payment ({awaitingPaymentPromotions.length})</TabsTrigger>
            <TabsTrigger value="awaiting_verification">Awaiting Verification ({awaitingVerificationPromotions.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activePromotions.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedPromotions.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedPromotions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingPromotions.length === 0 ? (
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center mb-6">
                    <Clock className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Promotions</h3>
                  <p className="text-gray-500 text-center">
                    All promotion requests have been reviewed
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingPromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-white" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-gray-500">
                              by {promotion.provider?.email || 'Unknown Provider'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge className={getStatusColor(promotion.status)}>
                              {promotion.status}
                            </Badge>
                            <Badge className={getPaymentStatusColor(promotion.paymentStatus)}>
                              {promotion.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Duration</span>
                          <span className="font-medium">{promotion.duration} days</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Created</span>
                          <span className="font-medium">{formatDate(promotion.createdAt)}</span>
                        </div>

                        {promotion.notes && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-700">
                              <strong>Notes:</strong> {promotion.notes}
                            </p>
                          </div>
                        )}

                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => {
                              setSelectedPromotion(promotion)
                              setShowDetailsDialog(true)
                            }}
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                          <Button 
                            onClick={() => handlePromotionAction(promotion._id, 'approve')}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => handlePromotionAction(promotion._id, 'reject')}
                            size="sm"
                            variant="destructive"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="awaiting_payment" className="space-y-4">
            {awaitingPaymentPromotions.length === 0 ? (
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6">
                    <AlertTriangle className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Awaiting Payment</h3>
                  <p className="text-gray-500 text-center">
                    No promotions are awaiting payment
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {awaitingPaymentPromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-white" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-gray-500">
                              by {promotion.provider?.email || 'Unknown Provider'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge className={getStatusColor(promotion.status)}>
                              {promotion.status}
                            </Badge>
                            <Badge className={getPaymentStatusColor(promotion.paymentStatus)}>
                              {promotion.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Duration</span>
                          <span className="font-medium">{promotion.duration} days</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Created</span>
                          <span className="font-medium">{formatDate(promotion.createdAt)}</span>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="text-sm text-orange-800">
                            <strong>Status:</strong> Payment required to activate promotion
                          </p>
                        </div>

                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => {
                              setSelectedPromotion(promotion)
                              setShowDetailsDialog(true)
                            }}
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="awaiting_verification" className="space-y-4">
            {awaitingVerificationPromotions.length === 0 ? (
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Awaiting Verification</h3>
                  <p className="text-gray-500 text-center">
                    No promotions are awaiting payment verification
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {awaitingVerificationPromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-white" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-gray-500">
                              by {promotion.provider?.email || 'Unknown Provider'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge className={getStatusColor(promotion.status)}>
                              {promotion.status}
                            </Badge>
                            <Badge className={getPaymentStatusColor(promotion.paymentStatus)}>
                              {promotion.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Duration</span>
                          <span className="font-medium">{promotion.duration} days</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Created</span>
                          <span className="font-medium">{formatDate(promotion.createdAt)}</span>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            <strong>Status:</strong> Payment uploaded, awaiting admin verification
                          </p>
                        </div>

                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => {
                              setSelectedPromotion(promotion)
                              setShowDetailsDialog(true)
                            }}
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Verify Payment
                          </Button>
                          <Button 
                            onClick={() => handlePromotionAction(promotion._id, 'verify-payment')}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activePromotions.length === 0 ? (
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6">
                    <Play className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Promotions</h3>
                  <p className="text-gray-500 text-center">
                    No promotions are currently running
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activePromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-white" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-gray-500">
                              by {promotion.provider?.email || 'Unknown Provider'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge className={getStatusColor(promotion.status)}>
                              {promotion.status}
                            </Badge>
                            <Badge className={getPaymentStatusColor(promotion.paymentStatus)}>
                              {promotion.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Remaining</span>
                          <span className="font-medium">{promotion.remainingDays} days</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{promotion.analytics.views}</div>
                            <div className="text-xs text-gray-500">Views</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{promotion.analytics.engagementRate}%</div>
                            <div className="text-xs text-gray-500">Engagement</div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => {
                              setSelectedPromotion(promotion)
                              setShowDetailsDialog(true)
                            }}
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          <Button 
                            onClick={() => handlePromotionAction(promotion._id, 'pause')}
                            size="sm"
                            variant="outline"
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedPromotions.length === 0 ? (
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Promotions</h3>
                  <p className="text-gray-500 text-center">
                    Completed promotions will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedPromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-white" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-gray-500">
                              by {promotion.provider?.email || 'Unknown Provider'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge className={getStatusColor(promotion.status)}>
                              {promotion.status}
                            </Badge>
                            <Badge className={getPaymentStatusColor(promotion.paymentStatus)}>
                              {promotion.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Duration</span>
                          <span className="font-medium">{promotion.duration} days</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{promotion.analytics.views}</div>
                            <div className="text-xs text-gray-500">Views</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{promotion.analytics.engagementRate}%</div>
                            <div className="text-xs text-gray-500">Engagement</div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => {
                              setSelectedPromotion(promotion)
                              setShowDetailsDialog(true)
                            }}
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedPromotions.length === 0 ? (
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6">
                    <XCircle className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Rejected Promotions</h3>
                  <p className="text-gray-500 text-center">
                    Rejected promotions will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rejectedPromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-white" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-gray-500">
                              by {promotion.provider?.email || 'Unknown Provider'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge className={getStatusColor(promotion.status)}>
                              {promotion.status}
                            </Badge>
                            <Badge className={getPaymentStatusColor(promotion.paymentStatus)}>
                              {promotion.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-0 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Duration</span>
                          <span className="font-medium">{promotion.duration} days</span>
                        </div>

                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => {
                              setSelectedPromotion(promotion)
                              setShowDetailsDialog(true)
                            }}
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Promotion Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Target className="h-6 w-6 text-orange-500" />
              <span>Promotion Details</span>
            </DialogTitle>
            <DialogDescription>
              Review promotion details and take action
            </DialogDescription>
          </DialogHeader>
          
          {selectedPromotion && (
            <div className="space-y-6">
              {/* Content Information */}
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-200">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Target className="h-5 w-5 text-blue-600" />
                    Content Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">{selectedPromotion.content?.title}</h4>
                      <p className="text-sm text-gray-600 mb-4">{selectedPromotion.content?.description}</p>
                      <div className="flex items-center space-x-2">
                        <Badge className="capitalize">{selectedPromotion.contentType}</Badge>
                        <Badge className={getStatusColor(selectedPromotion.status)}>
                          {selectedPromotion.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Provider Information</h5>
                      <p className="text-sm text-gray-600">{selectedPromotion.provider?.email}</p>
                      <p className="text-sm text-gray-600">
                        {selectedPromotion.provider?.firstName} {selectedPromotion.provider?.lastName}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Promotion Details */}
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b border-green-200">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Star className="h-5 w-5 text-green-600" />
                    Promotion Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Package</span>
                        <span className="font-medium">{selectedPromotion.packageName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Investment</span>
                        <span className="font-medium">{formatCurrency(selectedPromotion.investment || selectedPromotion.price || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-medium">{selectedPromotion.duration} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Payment Status</span>
                        <Badge className={getPaymentStatusColor(selectedPromotion.paymentStatus)}>
                          {selectedPromotion.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Start Date</span>
                        <span className="font-medium">{formatDate(selectedPromotion.startDate)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">End Date</span>
                        <span className="font-medium">{formatDate(selectedPromotion.endDate)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Created</span>
                        <span className="font-medium">{formatDate(selectedPromotion.createdAt)}</span>
                      </div>
                      {selectedPromotion.customDuration && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Custom Duration</span>
                          <span className="font-medium">{selectedPromotion.customDuration} days</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics */}
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-purple-200">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedPromotion.analytics.views}</div>
                      <div className="text-sm text-gray-500">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedPromotion.analytics.likes}</div>
                      <div className="text-sm text-gray-500">Likes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{selectedPromotion.analytics.saves}</div>
                      <div className="text-sm text-gray-500">Saves</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{selectedPromotion.analytics.engagementRate}%</div>
                      <div className="text-sm text-gray-500">Engagement</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              {(selectedPromotion.paymentStatus === 'awaiting_verification' || selectedPromotion.paymentStatus === 'paid') && (
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b border-green-200">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Payment Status</span>
                          <Badge className={getPaymentStatusColor(selectedPromotion.paymentStatus)}>
                            {selectedPromotion.paymentStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Amount</span>
                          <span className="font-medium">{formatCurrency(selectedPromotion.paymentAmount || selectedPromotion.investment || selectedPromotion.price || 0)}</span>
                        </div>
                        {selectedPromotion.paymentReference && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Payment Reference</span>
                            <span className="font-medium font-mono text-sm">{selectedPromotion.paymentReference}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        {selectedPromotion.paymentReceipt && (
                          <div>
                            <span className="text-gray-500 block mb-2">Payment Receipt</span>
                            <a 
                              href={selectedPromotion.paymentReceipt} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              View Receipt
                            </a>
                          </div>
                        )}
                        {selectedPromotion.paymentMethod && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Payment Method</span>
                            <span className="font-medium capitalize">{selectedPromotion.paymentMethod}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedPromotion.notes && (
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Settings className="h-5 w-5 text-gray-600" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-gray-700">{selectedPromotion.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                {selectedPromotion.status === 'pending' && (
                  <>
                    <Button 
                      onClick={() => handlePromotionAction(selectedPromotion._id, 'reject')}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      onClick={() => handlePromotionAction(selectedPromotion._id, 'approve')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
                {selectedPromotion.status === 'active' && selectedPromotion.paymentStatus === 'awaiting_verification' && (
                  <>
                    <Button 
                      onClick={() => handlePromotionAction(selectedPromotion._id, 'reject-payment')}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Payment
                    </Button>
                    <Button 
                      onClick={() => handlePromotionAction(selectedPromotion._id, 'verify-payment')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verify Payment
                    </Button>
                  </>
                )}
                {selectedPromotion.status === 'active' && selectedPromotion.paymentStatus === 'paid' && (
                  <Button 
                    onClick={() => handlePromotionAction(selectedPromotion._id, 'pause')}
                    variant="outline"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
