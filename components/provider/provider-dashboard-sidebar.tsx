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
  user: { firstName?: string; email?: string; profileImage?: string | null; isPremium?: boolean; role?: string } | null
  profile: { profileImage?: string | null } | null
  navItems: NavItem[]
  quickLinks: QuickLink[]
  activeTab: ProviderTab
  onTabChange: (tab: ProviderTab) => void
  totalPostings: number
  postingLimit: number
  hasPremium: boolean
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
  hasPremium,
}: ProviderDashboardSidebarProps) {
  const avatarUrl = profile?.profileImage || user?.profileImage || null
  const percentage = postingLimit > 0 ? Math.min((totalPostings / postingLimit) * 100, 100) : 0
  const navLinkClass = (active: boolean) =>
    cn(
      "flex min-h-11 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-body-sm font-semibold transition-all duration-200",
      active
        ? "border-primary/30 bg-primary/12 text-primary shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.18)]"
        : "border-transparent text-muted-foreground hover:border-border/50 hover:bg-muted/70 hover:text-foreground",
    )

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-border/60 bg-card/90 font-sans shadow-[inset_-1px_0_0_0_hsl(var(--border)/0.5)] backdrop-blur-xl">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.2] dark:opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative z-[1] border-b border-border/50 p-4">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/" className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-border/60 transition-transform duration-300 hover:scale-[1.04]">
            <Image
              src="/images/Yellow and Black Modern Media Company Logo (14).png"
              alt="GlowUp"
              fill
              className="object-contain p-1"
            />
          </Link>
          <div>
            <h1 className="text-display-sm font-bold tracking-tight text-foreground">Provider Hub</h1>
            <p className="text-caption text-muted-foreground">Manage your workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/40 p-3 backdrop-blur-sm">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-primary/10 ring-1 ring-primary/10">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={user?.firstName || user?.email || "Provider avatar"}
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-primary">
                {(user?.firstName || user?.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user?.firstName || user?.email?.split("@")[0]}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      <nav className="relative z-[1] flex-1 space-y-1.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={navLinkClass(isActive)}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="relative z-[1] space-y-2 border-t border-border/60 p-3">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Button
              key={link.label}
              asChild
              variant={link.variant}
              className={cn(
                "w-full justify-start rounded-2xl",
                link.variant === "default"
                  ? "bg-primary hover:bg-primary/90"
                  : "border-border/70 text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              <Link href={link.href}>
                <Icon className="mr-2 h-4 w-4" />
                {link.label}
              </Link>
            </Button>
          )
        })}
      </div>

      <div className="relative z-[1] border-t border-border/60 p-3">
        <div className="rounded-2xl border border-border/70 bg-card/40 p-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Your posts</span>
            <span className="text-lg font-bold text-primary">
              {totalPostings} of {postingLimit} max
            </span>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            {hasPremium ? "Premium: 20 posts max" : "Free: 5 posts max (all statuses count)"}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
          </div>
        </div>
      </div>
    </aside>
  )
}

