"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useLockedIn } from '@/contexts/locked-in-context'
import { usePlaylist } from '@/contexts/playlist-context'
import { cn } from '@/lib/utils'
import { showPwaInstallPrompt } from '@/components/pwa-install-banner'
import { Lock, LockOpen } from "lucide-react"
import { toast } from 'sonner'
import {
  RiHomeLine,
  RiGlobalLine,
  RiAddLine,
  RiSearchLine,
  RiUserLine,
  RiSettingsLine,
  RiVipCrownLine,
  RiLogoutBoxRLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiPlayList2Fill,
  RiHashtag,
  RiDownloadLine,
  RiMoneyDollarCircleLine,
  RiNotificationLine,
} from "react-icons/ri"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

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

function useIsStandalone() {
  const [standalone, setStandalone] = useState(false)
  useEffect(() => {
    setStandalone(
      (typeof window !== "undefined" && (window as Window & { standalone?: boolean }).standalone === true) ||
      (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) ||
      (typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean }).standalone === true)
    )
  }, [])
  return standalone
}

function LockedInSidebarLink({
  pathname,
  isCollapsed,
  linkBase,
  linkCollapsed,
  linkExpanded,
}: {
  pathname: string | null
  isCollapsed: boolean
  linkBase: string
  linkCollapsed: string
  linkExpanded: string
}) {
  const { isActive: isLockedInActive } = useLockedIn()
  const isOnPage = pathname?.startsWith('/locked-in')
  return (
    <Link
      href="/locked-in"
      title={isCollapsed ? "Locked In" : undefined}
      className={cn(
        linkBase,
        isCollapsed ? linkCollapsed : linkExpanded,
        isOnPage
          ? "bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
      )}
    >
      {isLockedInActive ? (
        <Lock className="w-5 h-5 flex-shrink-0 text-orange-500 drop-shadow-[0_0_6px_rgba(255,103,0,0.6)]" aria-hidden />
      ) : (
        <LockOpen className={cn("w-5 h-5 flex-shrink-0", isOnPage && "text-primary")} aria-hidden />
      )}
      {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Locked In</span>}
    </Link>
  )
}

function TestPushButton({
  isCollapsed,
  linkBase,
  linkCollapsed,
  linkExpanded,
}: {
  isCollapsed: boolean
  linkBase: string
  linkCollapsed: string
  linkExpanded: string
}) {
  const [loading, setLoading] = useState(false)
  const sendTestPush = async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (!token) {
        toast.error('Sign in to test push notifications.')
        return
      }
      const res = await fetch(`${API_BASE_URL}/api/users/me/push-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        toast.success(data.message || 'Test notification sent.')
      } else {
        toast.error(data.message || 'Failed to send test notification.')
      }
    } catch {
      toast.error('Failed to send test notification.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      type="button"
      onClick={sendTestPush}
      disabled={loading}
      title={isCollapsed ? "Test push" : undefined}
      className={cn(
        linkBase,
        isCollapsed ? linkCollapsed : linkExpanded,
        "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent w-full text-left disabled:opacity-60"
      )}
    >
      {loading ? (
        <span className="w-5 h-5 flex-shrink-0 inline-block animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : (
        <RiNotificationLine className="w-5 h-5 flex-shrink-0" aria-hidden />
      )}
      {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Test push</span>}
    </button>
  )
}

export default function AppSidebar({ isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { playlists } = usePlaylist()
  const isStandalone = useIsStandalone()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname?.startsWith(path)
  }

  const linkBase = "flex items-center font-medium transition-all duration-200 rounded-xl"
  const linkCollapsed = "justify-center py-3 px-4"
  const linkExpanded = "gap-3 px-4 py-3"

  return (
    <div className="h-full flex flex-col bg-card/80 backdrop-blur-sm border-r border-border/60 relative">
      {/* Logo */}
      <div className={cn("py-5 flex-shrink-0", isCollapsed ? "px-2 flex justify-center" : "px-5")}>
        <Link href="/" className={cn("flex items-center group", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-all duration-300">
            <Image
              src="/images/Yellow and Black Modern Media Company Logo (14).png"
              alt="GlowUp"
              fill
              className="object-contain"
              priority
            />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap overflow-hidden">
              Glow Up
            </span>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className={cn("flex-1 overflow-y-auto scrollbar-hide", isCollapsed ? "px-2" : "px-3")}>
        {/* Primary Nav */}
        <div className="space-y-0.5 mb-6">
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
                      ? "bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20"
                    : active
                      ? "bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-primary" : "")} />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.name}</span>}
              </Link>
            )
          })}
        </div>

        {/* Create Button (for providers) */}
        {user && (user.role === 'opportunity_poster' || user.role === 'admin' || user.role === 'super_admin') && (
          <Link
            href="/dashboard/provider/posting"
            title="Create Post"
            className={cn(
              "flex rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 hover:from-orange-600 hover:to-orange-700 transition-all duration-300",
              isCollapsed ? "justify-center p-3 mx-2 mb-6" : "items-center gap-3 mx-1 mb-6 px-4 py-3"
            )}
          >
            <RiAddLine className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Create Post</span>}
          </Link>
        )}

        {/* Playlists Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
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
          <div className="space-y-0.5">
            <Link
              href="/playlists"
              title={isCollapsed ? "My Playlists" : undefined}
              className={cn(
                linkBase,
                isCollapsed ? linkCollapsed : linkExpanded,
                isActive('/playlists')
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
              )}
            >
              <RiPlayList2Fill className={cn("w-5 h-5 flex-shrink-0", isActive('/playlists') && "text-primary")} />
              {!isCollapsed && (
                <>
                  <span className="whitespace-nowrap overflow-hidden">My Playlists</span>
                  {user && playlists.length > 0 && (
                    <span className="ml-auto text-[10px] bg-primary/15 text-primary rounded-full px-1.5 py-0.5">{playlists.length}</span>
                  )}
                </>
              )}
            </Link>
            <Link
              href="/playlists?tab=discover"
              title={isCollapsed ? "Discover" : undefined}
              className={cn(
                linkBase,
                isCollapsed ? linkCollapsed : linkExpanded,
                "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
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
              <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Library
              </p>
            )}
            <div className="space-y-0.5">
       
              <Link
                href={`/profile/${user._id}`}
                title={isCollapsed ? "My Profile" : undefined}
                className={cn(
                  linkBase,
                  isCollapsed ? linkCollapsed : linkExpanded,
                  pathname?.startsWith('/profile')
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
                )}
              >
                <RiUserLine className={cn("w-5 h-5 flex-shrink-0", pathname?.startsWith('/profile') && "text-primary")} />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">My Profile</span>}
              </Link>
              <LockedInSidebarLink
                pathname={pathname}
                isCollapsed={isCollapsed}
                linkBase={linkBase}
                linkCollapsed={linkCollapsed}
                linkExpanded={linkExpanded}
              />
              {(user.role === 'opportunity_poster' || user.role === 'admin' || user.role === 'super_admin') && (
                <Link
                  href="/dashboard/provider"
                  title={isCollapsed ? "Provider Hub" : undefined}
                  className={cn(
                    linkBase,
                    isCollapsed ? linkCollapsed : linkExpanded,
                    isActive('/dashboard/provider')
                      ? "bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
                  )}
                >
                  <RiVipCrownLine className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Provider Hub</span>}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Install app (browser only) */}
        {!isStandalone && (
          <div className="mb-6">
            <button
              type="button"
              onClick={showPwaInstallPrompt}
              title={isCollapsed ? "Install app" : undefined}
              className={cn(
                linkBase,
                isCollapsed ? linkCollapsed : linkExpanded,
                "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent w-full"
              )}
            >
              <RiDownloadLine className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">Install app</span>}
            </button>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className={cn("py-4 border-t border-border/60 flex-shrink-0", isCollapsed ? "px-2" : "px-3")}>
        {user ? (
          <div className="space-y-0.5">
            <Link
              href="/profile/settings"
              title={isCollapsed ? "Settings" : undefined}
              className={cn(
                linkBase,
                isCollapsed ? linkCollapsed : linkExpanded,
                "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
              )}
            >
              <RiSettingsLine className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">Settings</span>}
            </Link>
            <TestPushButton
              isCollapsed={isCollapsed}
              linkBase={linkBase}
              linkCollapsed={linkCollapsed}
              linkExpanded={linkExpanded}
            />
            {/* Premium entry */}
            <Link
              href="/premium"
              title={isCollapsed ? (user.isPremium ? "Premium" : "Go Premium") : undefined}
              className={cn(
                linkBase,
                isCollapsed ? linkCollapsed : linkExpanded,
                user.isPremium
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm shadow-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20"
              )}
            >
              <RiVipCrownLine className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium">
                  {user.isPremium ? "Premium" : "Go Premium"}
                </span>
              )}
            </Link>
            <button
              onClick={logout}
              title={isCollapsed ? "Logout" : undefined}
              className={cn(
                "w-full rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all duration-200 border border-transparent",
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
                className="mt-2 px-3 py-3 rounded-2xl bg-muted/60 border border-border/60 hover:bg-muted hover:border-border transition-all block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary/30 ring-offset-1 ring-offset-card bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
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
                    <p className="text-sm font-semibold text-foreground truncate">
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
                className={cn(linkBase, linkCollapsed, "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent")}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary/30 ring-offset-1 ring-offset-card bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-sm font-semibold text-white">
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
                "block rounded-xl border border-border/60 text-foreground hover:text-foreground hover:border-border hover:bg-muted/60 font-medium transition-all duration-200",
                isCollapsed ? "p-3 flex justify-center" : "w-full py-2.5 px-4 text-center"
              )}
            >
              {isCollapsed ? <RiUserLine className="w-5 h-5" /> : "Sign In"}
            </Link>
            <Link
              href="/signup"
              title={isCollapsed ? "Get Started" : undefined}
              className={cn(
                "block rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/20 transition-all duration-200",
                isCollapsed ? "p-3 flex justify-center" : "w-full py-2.5 px-4 text-center"
              )}
            >
              {isCollapsed ? <RiAddLine className="w-5 h-5" /> : "Get Started"}
            </Link>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-card border border-border/70 shadow-md hover:bg-muted hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-all w-9 h-9 lg:w-10 lg:h-10"
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
