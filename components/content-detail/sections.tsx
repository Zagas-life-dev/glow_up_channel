"use client"

/**
 * The building blocks of a content detail body.
 *
 * Small on purpose. Each page composes its own sections out of these rather
 * than passing a config object to one generic renderer — an event's agenda and
 * a job's benefits have nothing structural in common, and pretending otherwise
 * would produce a component with fifteen optional props.
 */

import Link from "next/link"
import type { ReactNode } from "react"
import { RiCheckboxCircleFill, RiCheckboxCircleLine, RiErrorWarningLine } from "react-icons/ri"
import { cn } from "@/lib/utils"

/** Quiet uppercase label above a block. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  )
}

/** A titled block. Renders nothing at all when it has no content to show. */
export function DetailSection({
  label,
  children,
  className,
}: {
  label: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </section>
  )
}

/** Body prose — the reading size, matched across all four pages. */
export function DetailProse({ children }: { children: ReactNode }) {
  return (
    <p className="whitespace-pre-wrap text-[17px] leading-[1.6] text-foreground">{children}</p>
  )
}

/** A labelled fact with an icon, e.g. "Deadline: 12 Sep 2026". */
export function Fact({
  icon: Icon,
  label,
  iconClassName = "text-primary",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  iconClassName?: string
  children: ReactNode
}) {
  return (
    <li className="flex gap-2.5">
      <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", iconClassName)} aria-hidden />
      <span className="min-w-0">
        <strong className="font-medium text-foreground">{label}:</strong>{" "}
        <span className="text-muted-foreground">{children}</span>
      </span>
    </li>
  )
}

/** Wrapper for a run of `Fact` rows. */
export function FactList({ children }: { children: ReactNode }) {
  return <ul className="space-y-2 text-[15px]">{children}</ul>
}

/** Plain bulleted list, for requirements and benefits. */
export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-inside list-disc space-y-1 text-[15px] text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/**
 * Trust signals, rendered only when the backend actually sends them.
 *
 * An unchecked link must never be shown as a checked one, so the caller is
 * responsible for passing nothing rather than a default.
 */
export function TrustBar({ parts }: { parts: string[] }) {
  if (parts.length === 0) return null
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/10 px-4 py-3 text-[15px] text-emerald-700 dark:text-emerald-400">
      <RiCheckboxCircleFill
        className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden
      />
      <span className="min-w-0">{parts.join(" · ")}</span>
    </div>
  )
}

/**
 * "Why you're seeing this".
 *
 * The score and reasons are recomputed on the page rather than read off the
 * listing, because these endpoints return content with no notion of who is
 * reading it. `lib/ranking` is the same scorer the feed uses, so the number
 * here is the number that put the card in their feed.
 */
export function WhyCard({
  reasons,
  glow,
  caveat,
}: {
  reasons: string[]
  glow: number | null
  /** Shown as an amber row under the reasons, e.g. a missing closing date. */
  caveat?: string | null
}) {
  if (reasons.length === 0) return null

  return (
    <section className="rounded-[1.25rem] border border-border/70 bg-card/80 p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-semibold text-foreground">Why you&apos;re seeing this</h2>
        {glow !== null && (
          <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
            {glow} glow
          </span>
        )}
      </div>
      <ul className="mt-4 space-y-3">
        {reasons.map((reason, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-snug text-foreground">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <RiCheckboxCircleLine
                className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
            </span>
            <span className="min-w-0">{reason}</span>
          </li>
        ))}
        {caveat && (
          <li className="flex gap-3 text-[15px] leading-snug text-foreground">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15">
              <RiErrorWarningLine
                className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
            </span>
            <span className="min-w-0 text-muted-foreground">{caveat}</span>
          </li>
        )}
      </ul>
    </section>
  )
}

export type SimilarRow = {
  _id: string
  title: string
  /** Right-hand detail, e.g. "NGN 500,000 · closes 12 Sep". */
  meta?: string | null
}

/** Rendered in the flow on phones, and in the sticky rail on desktop. */
export function SimilarList({
  items,
  basePath,
  label = "Similar, also open",
  className,
}: {
  items: SimilarRow[]
  /** Route prefix, e.g. "/events". */
  basePath: string
  label?: string
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <section className={cn("space-y-2.5", className)}>
      <SectionLabel>{label}</SectionLabel>
      <ul className="space-y-2.5">
        {items.map((row) => (
          <li key={row._id}>
            <Link
              href={`${basePath}/${row._id}`}
              className="block text-[15px] leading-snug text-foreground transition-colors hover:text-orange-500"
            >
              {row.title}
              {row.meta && <span className="text-muted-foreground"> · {row.meta}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Hashtag row under the hero subtitle. */
export function TagRow({ tags, className }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1.5", className)}>
      {tags.map((tag, i) => (
        <span key={i} className="text-[13px] font-medium text-muted-foreground">
          #{tag}
        </span>
      ))}
    </div>
  )
}
