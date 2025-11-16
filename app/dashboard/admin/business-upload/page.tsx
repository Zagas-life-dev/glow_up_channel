"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { 
  Users, 
  FileText, 
  Image, 
  Download, 
  Eye, 
  Search,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Filter,
  X,
  AlertTriangle,
  UserCheck,
  UserX,
  Ban
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface PosterData {
  _id: string
  userId: string
  user: {
    _id: string
    firstName: string
    lastName: string
    email: string
    role: string
    status: string
    isApproved: boolean
    createdAt: string
  }
  organizationName: string
  providerType?: string
  contactPersonName: string
  contactPersonRole?: string
  providerAddress?: string
  officialEmail: string
  phoneNumber?: string
  stateOfOperation?: string
  yearEstablished?: string
  website?: string
  isRegistered: boolean
  registrationNumber?: string
  verificationDocumentUrl?: string
  organizationLogoUrl?: string
  aboutOrganization?: string
  isOnboardingCompleted: boolean
  completionPercentage: number
  hasDocuments: boolean
  hasVerificationDoc: boolean
  hasLogo: boolean
  isApproved: boolean
  approvalStatus: string
  onboardingCreatedAt?: string
  onboardingUpdatedAt?: string
  onboardingCompletedAt?: string
  userCreatedAt: string
}

interface Stats {
  total: number
  approved: number
  pending: number
  onboardingCompleted: number
  hasDocuments: number
}

export default function PostersDetailsPage() {
  const { user, isAuthenticated } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [posters, setPosters] = useState<PosterData[]>([])
  const [filteredPosters, setFilteredPosters] = useState<PosterData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<Stats | null>(null)
  const [approvalFilter, setApprovalFilter] = useState<string>('all')
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all')
  const [documentsFilter, setDocumentsFilter] = useState<string>('all')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [selectedPoster, setSelectedPoster] = useState<PosterData | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
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

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login'
    } else if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      window.location.href = '/dashboard'
    }
  }, [isAuthenticated, user])

  // Fetch poster data
  useEffect(() => {
    const fetchPosters = async () => {
      try {
        setLoading(true)
        
        const response = await ApiClient.getAllPostersDetails()
        
        if (response.success) {
          setPosters(response.posters || [])
          setFilteredPosters(response.posters || [])
          setStats(response.stats || null)
        } else {
          throw new Error(response.message || 'Failed to fetch posters')
        }
      } catch (error: any) {
        console.error('Error fetching posters:', error)
        toast.error(`Failed to fetch poster data: ${error.message || 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
      fetchPosters()
    }
  }, [isAuthenticated, user])

  // Filter posters based on search term and filters
  useEffect(() => {
    let filtered = [...posters]

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase()
      filtered = filtered.filter(poster =>
        poster.organizationName.toLowerCase().includes(query) ||
        poster.contactPersonName.toLowerCase().includes(query) ||
        poster.officialEmail.toLowerCase().includes(query) ||
        poster.user.email.toLowerCase().includes(query) ||
        (poster.stateOfOperation && poster.stateOfOperation.toLowerCase().includes(query))
      )
    }

    // Approval filter
    if (approvalFilter === 'approved') {
      filtered = filtered.filter(p => p.isApproved)
    } else if (approvalFilter === 'pending') {
      filtered = filtered.filter(p => !p.isApproved)
    }

    // Onboarding filter
    if (onboardingFilter === 'completed') {
      filtered = filtered.filter(p => p.isOnboardingCompleted)
    } else if (onboardingFilter === 'incomplete') {
      filtered = filtered.filter(p => !p.isOnboardingCompleted)
    }

    // Documents filter
    if (documentsFilter === 'has') {
      filtered = filtered.filter(p => p.hasDocuments)
    } else if (documentsFilter === 'missing') {
      filtered = filtered.filter(p => !p.hasDocuments)
    }

    setFilteredPosters(filtered)
  }, [searchTerm, approvalFilter, onboardingFilter, documentsFilter, posters])

  const toggleFolder = (posterId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(posterId)) {
      newExpanded.delete(posterId)
    } else {
      newExpanded.add(posterId)
    }
    setExpandedFolders(newExpanded)
  }

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const getStatusBadge = (poster: PosterData) => {
    if (poster.isOnboardingCompleted) {
      return <Badge className="bg-green-100 text-green-800">Onboarding Complete</Badge>
    } else if (poster.completionPercentage > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>
    }
  }

  const getApprovalBadge = (poster: PosterData) => {
    if (poster.isApproved) {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>
    } else {
      return <Badge className="bg-orange-100 text-orange-800">Pending Approval</Badge>
    }
  }

  const openDocument = (url: string, filename: string) => {
    window.open(url, '_blank')
  }

  const downloadDocument = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setApprovalFilter('all')
    setOnboardingFilter('all')
    setDocumentsFilter('all')
  }

  const handleApprove = async (poster: PosterData) => {
    try {
      const userId = typeof poster.userId === 'string' ? poster.userId : poster.user._id
      setActionLoading(userId)
      await ApiClient.approveUser(userId)
      toast.success('Poster approved successfully')
      // Refresh the data
      const response = await ApiClient.getAllPostersDetails()
      if (response.success) {
        setPosters(response.posters || [])
        setFilteredPosters(response.posters || [])
        setStats(response.stats || null)
      }
    } catch (error: any) {
      console.error('Error approving poster:', error)
      toast.error(error.message || 'Failed to approve poster')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!selectedPoster || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    try {
      const userId = typeof selectedPoster.userId === 'string' ? selectedPoster.userId : selectedPoster.user._id
      setActionLoading(userId)
      await ApiClient.rejectUser(userId, rejectionReason)
      toast.success('Poster rejected successfully')
      setShowRejectDialog(false)
      setRejectionReason('')
      setSelectedPoster(null)
      // Refresh the data
      const response = await ApiClient.getAllPostersDetails()
      if (response.success) {
        setPosters(response.posters || [])
        setFilteredPosters(response.posters || [])
        setStats(response.stats || null)
      }
    } catch (error: any) {
      console.error('Error rejecting poster:', error)
      toast.error(error.message || 'Failed to reject poster')
    } finally {
      setActionLoading(null)
    }
  }

  const handleTerminate = async () => {
    if (!selectedPoster || !rejectionReason.trim()) {
      toast.error('Please provide a termination reason')
      return
    }

    try {
      const userId = typeof selectedPoster.userId === 'string' ? selectedPoster.userId : selectedPoster.user._id
      setActionLoading(userId)
      await ApiClient.rejectUser(userId, `Terminated: ${rejectionReason}`)
      toast.success('Poster approval terminated successfully')
      setShowTerminateDialog(false)
      setRejectionReason('')
      setSelectedPoster(null)
      // Refresh the data
      const response = await ApiClient.getAllPostersDetails()
      if (response.success) {
        setPosters(response.posters || [])
        setFilteredPosters(response.posters || [])
        setStats(response.stats || null)
      }
    } catch (error: any) {
      console.error('Error terminating poster approval:', error)
      toast.error(error.message || 'Failed to terminate poster approval')
    } finally {
      setActionLoading(null)
    }
  }

  const openRejectDialog = (poster: PosterData) => {
    setSelectedPoster(poster)
    setRejectionReason('')
    setShowRejectDialog(true)
  }

  const openTerminateDialog = (poster: PosterData) => {
    setSelectedPoster(poster)
    setRejectionReason('')
    setShowTerminateDialog(true)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-lg text-gray-600">Please log in to access this page</p>
        </div>
      </div>
    )
  }

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-lg text-gray-600">Access denied. Admin privileges required.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg text-gray-600">Loading poster details...</p>
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
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-orange-600" />
                <h1 className="text-2xl font-bold text-gray-900">Posters Details</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/admin">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Posters</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Onboarding Complete</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.onboardingCompleted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">With Documents</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.hasDocuments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Search & Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search posters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                <SelectTrigger>
                  <Shield className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Approval Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Approval Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
                <SelectTrigger>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Onboarding Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Onboarding Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
              <Select value={documentsFilter} onValueChange={setDocumentsFilter}>
                <SelectTrigger>
                  <FileText className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Documents Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents Status</SelectItem>
                  <SelectItem value="has">Has Documents</SelectItem>
                  <SelectItem value="missing">Missing Documents</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || approvalFilter !== 'all' || onboardingFilter !== 'all' || documentsFilter !== 'all') && (
              <div className="mt-4 flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
                <span className="text-sm text-gray-600">
                  Showing {filteredPosters.length} of {posters.length} posters
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Posters List */}
        <div className="space-y-4">
          {filteredPosters.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {posters.length === 0 
                    ? 'No poster data found. Posters will appear here once users register as opportunity posters.'
                    : 'No posters match your search criteria.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPosters.map((poster) => (
              <Card key={poster._id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFolder(poster._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Building2 className={`w-5 h-5 text-orange-600 transition-transform ${
                        expandedFolders.has(poster._id) ? 'rotate-90' : ''
                      }`} />
                      <div>
                        <CardTitle className="text-lg">{poster.organizationName}</CardTitle>
                        <p className="text-sm text-gray-600">
                          {poster.contactPersonName} {poster.providerType && `• ${poster.providerType}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getApprovalBadge(poster)}
                      {getStatusBadge(poster)}
                      <Badge variant="outline">{poster.completionPercentage}%</Badge>
                    </div>
                  </div>
                </CardHeader>

                {expandedFolders.has(poster._id) && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Organization Details */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                          <Building2 className="w-4 h-4" />
                          <span>Organization Details</span>
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">Contact Person:</span>
                            <span>{poster.contactPersonName} {poster.contactPersonRole && `(${poster.contactPersonRole})`}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">Email:</span>
                            <span>{poster.officialEmail}</span>
                          </div>
                          {poster.phoneNumber && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">Phone:</span>
                              <span>{poster.phoneNumber}</span>
                            </div>
                          )}
                          {poster.stateOfOperation && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">State:</span>
                              <span>{poster.stateOfOperation}</span>
                            </div>
                          )}
                          {poster.yearEstablished && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">Established:</span>
                              <span>{poster.yearEstablished}</span>
                            </div>
                          )}
                          {poster.website && (
                            <div className="flex items-center space-x-2">
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">Website:</span>
                              <a 
                                href={poster.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-orange-600 hover:underline"
                              >
                                {poster.website}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Registration Details */}
                        <div className="pt-4 border-t">
                          <h5 className="font-semibold text-gray-900 flex items-center space-x-2 mb-2">
                            <Shield className="w-4 h-4" />
                            <span>Registration Status</span>
                          </h5>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Registered:</span> {poster.isRegistered ? 'Yes' : 'No'}</p>
                            {poster.isRegistered && poster.registrationNumber && (
                              <p><span className="font-medium">Registration Number:</span> {poster.registrationNumber}</p>
                            )}
                          </div>
                        </div>

                        {/* User Account Details */}
                        <div className="pt-4 border-t">
                          <h5 className="font-semibold text-gray-900 flex items-center space-x-2 mb-2">
                            <User className="w-4 h-4" />
                            <span>User Account</span>
                          </h5>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Name:</span> {poster.user.firstName} {poster.user.lastName}</p>
                            <p><span className="font-medium">Email:</span> {poster.user.email}</p>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Status:</span>
                              {getApprovalBadge(poster)}
                            </div>
                            <p><span className="font-medium">Account Created:</span> {formatDate(poster.userCreatedAt)}</p>
                          </div>
                          
                          {/* Approval Actions */}
                          <div className="mt-4 pt-4 border-t">
                            <h6 className="text-sm font-semibold text-gray-900 mb-2">Approval Actions</h6>
                            <div className="flex flex-wrap gap-2">
                              {!poster.isApproved ? (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApprove(poster)}
                                  disabled={actionLoading === (typeof poster.userId === 'string' ? poster.userId : poster.user._id)}
                                >
                                  <UserCheck className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openTerminateDialog(poster)}
                                    disabled={actionLoading === (typeof poster.userId === 'string' ? poster.userId : poster.user._id)}
                                  >
                                    <Ban className="w-4 h-4 mr-1" />
                                    Terminate Approval
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => openRejectDialog(poster)}
                                disabled={actionLoading === (typeof poster.userId === 'string' ? poster.userId : poster.user._id)}
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Documents and Status */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>Uploaded Documents</span>
                        </h4>

                        {/* Verification Document */}
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-gray-700">Verification Document</h5>
                          {poster.verificationDocumentUrl ? (
                            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                              <FileText className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-800 flex-1">Document uploaded</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDocument(poster.verificationDocumentUrl!, 'verification-document')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadDocument(poster.verificationDocumentUrl!, 'verification-document')}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <XCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">No document uploaded</span>
                            </div>
                          )}
                        </div>

                        {/* Organization Logo */}
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-gray-700">Organization Logo</h5>
                          {poster.organizationLogoUrl ? (
                            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                              <Image className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-800 flex-1">Logo uploaded</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDocument(poster.organizationLogoUrl!, 'organization-logo')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadDocument(poster.organizationLogoUrl!, 'organization-logo')}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <XCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">No logo uploaded</span>
                            </div>
                          )}
                        </div>

                        {/* About Organization */}
                        {poster.aboutOrganization && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-gray-700">About Organization</h5>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              {poster.aboutOrganization}
                            </p>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
                          {poster.onboardingCreatedAt && (
                            <p>Onboarding Started: {formatDate(poster.onboardingCreatedAt)}</p>
                          )}
                          {poster.onboardingUpdatedAt && (
                            <p>Last Updated: {formatDate(poster.onboardingUpdatedAt)}</p>
                          )}
                          {poster.onboardingCompletedAt && (
                            <p>Completed: {formatDate(poster.onboardingCompletedAt)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Poster</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this poster. This action will set their status to rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setRejectionReason('')
                setSelectedPoster(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading === (selectedPoster ? (typeof selectedPoster.userId === 'string' ? selectedPoster.userId : selectedPoster.user._id) : null)}
            >
              {actionLoading === (selectedPoster ? (typeof selectedPoster.userId === 'string' ? selectedPoster.userId : selectedPoster.user._id) : null) ? 'Rejecting...' : 'Reject Poster'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Approval Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Poster Approval</DialogTitle>
            <DialogDescription>
              Please provide a reason for terminating this poster's approval. This action will revoke their approved status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Termination Reason</label>
              <Textarea
                placeholder="Enter the reason for terminating approval..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTerminateDialog(false)
                setRejectionReason('')
                setSelectedPoster(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={!rejectionReason.trim() || actionLoading === (selectedPoster ? (typeof selectedPoster.userId === 'string' ? selectedPoster.userId : selectedPoster.user._id) : null)}
            >
              {actionLoading === (selectedPoster ? (typeof selectedPoster.userId === 'string' ? selectedPoster.userId : selectedPoster.user._id) : null) ? 'Terminating...' : 'Terminate Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

