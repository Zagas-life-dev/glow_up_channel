"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentType, SVGProps } from "react"
import {
  RiHomeLine,
  RiHomeFill,
  RiPlayList2Line,
  RiPlayList2Fill,
  RiSearchLine,
  RiSearchFill,
  RiUserLine,
  RiUserFill,
  RiCheckboxCircleLine,
  RiCheckboxCircleFill,
  RiArrowLeftLine,
  RiLoginBoxLine,
  RiUserAddLine,
} from "react-icons/ri"
import { cn } from "@/lib/utils"
import { useGoBack } from "@/hooks/use-go-back"
import { useNavAudience } from "@/hooks/use-nav-audience"

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>

/**
 * A tab that navigates, or one that runs an action (only Back, so far).
 * `activeIcon` is the filled variant — state is carried by weight and colour, never by size,
 * so the bar's geometry is identical on every route.
 */
type NavItem =
  | { kind: "link"; name: string; icon: NavIcon; activeIcon?: NavIcon; path: string }
  | { kind: "action"; name: string; icon: NavIcon; action: "back" }

/** Signed-in tabs — the app's primary navigation. */
const MEMBER_ITEMS: NavItem[] = [
  { kind: "link", name: "Home", icon: RiHomeLine, activeIcon: RiHomeFill, path: "/" },
  { kind: "link", name: "Playlists", icon: RiPlayList2Line, activeIcon: RiPlayList2Fill, path: "/playlists" },
  { kind: "link", name: "Search", icon: RiSearchLine, activeIcon: RiSearchFill, path: "/search" },
  { kind: "link", name: "Tracker", icon: RiCheckboxCircleLine, activeIcon: RiCheckboxCircleFill, path: "/tracker" },
  { kind: "link", name: "Profile", icon: RiUserLine, activeIcon: RiUserFill, path: "/profile" },
]

/**
 * Signed-out tabs.
 *
 * Home, Playlists, Search and Tracker are all gated or empty without an account, so handing
 * a visitor those as the primary navigation is four dead ends. These three are a way out of
 * the page and two ways into the product.
 *
 * There used to be a fourth, "Profile", which pointed at /login — the same destination as
 * "Sign in" sitting right beside it. Two tabs, one place. It is gone.
 */
const GUEST_ITEMS: NavItem[] = [
  { kind: "action", name: "Back", icon: RiArrowLeftLine, action: "back" },
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
    if (path === "/tracker") return pathname?.startsWith("/tracker")
    // Settings lives under /profile/settings but is not a tab, so "Profile" must
    // not light up while the user is in there.
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-page/90 font-sans backdrop-blur-xl lg:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const active = isActive(item)
          const Icon = active && item.kind === "link" && item.activeIcon ? item.activeIcon : item.icon

          const inner = (
            <>
              {/* Indicator sits inside the tab's own box, so nothing reflows when it appears. */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-3 top-0 h-[2px] rounded-full transition-colors",
                  active ? "bg-primary" : "bg-transparent",
                )}
              />
              <Icon
                className={cn(
                  "h-[1.375rem] w-[1.375rem] shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "max-w-full truncate text-[11px] leading-none tracking-tight transition-colors",
                  active ? "font-semibold text-primary" : "font-medium text-muted-foreground",
                )}
              >
                {item.name}
              </span>
            </>
          )

          // One class for every tab, active or not — identical height, padding and icon size.
          const tabClass =
            "relative flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 pt-1.5 outline-none transition-colors active:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/40"

          if (item.kind === "action") {
            return (
              <button key={item.name} type="button" onClick={goBack} className={tabClass}>
                {inner}
              </button>
            )
          }

          return (
            <Link
              key={item.path + item.name}
              href={item.path}
              {...(active ? { "aria-current": "page" as const } : {})}
              className={tabClass}
            >
              {inner}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
