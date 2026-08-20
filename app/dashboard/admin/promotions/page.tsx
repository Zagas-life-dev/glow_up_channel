"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
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
import { AdminShell } from "@/components/admin/admin-shell"
import { AdminStat, AdminStatGrid, AdminToolbar } from "@/components/admin/ui"
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
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
    if (authLoading || !isAuthenticated || !user) return
    if (user.role !== "super_admin") return
    fetchPromotions()
  }, [authLoading, isAuthenticated, user])

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
      case 'active': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
      case 'pending': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
      case 'completed': return 'bg-primary/10 text-foreground'
      case 'cancelled': return 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30'
      case 'expired': return 'bg-muted text-foreground'
      case 'rejected': return 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30'
      default: return 'bg-muted text-foreground'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
      case 'pending': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
      case 'failed': return 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30'
      case 'awaiting_payment': return 'bg-primary/10 text-primary border border-primary/30'
      case 'awaiting_verification': return 'bg-primary/10 text-foreground'
      case 'verified': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
      default: return 'bg-muted text-foreground'
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
      case 'spotlight': return 'from-primary to-primary'
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

  if (!authLoading && isAuthenticated && user && user.role !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            Super admin privileges required for promotion management.
          </p>
          <Button asChild className="bg-primary hover:bg-primary/90 rounded-xl">
            <Link href="/dashboard/admin">Back to Admin</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <AdminShell
      title="Promotions"
      description="Promotion requests, active promotions, and revenue."
      onRefresh={fetchPromotions}
      requireSuperAdmin
      width="wide"
    >
      <div>
        <AdminStatGrid className="mb-5 lg:grid-cols-5">
          <AdminStat
            label="Total promotions"
            value={promotions.length.toLocaleString()}
            hint={`${totalActive} active, ${totalPending} pending`}
            icon={TrendingUp}
          />
          <AdminStat label="Total revenue" value={formatCurrency(totalRevenue)} hint="All time" icon={DollarSign} emphasis="positive" />
          <AdminStat
            label="Pending approval"
            value={totalPending.toLocaleString()}
            hint="Awaiting review"
            icon={Clock}
            emphasis={totalPending > 0 ? "attention" : "none"}
          />
          <AdminStat label="Awaiting payment" value={totalAwaitingPayment.toLocaleString()} hint="Payment pending" icon={AlertTriangle} />
          <AdminStat label="Awaiting verification" value={totalAwaitingVerification.toLocaleString()} hint="Payment uploaded" icon={CheckCircle} />
        </AdminStatGrid>

        <AdminToolbar
          search={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search content or provider…"
          className="mb-5"
        >
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[190px] rounded-xl">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="awaiting_payment">Awaiting payment</SelectItem>
              <SelectItem value="awaiting_verification">Awaiting verification</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={packageFilter} onValueChange={setPackageFilter}>
            <SelectTrigger className="h-10 w-[150px] rounded-xl">
              <SelectValue placeholder="All packages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All packages</SelectItem>
              <SelectItem value="spotlight">Spotlight</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="launch">Launch</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || statusFilter !== "all" || packageFilter !== "all") && (
            <Button
              variant="ghost"
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPackageFilter("all") }}
              className="h-10 rounded-xl text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </AdminToolbar>

        {/* Promotions Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="scrollbar-hide flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="pending">Pending ({pendingPromotions.length})</TabsTrigger>
            <TabsTrigger value="awaiting_payment">Awaiting Payment ({awaitingPaymentPromotions.length})</TabsTrigger>
            <TabsTrigger value="awaiting_verification">Awaiting Verification ({awaitingVerificationPromotions.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activePromotions.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedPromotions.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedPromotions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingPromotions.length === 0 ? (
              <Card className="rounded-xl border border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center mb-6">
                    <Clock className="h-10 w-10 text-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Pending Promotions</h3>
                  <p className="text-muted-foreground text-center">
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
                    <Card key={promotion._id} className="rounded-xl border border-border">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-foreground" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-muted-foreground">
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
                          <span className="text-muted-foreground">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium">{promotion.duration} days</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Created</span>
                          <span className="font-medium">{formatDate(promotion.createdAt)}</span>
                        </div>

                        {promotion.notes && (
                          <div className="bg-muted/40 rounded-lg p-3">
                            <p className="text-sm text-foreground">
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
                            className="bg-green-600 hover:bg-green-700 text-foreground"
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
              <Card className="rounded-xl border border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6">
                    <AlertTriangle className="h-10 w-10 text-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Awaiting Payment</h3>
                  <p className="text-muted-foreground text-center">
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
                    <Card key={promotion._id} className="rounded-xl border border-border">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-foreground" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-muted-foreground">
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
                          <span className="text-muted-foreground">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium">{promotion.duration} days</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Created</span>
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
              <Card className="rounded-xl border border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary rounded-2xl flex items-center justify-center mb-6">
                    <CheckCircle className="h-10 w-10 text-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Awaiting Verification</h3>
                  <p className="text-muted-foreground text-center">
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
                    <Card key={promotion._id} className="rounded-xl border border-border">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-foreground" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-muted-foreground">
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
                          <span className="text-muted-foreground">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium">{promotion.duration} days</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Created</span>
                          <span className="font-medium">{formatDate(promotion.createdAt)}</span>
                        </div>

                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                          <p className="text-sm text-foreground">
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
                            className="bg-green-600 hover:bg-green-700 text-foreground"
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
              <Card className="rounded-xl border border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6">
                    <Play className="h-10 w-10 text-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Active Promotions</h3>
                  <p className="text-muted-foreground text-center">
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
                    <Card key={promotion._id} className="rounded-xl border border-border">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-foreground" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-muted-foreground">
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
                          <span className="text-muted-foreground">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Remaining</span>
                          <span className="font-medium">{promotion.remainingDays} days</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-lg font-bold text-primary">{promotion.analytics.views}</div>
                            <div className="text-xs text-muted-foreground">Views</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{promotion.analytics.engagementRate}%</div>
                            <div className="text-xs text-muted-foreground">Engagement</div>
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
              <Card className="rounded-xl border border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary rounded-2xl flex items-center justify-center mb-6">
                    <CheckCircle className="h-10 w-10 text-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Completed Promotions</h3>
                  <p className="text-muted-foreground text-center">
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
                    <Card key={promotion._id} className="rounded-xl border border-border">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-foreground" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-muted-foreground">
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
                          <span className="text-muted-foreground">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium">{promotion.duration} days</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-lg font-bold text-primary">{promotion.analytics.views}</div>
                            <div className="text-xs text-muted-foreground">Views</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{promotion.analytics.engagementRate}%</div>
                            <div className="text-xs text-muted-foreground">Engagement</div>
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
              <Card className="rounded-xl border border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6">
                    <XCircle className="h-10 w-10 text-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Rejected Promotions</h3>
                  <p className="text-muted-foreground text-center">
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
                    <Card key={promotion._id} className="rounded-xl border border-border">
                      <CardHeader className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                                <Icon className="w-3 h-3 text-foreground" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {promotion.content?.title || 'Unknown Content'}
                              </CardTitle>
                            </div>
                            <CardDescription className="capitalize">
                              {promotion.contentType} • {promotion.packageName}
                            </CardDescription>
                            <p className="text-sm text-muted-foreground">
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
                          <span className="text-muted-foreground">Investment</span>
                          <span className="font-medium">{formatCurrency(promotion.investment || promotion.price || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
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
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/10 border-b border-primary/20">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Target className="h-5 w-5 text-primary" />
                    Content Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">{selectedPromotion.content?.title}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{selectedPromotion.content?.description}</p>
                      <div className="flex items-center space-x-2">
                        <Badge className="capitalize">{selectedPromotion.contentType}</Badge>
                        <Badge className={getStatusColor(selectedPromotion.status)}>
                          {selectedPromotion.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-foreground mb-2">Provider Information</h5>
                      <p className="text-sm text-muted-foreground">{selectedPromotion.provider?.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPromotion.provider?.firstName} {selectedPromotion.provider?.lastName}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Promotion Details */}
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b border-green-200">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Star className="h-5 w-5 text-green-600" />
                    Promotion Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Package</span>
                        <span className="font-medium">{selectedPromotion.packageName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Investment</span>
                        <span className="font-medium">{formatCurrency(selectedPromotion.investment || selectedPromotion.price || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">{selectedPromotion.duration} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Payment Status</span>
                        <Badge className={getPaymentStatusColor(selectedPromotion.paymentStatus)}>
                          {selectedPromotion.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Start Date</span>
                        <span className="font-medium">{formatDate(selectedPromotion.startDate)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">End Date</span>
                        <span className="font-medium">{formatDate(selectedPromotion.endDate)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span className="font-medium">{formatDate(selectedPromotion.createdAt)}</span>
                      </div>
                      {selectedPromotion.customDuration && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Custom Duration</span>
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
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{selectedPromotion.analytics.views}</div>
                      <div className="text-sm text-muted-foreground">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedPromotion.analytics.likes}</div>
                      <div className="text-sm text-muted-foreground">Likes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{selectedPromotion.analytics.saves}</div>
                      <div className="text-sm text-muted-foreground">Saves</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{selectedPromotion.analytics.engagementRate}%</div>
                      <div className="text-sm text-muted-foreground">Engagement</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              {(selectedPromotion.paymentStatus === 'awaiting_verification' || selectedPromotion.paymentStatus === 'paid') && (
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b border-green-200">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Payment Status</span>
                          <Badge className={getPaymentStatusColor(selectedPromotion.paymentStatus)}>
                            {selectedPromotion.paymentStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-medium">{formatCurrency(selectedPromotion.paymentAmount || selectedPromotion.investment || selectedPromotion.price || 0)}</span>
                        </div>
                        {selectedPromotion.paymentReference && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Payment Reference</span>
                            <span className="font-medium font-mono text-sm">{selectedPromotion.paymentReference}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        {selectedPromotion.paymentReceipt && (
                          <div>
                            <span className="text-muted-foreground block mb-2">Payment Receipt</span>
                            <a 
                              href={selectedPromotion.paymentReceipt} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:text-foreground underline"
                            >
                              View Receipt
                            </a>
                          </div>
                        )}
                        {selectedPromotion.paymentMethod && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Payment Method</span>
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
                  <CardHeader className="bg-muted/40 border-b border-border">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-foreground">{selectedPromotion.notes}</p>
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
                      className="bg-green-600 hover:bg-green-700 text-foreground"
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
                      className="bg-green-600 hover:bg-green-700 text-foreground"
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
    </AdminShell>
  )
}
