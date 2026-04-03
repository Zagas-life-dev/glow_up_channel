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
    <nav className="fixed bottom-0 left-0 right-0 z-30 font-sans lg:hidden" aria-label="Provider navigation">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-14 bg-gradient-to-t from-page via-page/80 to-transparent" />
      <div className="relative border-t border-border/60 bg-page/95 shadow-[0_-10px_40px_-14px_hsl(222_47%_6%/0.18)] backdrop-blur-2xl dark:shadow-[0_-14px_48px_-16px_rgba(0,0,0,0.45)] safe-area-bottom">
        <div className="mx-auto flex max-w-lg items-end justify-between gap-0.5 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          if (isActive) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                aria-current="page"
                className="relative z-[1] -mt-5 flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-end rounded-xl px-1 pb-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-page transition-transform duration-200 active:scale-95 dark:ring-page">
                  <Icon className="h-6 w-6 shrink-0" />
                </span>
                <span className="mt-1 max-w-full truncate px-0.5 text-center text-caption font-semibold leading-tight text-primary">
                  {item.label}
                </span>
              </button>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-xl px-0.5 pb-1 pt-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
            >
              <span className="flex h-10 w-[2.75rem] items-center justify-center rounded-2xl text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground">
                <Icon className="h-[1.35rem] w-[1.35rem] shrink-0" />
              </span>
              <span className="max-w-full truncate text-center text-[11px] font-semibold leading-none tracking-tight text-muted-foreground">
                {item.label}
              </span>
            </button>
          )
        })}
        </div>
      </div>
    </nav>
  )
}

