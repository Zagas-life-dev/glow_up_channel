"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { usePlaylist } from '@/contexts/playlist-context'
import { cn } from '@/lib/utils'
import {
  RiHomeLine,
  RiGlobalLine,
  RiAddLine,
  RiSearchLine,
  RiStarLine,
  RiUserLine,
  RiSettingsLine,
  RiVipCrownLine,
  RiLogoutBoxRLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiPlayList2Fill,
  RiFocus3Line,
  RiHashtag,
} from "react-icons/ri"

const mainNavItems = [
  { name: 'Home', icon: RiHomeLine, path: '/' },
  { name: 'Community', icon: RiGlobalLine, path: '/community' },
  { name: 'Post', icon: RiAddLine, path: '/post' },
  { name: 'Search', icon: RiSearchLine, path: '/search' },
  { name: 'Channels', icon: RiHashtag, path: '/channels' },
]

interface AppSidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export default function AppSidebar({ isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { playlists } = usePlaylist()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname?.startsWith(path)
  }

  const linkBase = "flex items-center font-medium transition-all duration-200 rounded-xl"
  const linkCollapsed = "justify-center py-3 px-4"
  const linkExpanded = "gap-3 px-4 py-3"

  return (
    <div className="h-full flex flex-col bg-page border-r border-border relative">
      {/* Logo */}
      <div className={cn("py-5 flex-shrink-0", isCollapsed ? "px-2 flex justify-center" : "px-6")}>
        <Link href="/" className={cn("flex items-center group", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300 flex-shrink-0">
            <RiStarLine className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-foreground whitespace-nowrap overflow-hidden">
              Glow Up
            </span>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className={cn("flex-1 overflow-y-auto", isCollapsed ? "px-2" : "px-3")}>
        {/* Primary Nav */}
        <div className="space-y-1 mb-6">
          {mainNavItems.map((item) => {
            const active = isActive(item.path)
            const isPost = item.path === '/post'
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={item.path}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  linkBase,
                  isCollapsed ? linkCollapsed : linkExpanded,
                  isPost
                    ? active
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20"
                    : active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", active && "text-primary")} />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.name}</span>}
              </Link>
            )
          })}
        </div>

        {/* Create Button (for providers) */}
        {user && (user.role === 'opportunity_poster' || user.role === 'admin' || user.role === 'super_admin') && (
          <Link
            href="/dashboard/posting"
            title="Create Post"
            className={cn(
              "flex rounded-xl bg-gradient-to-r from-primary to-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300",
              isCollapsed ? "justify-center p-3 mx-2 mb-6" : "items-center gap-3 mx-3 mb-6 px-4 py-3"
            )}
          >
            <RiAddLine className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Create Post</span>}
          </Link>
        )}

        {/* Playlists Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-4 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Playlists
              </p>
              {user && (
                <Link
                  href="/playlists"
                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                >
                  View All
                </Link>
              )}
            </div>
          )}
          <div className="space-y-1">
            <Link
              href="/playlists"
              title={isCollapsed ? "My Playlists" : undefined}
              className={cn(
                linkBase,
                isCollapsed ? linkCollapsed : linkExpanded,
                isActive('/playlists')
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <RiPlayList2Fill className={cn("w-5 h-5 flex-shrink-0", isActive('/playlists') && "text-primary")} />
              {!isCollapsed && (
                <>
                  <span className="whitespace-nowrap overflow-hidden">My Playlists</span>
                  {user && playlists.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{playlists.length}</span>
                  )}
                </>
              )}
            </Link>
            <Link
              href="/playlists?tab=public"
              title={isCollapsed ? "Discover" : undefined}
              className={cn(
                linkBase,
                isCollapsed ? linkCollapsed : linkExpanded,
                "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <RiGlobalLine className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Discover</span>}
            </Link>
          </div>
        </div>

        {/* Library Section (for logged in users) */}
        {user && (
          <div className="mb-6">
            {!isCollapsed && (
              <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Library
              </p>
            )}
            <div className="space-y-1">
              <Link
                href={`/profile/${user._id}`}
                title={isCollapsed ? "My Profile" : undefined}
                className={cn(
                  linkBase,
                  isCollapsed ? linkCollapsed : linkExpanded,
                  pathname?.startsWith('/profile')
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <RiUserLine className={cn("w-5 h-5 flex-shrink-0", pathname?.startsWith('/profile') && "text-primary")} />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">My Profile</span>}
              </Link>
              <Link
                href="/locked-in"
                title={isCollapsed ? "Locked In" : undefined}
                className={cn(
                  linkBase,
                  isCollapsed ? linkCollapsed : linkExpanded,
                  pathname?.startsWith('/locked-in')
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <RiFocus3Line className={cn("w-5 h-5 flex-shrink-0", pathname?.startsWith('/locked-in') && "text-primary")} />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Locked In</span>}
              </Link>
              {(user.role === 'opportunity_poster' || user.role === 'admin' || user.role === 'super_admin') && (
                <Link
                  href="/dashboard/provider"
                  title={isCollapsed ? "Provider Hub" : undefined}
                  className={cn(
                    linkBase,
                    isCollapsed ? linkCollapsed : linkExpanded,
                    isActive('/dashboard/provider')
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <RiVipCrownLine className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Provider Hub</span>}
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className={cn("py-4 border-t border-border flex-shrink-0", isCollapsed ? "px-2" : "px-3")}>
        {user ? (
          <div className="space-y-1">
            <Link
              href="/dashboard/settings"
              title={isCollapsed ? "Settings" : undefined}
              className={cn(
                linkBase,
                isCollapsed ? linkCollapsed : linkExpanded,
                "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <RiSettingsLine className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">Settings</span>}
            </Link>
            <button
              onClick={logout}
              title={isCollapsed ? "Logout" : undefined}
              className={cn(
                "w-full rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all duration-200",
                linkBase,
                isCollapsed ? linkCollapsed : linkExpanded
              )}
            >
              <RiLogoutBoxRLine className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">Logout</span>}
            </button>
            {!isCollapsed && (
              <Link
                href={`/profile/${user._id}`}
                className="mt-3 px-4 py-3 rounded-xl bg-muted border border-border hover:bg-muted hover:border-border transition-all block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary flex items-center justify-center text-sm font-semibold text-primary-foreground flex-shrink-0">
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
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.firstName || user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </Link>
            )}
            {isCollapsed && (
              <Link
                href={`/profile/${user._id}`}
                title="Profile"
                className={cn(linkBase, linkCollapsed, "text-muted-foreground hover:text-foreground hover:bg-muted")}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                  {user.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.profileImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()
                  )}
                </div>
              </Link>
            )}
          </div>
        ) : (
          <div className={cn("space-y-2", isCollapsed && "space-y-1")}>
            <Link
              href="/login"
              title={isCollapsed ? "Sign In" : undefined}
              className={cn(
                "block rounded-xl border border-border text-foreground hover:text-foreground hover:border-border font-medium transition-all duration-200",
                isCollapsed ? "p-3 flex justify-center" : "w-full py-2.5 px-4 text-center"
              )}
            >
              {isCollapsed ? <RiUserLine className="w-5 h-5" /> : "Sign In"}
            </Link>
            <Link
              href="/signup"
              title={isCollapsed ? "Get Started" : undefined}
              className={cn(
                "block rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-200",
                isCollapsed ? "p-3 flex justify-center" : "w-full py-2.5 px-4 text-center"
              )}
            >
              {isCollapsed ? <RiAddLine className="w-5 h-5" /> : "Get Started"}
            </Link>
          </div>
        )}
      </div>

      {/* Collapse toggle: right side, vertically centered, circular button */}
      <button
        type="button"
        onClick={onToggleCollapse}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-page/95 border border-border shadow-md hover:bg-muted/90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-page transition-all w-9 h-9 lg:w-10 lg:h-10"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <RiArrowRightLine className="w-4 h-4 lg:w-5 lg:h-5" />
        ) : (
          <RiArrowLeftLine className="w-4 h-4 lg:w-5 lg:h-5" />
        )}
      </button>
    </div>
  )
}
