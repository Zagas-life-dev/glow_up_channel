"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  Zap,
  DollarSign,
  BarChart3,
  Crown,
  Plus,
  Settings,
  Home,
} from "lucide-react"

export type ProviderNavId = "overview" | "content" | "promotions" | "wallet" | "analytics"

export interface ProviderNavItem {
  id: ProviderNavId
  label: string
  icon: any
  href?: string
}

export const defaultProviderNavItems: ProviderNavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/dashboard/provider" },
  { id: "content", label: "Content", icon: FileText, href: "/dashboard/provider" },
  { id: "promotions", label: "Promotions", icon: Zap, href: "/dashboard/provider/promotions" },
  { id: "wallet", label: "Wallet", icon: DollarSign, href: "/dashboard/provider/wallet" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/dashboard/provider" },
]

interface ProviderSidebarProps {
  navItems?: ProviderNavItem[]
  activeId: ProviderNavId
  onNavClick?: (id: ProviderNavId, href?: string) => void
  avatarUrl?: string | null
  user?: { firstName?: string | null; email?: string | null } | null
  statsSummary?: { label: string; value: number } | null
}

export function ProviderSidebar({
  navItems = defaultProviderNavItems,
  activeId,
  onNavClick,
  avatarUrl,
  user,
  statsSummary,
}: ProviderSidebarProps) {
  const router = useRouter()

  const handleClick = (item: ProviderNavItem) => {
    if (onNavClick) {
      onNavClick(item.id, item.href)
      return
    }
    if (item.href) {
      router.push(item.href)
    }
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border/60 bg-card/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.65)] sticky top-0 h-screen">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-border/60 bg-card/10 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/15 flex items-center justify-center border border-orange-500/30 shadow-inner">
            <Crown className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Provider Hub</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>

        {/* User Info */}
        <div className="p-3 rounded-xl bg-card/70 backdrop-blur-sm border border-border/70 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500/30 to-rose-500/20 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={user?.firstName || user?.email || "Provider avatar"}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-orange-400">
                {(user?.firstName || user?.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.firstName || user?.email?.split("@")[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/70 hover:border hover:border-border/60",
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-orange-400")} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Quick actions + optional stats */}
      <div className="p-4 border-t border-border/60 space-y-2">
        <Button
          asChild
          variant="default"
          className="w-full justify-start bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30"
        >
          <Link href="/dashboard/posting">
            <Plus className="w-4 h-4 mr-2" />
            Post Content
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full justify-start border-border/70 text-muted-foreground hover:text-foreground hover:bg-card/60"
        >
          <Link href="/dashboard/provider/settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full justify-start border-border/70 text-muted-foreground hover:text-foreground hover:bg-card/60"
        >
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>

      {statsSummary && (
        <div className="p-4 border-t border-border/60">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{statsSummary.label}</span>
              <span className="text-lg font-bold text-orange-400">{statsSummary.value}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

interface ProviderMobileBottomNavProps {
  navItems?: ProviderNavItem[]
  activeId: ProviderNavId
  onNavClick?: (id: ProviderNavId, href?: string) => void
}

export function ProviderMobileBottomNav({
  navItems = defaultProviderNavItems,
  activeId,
  onNavClick,
}: ProviderMobileBottomNavProps) {
  const router = useRouter()

  const handleClick = (item: ProviderNavItem) => {
    if (onNavClick) {
      onNavClick(item.id, item.href)
      return
    }
    if (item.href) {
      router.push(item.href)
    }
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-page/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 px-2 transition-all",
                isActive ? "text-orange-400" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-orange-400")} />
              <span
                className={cn(
                  "text-[10px] font-medium truncate w-full text-center",
                  isActive && "text-orange-400",
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

