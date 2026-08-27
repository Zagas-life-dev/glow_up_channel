"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import ProviderDashboardSidebar from "@/components/provider/provider-dashboard-sidebar"
import ProviderDashboardBottomNav from "@/components/provider/provider-dashboard-bottom-nav"
import type { ProviderTab } from "@/components/provider/provider-ui"
import {
  LayoutDashboard,
  FileText,
  Zap,
  BarChart3,
  Plus,
  Settings,
  Home,
  Crown,
  RefreshCw,
  MoreVertical,
} from "lucide-react"

/** One source of truth for provider navigation — every provider page uses these. */
export const PROVIDER_NAV_ITEMS: { id: ProviderTab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "content", label: "Content", icon: FileText },
  { id: "promotions", label: "Promotions", icon: Zap },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
]

export const PROVIDER_NAV_ROUTES: Record<ProviderTab, string> = {
  overview: "/dashboard/provider",
  content: "/dashboard/provider/posting",
  promotions: "/dashboard/provider/promotions",
  analytics: "/dashboard/provider/settings",
}

export const PROVIDER_QUICK_LINKS = [
  { label: "Post Content", icon: Plus, href: "/dashboard/provider/posting", variant: "default" as const },
  { label: "Settings", icon: Settings, href: "/dashboard/provider/settings", variant: "outline" as const },
  { label: "Home", icon: Home, href: "/", variant: "outline" as const },
]

/** Maps a pathname to the provider tab that should read as active. */
export function providerTabForPath(pathname?: string | null): ProviderTab {
  if (!pathname) return "overview"
  if (pathname.startsWith("/dashboard/provider/posting")) return "content"
  if (pathname.startsWith("/dashboard/provider/promotions")) return "promotions"
  if (pathname.startsWith("/dashboard/provider/settings")) return "analytics"
  return "overview"
}

export const PROVIDER_PAGE_BACKGROUND =
  "bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.16),transparent_58%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.08),transparent_55%)]"

interface ProviderShellProps {
  user: any
  profile?: any
  /** Which sidebar/bottom-nav entry reads as active. */
  activeTab: ProviderTab
  onTabChange: (tab: ProviderTab) => void
  /** Header title for this page or section. */
  title: string
  totalPostings: number
  postingLimit: number
  onRefresh?: () => void
  refreshing?: boolean
  /** Extra header controls, rendered before the mobile overflow menu. */
  actions?: ReactNode
  /** Set false to drop the header's primary "New post" button (e.g. on the posting page itself). */
  showNewPost?: boolean
  children: ReactNode
}

export function ProviderShell({
  user,
  profile = null,
  activeTab,
  onTabChange,
  title,
  totalPostings,
  postingLimit,
  onRefresh,
  refreshing = false,
  actions,
  showNewPost = true,
  children,
}: ProviderShellProps) {
  return (
    <div className={cn("flex min-h-screen font-sans", PROVIDER_PAGE_BACKGROUND)}>
      <div className="flex min-w-0 flex-1">
        <ProviderDashboardSidebar
          user={user}
          profile={profile}
          navItems={PROVIDER_NAV_ITEMS}
          quickLinks={PROVIDER_QUICK_LINKS}
          activeTab={activeTab}
          onTabChange={onTabChange}
          totalPostings={totalPostings}
          postingLimit={postingLimit}
        />

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-page/80 backdrop-blur-xl">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 pt-[max(0rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 lg:hidden">
                <Crown className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Provider Hub</p>
                <h1 className="truncate text-body font-semibold leading-tight text-foreground">{title}</h1>
              </div>

              {onRefresh ? (
                <Button
                  onClick={onRefresh}
                  variant="ghost"
                  size="sm"
                  disabled={refreshing}
                  aria-label="Refresh"
                  className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                </Button>
              ) : null}

              {actions}

              {showNewPost ? (
                <Button asChild size="sm" className="h-9 shrink-0 rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90">
                  <Link href="/dashboard/provider/posting">
                    <Plus className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">New post</span>
                  </Link>
                </Button>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="More options" className="h-9 w-9 shrink-0 p-0 text-muted-foreground lg:hidden">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-1">
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link href="/dashboard/provider/settings" className="flex w-full items-center gap-2.5">
                      <Settings className="h-4 w-4 text-primary" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link href="/" className="flex w-full items-center gap-2.5">
                      <Home className="h-4 w-4 text-primary" />
                      <span>Home</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-28 lg:pb-10">
            <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 md:py-6 lg:px-8">{children}</div>
          </main>

          <ProviderDashboardBottomNav navItems={PROVIDER_NAV_ITEMS} activeTab={activeTab} onTabChange={onTabChange} />
        </div>
      </div>
    </div>
  )
}
