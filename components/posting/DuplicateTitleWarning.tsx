"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle } from "lucide-react"
import ApiClient, { type ListingDuplicate, type ListingKind } from "@/lib/api-client"
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

function ago(date: string | null): string | null {
  if (!date) return null
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? null : formatDistanceToNow(d, { addSuffix: true })
}

/** The listings a title collides with, one compact row each. */
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
              {[m.organization, where, when && `posted ${when}`].filter(Boolean).join(" · ")}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

/** Same rule the backend normalises with; anything shorter is not worth a request. */
function significant(title: string): boolean {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "").length >= 4
}

/**
 * Listings already using `title` in this country, checked as the poster types.
 * A failed check is silent: the warning is advice, never a reason to block a post.
 */
export function useDuplicateTitleCheck(params: {
  type: ListingKind | null
  title: string
  country?: string
  countryCode?: string
  isRemote?: boolean
}) {
  const { type, title, country, countryCode, isRemote } = params
  const query = type && significant(title) ? JSON.stringify([type, title, country, countryCode, isRemote]) : null
  // Tagged with the query it answers, so a result never outlives the title it was for.
  const [result, setResult] = useState<{ query: string; matches: ListingDuplicate[]; total: number } | null>(null)

  useEffect(() => {
    if (!query || !type) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      ApiClient.checkDuplicateTitle({ type, title, country, countryCode, isRemote }, controller.signal)
        .then((r) => setResult({ query, matches: r.matches, total: r.total }))
        .catch(() => {
          if (!controller.signal.aborted) setResult({ query, matches: [], total: 0 })
        })
    }, 450)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, type, title, country, countryCode, isRemote])

  return result && result.query === query ? { matches: result.matches, total: result.total } : { matches: [], total: 0 }
}

/** Inline warning under the title field. Renders nothing when there are no matches. */
export function DuplicateTitleWarning({
  matches,
  total,
  className,
}: {
  matches: ListingDuplicate[]
  total: number
  className?: string
}) {
  if (matches.length === 0) return null
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
          {total === 1 ? "A listing" : `${total} listings`} with this title already{" "}
          {total === 1 ? "exists" : "exist"} in this country. Check it isn&apos;t the same one before posting.
        </p>
      </div>
      <DuplicateMatchList matches={matches} className="mt-2" />
    </div>
  )
}
