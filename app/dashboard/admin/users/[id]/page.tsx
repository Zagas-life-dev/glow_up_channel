"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ChevronLeft,
  User,
  Mail,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  Eye,
  EyeOff
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useParams } from "next/navigation"

interface UserDetails {
  user: {
    _id: string
    email: string
    role: string
    status: string
    isActive: boolean
    emailVerified: boolean
    createdAt: string
    updatedAt: string
    lastLogin?: string
    approvedAt?: string
    approvedBy?: string
    rejectionReason?: string
  }
  profile?: {
    country?: string
    province?: string
    city?: string
    careerStage?: string
    educationLevel?: string
    fieldOfStudy?: string
    institution?: string
    interests?: string[]
    industrySectors?: string[]
    skills?: string[]
    aspirations?: string[]
    completionPercentage?: number
    onboardingCompleted?: boolean
  }
  preferences?: any
}

export default function UserDetailsPage() {
  const { user: currentUser, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const params = useParams()
  const userId = params.id as string
  
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser) {
      if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        setError('Access denied. Admin privileges required.')
        setLoading(false)
        return
      }
      fetchUserDetails()
    }
  }, [isLoading, isAuthenticated, currentUser, userId])

  const fetchUserDetails = async () => {
    try {
      setLoading(true)
      const data = await ApiClient.getUserDetails(userId)
      setUserDetails(data)
    } catch (error: any) {
      console.error('Error fetching user details:', error)
      setError(error.message || 'Failed to load user details')
      toast.error('Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!userDetails?.user) return
    
    try {
      setActionLoading('approve')
      await ApiClient.approveUser(userDetails.user._id)
      toast.success('User approved successfully')
      fetchUserDetails()
    } catch (error: any) {
      console.error('Error approving user:', error)
      toast.error(error.message || 'Failed to approve user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleStatus = async () => {
    if (!userDetails?.user) return
    
    try {
      setActionLoading('toggle')
      await ApiClient.toggleUserStatus(userDetails.user._id, !userDetails.user.isActive)
      toast.success(`User ${!userDetails.user.isActive ? 'activated' : 'deactivated'} successfully`)
      fetchUserDetails()
    } catch (error: any) {
      console.error('Error toggling user status:', error)
      toast.error(error.message || 'Failed to update user status')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    const roleColors = {
      'opportunity_seeker': 'bg-blue-100 text-blue-800',
      'opportunity_poster': 'bg-purple-100 text-purple-800',
      'admin': 'bg-orange-100 text-orange-800',
      'super_admin': 'bg-red-100 text-red-800'
    }
    
    const roleDisplay = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    return (
      <Badge variant="outline" className={roleColors[role as keyof typeof roleColors] || ''}>
        {roleDisplay}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <User className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <p className="text-lg text-gray-600">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin')) {
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

  if (error || !userDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'User not found'}</p>
          <div className="flex space-x-4">
            <Button onClick={fetchUserDetails}>Try Again</Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/admin/users">Back to Users</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { user, profile, preferences } = userDetails

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/admin/users">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Link>
              </Button>
              <div className="flex items-center space-x-2">
                <User className="h-8 w-8 text-orange-600" />
                <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={fetchUserDetails}>
                <User className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main User Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Basic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{user.email}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <div className="mt-1">
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(user.status)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Account Status</label>
                    <div className="flex items-center space-x-2 mt-1">
                      {user.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-900">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email Verified</label>
                    <div className="flex items-center space-x-2 mt-1">
                      {user.emailVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-900">
                        {user.emailVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Login</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Information */}
            {profile && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.country && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Country</label>
                        <p className="text-sm text-gray-900 mt-1">{profile.country}</p>
                      </div>
                    )}
                    
                    {profile.province && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Province</label>
                        <p className="text-sm text-gray-900 mt-1">{profile.province}</p>
                      </div>
                    )}
                    
                    {profile.city && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">City</label>
                        <p className="text-sm text-gray-900 mt-1">{profile.city}</p>
                      </div>
                    )}
                    
                    {profile.careerStage && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Career Stage</label>
                        <p className="text-sm text-gray-900 mt-1">{profile.careerStage}</p>
                      </div>
                    )}
                    
                    {profile.educationLevel && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Education Level</label>
                        <p className="text-sm text-gray-900 mt-1">{profile.educationLevel}</p>
                      </div>
                    )}
                    
                    {profile.fieldOfStudy && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Field of Study</label>
                        <p className="text-sm text-gray-900 mt-1">{profile.fieldOfStudy}</p>
                      </div>
                    )}
                    
                    {profile.institution && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Institution</label>
                        <p className="text-sm text-gray-900 mt-1">{profile.institution}</p>
                      </div>
                    )}
                    
                    {profile.completionPercentage !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Profile Completion</label>
                        <p className="text-sm text-gray-900 mt-1">{profile.completionPercentage}%</p>
                      </div>
                    )}
                  </div>
                  
                  {profile.interests && profile.interests.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Interests</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {profile.interests.map((interest, index) => (
                          <Badge key={index} variant="outline">{interest}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {profile.skills && profile.skills.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Skills</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {profile.skills.map((skill, index) => (
                          <Badge key={index} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions & Timeline */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.status === 'pending' && (
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading === 'approve'}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    {actionLoading === 'approve' ? 'Approving...' : 'Approve User'}
                  </Button>
                )}
                
                <Button
                  onClick={handleToggleStatus}
                  disabled={actionLoading === 'toggle'}
                  variant={user.isActive ? "destructive" : "default"}
                  className="w-full"
                >
                  {user.isActive ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      {actionLoading === 'toggle' ? 'Deactivating...' : 'Deactivate User'}
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      {actionLoading === 'toggle' ? 'Activating...' : 'Activate User'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Account Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Account Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Account Created</p>
                    <p className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {user.approvedAt && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Account Approved</p>
                      <p className="text-xs text-gray-500">{new Date(user.approvedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {user.lastLogin && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Last Login</p>
                      <p className="text-xs text-gray-500">{new Date(user.lastLogin).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Updated</p>
                    <p className="text-xs text-gray-500">{new Date(user.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rejection Reason */}
            {user.rejectionReason && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Rejection Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{user.rejectionReason}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
