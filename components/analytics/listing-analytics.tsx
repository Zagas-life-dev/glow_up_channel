"use client"

/**
 * Per-listing analytics, rendered the same way in both portals.
 *
 * The admin and the provider look at identical numbers — only the scope differs
 * — so the presentation lives here once. Anything that decides what a figure
 * means (a rate, a stage order, a colour) belongs in this file or in
 * `lib/analytics/listing-analytics.ts`, never in a page.
 */

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  CONTENT_TYPE_LABELS,
  FUNNEL_STAGES,
  OUTCOME_STAGES,
  formatCount,
  formatRate,
  listingStatusLabel,
  topRejectionReasons,
  type ListingAnalyticsRow,
  type ListingAnalyticsTotals,
  type ListingEngagement,
  type ListingFunnel,
} from "@/lib/analytics/listing-analytics"
import {
  Eye,
  Users,
  Heart,
  Bookmark,
  ExternalLink,
  ChevronDown,
  BarChart3,
} from "lucide-react"

/** Fill for each funnel stage. Tokens are defined and validated in globals.css. */
const STAGE_FILL: Record<string, string> = {
  started: "var(--funnel-started)",
  applied: "var(--funnel-applied)",
  notForMe: "var(--funnel-not-for-me)",
  pending: "hsl(var(--funnel-pending))",
}

/* ------------------------------------------------------------------ metrics */

/**
 * The five raw counts, as a compact row.
 *
 * These are stat tiles, not a chart: five unrelated magnitudes with no shared
 * scale have nothing to compare against each other, and bars would invent a
 * comparison that does not exist.
 */
export function EngagementStrip({
  engagement,
  className,
  dense = false,
}: {
  engagement: ListingEngagement
  className?: string
  dense?: boolean
}) {
  const items = [
    { icon: Eye, label: "Views", value: engagement.views, hint: "Every time the listing was opened" },
    { icon: Users, label: "People", value: engagement.uniqueViewers, hint: "Distinct viewers, not repeat opens" },
    { icon: Heart, label: "Likes", value: engagement.likes, hint: "" },
    { icon: Bookmark, label: "Saves", value: engagement.saves, hint: "" },
    { icon: ExternalLink, label: "Clicks", value: engagement.clicks, hint: "Clicked through to the listing itself" },
  ]

  if (dense) {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground", className)}>
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1 tabular-nums" title={item.hint || item.label}>
            <item.icon className="h-3 w-3" aria-hidden />
            <span className="font-medium text-foreground">{formatCount(item.value)}</span>
            <span className="sr-only sm:not-sr-only">{item.label.toLowerCase()}</span>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5", className)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border/60 bg-card/60 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="truncate text-[11px] font-medium text-muted-foreground">{item.label}</p>
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatCount(item.value)}
          </p>
          {item.hint ? <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ funnel */

/**
 * Where everyone who clicked through ended up, as one proportion bar.
 *
 * A partition of a single whole is exactly what a stacked bar is for, and there
 * are only four parts. Every segment is direct-labelled below the bar as well as
 * legended, so the four are never told apart by colour alone; segments are
 * separated by a 2px surface gap so adjacent fills never touch.
 */
export function ApplyFunnelBar({
  funnel,
  className,
  showLegend = true,
}: {
  funnel: ListingFunnel
  className?: string
  showLegend?: boolean
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const total = funnel.tracked

  const segments = useMemo(
    () =>
      FUNNEL_STAGES.map((stage) => ({
        ...stage,
        value: funnel[stage.key] as number,
        pct: total > 0 ? ((funnel[stage.key] as number) / total) * 100 : 0,
      })),
    [funnel, total],
  )

  if (total === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Nobody has clicked through to apply yet, so there is no funnel to show.
      </p>
    )
  }

  return (
    <div className={className}>
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}
      >
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <div
              key={segment.key as string}
              className="h-full rounded-[4px] transition-opacity duration-150"
              style={{
                width: `${segment.pct}%`,
                background: STAGE_FILL[segment.key as string],
                opacity: hovered && hovered !== segment.key ? 0.35 : 1,
              }}
              onMouseEnter={() => setHovered(segment.key as string)}
              onMouseLeave={() => setHovered(null)}
              title={`${segment.label}: ${formatCount(segment.value)} of ${formatCount(total)} (${Math.round(segment.pct)}%)`}
            />
          ))}
      </div>

      {showLegend ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {segments.map((segment) => (
            <div
              key={segment.key as string}
              className="min-w-0"
              onMouseEnter={() => setHovered(segment.key as string)}
              onMouseLeave={() => setHovered(null)}
            >
              <dt className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: STAGE_FILL[segment.key as string] }}
                  aria-hidden
                />
                <span className="truncate text-[11px] text-muted-foreground" title={segment.hint}>
                  {segment.label}
                </span>
              </dt>
              <dd className="mt-0.5 pl-3.5 text-sm font-semibold tabular-nums text-foreground">
                {formatCount(segment.value)}
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  {Math.round(segment.pct)}%
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

/**
 * Outcomes after a submission.
 *
 * Kept separate from the funnel bar because these are a partition of `applied`,
 * not of everyone who clicked — stacking them into the same bar would double-count.
 */
export function OutcomeRow({ funnel, className }: { funnel: ListingFunnel; className?: string }) {
  const anyOutcome = OUTCOME_STAGES.some((stage) => (funnel[stage.key] as number) > 0)
  if (!anyOutcome) return null

  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1.5", className)}>
      {OUTCOME_STAGES.map((stage) => (
        <div key={stage.key as string} className="text-[11px]">
          <span className="text-muted-foreground">{stage.label}: </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatCount(funnel[stage.key] as number)}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Why people ruled the listing out.
 *
 * One series, so one hue and no legend — the heading names it. Bars are sorted
 * by size because the only question being asked here is "which reason is biggest".
 */
export function RejectionReasonBars({
  reasons,
  className,
}: {
  reasons: ListingAnalyticsRow["rejectionReasons"]
  className?: string
}) {
  const rows = topRejectionReasons(reasons)
  if (rows.length === 0) return null

  const max = Math.max(...rows.map((row) => row.count))

  return (
    <div className={className}>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Why people ruled it out
      </p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.reason}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-xs text-foreground">{row.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{row.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-[4px]"
                style={{ width: `${(row.count / max) * 100}%`, background: STAGE_FILL.notForMe }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ rows */

/**
 * One listing, collapsed to a summary line that expands into the full breakdown.
 *
 * Collapsed by default because a provider with thirty listings wants to scan
 * them, and thirty open funnels is not a scannable page.
 */
export function ListingAnalyticsCard({
  row,
  actions,
  defaultOpen = false,
}: {
  row: ListingAnalyticsRow
  /** Portal-specific controls, e.g. the admin's attach button. */
  actions?: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const statusLabel = listingStatusLabel(row)

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{row.title}</h3>
            <span className="shrink-0 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {CONTENT_TYPE_LABELS[row.contentType]}
            </span>
            <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {statusLabel}
            </span>
          </div>

          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {row.providerName || "No provider name"}
            {row.providerId ? "" : " · not attached to any provider account"}
          </p>

          <EngagementStrip engagement={row.engagement} dense className="mt-2" />

          <div className="mt-2.5">
            <ApplyFunnelBar funnel={row.funnel} showLegend={false} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {actions}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-expanded={open}
          >
            {open ? "Less" : "Breakdown"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        </div>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-border px-3 py-4 sm:px-4">
          <EngagementStrip engagement={row.engagement} />

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Of the {formatCount(row.funnel.tracked)} who clicked through to apply
            </p>
            <ApplyFunnelBar funnel={row.funnel} />
            <OutcomeRow funnel={row.funnel} className="mt-3" />
          </div>

          <RejectionReasonBars reasons={row.rejectionReasons} />

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 sm:grid-cols-4">
            {[
              { label: "Click-through", value: formatRate(row.rates.clickThroughRate), hint: "Views that became apply clicks" },
              { label: "Submit rate", value: formatRate(row.rates.submitRate), hint: "Apply clicks that became submissions" },
              { label: "Save rate", value: formatRate(row.rates.saveRate), hint: "Views that saved the listing" },
              { label: "Answered", value: formatRate(row.rates.answerRate), hint: "Apply clicks we got an answer for" },
            ].map((stat) => (
              <div key={stat.label} className="min-w-0">
                <dt className="truncate text-[11px] text-muted-foreground" title={stat.hint}>
                  {stat.label}
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ totals */

/** The header summary: everything in scope, added up. */
export function ListingAnalyticsSummary({
  totals,
  className,
}: {
  totals: ListingAnalyticsTotals
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <EngagementStrip engagement={totals.engagement} />

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">Application funnel</h3>
          <span className="text-[11px] text-muted-foreground">
            across {formatCount(totals.listings)} listing{totals.listings === 1 ? "" : "s"}
          </span>
        </div>
        <ApplyFunnelBar funnel={totals.funnel} />
        <OutcomeRow funnel={totals.funnel} className="mt-3 border-t border-border pt-3" />
      </div>

      <RejectionReasonBars reasons={totals.rejectionReasons} className="rounded-xl border border-border bg-card p-4" />
    </div>
  )
}
