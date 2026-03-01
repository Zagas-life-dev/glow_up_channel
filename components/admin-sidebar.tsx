"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RiDashboardLine,
  RiGroupLine,
  RiFileLine,
  RiBarChartBoxLine,
  RiSettingsLine,
  RiHomeLine,
  RiShieldCheckLine,
  RiArrowLeftLine,
  RiRefreshLine,
  RiMore2Line,
  RiCloseLine,
  RiMenuLine,
  RiAddCircleLine,
  RiMailLine,
} from "react-icons/ri"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: RiDashboardLine, href: "/dashboard/admin", superAdminOnly: false },
  { id: "create-content", label: "Create content", icon: RiAddCircleLine, href: "/dashboard/admin/create-content", superAdminOnly: false },
  { id: "users", label: "Users", icon: RiGroupLine, href: "/dashboard/admin/users", superAdminOnly: true },
  { id: "content", label: "Content", icon: RiFileLine, href: "/dashboard/admin/content", superAdminOnly: false },
  { id: "analytics", label: "Analytics", icon: RiBarChartBoxLine, href: "/dashboard/admin/analytics", superAdminOnly: false },
  { id: "marketing-email", label: "Marketing email", icon: RiMailLine, href: "/dashboard/admin/marketing/email", superAdminOnly: true },
] as const

const QUICK_LINKS = [
  { label: "Settings", icon: RiSettingsLine, href: "/dashboard/admin/settings", variant: "outline" as const, superAdminOnly: true },
  { label: "Home", icon: RiHomeLine, href: "/", variant: "outline" as const, superAdminOnly: false },
] as const

function isNavActive(pathname: string, item: (typeof NAV_ITEMS)[number]): boolean {
  if (item.id === "overview") return pathname === "/dashboard/admin"
  if (item.id === "create-content") return pathname === "/dashboard/admin/create-content"
  return pathname === item.href || pathname?.startsWith(item.href + "/") || pathname?.includes(item.href)
}

export interface AdminLayoutProps {
  children: React.ReactNode
  /** Mobile header title (e.g. "Content", "Users") */
  pageTitle?: string
  /** Mobile header subtitle (e.g. "Moderate", "Manage") */
  pageSubtitle?: string
  /** Icon component for mobile header (e.g. RiFileLine) */
  PageIcon?: React.ComponentType<{ className?: string }>
  /** Callback when refresh is clicked (mobile + optional desktop) */
  onRefresh?: () => void
  /** Show loading state on refresh button */
  refreshLoading?: boolean
  /** If set, show Back button to this href; if unset (overview), show menu button + drawer */
  backHref?: string
  /** Extra dropdown menu items (rendered after "Back to Admin") */
  mobileMenuExtra?: React.ReactNode
}

export function AdminLayout({
  children,
  pageTitle,
  pageSubtitle,
  PageIcon = RiFileLine,
  onRefresh,
  refreshLoading = false,
  backHref,
  mobileMenuExtra,
}: AdminLayoutProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isSuperAdmin = user?.role === "super_admin"
  const showBack = backHref != null

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-page flex">
      {/* Desktop Sidebar — content-page style */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-card border-r border-border/80 fixed left-0 top-0 bottom-0 h-screen overflow-y-auto shadow-sm">
        <div className="p-6 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
              <RiShieldCheckLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Admin Hub</h1>
              <p className="text-xs text-muted-foreground">GlowUp</p>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-muted/50 dark:bg-muted/30 border border-border/50">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-foreground truncate min-w-0">
                {user?.firstName || user?.email?.split("@")[0]}
              </p>
              <Badge variant={isSuperAdmin ? "destructive" : "secondary"} className="text-xs shrink-0">
                {isSuperAdmin ? "Super" : "Admin"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => {
            const Icon = item.icon
            const isActive = isNavActive(pathname ?? "", item)
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-orange-500/15 to-amber-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-orange-500")} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border/60 space-y-2">
          {QUICK_LINKS.filter((link) => !link.superAdminOnly || isSuperAdmin).map((link) => {
            const Icon = link.icon
            return (
              <Button
                key={link.label}
                asChild
                variant={link.variant}
                className={cn(
                  "w-full justify-start rounded-2xl",
                  link.variant === "outline" ? "border-border hover:bg-muted/60" : "bg-primary hover:bg-primary/90"
                )}
              >
                <Link href={link.href}>
                  <Icon className="w-4 h-4 mr-2" />
                  {link.label}
                </Link>
              </Button>
            )
          })}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/90 dark:bg-card/90 backdrop-blur-xl border-b border-border/80 shadow-sm">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              {showBack ? (
                <Button
                  onClick={() => router.push(backHref)}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-xl"
                >
                  <RiArrowLeftLine className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-xl"
                >
                  {sidebarOpen ? <RiCloseLine className="h-5 w-5" /> : <RiMenuLine className="h-5 w-5" />}
                </Button>
              )}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <PageIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">{pageTitle ?? "Admin Hub"}</h1>
                <p className="text-xs text-muted-foreground">{pageSubtitle ?? (isSuperAdmin ? "Super Admin" : "Admin")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  variant="ghost"
                  size="sm"
                  disabled={refreshLoading}
                  className="h-9 w-9 p-0 rounded-xl"
                >
                  <RiRefreshLine className={cn("h-4 w-4", refreshLoading && "animate-spin")} />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
                    <RiMore2Line className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href="/dashboard/admin" className="flex items-center gap-3 w-full">
                      <RiHomeLine className="h-4 w-4 text-orange-500" />
                      <span>Back to Admin</span>
                    </Link>
                  </DropdownMenuItem>
                  {mobileMenuExtra}
                  <DropdownMenuSeparator className="bg-muted my-1" />
                  {isSuperAdmin && (
                    <DropdownMenuItem asChild className="rounded-xl">
                      <Link href="/dashboard/admin/settings" className="flex items-center gap-3 w-full">
                        <RiSettingsLine className="h-4 w-4 text-orange-500" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="rounded-xl">
                    <Link href="/" className="flex items-center gap-3 w-full">
                      <RiHomeLine className="h-4 w-4 text-orange-500" />
                      <span>Home</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile sidebar drawer (overview only) */}
          {!showBack && sidebarOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden
              />
              <div className="fixed left-0 top-14 bottom-20 w-64 bg-white dark:bg-card border-r border-border/80 z-40 overflow-y-auto lg:hidden shadow-xl">
                <div className="p-4 space-y-1">
                  {NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => {
                    const Icon = item.icon
                    const isActive = isNavActive(pathname ?? "", item)
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
                          isActive
                            ? "bg-gradient-to-r from-orange-500/15 to-amber-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-orange-500")} />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                  <div className="pt-4 mt-4 border-t border-border/60 space-y-2">
                    {QUICK_LINKS.filter((link) => !link.superAdminOnly || isSuperAdmin).map((link) => {
                      const Icon = link.icon
                      return (
                        <Button
                          key={link.label}
                          asChild
                          variant={link.variant}
                          className={cn(
                            "w-full justify-start rounded-2xl",
                            link.variant === "outline" ? "border-border hover:bg-muted/60" : "bg-primary hover:bg-primary/90"
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Link href={link.href}>
                            <Icon className="w-4 h-4 mr-2" />
                            {link.label}
                          </Link>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </header>

        <main className="flex-1 overflow-y-auto pb-24 lg:pb-10">
          {children}
        </main>

        {/* Mobile bottom nav */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-card border-t border-border/80 z-30 shadow-lg">
          <div className="flex justify-around h-16 items-center px-2">
            {NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => {
              const Icon = item.icon
              const isActive = isNavActive(pathname ?? "", item)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-2xl transition-colors",
                    isActive ? "text-orange-500 bg-orange-500/10" : "text-muted-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "text-orange-500")} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
