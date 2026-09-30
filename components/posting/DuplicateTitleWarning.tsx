"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle } from "lucide-react"
import ApiClient, { type DuplicateReason, type ListingDuplicate, type ListingKind } from "@/lib/api-client"
import { cn } from "@/lib/utils"

const STATE_LABEL: Record<ListingDuplicate["state"], string> = {
  live: "Live",
  pending: "Pending",
  hidden: "Hidden",
}

const STATE_CLASS: Record<ListingDuplicate["state"], string> = {
  live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  hidden: "bg-muted text-muted-foreground",
}

const REASON_LABEL: Record<DuplicateReason, string> = {
  title: "similar title",
  description: "similar description",
  tags: "same tags",
}

export function reasonText(reasons: DuplicateReason[] | undefined): string | null {
  return reasons && reasons.length ? reasons.map((r) => REASON_LABEL[r]).join(", ") : null
}

function ago(date: string | null): string | null {
  if (!date) return null
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? null : formatDistanceToNow(d, { addSuffix: true })
}

/** The listings a listing looks like, one compact row each. */
export function DuplicateMatchList({ matches, className }: { matches: ListingDuplicate[]; className?: string }) {
  return (
    <ul className={cn("space-y-1.5", className)}>
      {matches.map((m) => {
        const where = [m.city, m.country].filter(Boolean).join(", ")
        const when = ago(m.createdAt)
        return (
          <li key={m._id} className="rounded-xl border border-border bg-muted/40 px-3 py-2">
            <div className="flex items-start gap-2">
              <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", STATE_CLASS[m.state])}>
                {STATE_LABEL[m.state]}
              </span>
              <span className="min-w-0 break-words text-sm font-medium text-foreground">{m.title}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[reasonText(m.reasons), m.organization, where, when && `posted ${when}`].filter(Boolean).join(" · ")}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

/** Anything shorter is not worth a request. */
function significant(text: string, min: number): boolean {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "").length >= min
}

type DuplicateCheck = { matches: ListingDuplicate[]; total: number }

/**
 * Listings in this country that look like the draft, checked as the poster
 * types: over half the title or description words shared (fillers ignored),
 * or tags settling a borderline pair. Starts from the title's first word or
 * so, and re-checks as the description and tags fill in.
 * A failed check is silent: the warning is advice, never a reason to block a post.
 */
export function useDuplicateTitleCheck(params: {
  type: ListingKind | null
  title: string
  description?: string
  canonicalTags?: string[]
  country?: string
  countryCode?: string
  isRemote?: boolean
}): DuplicateCheck {
  const { type, title, description, canonicalTags, country, countryCode, isRemote } = params
  const query =
    type && (significant(title, 4) || significant(description ?? "", 30))
      ? JSON.stringify([type, title, description ?? "", canonicalTags ?? [], country, countryCode, isRemote])
      : null
  // Tagged with the query it answers, so a result never outlives the draft it was for.
  const [result, setResult] = useState<({ query: string } & DuplicateCheck) | null>(null)

  useEffect(() => {
    if (!query || !type) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      ApiClient.checkDuplicateTitle(
        { type, title, description, canonicalTags, country, countryCode, isRemote },
        controller.signal,
      )
        .then((r) => setResult({ query, matches: r.matches, total: r.total }))
        .catch(() => {
          if (!controller.signal.aborted) setResult({ query, matches: [], total: 0 })
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // `query` already covers every input; the rest are read from the same render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return result && result.query === query ? { matches: result.matches, total: result.total } : { matches: [], total: 0 }
}

/**
 * Split a check for the form: title matches warn under Title, the rest (found
 * through the description or tags) under Description, where the poster is typing.
 */
export function splitDuplicates({ matches, total }: DuplicateCheck): { byTitle: DuplicateCheck; byContent: DuplicateCheck } {
  const byTitle = matches.filter((m) => !m.reasons || m.reasons.includes("title"))
  const byContent = matches.filter((m) => m.reasons && !m.reasons.includes("title"))
  // The server lists five; any beyond that are counted with the title ones.
  return {
    byTitle: { matches: byTitle, total: byTitle.length + (total - matches.length) },
    byContent: { matches: byContent, total: byContent.length },
  }
}

/** Inline warning under a form field. Renders nothing when there are no matches. */
export function DuplicateTitleWarning({
  matches,
  total,
  field = "title",
  className,
}: {
  matches: ListingDuplicate[]
  total: number
  /** Which field the matches came through, for the wording. */
  field?: "title" | "content"
  className?: string
}) {
  if (matches.length === 0) return null
  const what = field === "title" ? "a similar title" : "a similar description or the same tags"
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-900 dark:text-amber-200">
          {total === 1 ? "A listing" : `${total} listings`} with {what} already{" "}
          {total === 1 ? "exists" : "exist"} in this country. Check it isn&apos;t the same one before posting.
        </p>
      </div>
      <DuplicateMatchList matches={matches} className="mt-2" />
    </div>
  )
}
