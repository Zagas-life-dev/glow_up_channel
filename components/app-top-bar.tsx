"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { usePlaylist } from '@/contexts/playlist-context'
import { Search, Bell, X, Sparkles, Mail, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import PlaylistInvitations from '@/components/playlist-invitations'
import ConnectionRequests from '@/components/connection-requests'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

interface ConnectionRequest {
  requestId: string
  user: {
    _id: string
    email: string
    firstName?: string
    lastName?: string
    profileImage?: string
    headline?: string
    bio?: string
  }
  requestedAt: string
}

export default function AppTopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { invitations } = usePlaylist()
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showInvitations, setShowInvitations] = useState(false)
  const [showConnectionRequests, setShowConnectionRequests] = useState(false)
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([])

  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    return token 
      ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  }, [])

  const fetchConnectionRequests = useCallback(async () => {
    if (!user) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/connections/requests/pending`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      
      if (data.success) {
        setConnectionRequests(data.data.requests || [])
      }
    } catch (err) {
      console.error('Error fetching connection requests:', err)
    }
  }, [user, getAuthHeaders])

  useEffect(() => {
    if (user) {
      fetchConnectionRequests()
    }
  }, [user, fetchConnectionRequests])

  // Hide on certain pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/signup') || 
      pathname?.startsWith('/dashboard/posting') || pathname?.startsWith('/onboarding')) {
    return null
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowMobileSearch(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6 max-w-[1600px] mx-auto">
          {/* Mobile: Logo or Search */}
          <div className="lg:hidden flex items-center gap-3 flex-1">
            {showMobileSearch ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/40 rounded-xl focus:ring-orange-500/50"
                    autoFocus
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileSearch(false)}
                  className="text-white/60 hover:text-white px-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </form>
            ) : (
              <>
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-white">Glow Up</span>
                </Link>
              </>
            )}
          </div>

          {/* Desktop: Search */}
          <div className="hidden lg:flex items-center flex-1 max-w-md">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  type="text"
                  placeholder="Search opportunities, jobs, events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 h-10 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/40 rounded-xl focus:ring-orange-500/50 focus:border-orange-500/50"
                />
              </div>
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Search Toggle */}
            {!showMobileSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileSearch(true)}
                className="lg:hidden text-white/60 hover:text-white hover:bg-white/[0.05] px-2"
              >
                <Search className="w-5 h-5" />
              </Button>
            )}

            {/* Connection Requests (only for logged in users with private accounts) */}
            {user && connectionRequests.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConnectionRequests(true)}
                className="text-white/60 hover:text-white hover:bg-white/[0.05] px-2 relative"
              >
                <UserPlus className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {connectionRequests.length > 9 ? '9+' : connectionRequests.length}
                </span>
              </Button>
            )}

            {/* Playlist Invitations (only for logged in users) */}
            {user && invitations.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInvitations(true)}
                className="text-white/60 hover:text-white hover:bg-white/[0.05] px-2 relative"
              >
                <Mail className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {invitations.length > 9 ? '9+' : invitations.length}
                </span>
              </Button>
            )}

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/[0.05] px-2 relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-[#0a0a0a]" />
            </Button>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-white/[0.05] px-2"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                      {user.profileImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.profileImage}
                          alt={user.firstName || user.email || 'Profile'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-xs font-semibold">
                          {(user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 bg-[#141414] border-white/[0.08] rounded-xl shadow-2xl"
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{user.firstName || user.email?.split('@')[0]}</p>
                    <p className="text-xs text-white/40">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                  <DropdownMenuItem asChild className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.05] cursor-pointer">
                    <Link href={`/profile/${user._id}`}>My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.05] cursor-pointer">
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.05] cursor-pointer">
                    <Link href="/playlists">My Playlists</Link>
                  </DropdownMenuItem>
                  {connectionRequests.length > 0 && (
                    <DropdownMenuItem 
                      onClick={() => setShowConnectionRequests(true)}
                      className="text-violet-400 hover:text-violet-300 focus:text-violet-400 focus:bg-violet-500/10 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Connection Requests ({connectionRequests.length})
                    </DropdownMenuItem>
                  )}
                  {invitations.length > 0 && (
                    <DropdownMenuItem 
                      onClick={() => setShowInvitations(true)}
                      className="text-orange-400 hover:text-orange-300 focus:text-orange-400 focus:bg-orange-500/10 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Playlist Invitations ({invitations.length})
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.05] cursor-pointer">
                    <Link href="/dashboard/settings">Settings</Link>
                  </DropdownMenuItem>
                  {(user.role === 'opportunity_poster' || user.role === 'admin' || user.role === 'super_admin') && (
                    <DropdownMenuItem asChild className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.05] cursor-pointer">
                      <Link href="/dashboard/provider">Provider Hub</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                  <DropdownMenuItem 
                    onClick={logout}
                    className="text-red-400 hover:text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex text-white/70 hover:text-white hover:bg-white/[0.05]">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Invitations Panel */}
      <PlaylistInvitations
        isOpen={showInvitations}
        onClose={() => setShowInvitations(false)}
      />

      {/* Connection Requests Panel */}
      <ConnectionRequests
        isOpen={showConnectionRequests}
        onClose={() => setShowConnectionRequests(false)}
        requests={connectionRequests}
        onUpdate={fetchConnectionRequests}
      />
    </>
  )
}
