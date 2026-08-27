"use client"

import Link from "next/link"
import Image from "next/image"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ProviderTab = "overview" | "content" | "promotions" | "analytics"

interface NavItem {
  id: ProviderTab
  label: string
  icon: LucideIcon
}

interface QuickLink {
  label: string
  icon: LucideIcon
  href: string
  variant: "default" | "outline"
}

interface ProviderDashboardSidebarProps {
  user: { firstName?: string; email?: string; profileImage?: string | null; role?: string } | null
  profile: { profileImage?: string | null } | null
  navItems: NavItem[]
  quickLinks: QuickLink[]
  activeTab: ProviderTab
  onTabChange: (tab: ProviderTab) => void
  totalPostings: number
  postingLimit: number
}

const NOISE_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")"

export default function ProviderDashboardSidebar({
  user,
  profile,
  navItems,
  quickLinks,
  activeTab,
  onTabChange,
  totalPostings,
  postingLimit,
}: ProviderDashboardSidebarProps) {
  const avatarUrl = profile?.profileImage || user?.profileImage || null
  const unlimited = !Number.isFinite(postingLimit)
  const percentage = unlimited || postingLimit <= 0 ? 0 : Math.min((totalPostings / postingLimit) * 100, 100)
  const nearLimit = !unlimited && percentage >= 80

  const primaryLinks = quickLinks.filter((link) => link.variant === "default")
  const secondaryLinks = quickLinks.filter((link) => link.variant !== "default")

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-border/60 bg-card/90 font-sans backdrop-blur-xl lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] dark:opacity-[0.1]"
        style={{ backgroundImage: NOISE_TEXTURE }}
      />

      {/* Brand */}
      <div className="relative z-[1] flex items-center gap-3 px-4 py-5">
        <Link
          href="/"
          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border/60 transition-transform duration-300 hover:scale-[1.04]"
        >
          <Image
            src="/images/Yellow and Black Modern Media Company Logo (14).png"
            alt="Home"
            fill
            className="object-contain p-1"
          />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-body font-bold tracking-tight text-foreground">Provider Hub</p>
          <p className="text-[11px] text-muted-foreground">Your workspace</p>
        </div>
      </div>

      {/* Primary navigation */}
      <nav className="relative z-[1] flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-semibold transition-colors duration-200",
                isActive
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Posting quota */}
      <div className="relative z-[1] px-3 pt-3">
        <div className="rounded-xl border border-border/60 bg-card/50 px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Posts used</span>
            <span
              className={cn(
                "text-body-sm font-bold tabular-nums",
                nearLimit ? "text-amber-500 dark:text-amber-400" : "text-foreground",
              )}
            >
              {unlimited ? "Unlimited" : `${totalPostings}/${postingLimit}`}
            </span>
          </div>
          {!unlimited && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-500", nearLimit ? "bg-amber-500" : "bg-primary")}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="relative z-[1] space-y-2 px-3 pt-3">
        {primaryLinks.map((link) => {
          const Icon = link.icon
          return (
            <Button
              key={link.label}
              asChild
              className="min-h-11 w-full justify-center rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Link href={link.href}>
                <Icon className="mr-2 h-4 w-4" />
                {link.label}
              </Link>
            </Button>
          )
        })}
        {secondaryLinks.length > 0 && (
          <div className={cn("grid gap-2", secondaryLinks.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {secondaryLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border/60 px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Account */}
      <div className="relative z-[1] mt-3 border-t border-border/50 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-primary/10">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={user?.firstName || user?.email || "Provider avatar"}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-primary">
                {(user?.firstName || user?.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">
              {user?.firstName || user?.email?.split("@")[0]}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
