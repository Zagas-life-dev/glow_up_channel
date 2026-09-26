"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BarChart3, Eye, Home, RefreshCw } from "lucide-react"
import { UpLogo } from "@/components/up/up-logo"

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

export const MONITOR_PAGE_BACKGROUND = "bg-page"

/** The role in one badge: lime, in the rail and the header, so it is always in view. */
function ReadOnlyBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] rounded-full bg-up-lime px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-up-navy",
        className,
      )}
    >
      <Eye className="h-3.5 w-3.5" aria-hidden />
      Read-only
    </span>
  )
}

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
    <div className={cn("flex min-h-screen font-sans", MONITOR_PAGE_BACKGROUND)}>
      {/* Desktop navy rail — no write control anywhere in it. */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[280px] flex-col bg-up-navy px-4 py-6 text-up-on-navy lg:flex dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-3 border-b border-up-border-on-navy px-2 pb-[22px]">
          <Link
            href="/"
            aria-label="UP home"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-up-md bg-up-orange"
          >
            <UpLogo tone="navy" height={26} alt="" className="w-[74%]" />
          </Link>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight">Monitor</p>
            <p className="text-[13px] text-up-orange opacity-85">Watch, don&apos;t edit</p>
          </div>
        </div>
        <div className="px-2 pt-4">
          <ReadOnlyBadge />
        </div>
        <nav className="grid gap-[3px] pt-[18px]">
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
                  "flex min-h-11 w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-up-navy-subtle font-bold shadow-[inset_0_0_0_1px_var(--up-border-on-navy)]"
                    : "font-medium hover:bg-up-navy-subtle",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-up-orange" : "text-up-on-navy-muted")} />
                {item.label}
                {item.id === "listings" && assignedCount > 0 ? (
                  <span className="ml-auto text-xs tabular-nums text-up-on-navy-faint">{assignedCount}</span>
                ) : null}
              </button>
            )
          })}
          <p className="px-3 pb-1.5 pt-[18px] text-[11px] font-bold uppercase tracking-[0.14em] text-up-orange opacity-75">
            Quick links
          </p>
          <Link href="/" className="flex min-h-11 items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors hover:bg-up-navy-subtle">
            <Home className="h-[18px] w-[18px] shrink-0 text-up-on-navy-muted" />
            Back to UP
          </Link>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[280px]">
        <header className="sticky top-0 z-20 border-b border-border bg-up-bar backdrop-blur-xl">
          <div className="mx-auto flex min-h-[64px] max-w-6xl items-center gap-3 px-4 pt-[max(0rem,env(safe-area-inset-top))] sm:px-6 lg:px-10">
            <Link
              href="/"
              aria-label="UP home"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-up-sm bg-up-orange lg:hidden"
            >
              <UpLogo tone="navy" height={22} alt="" className="w-[74%]" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-up-orange-ink">Monitor</p>
              <h1 className="truncate font-display text-lg font-bold leading-tight text-foreground sm:text-xl">{title}</h1>
            </div>

            <ReadOnlyBadge className="hidden sm:inline-flex" />

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
          </div>

          {/* Phone/tablet tabs; the rail carries them on desktop. */}
          <nav className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 pb-2.5 sm:px-6 lg:hidden">
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
                    "inline-flex h-[38px] items-center gap-[7px] rounded-full px-[15px] text-sm font-semibold transition-colors",
                    active ? "bg-up-solid text-up-on-solid" : "text-muted-foreground hover:bg-up-fill hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "text-up-orange dark:text-[#B8551E]")} />
                  {item.label}
                  {item.id === "listings" && assignedCount > 0 ? (
                    <span className="text-xs tabular-nums opacity-70">{assignedCount}</span>
                  ) : null}
                </button>
              )
            })}
            <ReadOnlyBadge className="ml-auto sm:hidden" />
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto pb-16">
          <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6 md:py-7 lg:px-10">
            {viewingAsLabel ? (
              <div className="flex items-center gap-2 rounded-up-xl bg-up-fill px-4 py-3">
                <Eye className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
                <p className="text-sm text-foreground">
                  Viewing as <span className="font-bold">{viewingAsLabel}</span> — this is exactly
                  what that account sees.
                </p>
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
