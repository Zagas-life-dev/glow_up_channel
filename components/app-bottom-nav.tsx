"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentType, SVGProps } from "react"
import {
  RiHomeLine,
  RiPlayList2Fill,
  RiSearchLine,
  RiUserLine,
  RiSettingsLine,
  RiArrowLeftLine,
  RiLoginBoxLine,
  RiUserAddLine,
} from "react-icons/ri"
import { cn } from "@/lib/utils"
import { useGoBack } from "@/hooks/use-go-back"
import { useNavAudience } from "@/hooks/use-nav-audience"

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>

/** A tab that navigates, or one that runs an action (only Back, so far). */
type NavItem =
  | { kind: "link"; name: string; icon: NavIcon; path: string }
  | { kind: "action"; name: string; icon: NavIcon; action: "back" }

/** Signed-in tabs — the app's primary navigation. */
const MEMBER_ITEMS: NavItem[] = [
  { kind: "link", name: "Home", icon: RiHomeLine, path: "/" },
  { kind: "link", name: "Playlist", icon: RiPlayList2Fill, path: "/playlists" },
  { kind: "link", name: "Search", icon: RiSearchLine, path: "/search" },
  { kind: "link", name: "Settings", icon: RiSettingsLine, path: "/profile/settings" },
  { kind: "link", name: "Profile", icon: RiUserLine, path: "/profile" },
]

/**
 * Signed-out tabs.
 *
 * Home, Playlist, Search and Settings are all gated or empty without an
 * account — a visitor tapping Playlist gets a login wall, and Settings has
 * nothing to configure. Handing them four dead ends as the primary navigation
 * is worse than handing them a way out of the page and a way in to the
 * product, which is what these four are.
 */
const GUEST_ITEMS: NavItem[] = [
  { kind: "action", name: "Back", icon: RiArrowLeftLine, action: "back" },
  { kind: "link", name: "Profile", icon: RiUserLine, path: "/login" },
  { kind: "link", name: "Sign in", icon: RiLoginBoxLine, path: "/login" },
  { kind: "link", name: "Sign up", icon: RiUserAddLine, path: "/signup" },
]

export default function AppBottomNav() {
  const pathname = usePathname()
  const { isMember, userId } = useNavAudience()
  const goBack = useGoBack()

  const items: NavItem[] = isMember
    ? MEMBER_ITEMS.map((item) =>
        item.kind === "link" && item.name === "Profile" && userId
          ? { ...item, path: `/profile/${userId}` }
          : item,
      )
    : GUEST_ITEMS

  const isActive = (item: NavItem) => {
    // Back is a control, not a destination, so it never lights up.
    if (item.kind === "action") return false
    const path = item.path
    if (path === "/") return pathname === "/"
    if (path === "/profile/settings") return pathname?.startsWith("/profile/settings")
    // "Profile" must not light up while the Settings tab is the active route.
    if (path.startsWith("/profile")) {
      return pathname?.startsWith("/profile") && !pathname.startsWith("/profile/settings")
    }
    return pathname?.startsWith(path)
  }

  if (
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/dashboard/provider/posting") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/post")
  ) {
    return null
  }

  if (
    pathname &&
    (/^\/channels\/(?!create$)[^/]+$/.test(pathname) || /^\/channels\/[^/]+\/details$/.test(pathname))
  ) {
    return null
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 font-sans"
      aria-label="Main navigation"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-14 bg-gradient-to-t from-page via-page/80 to-transparent" />

      <div className="relative border-t border-border/60 bg-page/95 shadow-[0_-10px_40px_-14px_hsl(222_47%_6%/0.18)] backdrop-blur-2xl dark:shadow-[0_-14px_48px_-16px_rgba(0,0,0,0.45)]">
        <div className="mx-auto flex max-w-lg items-end justify-between gap-0.5 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {items.map((item) => {
            const active = isActive(item)
            const Icon = item.icon

            const activeInner = (
              <>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-page transition-transform duration-200 active:scale-95 dark:ring-page">
                  <Icon className="h-7 w-7 shrink-0" aria-hidden />
                </span>
                <span className="mt-1 max-w-full truncate px-0.5 text-center text-caption font-semibold leading-tight text-primary">
                  {item.name}
                </span>
              </>
            )

            const restInner = (
              <>
                <span className="flex h-10 w-[2.75rem] items-center justify-center rounded-2xl text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground">
                  <Icon className="h-[1.35rem] w-[1.35rem] shrink-0" aria-hidden />
                </span>
                <span className="max-w-full truncate text-center text-[11px] font-semibold leading-none tracking-tight text-muted-foreground">
                  {item.name}
                </span>
              </>
            )

            const activeClass =
              "relative z-[1] -mt-5 flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-end px-1 pb-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-page rounded-xl"
            const restClass =
              "flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-xl px-0.5 pb-1 pt-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-page"

            if (item.kind === "action") {
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={goBack}
                  className={restClass}
                >
                  {restInner}
                </button>
              )
            }

            return (
              <Link
                key={item.path + item.name}
                href={item.path}
                {...(active ? { "aria-current": "page" as const } : {})}
                className={active ? activeClass : restClass}
              >
                {active ? activeInner : restInner}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
