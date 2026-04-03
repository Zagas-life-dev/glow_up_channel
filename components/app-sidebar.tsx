"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useLockedIn } from "@/contexts/locked-in-context"
import { usePlaylist } from "@/contexts/playlist-context"
import { cn } from "@/lib/utils"
import { showPwaInstallPrompt } from "@/components/pwa-install-banner"
import { Lock, LockOpen } from "lucide-react"
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
} from "react-icons/ri"

const mainNavItems = [
  { name: "Home", icon: RiHomeLine, path: "/" },
  { name: "Playlist", icon: RiPlayList2Fill, path: "/playlists" },
  { name: "Search", icon: RiSearchLine, path: "/search" },
  { name: "Channels", icon: RiHashtag, path: "/channels" },
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
        (typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean }).standalone === true),
    )
  }, [])
  return standalone
}

function navLinkClass({
  isCollapsed,
  active,
}: {
  isCollapsed: boolean
  active: boolean
}) {
  return cn(
    "flex min-h-11 items-center font-semibold transition-all duration-200 rounded-2xl border text-body-sm",
    isCollapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-2.5",
    active
      ? "border-primary/30 bg-primary/12 text-primary shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.18)]"
      : "border-transparent text-muted-foreground hover:border-border/50 hover:bg-muted/70 hover:text-foreground",
  )
}

function LockedInSidebarLink({
  pathname,
  isCollapsed,
}: {
  pathname: string | null
  isCollapsed: boolean
}) {
  const { isActive: isLockedInActive } = useLockedIn()
  const active = Boolean(pathname?.startsWith("/locked-in"))
  return (
    <Link
      href="/locked-in"
      title={isCollapsed ? "Locked In" : undefined}
      className={navLinkClass({ isCollapsed, active })}
    >
      {isLockedInActive ? (
        <Lock
          className="h-5 w-5 shrink-0 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
          aria-hidden
        />
      ) : (
        <LockOpen className={cn("h-5 w-5 shrink-0", active && "text-primary")} aria-hidden />
      )}
      {!isCollapsed && <span className="truncate">Locked In</span>}
    </Link>
  )
}

export default function AppSidebar({ isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, logout } = useAuth()
  const { playlists } = usePlaylist()
  const isStandalone = useIsStandalone()

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname?.startsWith(path)
  }

  const onPlaylists = pathname?.startsWith("/playlists") ?? false
  const playlistTab = onPlaylists ? searchParams.get("tab") : null
  const discoverPlaylistActive = onPlaylists && (playlistTab === "public" || (!user && !playlistTab))
  const myPlaylistsActive = onPlaylists && !!user && playlistTab !== "public"

  const sectionLabel = "px-3 mb-2 text-overline font-semibold uppercase tracking-[0.14em] text-muted-foreground"

  return (
    <div className="relative flex h-full flex-col border-r border-border/60 bg-card/90 font-sans shadow-[inset_-1px_0_0_0_hsl(var(--border)/0.5)] backdrop-blur-xl">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.2] dark:opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
        }}
      />

      <div className={cn("relative z-[1] flex-shrink-0 border-b border-border/50 py-4", isCollapsed ? "px-2" : "px-4")}>
        <Link href="/" className={cn("group flex items-center outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-border/60 transition-transform duration-300 group-hover:scale-[1.04]">
            <Image
              src="/images/Yellow and Black Modern Media Company Logo (14).png"
              alt="GlowUp"
              fill
              className="object-contain p-1"
              priority
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-display-sm font-bold tracking-tight text-foreground">Glow Up</p>
              <p className="text-caption text-muted-foreground">Your growth hub</p>
            </div>
          )}
        </Link>
      </div>

      <nav className={cn("relative z-[1] flex-1 overflow-y-auto scrollbar-hide", isCollapsed ? "px-2 py-3" : "px-3 py-3")}>
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const active = isActive(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={item.path}
                title={isCollapsed ? item.name : undefined}
                className={navLinkClass({ isCollapsed, active })}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "")} aria-hidden />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </div>

        

        {/* <div className="my-5 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" aria-hidden /> */}

        {/* <div>
          {!isCollapsed && (
            <div className="mb-2 flex items-center justify-between px-3">
              <p className={sectionLabel}>Playlists</p>
              {user ? (
                <Link href="/playlists" className="text-caption font-semibold text-primary hover:underline">
                  View all
                </Link>
              ) : null}
            </div>
          )}
          <div className="space-y-1">
            <Link
              href="/playlists"
              title={isCollapsed ? "My Playlists" : undefined}
              className={navLinkClass({ isCollapsed, active: myPlaylistsActive })}
            >
              <RiPlayList2Fill className={cn("h-5 w-5 shrink-0", myPlaylistsActive && "text-primary")} aria-hidden />
              {!isCollapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate">My playlists</span>
                  {user && playlists.length > 0 ? (
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-caption font-bold tabular-nums text-primary">
                      {playlists.length}
                    </span>
                  ) : null}
                </>
              )}
            </Link>
            <Link
              href="/playlists?tab=public"
              title={isCollapsed ? "Discover" : undefined}
              className={navLinkClass({ isCollapsed, active: discoverPlaylistActive })}
            >
              <RiGlobalLine className={cn("h-5 w-5 shrink-0", discoverPlaylistActive && "text-primary")} aria-hidden />
              {!isCollapsed && <span className="truncate">Discover</span>}
            </Link>
          </div>
        </div> */}

        {user && (
          <>
            <div className="my-5 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" aria-hidden />
            <div>
              {!isCollapsed && <p className={cn(sectionLabel, "mb-2")}>Library</p>}
              <div className="space-y-1">
                <Link
                  href={`/profile/${user._id}`}
                  title={isCollapsed ? "My Profile" : undefined}
                  className={navLinkClass({ isCollapsed, active: !!pathname?.startsWith("/profile") })}
                >
                  <RiUserLine
                    className={cn("h-5 w-5 shrink-0", pathname?.startsWith("/profile") && "text-primary")}
                    aria-hidden
                  />
                  {!isCollapsed && <span className="truncate">My profile</span>}
                </Link>
                <LockedInSidebarLink pathname={pathname} isCollapsed={isCollapsed} />
                {(user.role === "opportunity_poster" || user.role === "admin" || user.role === "super_admin") && (
                  <Link
                    href="/dashboard/provider"
                    title={isCollapsed ? "Provider Hub" : undefined}
                    className={navLinkClass({ isCollapsed, active: isActive("/dashboard/provider") })}
                  >
                    <RiVipCrownLine className="h-5 w-5 shrink-0" aria-hidden />
                    {!isCollapsed && <span className="truncate">Provider hub</span>}
                  </Link>
                )}
              </div>
            </div>
          </>
        )}

        {!isStandalone && (
          <>
            <div className="my-5 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" aria-hidden />
            <button
              type="button"
              onClick={showPwaInstallPrompt}
              title={isCollapsed ? "Install app" : undefined}
              className={cn(navLinkClass({ isCollapsed, active: false }), "w-full")}
            >
              <RiDownloadLine className="h-5 w-5 shrink-0" aria-hidden />
              {!isCollapsed && <span className="truncate">Install app</span>}
            </button>
          </>
        )}
      </nav>

      <div className={cn("relative z-[1] flex-shrink-0 border-t border-border/60 bg-card/40 backdrop-blur-sm", isCollapsed ? "px-2 py-3" : "px-3 py-4")}>
        {user ? (
          <div className="space-y-1">
            <Link
              href="/profile/settings"
              title={isCollapsed ? "Settings" : undefined}
              className={navLinkClass({ isCollapsed, active: false })}
            >
              <RiSettingsLine className="h-5 w-5 shrink-0" aria-hidden />
              {!isCollapsed && <span className="truncate">Settings</span>}
            </Link>
            <Link
              href="/premium"
              title={isCollapsed ? (user.isPremium ? "Premium" : "Go Premium") : undefined}
              className={navLinkClass({
                isCollapsed,
                active: !!user.isPremium,
              })}
            >
              <RiVipCrownLine className={cn("h-5 w-5 shrink-0", user.isPremium && "text-primary")} aria-hidden />
              {!isCollapsed && <span className="truncate">{user.isPremium ? "Premium" : "Go Premium"}</span>}
            </Link>
            <button
              type="button"
              onClick={logout}
              title={isCollapsed ? "Logout" : undefined}
              className={cn(
                navLinkClass({ isCollapsed, active: false }),
                "w-full hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400",
              )}
            >
              <RiLogoutBoxRLine className="h-5 w-5 shrink-0" aria-hidden />
              {!isCollapsed && <span className="truncate">Log out</span>}
            </button>
            {!isCollapsed && (
              <Link
                href={`/profile/${user._id}`}
                className="mt-3 block rounded-2xl border border-border/60 bg-muted/40 p-3 transition-colors hover:border-primary/25 hover:bg-muted/60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground ring-2 ring-primary/25 ring-offset-2 ring-offset-card">
                    {user.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.profileImage}
                        alt={user.firstName || user.email || "Profile"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (user.firstName?.charAt(0) || user.email?.charAt(0) || "?").toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-bold text-foreground">
                      {user.firstName || user.email?.split("@")[0]}
                    </p>
                    <p className="truncate text-caption capitalize text-muted-foreground">
                      {user.role?.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </Link>
            )}
            {isCollapsed && (
              <Link
                href={`/profile/${user._id}`}
                title="Profile"
                className={cn(navLinkClass({ isCollapsed, active: false }), "justify-center")}
              >
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground ring-2 ring-primary/25 ring-offset-2 ring-offset-card">
                  {user.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.profileImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (user.firstName?.charAt(0) || user.email?.charAt(0) || "?").toUpperCase()
                  )}
                </div>
              </Link>
            )}
          </div>
        ) : (
          <div className={cn("space-y-2", isCollapsed && "space-y-1.5")}>
            <Link
              href="/login"
              title={isCollapsed ? "Sign In" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-2xl border border-border/70 font-semibold text-foreground transition-colors hover:border-border hover:bg-muted/60",
                isCollapsed ? "p-3" : "w-full px-4 py-2.5",
              )}
            >
              {isCollapsed ? <RiUserLine className="h-5 w-5" aria-hidden /> : "Sign in"}
            </Link>
            <Link
              href="/signup"
              title={isCollapsed ? "Get Started" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-primary/85 font-bold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:brightness-[1.03]",
                isCollapsed ? "p-3" : "w-full px-4 py-2.5",
              )}
            >
              {isCollapsed ? <RiAddLine className="h-5 w-5" aria-hidden /> : "Get started"}
            </Link>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleCollapse}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute right-0 top-1/2 z-20 flex h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-md transition-all hover:border-primary/30 hover:bg-muted hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card lg:h-11 lg:w-11"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <RiArrowRightLine className="h-4 w-4 lg:h-[1.15rem] lg:w-[1.15rem]" aria-hidden />
        ) : (
          <RiArrowLeftLine className="h-4 w-4 lg:h-[1.15rem] lg:w-[1.15rem]" aria-hidden />
        )}
      </button>
    </div>
  )
}
