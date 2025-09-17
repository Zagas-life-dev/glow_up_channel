"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  Clock, 
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  AlertTriangle,
  Users
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface PendingUser {
  _id: string
  email: string
  role: string
  status: string
  createdAt: string
}

export default function PendingUsers() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [roleFilter, setRoleFilter] = useState("all")
  
  // Actions
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
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
    if (!isLoading && isAuthenticated && user) {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        setError('Access denied. Admin privileges required.')
        setLoading(false)
        return
      }
      fetchPendingUsers()
    }
  }, [isLoading, isAuthenticated, user, currentPage, roleFilter])

  const fetchPendingUsers = async () => {
    try {
      setLoading(true)
      const role = roleFilter === "all" ? undefined : roleFilter || undefined
      const data = await ApiClient.getPendingUsers(currentPage, 10, role)
      setPendingUsers(data.users)
      setTotalPages(data.pagination.totalPages)
      setTotalCount(data.pagination.totalCount)
    } catch (error: any) {
      console.error('Error fetching pending users:', error)
      setError(error.message || 'Failed to load pending users')
      toast.error('Failed to load pending users')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      setActionLoading(userId)
      await ApiClient.approveUser(userId)
      toast.success('User approved successfully')
      fetchPendingUsers()
    } catch (error: any) {
      console.error('Error approving user:', error)
      toast.error(error.message || 'Failed to approve user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!selectedUser || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    try {
      setActionLoading(selectedUser._id)
      await ApiClient.rejectUser(selectedUser._id, rejectionReason)
      toast.success('User rejected successfully')
      setShowRejectDialog(false)
      setRejectionReason("")
      setSelectedUser(null)
      fetchPendingUsers()
    } catch (error: any) {
      console.error('Error rejecting user:', error)
      toast.error(error.message || 'Failed to reject user')
    } finally {
      setActionLoading(null)
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
            <Clock className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <p className="text-lg text-gray-600">Loading pending users...</p>
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
                <Link href="/dashboard/admin/users">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Link>
              </Button>
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-orange-600" />
                <h1 className="text-2xl font-bold text-gray-900">Pending Users</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={fetchPendingUsers}>
                <Clock className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Filter by Role</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="All pending roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pending roles</SelectItem>
                  <SelectItem value="opportunity_seeker">Opportunity Seeker</SelectItem>
                  <SelectItem value="opportunity_poster">Opportunity Poster</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setRoleFilter("")
                  setCurrentPage(1)
                }}
              >
                Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {totalCount} user{totalCount !== 1 ? 's' : ''} pending approval
          </p>
        </div>

        {/* Pending Users */}
        <Card>
          <CardContent className="p-0">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending users</h3>
                <p className="text-gray-600">All users have been reviewed and processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingUsers.map((pendingUser) => (
                      <tr key={pendingUser._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{pendingUser.email}</div>
                            <div className="text-sm text-gray-500">
                              ID: {pendingUser._id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(pendingUser.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(pendingUser.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(pendingUser._id)}
                              disabled={actionLoading === pendingUser._id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              {actionLoading === pendingUser._id ? 'Approving...' : 'Approve'}
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedUser(pendingUser)
                                setShowRejectDialog(true)
                              }}
                              disabled={actionLoading === pendingUser._id}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/dashboard/admin/users/${pendingUser._id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reject User Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this user. This will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Rejection Reason
              </label>
              <Textarea
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setRejectionReason("")
                setSelectedUser(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading === selectedUser?._id}
            >
              {actionLoading === selectedUser?._id ? 'Rejecting...' : 'Reject User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
