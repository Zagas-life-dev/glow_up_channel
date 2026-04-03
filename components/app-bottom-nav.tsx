"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { RiHomeLine, RiPlayList2Fill, RiSearchLine, RiUserLine, RiHashtag } from "react-icons/ri"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

const navItems = [
  { name: "Home", icon: RiHomeLine, path: "/" },
  { name: "Playlist", icon: RiPlayList2Fill, path: "/playlists" },
  { name: "Search", icon: RiSearchLine, path: "/search" },
  { name: "Channels", icon: RiHashtag, path: "/channels" },
  { name: "Profile", icon: RiUserLine, path: "/profile" },
]

export default function AppBottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const items = navItems.map((item) => ({
    ...item,
    path: item.name === "Profile" ? (user ? `/profile/${user._id}` : "/login") : item.path,
  }))

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/"
    if (path.startsWith("/profile")) return pathname?.startsWith("/profile")
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
            const active = isActive(item.path)
            const Icon = item.icon

            if (active) {
              return (
                <Link
                  key={item.path + item.name}
                  href={item.path}
                  aria-current="page"
                  className="relative z-[1] -mt-5 flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-end px-1 pb-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-page rounded-xl"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-page transition-transform duration-200 active:scale-95 dark:ring-page">
                    <Icon className="h-7 w-7 shrink-0" aria-hidden />
                  </span>
                  <span className="mt-1 max-w-full truncate px-0.5 text-center text-caption font-semibold leading-tight text-primary">
                    {item.name}
                  </span>
                </Link>
              )
            }

            return (
              <Link
                key={item.path + item.name}
                href={item.path}
                className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-xl px-0.5 pb-1 pt-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
              >
                <span className="flex h-10 w-[2.75rem] items-center justify-center rounded-2xl text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground">
                  <Icon className="h-[1.35rem] w-[1.35rem] shrink-0" aria-hidden />
                </span>
                <span className="max-w-full truncate text-center text-[11px] font-semibold leading-none tracking-tight text-muted-foreground">
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
