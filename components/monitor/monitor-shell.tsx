"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BarChart3, Eye, Home, RefreshCw } from "lucide-react"

/**
 * The monitor portal's frame.
 *
 * Deliberately not ProviderShell. That shell is built around publishing — a
 * "New post" button, a posting quota meter, nav to the posting and promotions
 * screens — and a monitor can do none of those things. Reusing it and hiding
 * pieces would leave a row of dead controls one prop away from reappearing;
 * a monitor's frame simply has no write control in it to hide.
 *
 * The panels, stat tiles and analytics cards inside are the provider ones,
 * because the numbers are the same numbers and should read identically.
 *
 * Admins reach this frame too, with a picker in `actions` for switching whose
 * view they are reading. Nothing else about the frame changes for them — the
 * whole point is to see what the monitor sees.
 */

export type MonitorTab = "listings" | "analytics"

export const MONITOR_NAV_ITEMS: { id: MonitorTab; label: string; icon: any }[] = [
  { id: "listings", label: "Listings", icon: Eye },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
]

export const MONITOR_NAV_ROUTES: Record<MonitorTab, string> = {
  listings: "/dashboard/monitor",
  analytics: "/dashboard/monitor/analytics",
}

/** Maps a pathname to the tab that should read as active. */
export function monitorTabForPath(pathname?: string | null): MonitorTab {
  if (pathname?.startsWith("/dashboard/monitor/analytics")) return "analytics"
  return "listings"
}

export const MONITOR_PAGE_BACKGROUND =
  "bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.16),transparent_58%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.08),transparent_55%)]"

interface MonitorShellProps {
  activeTab: MonitorTab
  onTabChange: (tab: MonitorTab) => void
  title: string
  /** How many listings this account has been assigned. */
  assignedCount: number
  onRefresh?: () => void
  refreshing?: boolean
  /** Header controls; the admin "viewing as" picker goes here. */
  actions?: ReactNode
  /** Set when an admin is reading someone else's view. */
  viewingAsLabel?: string | null
  children: ReactNode
}

export function MonitorShell({
  activeTab,
  onTabChange,
  title,
  assignedCount,
  onRefresh,
  refreshing = false,
  actions,
  viewingAsLabel = null,
  children,
}: MonitorShellProps) {
  return (
    <div className={cn("flex min-h-screen flex-col font-sans", MONITOR_PAGE_BACKGROUND)}>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-page/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 pt-[max(0rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10">
            <Eye className="h-4 w-4 text-violet-500 dark:text-violet-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Monitor</p>
            <h1 className="truncate text-body font-semibold leading-tight text-foreground">{title}</h1>
          </div>

          {actions}

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

          <Button asChild variant="ghost" size="sm" className="h-9 shrink-0 px-3 text-muted-foreground hover:text-foreground">
            <Link href="/">
              <Home className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </Button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2 sm:px-6 lg:px-8">
          {MONITOR_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = item.id === activeTab
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-body-sm font-medium transition-colors",
                  active
                    ? "bg-violet-500/12 text-violet-600 dark:text-violet-400"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.id === "listings" && assignedCount > 0 ? (
                  <span className="ml-0.5 rounded-md bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">
                    {assignedCount}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto pb-16">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 md:py-6 lg:px-8">
          {viewingAsLabel ? (
            <div className="flex items-center gap-2 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] px-3.5 py-2.5">
              <Eye className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
              <p className="text-body-sm text-foreground">
                Viewing as <span className="font-semibold">{viewingAsLabel}</span> — this is exactly
                what that account sees.
              </p>
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  )
}
