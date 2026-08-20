"use client"

import * as React from "react"
import Link from "next/link"
import type { IconType } from "react-icons"
import { RiSearchLine, RiInboxLine } from "react-icons/ri"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Shared building blocks for the admin area.
 *
 * Admin screens are tools, not marketing pages: they run denser, flatter and quieter than the
 * consumer app — 12px radii, hairline borders, a single accent reserved for the active state
 * and primary actions. Everything here is built on theme tokens (bg-card, text-foreground,
 * border-border) so the whole area works in dark mode without per-page overrides.
 */

/* ------------------------------------------------------------------ page header */

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ surfaces */

export function AdminCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", className)} {...props}>
      {children}
    </div>
  )
}

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <AdminCard className={className}>
      {title || actions ? (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </AdminCard>
  )
}

/* ------------------------------------------------------------------ stats */

export function AdminStatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>
}

/**
 * A single metric. Deliberately monochrome — in the old design every tile carried its own
 * gradient and colour, which made nine equally-weighted numbers shout at once. Colour here is
 * reserved for `emphasis`, for the one or two figures that actually need attention.
 */
export function AdminStat({
  label,
  value,
  hint,
  icon: Icon,
  href,
  emphasis = "none",
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: IconType
  href?: string
  emphasis?: "none" | "attention" | "positive"
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" /> : null}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.75rem]",
          emphasis === "attention" && "text-primary",
          emphasis === "positive" && "text-emerald-600 dark:text-emerald-400",
          emphasis === "none" && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </>
  )

  const base = "rounded-xl border border-border bg-card p-4 text-left"

  if (href) {
    return (
      <Link href={href} className={cn(base, "block transition-colors hover:border-primary/40 hover:bg-muted/40")}>
        {body}
      </Link>
    )
  }
  return <div className={base}>{body}</div>
}

/* ------------------------------------------------------------------ toolbar */

export function AdminToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  children,
  className,
}: {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Filter selects and other controls, laid out beside the search field. */
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      {onSearchChange ? (
        <div className="relative min-w-0 flex-1">
          <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-xl pl-9"
          />
        </div>
      ) : null}
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

/** Segmented filter chips — the shared replacement for each page's bespoke tab strip. */
export function AdminTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; count?: number }[]
  className?: string
}) {
  return (
    <div className={cn("scrollbar-hide -mx-1 flex gap-1 overflow-x-auto px-1", className)} role="tablist">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className={cn("text-xs tabular-nums", active ? "text-primary/70" : "text-muted-foreground/70")}>
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ status */

type StatusTone = "neutral" | "positive" | "warning" | "danger"

const STATUS_TONE: Record<string, StatusTone> = {
  active: "positive",
  approved: "positive",
  completed: "positive",
  published: "positive",
  paid: "positive",
  pending: "warning",
  review: "warning",
  processing: "warning",
  rejected: "danger",
  cancelled: "danger",
  failed: "danger",
  suspended: "danger",
  draft: "neutral",
  inactive: "neutral",
  expired: "neutral",
  archived: "neutral",
}

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  positive: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
}

/** One status vocabulary for the whole admin area, so "pending" looks the same on every screen. */
export function StatusPill({ status, className }: { status: string; className?: string }) {
  const key = (status ?? "").toLowerCase()
  const tone = STATUS_TONE[key] ?? "neutral"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        TONE_CLASS[tone],
        className,
      )}
    >
      {(status ?? "").replace(/_/g, " ") || "unknown"}
    </span>
  )
}

/* ------------------------------------------------------------------ states */

export function AdminEmpty({
  title,
  description,
  icon: Icon = RiInboxLine,
  action,
  className,
}: {
  title: string
  description?: string
  icon?: IconType
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-xl border border-dashed border-border px-6 py-14 text-center", className)}>
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

/** Row-shaped loading placeholder, matching the density of the real lists. */
export function AdminSkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded-full bg-muted" />
            <div className="h-3 w-1/2 rounded-full bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AdminSkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <AdminStatGrid>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
          <div className="h-3 w-16 rounded-full bg-muted" />
          <div className="mt-3 h-7 w-20 rounded-lg bg-muted" />
        </div>
      ))}
    </AdminStatGrid>
  )
}
