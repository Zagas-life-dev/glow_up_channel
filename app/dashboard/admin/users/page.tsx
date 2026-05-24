"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AdminLayout } from "@/components/admin-sidebar"
import { AuthRequiredCard } from "@/components/auth-required-card"
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
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"
import { RiEyeLine } from "react-icons/ri"
import {
  RiUserLine,
  RiSearchLine,
  RiFilterLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiUserReceivedLine,
  RiUserUnfollowLine,
  RiErrorWarningLine,
  RiDownloadLine,
  RiFileLine,
  RiShieldLine,
  RiSettingsLine,
  RiHomeLine,
  RiLayoutLine,
  RiBarChartBoxLine,
  RiMenuLine,
  RiCloseLine,
  RiRefreshLine,
  RiTimeLine,
  RiUserSettingsLine,
} from "react-icons/ri"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

function safeFormatDistanceToNow(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "N/A"
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return "N/A"
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return "N/A"
  }
}

const Users = RiUserLine
const Search = RiSearchLine
const Filter = RiFilterLine
const CheckCircle = RiCheckboxCircleLine
const XCircle = RiCloseCircleLine
const Eye = RiEyeLine
const ChevronLeft = RiArrowLeftLine
const ChevronRight = RiArrowRightLine
const UserCheck = RiUserReceivedLine
const UserX = RiUserUnfollowLine
const AlertTriangle = RiErrorWarningLine
const Download = RiDownloadLine
const FileSpreadsheet = RiFileLine
const Settings = RiSettingsLine
const FileText = RiFileLine
const BarChart3 = RiBarChartBoxLine
const RefreshCw = RiRefreshLine
const Clock = RiTimeLine

interface User {
  _id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  status: string
  isActive: boolean
  createdAt: string
  approvedAt?: string
  approvedBy?: string
  rejectionReason?: string
}

const ROLES = [
  { value: "user", label: "User" },
  { value: "opportunity_seeker", label: "Opportunity Seeker" },
  { value: "opportunity_poster", label: "Opportunity Poster" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
] as const

export default function UserManagement() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Role swap
  const [roleSwapUser, setRoleSwapUser] = useState<User | null>(null)
  const [roleSwapNewRole, setRoleSwapNewRole] = useState<string>("user")
  const [isRoleSwapDialogOpen, setIsRoleSwapDialogOpen] = useState(false)
  const [isRoleSwapSubmitting, setIsRoleSwapSubmitting] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

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
    if (!authLoading && isAuthenticated && user) {
      if (user.role !== 'super_admin') {
        setError('Access denied. Super admin privileges required for user management.')
        setLoading(false)
        return
      }
      fetchUsers()
    }
  }, [authLoading, isAuthenticated, user, currentPage, searchQuery, roleFilter, statusFilter])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = {
        role: roleFilter === "all" ? undefined : roleFilter || undefined,
        status: statusFilter === "all" ? undefined : statusFilter || undefined,
        search: searchQuery || undefined
      }
      
      const data = await ApiClient.getAllUsers(currentPage, 20, filters)
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
      setTotalCount(data.pagination.totalCount)

      // Calculate stats from users
      const pending = data.users.filter((u: User) => u.status === 'pending').length
      const approved = data.users.filter((u: User) => u.status === 'approved').length
      const rejected = data.users.filter((u: User) => u.status === 'rejected').length
      
      setStats({
        total: data.pagination.totalCount,
        pending,
        approved,
        rejected
      })
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setError(error.message || 'Failed to load users')
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, roleFilter, statusFilter])

  const handleApprove = async (userId: string) => {
    try {
      setActionLoading(userId)
      await ApiClient.approveUser(userId)
      toast.success('User approved successfully')
      fetchUsers()
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
      fetchUsers()
    } catch (error: any) {
      console.error('Error rejecting user:', error)
      toast.error(error.message || 'Failed to reject user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownload = async (format: 'excel') => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        toast.error('Authentication required')
        return
      }

      const formatMap = {
        excel: { endpoint: 'excel', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' }
      }

      const formatInfo = formatMap[format]

      const response = await ApiClient.makeAuthenticatedRequest(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/api/admin/users/export/${formatInfo.endpoint}`,
        {
          method: 'GET'
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to download ${format.toUpperCase()}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.${formatInfo.extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`${format.toUpperCase()} file downloaded successfully`)
    } catch (error: any) {
      console.error(`Error downloading ${format}:`, error)
      toast.error(error.message || `Failed to download ${format.toUpperCase()}`)
    }
  }

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      setActionLoading(userId)
      await ApiClient.toggleUserStatus(userId, isActive)
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`)
      fetchUsers()
    } catch (error: any) {
      console.error('Error toggling user status:', error)
      toast.error(error.message || 'Failed to update user status')
    } finally {
      setActionLoading(null)
    }
  }

  const openRoleSwapDialog = (userItem: User) => {
    setRoleSwapUser(userItem)
    setRoleSwapNewRole(userItem.role)
    setIsRoleSwapDialogOpen(true)
  }

  const handleRoleSwap = async () => {
    if (!roleSwapUser || roleSwapNewRole === roleSwapUser.role) {
      if (roleSwapNewRole === roleSwapUser?.role) {
        toast.info("Select a different role to change.")
      }
      return
    }
    if (!roleSwapUser.email?.trim()) {
      toast.error("Cannot update role: user has no email.")
      return
    }

    setIsRoleSwapSubmitting(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"
      // Backend requires all four fields to be non-empty; some users may have missing firstName/lastName
      const firstName = (roleSwapUser.firstName ?? "").trim() || roleSwapUser.email?.split("@")[0] || "User"
      const lastName = (roleSwapUser.lastName ?? "").trim() || "—"
      const response = await ApiClient.makeAuthenticatedRequest(`${baseUrl}/api/admin/users/${roleSwapUser._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: roleSwapUser.email,
          role: roleSwapNewRole,
        }),
      })

      const data = await response.json()
      if (data.success) {
        const roleLabel = ROLES.find((r) => r.value === roleSwapNewRole)?.label ?? roleSwapNewRole
        toast.success(`Role updated to ${roleLabel}`)
        setIsRoleSwapDialogOpen(false)
        setRoleSwapUser(null)
        fetchUsers()
      } else {
        throw new Error(data.message || "Failed to update role")
      }
    } catch (error: any) {
      console.error("Error updating role:", error)
      toast.error(error?.message || "Failed to update role")
    } finally {
      setIsRoleSwapSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline" className="border-border text-muted-foreground">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      'opportunity_seeker': 'bg-primary/20 text-primary border-primary/30',
      'opportunity_poster': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'admin': 'bg-primary/20 text-orange-400 border-orange-500/30',
      'super_admin': 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    
    const roleDisplay = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    return (
      <Badge className={cn("border", roleColors[role] || "bg-muted text-muted-foreground border-border")}>
        {roleDisplay}
      </Badge>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredCard
        title="Authentication required"
        description="Please log in to access this page."
        icon={Lock}
        signInLabel="Sign in"
      />
    )
  }

  if (user?.role !== 'super_admin') {
    return (
      <AuthRequiredCard
        title="Access denied"
        description="Super admin privileges required for user management."
        icon={Lock}
        iconVariant="neutral"
        signInLabel="Sign in"
        secondaryAction={{ label: "Back to Admin", href: "/dashboard/admin" }}
      />
    )
  }

  return (
    <>
    <AdminLayout
      pageTitle="Users"
      pageSubtitle={`${totalCount} total`}
      PageIcon={RiUserLine}
      onRefresh={fetchUsers}
      refreshLoading={loading}
      backHref="/dashboard/admin"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Link href="/dashboard/admin" className="flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Link>
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                    <p className="text-sm text-muted-foreground">{totalCount} total users</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('excel')}
                  disabled={loading}
                  className="rounded-2xl border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers()}
                  disabled={loading}
                  className="rounded-2xl border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
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
              <div className="rounded-xl border p-4 bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-primary">{stats.total.toLocaleString()}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary/50" />
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Pending</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.pending.toLocaleString()}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-400/50" />
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Approved</p>
                    <p className="text-2xl font-bold text-emerald-400">{stats.approved.toLocaleString()}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-400/50" />
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Rejected</p>
                    <p className="text-2xl font-bold text-red-400">{stats.rejected.toLocaleString()}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-400/50" />
                </div>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-6 bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Filter className="h-5 w-5 text-orange-400" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Role</label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="bg-muted border-border text-foreground">
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-border">
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="opportunity_seeker">Opportunity Seeker</SelectItem>
                        <SelectItem value="opportunity_poster">Opportunity Poster</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-muted border-border text-foreground">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-border">
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchQuery("")
                        setRoleFilter("all")
                        setStatusFilter("all")
                        setCurrentPage(1)
                      }}
                      className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Summary */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Showing {users.length} of {totalCount} users
              </p>
            </div>

            {/* Users List - Card Based for Mobile */}
            {loading && users.length === 0 ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="bg-card border-border">
                    <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-muted rounded w-32" />
                        <div className="h-6 bg-muted rounded w-16" />
                      </div>
                      <div className="h-3 bg-muted rounded w-24" />
                    </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : users.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {users.map((userItem) => (
                  <Card key={userItem._id} className="bg-card border-border hover:bg-muted transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0">
                              {(userItem.firstName?.charAt(0) || userItem.email?.charAt(0) || '?').toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {userItem.firstName && userItem.lastName 
                                    ? `${userItem.firstName} ${userItem.lastName}`
                                    : userItem.email}
                                </p>
                                {userItem.firstName && (
                                  <p className="text-xs text-muted-foreground truncate">{userItem.email}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getRoleBadge(userItem.role)}
                                {getStatusBadge(userItem.status)}
                                <Badge variant="outline" className={cn(
                                  "border text-xs",
                                  userItem.isActive 
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                    : "bg-muted text-muted-foreground border-border"
                                )}>
                                  {userItem.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Joined {safeFormatDistanceToNow(userItem.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {userItem.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(userItem._id)}
                                disabled={actionLoading === userItem._id}
                                className="bg-emerald-500 hover:bg-emerald-600 text-foreground flex-1 sm:flex-initial"
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(userItem)
                                  setShowRejectDialog(true)
                                }}
                                disabled={actionLoading === userItem._id}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex-1 sm:flex-initial"
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRoleSwapDialog(userItem)}
                            disabled={actionLoading === userItem._id}
                            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted flex-1 sm:flex-initial"
                            title="Change role"
                          >
                            <RiUserSettingsLine className="h-4 w-4 mr-1" />
                            Change role
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(userItem._id, !userItem.isActive)}
                            disabled={actionLoading === userItem._id}
                            className={cn(
                              "border flex-1 sm:flex-initial",
                              userItem.isActive 
                                ? "border-red-500/30 text-red-400 hover:bg-red-500/10" 
                                : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            )}
                          >
                            {userItem.isActive ? (
                              <>
                                <UserX className="h-4 w-4 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                          
                          <Button asChild size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted">
                            <Link href={`/dashboard/admin/users/${userItem._id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
    </AdminLayout>

      {/* Role Swap Dialog */}
      <Dialog
        open={isRoleSwapDialogOpen}
        onOpenChange={(open) => {
          setIsRoleSwapDialogOpen(open)
          if (!open) setRoleSwapUser(null)
        }}
      >
        <DialogContent className="bg-surface border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <RiUserSettingsLine className="h-5 w-5" />
              Change user role
            </DialogTitle>
          </DialogHeader>
          {roleSwapUser && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set role for{" "}
                <span className="font-medium text-foreground">
                  {roleSwapUser.firstName && roleSwapUser.lastName
                    ? `${roleSwapUser.firstName} ${roleSwapUser.lastName}`
                    : roleSwapUser.email}
                </span>{" "}
                ({roleSwapUser.email}).
              </p>
              <div className="space-y-2">
                <Label className="text-foreground">Role</Label>
                <Select
                  value={roleSwapNewRole}
                  onValueChange={(value) => setRoleSwapNewRole(value)}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {roleSwapUser._id === user?._id && roleSwapNewRole !== "super_admin" && (
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
                  Changing your own role may lock you out. Only Super Admin can access this page.
                </p>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsRoleSwapDialogOpen(false)}
                  className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRoleSwap}
                  disabled={isRoleSwapSubmitting || roleSwapNewRole === roleSwapUser.role}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isRoleSwapSubmitting ? "Updating…" : "Update role"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject User Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reject User</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Please provide a reason for rejecting this user. This will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Rejection Reason
              </label>
              <Textarea
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
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
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading === selectedUser?._id}
              className="bg-red-500 hover:bg-red-600"
            >
              {actionLoading === selectedUser?._id ? 'Rejecting...' : 'Reject User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
