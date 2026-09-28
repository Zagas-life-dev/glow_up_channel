"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/dashboard/admin/analytics", label: "Overview" },
  { href: "/dashboard/admin/analytics/listings", label: "Listings" },
  { href: "/dashboard/admin/analytics/locations", label: "Locations" },
  { href: "/dashboard/admin/analytics/demographics", label: "Demographics" },
]

/** Links between the admin analytics pages, so each one is reachable from the others. */
export function AnalyticsTabs({ className }: { className?: string }) {
  const pathname = usePathname() ?? ""
  return (
    <nav className={cn("scrollbar-hide -mx-1 flex gap-1 overflow-x-auto px-1", className)} aria-label="Analytics">
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
