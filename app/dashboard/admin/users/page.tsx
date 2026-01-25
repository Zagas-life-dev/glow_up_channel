"use client"

import { useState, useEffect, useCallback } from "react"
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { Textarea } from "@/components/ui/textarea"
import { 
  Users, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Shield,
  Settings,
  Home,
  LayoutDashboard,
  FileText,
  BarChart3,
  Menu,
  X,
  RefreshCw,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

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

export default function UserManagement() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const router = useRouter()
  const pathname = usePathname()
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
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        setError('Access denied. Admin privileges required.')
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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/api/admin/users/export/${formatInfo.endpoint}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline" className="border-white/10 text-white/60">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      'opportunity_seeker': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'opportunity_poster': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'admin': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'super_admin': 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    
    const roleDisplay = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    return (
      <Badge className={cn("border", roleColors[role] || "bg-white/10 text-white/60 border-white/10")}>
        {roleDisplay}
      </Badge>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading users...</p>
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
    { label: 'User Management', icon: Users, href: '/dashboard/admin/user-management', variant: 'default' as const },
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
            const isActive = pathname === item.href || (item.id === 'users' && pathname?.includes('/dashboard/admin/users'))
            
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
                <Users className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Users</h1>
                <p className="text-xs text-white/50">{totalCount} total</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => fetchUsers()} 
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
                  <DropdownMenuItem 
                    onClick={() => handleDownload('excel')}
                    className="text-white hover:bg-white/[0.08] rounded-lg cursor-pointer focus:bg-white/[0.08] focus:text-white"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-3 text-orange-400" />
                    <span>Export Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
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
                    <Users className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">User Management</h1>
                    <p className="text-sm text-white/50">{totalCount} total users</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('excel')}
                  disabled={loading}
                  className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers()}
                  disabled={loading}
                  className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
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
              <div className="rounded-xl border p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/70 mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-blue-400">{stats.total.toLocaleString()}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-400/50" />
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/70 mb-1">Pending</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.pending.toLocaleString()}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-400/50" />
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/70 mb-1">Approved</p>
                    <p className="text-2xl font-bold text-emerald-400">{stats.approved.toLocaleString()}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-400/50" />
                </div>
              </div>

              <div className="rounded-xl border p-4 bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30 hover:opacity-90 transition-opacity">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/70 mb-1">Rejected</p>
                    <p className="text-2xl font-bold text-red-400">{stats.rejected.toLocaleString()}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-400/50" />
                </div>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-6 bg-white/[0.02] border-white/[0.06]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Filter className="h-5 w-5 text-orange-400" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        placeholder="Search by email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white/[0.03] border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">Role</label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="bg-white/[0.03] border-white/10 text-white">
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-white/10">
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="opportunity_seeker">Opportunity Seeker</SelectItem>
                        <SelectItem value="opportunity_poster">Opportunity Poster</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-white/[0.03] border-white/10 text-white">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-white/10">
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
                      className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Summary */}
            <div className="mb-4">
              <p className="text-sm text-white/60">
                Showing {users.length} of {totalCount} users
              </p>
            </div>

            {/* Users List - Card Based for Mobile */}
            {loading && users.length === 0 ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="bg-white/[0.02] border-white/[0.06]">
                    <CardContent className="p-4">
                    <div className="animate-pulse space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-white/10 rounded w-32" />
                        <div className="h-6 bg-white/10 rounded w-16" />
                      </div>
                      <div className="h-3 bg-white/10 rounded w-24" />
                    </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : users.length === 0 ? (
              <Card className="bg-white/[0.02] border-white/[0.06]">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No users found</h3>
                  <p className="text-white/60">Try adjusting your filters or search criteria.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {users.map((userItem) => (
                  <Card key={userItem._id} className="bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                              {(userItem.firstName?.charAt(0) || userItem.email?.charAt(0) || '?').toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="text-sm font-medium text-white truncate">
                                  {userItem.firstName && userItem.lastName 
                                    ? `${userItem.firstName} ${userItem.lastName}`
                                    : userItem.email}
                                </p>
                                {userItem.firstName && (
                                  <p className="text-xs text-white/50 truncate">{userItem.email}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {getRoleBadge(userItem.role)}
                                {getStatusBadge(userItem.status)}
                                <Badge variant="outline" className={cn(
                                  "border text-xs",
                                  userItem.isActive 
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                    : "bg-white/10 text-white/60 border-white/10"
                                )}>
                                  {userItem.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-xs text-white/50 mt-1">
                                Joined {formatDistanceToNow(new Date(userItem.createdAt), { addSuffix: true })}
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
                                className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1 sm:flex-initial"
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
                          
                          <Button asChild size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/[0.05]">
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
                <div className="text-sm text-white/60">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
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
              const isActive = pathname === item.href || (item.id === 'users' && pathname?.includes('/dashboard/admin/users'))
              
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

      {/* Reject User Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-[#141414] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Reject User</DialogTitle>
            <DialogDescription className="text-white/60">
              Please provide a reason for rejecting this user. This will be sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Rejection Reason
              </label>
              <Textarea
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/40"
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
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]"
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
    </div>
  )
}
