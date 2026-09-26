"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePlaylist } from "@/contexts/playlist-context"
import { cn } from "@/lib/utils"
import { showPwaInstallPrompt } from "@/components/pwa-install-banner"
import LanguageSwitcher from "@/components/language-switcher"
import {
  RiHomeLine,
  RiGlobalLine,
  RiAddLine,
  RiSearchLine,
  RiUserLine,
  
  RiVipCrownLine,
  RiEyeLine,
  RiLogoutBoxRLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiPlayList2Fill,
  RiDownloadLine,
  RiCheckboxCircleLine,
  RiSettings3Line,
  RiMoonLine,
  RiSunLine,
} from "react-icons/ri"
import { useTheme } from "next-themes"
import { canAccessMonitorPortal, canPublishContent } from '@/lib/roles'
import { useGoBack } from "@/hooks/use-go-back"
import { useNavAudience } from "@/hooks/use-nav-audience"
import { UpLogo } from "@/components/up/up-logo"

/** Signed-in navigation — the app's primary routes. */
const mainNavItems = [
  { name: "Home", icon: RiHomeLine, path: "/" },
  { name: "Playlist", icon: RiPlayList2Fill, path: "/playlists" },
  { name: "Search", icon: RiSearchLine, path: "/search" },
  { name: "Tracker", icon: RiCheckboxCircleLine, path: "/tracker" },
]

/**
 * Signed-out navigation.
 *
 * Every route above is gated or empty without an account, so offering them as
 * the primary nav gives a visitor four login walls. Back and Profile replace
 * them; Sign in and Sign up already sit in the footer below, so the full
 * signed-out set is present without duplicating those two here.
 */
const guestNavItems = [{ name: "Profile", icon: RiUserLine, path: "/login" }]

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

/**
 * UP Design v1 navy rail: pill links, the active one outlined on a faint
 * white fill with an orange icon. Same on light and dark themes.
 */
function navLinkClass({
  isCollapsed,
  active,
}: {
  isCollapsed: boolean
  active: boolean
}) {
  return cn(
    "flex min-h-11 items-center rounded-full text-sm transition-colors duration-200 text-up-on-navy [&>svg]:text-up-on-navy-muted",
    isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
    active
      ? "bg-up-navy-subtle font-bold shadow-[inset_0_0_0_1px_var(--up-border-on-navy)] [&>svg]:!text-up-orange"
      : "font-medium hover:bg-up-navy-subtle",
  )
}

export default function AppSidebar({ isCollapsed, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, logout } = useAuth()
  const { playlists } = usePlaylist()
  const isStandalone = useIsStandalone()
  const goBack = useGoBack()
  // Which nav set to show. Keyed off this rather than `user` so a signed-in
  // member does not watch the visitor nav sit there for a round trip and then
  // rearrange — see `useNavAudience`. The sections below stay on `user`, since
  // they render real profile data that genuinely is not available yet.
  const { isMember } = useNavAudience()
  const { resolvedTheme, setTheme } = useTheme()
  const [themeReady, setThemeReady] = useState(false)
  useEffect(() => setThemeReady(true), [])
  const isDark = themeReady && resolvedTheme === "dark"

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname?.startsWith(path)
  }

  // "My profile" must not light up while the Settings nav item owns the route.
  const profileActive = !!pathname?.startsWith("/profile") && !pathname.startsWith("/profile/settings")

  const onPlaylists = pathname?.startsWith("/playlists") ?? false
  const playlistTab = onPlaylists ? searchParams.get("tab") : null
  const discoverPlaylistActive = onPlaylists && (playlistTab === "public" || (!user && !playlistTab))
  const myPlaylistsActive = onPlaylists && !!user && playlistTab !== "public"

  const sectionLabel = "px-3 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-up-orange opacity-75"

  return (
    <div className="relative flex h-full flex-col bg-up-navy font-sans text-up-on-navy dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)]">
      <div className={cn("relative z-[1] flex-shrink-0 border-b border-up-border-on-navy pb-5 pt-6", isCollapsed ? "px-2" : "px-6")}>
        <Link href="/" className={cn("group flex items-center rounded-up-md outline-none focus-visible:ring-2 focus-visible:ring-up-orange", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-up-md bg-up-orange transition-transform duration-300 group-hover:scale-[1.04]">
            <UpLogo tone="navy" height={26} alt={isCollapsed ? "UP" : ""} className="w-[74%]" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="font-display text-lg font-bold leading-tight">UP</p>
              <p className="text-[13px] text-up-orange opacity-85">Your growth hub</p>
            </div>
          )}
        </Link>
      </div>

      <nav className={cn("relative z-[1] flex-1 overflow-y-auto scrollbar-hide", isCollapsed ? "px-2 py-4" : "px-4 py-4")}>
        <div className="space-y-[3px]">
          {/* Back leads the signed-out nav: a visitor usually landed here from a
              shared link or a search result, so the way out is the control they
              reach for first. */}
          {!isMember && (
            <button
              type="button"
              onClick={goBack}
              title={isCollapsed ? "Back" : undefined}
              className={cn(navLinkClass({ isCollapsed, active: false }), "w-full")}
            >
              <RiArrowLeftLine className="h-5 w-5 shrink-0" aria-hidden />
              {!isCollapsed && <span className="truncate">Back</span>}
            </button>
          )}
          {(isMember ? mainNavItems : guestNavItems).map((item) => {
            const active = isActive(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={item.path}
                title={isCollapsed ? item.name : undefined}
                className={navLinkClass({ isCollapsed, active })}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
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
            <div>
              {!isCollapsed ? <p className={sectionLabel}>Library</p> : <div className="my-3 h-px bg-up-border-on-navy" aria-hidden />}
              <div className="space-y-[3px]">
                <Link
                  href={`/profile/${user._id}`}
                  title={isCollapsed ? "My Profile" : undefined}
                  className={navLinkClass({ isCollapsed, active: profileActive })}
                >
                  <RiUserLine className="h-5 w-5 shrink-0" aria-hidden />
                  {!isCollapsed && <span className="truncate">My profile</span>}
                </Link>
                {canPublishContent(user.role) && (
                  <Link
                    href="/dashboard/provider"
                    title={isCollapsed ? "Provider Hub" : undefined}
                    className={navLinkClass({ isCollapsed, active: isActive("/dashboard/provider") })}
                  >
                    <RiVipCrownLine className="h-5 w-5 shrink-0" aria-hidden />
                    {!isCollapsed && <span className="truncate">Provider hub</span>}
                  </Link>
                )}
                {canAccessMonitorPortal(user.role) && (
                  <Link
                    href="/dashboard/monitor"
                    title={isCollapsed ? "Monitor" : undefined}
                    className={navLinkClass({ isCollapsed, active: isActive("/dashboard/monitor") })}
                  >
                    <RiEyeLine className="h-5 w-5 shrink-0" aria-hidden />
                    {!isCollapsed && <span className="truncate">Monitor</span>}
                  </Link>
                )}
              </div>
            </div>
          </>
        )}

      </nav>

      <div className={cn("relative z-[1] flex-shrink-0 space-y-[3px] border-t border-up-border-on-navy", isCollapsed ? "px-2 py-3" : "px-4 py-3.5")}>
        {/* Language applies to signed-out visitors too, so it sits outside the
            `user` branch. Hidden when collapsed — the trigger needs its label. */}
        {!isCollapsed && (
          <div className="pb-1">
            <LanguageSwitcher
              variant="ghost"
              className="w-full justify-start border border-up-border-on-navy text-up-on-navy hover:bg-up-navy-subtle hover:text-up-on-navy"
            />
          </div>
        )}
        {user && (
          <Link
            href="/profile/settings"
            title={isCollapsed ? "Settings" : undefined}
            className={navLinkClass({ isCollapsed, active: !!pathname?.startsWith("/profile/settings") })}
          >
            <RiSettings3Line className="h-5 w-5 shrink-0" aria-hidden />
            {!isCollapsed && <span className="truncate">Settings</span>}
          </Link>
        )}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title={isCollapsed ? (isDark ? "Light mode" : "Dark mode") : undefined}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className={cn(navLinkClass({ isCollapsed, active: false }), "w-full")}
        >
          {isDark ? <RiSunLine className="h-5 w-5 shrink-0" aria-hidden /> : <RiMoonLine className="h-5 w-5 shrink-0" aria-hidden />}
          {!isCollapsed && <span className="truncate">{isDark ? "Light mode" : "Dark mode"}</span>}
        </button>
        {!isStandalone && (
          <button
            type="button"
            onClick={showPwaInstallPrompt}
            title={isCollapsed ? "Install app" : undefined}
            className={cn(navLinkClass({ isCollapsed, active: false }), "w-full")}
          >
            <RiDownloadLine className="h-5 w-5 shrink-0" aria-hidden />
            {!isCollapsed && <span className="truncate">Install app</span>}
          </button>
        )}
        {user ? (
          <>
            <button
              type="button"
              onClick={logout}
              title={isCollapsed ? "Logout" : undefined}
              className={cn(navLinkClass({ isCollapsed, active: false }), "w-full")}
            >
              <RiLogoutBoxRLine className="h-5 w-5 shrink-0" aria-hidden />
              {!isCollapsed && <span className="truncate">Log out</span>}
            </button>
            <Link
              href={`/profile/${user._id}`}
              title={isCollapsed ? "Profile" : undefined}
              className={cn(
                "mt-2 flex items-center rounded-up-lg bg-up-navy-subtle transition-shadow hover:shadow-[inset_0_0_0_1px_var(--up-border-on-navy)]",
                isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-up-lime font-display text-xs font-bold text-up-navy">
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
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {user.firstName || user.email?.split("@")[0]}
                  </p>
                  <p className="truncate text-xs capitalize text-up-orange opacity-85">
                    {user.role?.replace("_", " ")}
                  </p>
                </div>
              )}
            </Link>
          </>
        ) : (
          <div className={cn("space-y-2 pt-2", isCollapsed && "space-y-1.5")}>
            <Link
              href="/login"
              title={isCollapsed ? "Sign In" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-full font-bold text-up-on-navy shadow-[inset_0_0_0_1.5px_var(--up-border-on-navy)] transition-colors hover:bg-up-navy-subtle",
                isCollapsed ? "p-3" : "w-full px-4 py-2.5",
              )}
            >
              {isCollapsed ? <RiUserLine className="h-5 w-5" aria-hidden /> : "Sign in"}
            </Link>
            <Link
              href="/signup"
              title={isCollapsed ? "Get Started" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-full bg-up-orange font-bold text-up-navy transition-all hover:brightness-105",
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
        className="absolute right-0 top-1/2 z-20 flex h-9 w-9 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all hover:border-up-border-hover hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-up-orange"
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
