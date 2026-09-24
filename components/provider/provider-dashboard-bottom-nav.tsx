"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type ProviderTab = "overview" | "content" | "promotions" | "analytics"

interface NavItem {
  id: ProviderTab
  label: string
  icon: LucideIcon
}

interface ProviderDashboardBottomNavProps {
  navItems: NavItem[]
  activeTab: ProviderTab
  onTabChange: (tab: ProviderTab) => void
}

export default function ProviderDashboardBottomNav({
  navItems,
  activeTab,
  onTabChange,
}: ProviderDashboardBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card font-sans lg:hidden"
      aria-label="Provider navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className="flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center gap-1 rounded-up-sm px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-up-orange"
            >
              <span
                className={cn(
                  "flex h-[30px] w-[52px] items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-up-solid text-up-orange dark:text-up-navy" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
              </span>
              <span
                className={cn(
                  "max-w-full truncate text-center text-[11px] leading-none tracking-tight",
                  isActive ? "font-bold text-foreground" : "font-semibold text-muted-foreground",
                )}
              >
                {item.label === "Promotions" ? "Promote" : item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
