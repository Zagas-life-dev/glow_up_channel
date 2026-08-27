"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

export type ProviderTab = "overview" | "content" | "promotions" | "analytics"

export type Tone = "primary" | "emerald" | "amber" | "violet" | "neutral"

export const TONES: Record<Tone, { wrap: string; icon: string }> = {
  primary: { wrap: "border-primary/25 bg-primary/10", icon: "text-primary" },
  emerald: { wrap: "border-emerald-500/25 bg-emerald-500/10", icon: "text-emerald-500 dark:text-emerald-400" },
  amber: { wrap: "border-amber-500/25 bg-amber-500/10", icon: "text-amber-500 dark:text-amber-400" },
  violet: { wrap: "border-violet-500/25 bg-violet-500/10", icon: "text-violet-500 dark:text-violet-400" },
  neutral: { wrap: "border-border/60 bg-muted/60", icon: "text-muted-foreground" },
}

/** Shared status pill colours — readable in both themes. */
export function statusToneClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "active":
    case "live":
    case "paid":
    case "completed_ok":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
    case "pending":
    case "paused":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
    case "completed":
    case "expired":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/25"
    case "cancelled":
    case "failed":
      return "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25"
    default:
      return "bg-muted text-muted-foreground border border-border"
  }
}

/* ------------------------------------------------------------------ */

export function Panel({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  bodyClassName,
  className,
}: {
  icon?: any
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  bodyClassName?: string
  className?: string
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm", className)}>
      {title ? (
        <div className="flex flex-col gap-3 border-b border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon ? <Icon className="h-4 w-4 shrink-0 text-primary" /> : null}
            <div className="min-w-0">
              <h2 className="truncate text-body-sm font-semibold text-foreground">{title}</h2>
              {subtitle ? <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("p-3 md:p-4", bodyClassName)}>{children}</div>
    </section>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaHref,
  ctaLabel,
  onCta,
}: {
  icon: any
  title: string
  description: string
  ctaHref?: string
  ctaLabel?: string
  onCta?: () => void
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center md:py-14">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-body-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground md:text-body-sm">{description}</p>
      {ctaLabel && ctaHref ? (
        <Button asChild className="mt-4 min-h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href={ctaHref}>
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : ctaLabel && onCta ? (
        <Button onClick={onCta} className="mt-4 min-h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          {ctaLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : null}
    </div>
  )
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string
  value: ReactNode
  hint?: string
  icon: any
  tone?: Tone
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-3 backdrop-blur-sm transition-colors hover:border-primary/25 md:p-4">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border md:h-10 md:w-10", TONES[tone].wrap)}>
          <Icon className={cn("h-4 w-4 md:h-[1.15rem] md:w-[1.15rem]", TONES[tone].icon)} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground md:text-[11px]">
            {label}
          </p>
          <p className="truncate text-lg font-bold tabular-nums leading-tight text-foreground md:text-2xl">{value}</p>
        </div>
      </div>
      {hint ? <p className="mt-2 truncate text-[10px] text-muted-foreground md:text-[11px]">{hint}</p> : null}
    </div>
  )
}

export function QuotaMeter({ used, limit, className }: { used: number; limit: number; className?: string }) {
  const unlimited = !Number.isFinite(limit)
  const percentage = unlimited || limit <= 0 ? 0 : Math.min((used / limit) * 100, 100)
  const nearLimit = !unlimited && percentage >= 80

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card/70 px-3.5 py-3 backdrop-blur-sm", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Posts used</span>
        <span className={cn("text-body-sm font-bold tabular-nums", nearLimit ? "text-amber-500 dark:text-amber-400" : "text-foreground")}>
          {unlimited ? "Unlimited" : `${used} of ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-500", nearLimit ? "bg-amber-500" : "bg-primary")}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">All statuses count toward your {limit}-post limit.</p>
        </>
      )}
    </div>
  )
}

/** Horizontal chip tabs for in-page sections. Scrolls rather than wrapping. */
export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { id: T; label: string; icon?: any; count?: number }[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5", className)} role="tablist">
      {items.map((item) => {
        const Icon = item.icon
        const active = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-body-sm font-semibold transition-colors",
              active
                ? "border-primary/30 bg-primary/12 text-primary"
                : "border-border/60 bg-card/70 text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span
                className={cn(
                  "rounded-md px-1.5 text-[11px] font-bold tabular-nums",
                  active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** Full-page centred spinner used while a provider page boots. */
export function ProviderLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.16),transparent_58%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.08),transparent_55%)] px-4">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-8 text-center backdrop-blur-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-body-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/** Inline spinner for content that loads inside an already-rendered shell. */
export function InlineLoading({ label }: { label: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-body-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-3.5">
      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-red-500/80" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="break-words text-body-sm text-red-500 dark:text-red-400">{message}</p>
      </div>
      {onRetry ? (
        <Button
          onClick={onRetry}
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 rounded-lg px-2 text-xs text-red-500 hover:bg-red-500/10 dark:text-red-400"
        >
          Retry
        </Button>
      ) : null}
    </div>
  )
}

/** Compact one-row onboarding prompt, shared by the hub and the posting page. */
export function OnboardingBanner({
  percentage,
  title = "Complete your provider profile",
  description = "Set up your organization details to unlock full features",
}: {
  percentage: number
  title?: string
  description?: string
}) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-3.5 backdrop-blur-sm md:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground md:text-xs">{description}</p>
          {percentage > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percentage}%` }} />
              </div>
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-primary">{percentage}%</span>
            </div>
          )}
        </div>
        <Button asChild size="sm" className="h-10 w-full shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
          <Link href="/dashboard/provider/onboarding">
            {percentage > 0 ? "Continue" : "Start setup"}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

/** Label/value pair used across the settings record views. */
export function Field({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-body-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  )
}
