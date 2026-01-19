"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { usePlaylist } from '@/contexts/playlist-context'
import { 
  Home, 
  Search, 
  Target, 
  Briefcase, 
  Calendar, 
  BookOpen,
  User,
  Settings,
  LogOut,
  Plus,
  Crown,
  Sparkles,
  ListMusic,
  Globe,
  Users,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mainNavItems = [
  { name: 'Home', icon: Home, path: '/' },
  { name: 'Community', icon: Globe, path: '/community' },
  { name: 'Post', icon: Plus, path: '/post' },
  { name: 'Search', icon: Search, path: '/search' },
]

const exploreItems = [
  { name: 'Opportunities', icon: Target, path: '/opportunities', color: 'text-orange-500' },
  { name: 'Jobs', icon: Briefcase, path: '/jobs', color: 'text-blue-500' },
  { name: 'Events', icon: Calendar, path: '/events', color: 'text-emerald-500' },
  { name: 'Resources', icon: BookOpen, path: '/resources', color: 'text-violet-500' },
]

export default function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { playlists } = usePlaylist()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname?.startsWith(path)
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-r border-white/[0.08]">
      {/* Logo */}
      <div className="px-6 py-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all duration-300">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">
            Glow Up
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {/* Primary Nav */}
        <div className="space-y-1 mb-6">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            const isPost = item.path === '/post'
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                  isPost
                    ? active
                      ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                      : "text-white/60 hover:text-orange-500 hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20"
                    : active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                <Icon className={cn("w-5 h-5", active && (isPost ? "text-orange-500" : "text-orange-500"))} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* Explore Section */}
        <div className="mb-6">
          <p className="px-4 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
            Explore
          </p>
          <div className="space-y-1">
            {exploreItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                  )}
                >
                  <Icon className={cn("w-5 h-5", active ? item.color : "")} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Create Button (for providers) */}
        {user && (user.role === 'opportunity_poster' || user.role === 'admin' || user.role === 'super_admin') && (
          <Link
            href="/dashboard/posting"
            className="flex items-center gap-3 mx-3 mb-6 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            <span>Create Post</span>
          </Link>
        )}

        {/* Playlists Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 mb-2">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Playlists
            </p>
            {user && (
              <Link
                href="/playlists"
                className="text-[10px] text-white/40 hover:text-orange-500 transition-colors"
              >
                View All
              </Link>
            )}
          </div>
          <div className="space-y-1">
            <Link
              href="/playlists"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                isActive('/playlists')
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <ListMusic className={cn("w-5 h-5", isActive('/playlists') && "text-violet-500")} />
              <span>My Playlists</span>
              {user && playlists.length > 0 && (
                <span className="ml-auto text-xs text-white/30">{playlists.length}</span>
              )}
            </Link>
            <Link
              href="/playlists?tab=public"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                "text-white/60 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <Globe className="w-5 h-5" />
              <span>Discover</span>
            </Link>
          </div>
        </div>

        {/* Library Section (for logged in users) */}
        {user && (
          <div className="mb-6">
            <p className="px-4 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
              Library
            </p>
            <div className="space-y-1">
              <Link
                href={`/profile/${user._id}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                  pathname?.startsWith('/profile')
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                <User className={cn("w-5 h-5", pathname?.startsWith('/profile') && "text-orange-500")} />
                <span>My Profile</span>
              </Link>
              
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                  isActive('/dashboard') && !pathname?.includes('/dashboard/')
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                <Settings className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
              
              {(user.role === 'opportunity_poster' || user.role === 'admin' || user.role === 'super_admin') && (
                <Link
                  href="/dashboard/provider"
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                    isActive('/dashboard/provider')
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                  )}
                >
                  <Crown className="w-5 h-5" />
                  <span>Provider Hub</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="px-3 py-4 border-t border-white/[0.08]">
        {user ? (
          <div className="space-y-1">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.05] transition-all duration-200"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </Link>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
            
            {/* User Profile Card */}
            <Link 
              href={`/profile/${user._id}`}
              className="mt-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all block"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-semibold text-white">
                  {user.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.profileImage}
                      alt={user.firstName || user.email || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.firstName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-white/40 capitalize">
                    {user.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href="/login"
              className="block w-full py-2.5 px-4 text-center rounded-xl border border-white/10 text-white/80 hover:text-white hover:border-white/20 font-medium transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="block w-full py-2.5 px-4 text-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-all duration-200"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
