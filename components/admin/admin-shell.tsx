"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import {
  RiMenuLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiHomeLine,
  RiLogoutBoxRLine,
} from "react-icons/ri"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { AuthRequiredCard } from "@/components/auth-required-card"
import { adminNavFor, activeAdminHref, adminTitleFor, type AdminNavGroup } from "@/components/admin/nav"
import { AdminPageHeader } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

/**
 * The frame every admin screen sits in.
 *
 * It owns three things the pages used to each re-implement: navigation (one grouped nav,
 * rendered as a fixed sidebar on desktop and a single drawer on mobile — replacing the old
 * mix of drawer + bottom bar + overflow menu), the role gate, and hiding the consumer
 * navbar/footer. A page supplies a title and its content; everything else is handled here.
 */

interface AdminShellProps {
  children: React.ReactNode
  /** Defaults to the nav label for the current route. */
  title?: string
  description?: string
  /** Primary page actions, shown beside the title on desktop and in the mobile bar. */
  actions?: React.ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  /** Gate the page to super admins only. */
  requireSuperAdmin?: boolean
  /** Content column width. Lists and tables want `wide`; forms want `narrow`. */
  width?: "default" | "wide" | "narrow"
  /** Render without the standard page header (for screens that draw their own). */
  bare?: boolean
}

const WIDTH_CLASS = {
  narrow: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
} as const

function NavList({
  groups,
  activeHref,
  onNavigate,
}: {
  groups: AdminNavGroup[]
  activeHref: string | null
  onNavigate?: () => void
}) {
  return (
    <nav className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              const active = activeHref === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-[1.05rem] w-[1.05rem] shrink-0", active && "text-primary")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function AdminShell({
  children,
  title,
  description,
  actions,
  onRefresh,
  refreshing = false,
  requireSuperAdmin = false,
  width = "default",
  bare = false,
}: AdminShellProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const pathname = usePathname() ?? ""
  const [drawerOpen, setDrawerOpen] = useState(false)

  // The admin area is its own environment — the consumer chrome would only compete with it.
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  const isSuperAdmin = user?.role === "super_admin"
  const isAdmin = user?.role === "admin" || isSuperAdmin
  const resolvedTitle = title ?? adminTitleFor(pathname) ?? "Admin"

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <RiRefreshLine className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredCard
        title="Authentication required"
        description="Please log in to access the admin area."
        icon={Lock}
        signInLabel="Sign in"
      />
    )
  }

  if (!isAdmin || (requireSuperAdmin && !isSuperAdmin)) {
    return (
      <AuthRequiredCard
        title="Access denied"
        description={
          requireSuperAdmin
            ? "Super admin privileges are required for this page."
            : "Admin privileges are required for this page."
        }
        icon={Lock}
        iconVariant="neutral"
        signInLabel="Sign in"
        secondaryAction={{ label: "Back to Admin", href: "/dashboard/admin" }}
      />
    )
  }

  const groups = adminNavFor(isSuperAdmin)
  const activeHref = activeAdminHref(pathname)

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <RiShieldCheckLine className="h-[1.05rem] w-[1.05rem] text-primary-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight text-foreground">Admin</p>
        <p className="text-[11px] leading-tight text-muted-foreground">
          {isSuperAdmin ? "Super admin" : "Admin"}
        </p>
      </div>
    </div>
  )

  const footerLinks = (
    <div className="space-y-0.5">
      <Link
        href="/"
        className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <RiHomeLine className="h-[1.05rem] w-[1.05rem] shrink-0" />
        Back to site
      </Link>
      <Link
        href="/dashboard"
        className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <RiLogoutBoxRLine className="h-[1.05rem] w-[1.05rem] shrink-0" />
        My dashboard
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-page">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[15.5rem] flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border px-4 py-4">{brand}</div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavList groups={groups} activeHref={activeHref} />
        </div>
        <div className="border-t border-border px-3 py-3">
          {footerLinks}
          <div className="mt-3 truncate px-3 text-[11px] text-muted-foreground" title={user?.email}>
            {user?.email}
          </div>
        </div>
      </aside>

      {/* Mobile drawer — the only mobile nav surface */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[17rem] overflow-y-auto p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <div className="border-b border-border px-4 py-4">{brand}</div>
          <div className="px-3 py-4">
            <NavList groups={groups} activeHref={activeHref} onNavigate={() => setDrawerOpen(false)} />
            <div className="mt-5 border-t border-border pt-3">{footerLinks}</div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:pl-[15.5rem]">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-page/90 px-3 backdrop-blur-xl lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-lg"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open admin navigation"
          >
            <RiMenuLine className="h-5 w-5" />
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{resolvedTitle}</p>
          {onRefresh ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-lg"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RiRefreshLine className={cn("h-[1.05rem] w-[1.05rem]", refreshing && "animate-spin")} />
            </Button>
          ) : null}
        </header>

        <main className={cn("mx-auto px-4 py-5 sm:px-6 lg:py-8", WIDTH_CLASS[width])}>
          {bare ? (
            children
          ) : (
            <>
              <AdminPageHeader
                title={resolvedTitle}
                description={description}
                actions={
                  <>
                    {actions}
                    {onRefresh ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="hidden h-10 rounded-xl lg:inline-flex"
                        onClick={onRefresh}
                        disabled={refreshing}
                      >
                        <RiRefreshLine className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                        Refresh
                      </Button>
                    ) : null}
                  </>
                }
                className="mb-6"
              />
              {children}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
