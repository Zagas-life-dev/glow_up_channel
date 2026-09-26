"use client"

import Link from "next/link"
import Image from "next/image"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UpLogo } from "@/components/up/up-logo"

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
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[280px] flex-col bg-up-navy px-4 py-6 font-sans text-up-on-navy lg:flex dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)]">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-up-border-on-navy px-2 pb-[22px]">
        <Link
          href="/"
          aria-label="UP home"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-up-md bg-up-orange transition-transform duration-300 hover:scale-[1.04]"
        >
          <UpLogo tone="navy" height={26} alt="" className="w-[74%]" />
        </Link>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold leading-tight">Provider hub</p>
          <p className="text-[13px] text-up-orange opacity-85">Publish and measure</p>
        </div>
      </div>

      {/* Primary navigation */}
      <nav className="grid gap-[3px] overflow-y-auto pt-[18px]">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors duration-200",
                isActive
                  ? "bg-up-navy-subtle font-bold shadow-[inset_0_0_0_1px_var(--up-border-on-navy)]"
                  : "font-medium hover:bg-up-navy-subtle",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-up-orange" : "text-up-on-navy-muted")} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}

        {secondaryLinks.length > 0 && (
          <>
            <p className="px-3 pb-1.5 pt-[18px] text-[11px] font-bold uppercase tracking-[0.14em] text-up-orange opacity-75">
              Quick links
            </p>
            {secondaryLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex min-h-11 items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors hover:bg-up-navy-subtle"
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 text-up-on-navy-muted" />
                  <span className="truncate">{link.label === "Home" ? "Back to UP" : link.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="mt-auto grid gap-2.5 border-t border-up-border-on-navy pt-3.5">
        {primaryLinks.map((link) => {
          const Icon = link.icon
          return (
            <Button key={link.label} asChild className="h-11 w-full">
              <Link href={link.href}>
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            </Button>
          )
        })}

        {/* Posting quota */}
        <div className="rounded-up-lg bg-up-navy-subtle p-3">
          <div className="flex items-baseline justify-between gap-2 text-xs text-up-on-navy-muted">
            <span>Listings this cycle</span>
            <b className="font-display text-xs text-up-on-navy tabular-nums">
              {unlimited ? "Unlimited" : `${totalPostings} / ${postingLimit}`}
            </b>
          </div>
          {!unlimited && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn("h-full rounded-full transition-all duration-500", nearLimit ? "bg-up-lime" : "bg-up-orange")}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
        </div>

        {/* Account */}
        <div className="flex items-center gap-3 rounded-up-lg bg-up-navy-subtle px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-up-orange">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={user?.firstName || user?.email || "Provider avatar"}
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-display text-xs font-bold text-up-navy">
                {(user?.firstName || user?.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user?.firstName || user?.email?.split("@")[0]}</p>
            <p className="truncate text-xs text-up-orange opacity-85">Provider</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
