"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

export type ProviderTab = "overview" | "content" | "promotions" | "analytics"

/**
 * UP Design v1 maps the old emerald/amber/violet tones onto the brand set:
 * good news = lime tint, needs attention = orange tint, everything else
 * neutral. `navy` is the one highlighted tile on a page (e.g. "Live").
 */
export type Tone = "primary" | "emerald" | "amber" | "violet" | "neutral" | "navy"

export const TONES: Record<Tone, { wrap: string; icon: string }> = {
  primary: { wrap: "border-transparent bg-up-orange-tint", icon: "text-up-orange-ink" },
  emerald: { wrap: "border-transparent bg-up-lime-tint", icon: "text-up-lime-ink" },
  amber: { wrap: "border-transparent bg-up-orange-tint", icon: "text-up-orange-ink" },
  violet: { wrap: "border-transparent bg-up-fill", icon: "text-foreground" },
  neutral: { wrap: "border-transparent bg-up-fill", icon: "text-muted-foreground" },
  navy: { wrap: "border-transparent bg-up-navy-subtle", icon: "text-up-orange" },
}

/** Shared status pill colours — readable in both themes. */
export function statusToneClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "active":
    case "live":
    case "paid":
    case "completed_ok":
      return "bg-up-lime-tint text-foreground border border-transparent"
    case "pending":
    case "paused":
      return "bg-up-orange-tint text-up-orange-ink border border-transparent"
    case "completed":
    case "expired":
      return "bg-up-fill text-muted-foreground border border-transparent"
    case "cancelled":
    case "failed":
      return "bg-destructive/10 text-destructive border border-transparent"
    default:
      return "bg-up-fill text-muted-foreground border border-transparent"
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
    <section className={cn("overflow-hidden rounded-up-xl border border-border bg-card", className)}>
      {title ? (
        <div className="flex flex-col gap-3 border-b border-up-hairline px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-[22px]">
          <div className="flex min-w-0 items-center gap-3">
            {Icon ? (
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-up-sm bg-up-fill text-foreground">
                <Icon className="h-[18px] w-[18px]" />
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-foreground">{title}</h2>
              {subtitle ? <p className="truncate text-[13px] text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("p-3 md:px-[22px] md:py-5", bodyClassName)}>{children}</div>
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
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-up-md bg-up-fill text-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground md:text-body-sm">{description}</p>
      {ctaLabel && ctaHref ? (
        <Button asChild className="mt-4 min-h-11">
          <Link href={ctaHref}>
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : ctaLabel && onCta ? (
        <Button onClick={onCta} className="mt-4 min-h-11">
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
    <div
      className={cn(
        "rounded-up-xl border px-4 py-4 transition-colors md:px-[18px]",
        tone === "navy"
          ? "border-transparent bg-up-navy text-up-on-navy dark:bg-[#141D4A] dark:shadow-[0_0_0_1px_rgba(255,106,0,0.35)]"
          : "border-border bg-card hover:border-up-border-hover",
      )}
    >
      <div className={cn("flex items-center justify-between gap-2 text-[13px] font-semibold", tone === "navy" ? "text-up-orange" : "text-muted-foreground")}>
        <span className="truncate">{label}</span>
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-[10px]", TONES[tone].wrap)}>
          <Icon className={cn("h-3.5 w-3.5", TONES[tone].icon)} />
        </span>
      </div>
      <p className={cn("mt-2 truncate font-display text-2xl font-bold tabular-nums leading-tight md:text-[30px]", tone === "navy" ? "text-up-on-navy" : "text-foreground")}>
        {value}
      </p>
      {hint ? <p className={cn("mt-1 truncate text-xs", tone === "navy" ? "text-up-orange" : "text-muted-foreground")}>{hint}</p> : null}
    </div>
  )
}

export function QuotaMeter({ used, limit, className }: { used: number; limit: number; className?: string }) {
  const unlimited = !Number.isFinite(limit)
  const percentage = unlimited || limit <= 0 ? 0 : Math.min((used / limit) * 100, 100)
  const nearLimit = !unlimited && percentage >= 80

  return (
    <div className={cn("rounded-up-xl border border-border bg-card px-4 py-3.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted-foreground">Listings this cycle</span>
        <span className={cn("font-display text-sm font-bold tabular-nums", nearLimit ? "text-up-orange-ink" : "text-foreground")}>
          {unlimited ? "Unlimited" : `${used} of ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-up-fill">
            <div
              className="h-full rounded-full bg-up-orange transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">All statuses count toward your {limit}-post limit.</p>
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
  vertical = false,
}: {
  items: { id: T; label: string; icon?: any; count?: number }[]
  value: T
  onChange: (id: T) => void
  className?: string
  /** From `lg`, stack into a vertical rail (settings pages). */
  vertical?: boolean
}) {
  return (
    <div
      className={cn(
        "flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5",
        vertical && "lg:sticky lg:top-24 lg:flex-col lg:self-start lg:overflow-visible",
        className,
      )}
      role="tablist"
    >
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
              "inline-flex h-[38px] shrink-0 items-center gap-2 rounded-full px-[15px] text-sm font-semibold transition-colors",
              vertical && "lg:h-10 lg:w-full lg:justify-start",
              active
                ? "bg-up-solid text-up-on-solid"
                : "text-muted-foreground hover:bg-up-fill hover:text-foreground",
            )}
          >
            {Icon ? <Icon className={cn("h-4 w-4 shrink-0", active && "text-up-orange dark:text-[#B8551E]")} /> : null}
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums opacity-70",
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
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="rounded-up-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-up-orange border-t-transparent" />
        <p className="text-body-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

/** Inline spinner for content that loads inside an already-rendered shell. */
export function InlineLoading({ label }: { label: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-up-orange border-t-transparent" />
      <p className="text-body-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-up-xl border border-destructive/30 bg-destructive/10 p-3.5">
      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-destructive" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold text-destructive">{message}</p>
      </div>
      {onRetry ? (
        <Button
          onClick={onRetry}
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
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
    <div className="rounded-up-xl bg-up-orange-tint px-4 py-3.5 md:px-[18px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-up-md bg-up-orange text-up-navy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-[13px] text-muted-foreground">{description}</p>
          {percentage > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-card">
                <div className="h-full rounded-full bg-up-orange transition-all duration-500" style={{ width: `${percentage}%` }} />
              </div>
              <span className="shrink-0 font-display text-xs font-bold tabular-nums text-up-orange-ink">{percentage}%</span>
            </div>
          )}
        </div>
        <Button asChild size="sm" className="h-10 w-full shrink-0 sm:w-auto">
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
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-foreground">{value || "—"}</p>
    </div>
  )
}
