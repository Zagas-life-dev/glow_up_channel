"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { usePlaylist } from '@/contexts/playlist-context'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  RiSearchLine,
  RiCloseLine,
  RiStarLine,
  RiUserAddLine,
  RiMailLine,
  RiNotificationLine,
} from 'react-icons/ri'
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

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
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
      <header className="sticky top-0 z-40 bg-page/95 dark:bg-page/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 lg:px-6 max-w-[1600px] mx-auto">
          {/* Mobile: Logo or Search */}
          <div className="lg:hidden flex items-center gap-3 flex-1">
            {showMobileSearch ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-primary focus:border-primary"
                    autoFocus
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileSearch(false)}
                  className="text-muted-foreground hover:text-foreground px-2"
                >
                  <RiCloseLine className="w-5 h-5" aria-label="Close search" />
                </Button>
              </form>
            ) : (
              <>
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <RiStarLine className="w-4 h-4 text-primary-foreground" aria-hidden />
                  </div>
                  <span className="text-lg font-bold text-foreground">Glow Up</span>
                </Link>
              </>
            )}
          </div>

          {/* Desktop: Search */}
          <div className="hidden lg:flex items-center flex-1 max-w-md">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
                <Input
                  type="text"
                  placeholder="Search opportunities, jobs, events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 h-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-primary focus:border-primary"
                />
              </div>
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle className="shrink-0" />
            {/* Mobile Search Toggle */}
            {!showMobileSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileSearch(true)}
                className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-accent px-2"
              >
                <RiSearchLine className="w-5 h-5" aria-hidden />
              </Button>
            )}

            {/* Connection Requests (only for logged in users with private accounts) */}
            {user && connectionRequests.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConnectionRequests(true)}
                className="text-muted-foreground hover:text-foreground hover:bg-accent px-2 relative"
              >
                <RiUserAddLine className="w-5 h-5" aria-hidden />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center">
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
                className="text-muted-foreground hover:text-foreground hover:bg-accent px-2 relative"
              >
                <RiMailLine className="w-5 h-5" aria-hidden />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {invitations.length > 9 ? '9+' : invitations.length}
                </span>
              </Button>
            )}

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-accent px-2 relative"
            >
              <RiNotificationLine className="w-5 h-5" aria-hidden />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-page" />
            </Button>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-accent px-2"
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
                        <span className="text-primary-foreground text-xs font-semibold">
                          {(user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-popover border-border rounded-xl shadow-2xl text-popover-foreground"
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{user.firstName || user.email?.split('@')[0]}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem asChild className="text-foreground hover:bg-accent focus:bg-accent cursor-pointer">
                    <Link href={`/profile/${user._id}`}>My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-muted-foreground hover:text-foreground focus:text-foreground focus:bg-muted cursor-pointer">
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-muted-foreground hover:text-foreground focus:text-foreground focus:bg-muted cursor-pointer">
                    <Link href="/playlists">My Playlists</Link>
                  </DropdownMenuItem>
                  {connectionRequests.length > 0 && (
                    <DropdownMenuItem 
                      onClick={() => setShowConnectionRequests(true)}
                      className="text-violet-400 hover:text-violet-300 focus:text-violet-400 focus:bg-violet-500/10 cursor-pointer"
                    >
                      <RiUserAddLine className="w-4 h-4 mr-2" aria-hidden />
                      Connection Requests ({connectionRequests.length})
                    </DropdownMenuItem>
                  )}
                  {invitations.length > 0 && (
                    <DropdownMenuItem
                      onClick={() => setShowInvitations(true)}
                      className="text-orange-600 dark:text-orange-400 hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"
                    >
                      <RiMailLine className="w-4 h-4 mr-2" aria-hidden />
                      Playlist Invitations ({invitations.length})
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="text-foreground hover:bg-accent focus:bg-accent cursor-pointer">
                    <Link href="/dashboard/settings">Settings</Link>
                  </DropdownMenuItem>
                  {(user.role === 'opportunity_poster' || user.role === 'admin' || user.role === 'super_admin') && (
                    <DropdownMenuItem asChild className="text-foreground hover:bg-accent focus:bg-accent cursor-pointer">
                      <Link href="/dashboard/provider">Provider Hub</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground hover:bg-accent">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
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
