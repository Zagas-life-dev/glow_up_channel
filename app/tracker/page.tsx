"use client"

/**
 * The tracker: everything the user left UP to chase, and where each one ended.
 *
 * Grouped by status rather than by date, because the question a person brings
 * to this page is "what still needs me?", not "what did I click last Tuesday".
 * Inside each group the order is deadline-ascending, set by the backend.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  RiArrowRightUpLine,
  RiCheckLine,
  RiInboxLine,
  RiTimeLine,
} from "react-icons/ri"
import AuthGuard from "@/components/auth-guard"
import { PageShell } from "@/components/layout/page-shell"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTracker } from "@/contexts/tracker-context"
import { getTracker, updateStatus } from "@/lib/tracker/api"
import {
  BUCKET_LABELS,
  BUCKET_ORDER,
  EMPTY_BUCKETS,
  REASON_LABELS,
  STATUS_LABELS,
  hrefFor,
  type TrackerBucket,
  type TrackerBuckets,
  type TrackerEntry,
  type TrackerStatus,
} from "@/lib/tracker/types"
import { cn } from "@/lib/utils"

/** What a person can move an entry to from this page, per bucket. */
const NEXT_STATUSES: Partial<Record<TrackerBucket, TrackerStatus[]>> = {
  needs_answer: ["submitted", "started", "not_for_me"],
  unfinished: ["submitted", "not_for_me"],
  submitted: ["accepted", "declined", "no_response"],
  awaiting_answer: ["accepted", "declined", "no_response"],
}

const BUCKET_HINTS: Record<TrackerBucket, string> = {
  needs_answer: "You left for these and never said how it went.",
  unfinished: "Started but not sent. These are the ones with time left on them.",
  submitted: "In, and still open.",
  awaiting_answer: "Closed on their end. Waiting to hear back.",
  closed: "Done, one way or another.",
}

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null
  const date = new Date(deadline)
  if (isNaN(date.getTime())) return null

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000)

  if (days < 0) return `Closed ${Math.abs(days)}d ago`
  if (days === 0) return "Closes today"
  if (days === 1) return "Closes tomorrow"
  if (days <= 7) return `Closes in ${days} days`

  return `Closes ${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
}

/** Urgency is earned by the calendar, never by the status. */
function isUrgent(deadline: string | null): boolean {
  if (!deadline) return false
  const date = new Date(deadline)
  if (isNaN(date.getTime())) return false
  const days = (date.getTime() - Date.now()) / 86400000
  return days >= 0 && days <= 3
}

function EntryRow({
  entry,
  onStatusChange,
}: {
  entry: TrackerEntry
  onStatusChange: (entryId: string, status: TrackerStatus) => void
}) {
  const deadlineLabel = formatDeadline(entry.deadline)
  const urgent = isUrgent(entry.deadline)
  const options = NEXT_STATUSES[entry.bucket] ?? []

  const meta = [
    entry.contentProvider,
    entry.status === "not_for_me" && entry.reason ? REASON_LABELS[entry.reason] : null,
    entry.bucket === "closed" ? STATUS_LABELS[entry.status] : null,
  ].filter(Boolean)

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <Link
          href={hrefFor(entry)}
          className="group flex items-start gap-1.5 text-[15px] font-semibold leading-snug text-foreground hover:underline"
        >
          <span className="min-w-0 break-words">{entry.contentTitle || "Untitled listing"}</span>
          <RiArrowRightUpLine
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden
          />
        </Link>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {meta.length > 0 && (
            <p className="text-body-sm text-muted-foreground">{meta.join(" · ")}</p>
          )}
          {deadlineLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium",
                urgent
                  ? "bg-orange-500/[0.14] text-orange-600 dark:text-orange-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <RiTimeLine className="h-3 w-3" aria-hidden />
              {deadlineLabel}
            </span>
          )}
        </div>
      </div>

      {options.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex-shrink-0 rounded-full border border-border px-3 py-1.5 text-caption font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
            Update
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {options.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => onStatusChange(entry._id, status)}
                className="gap-2"
              >
                {entry.status === status && <RiCheckLine className="h-4 w-4" aria-hidden />}
                {STATUS_LABELS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  )
}

function TrackerContent() {
  const { answeredAt } = useTracker()
  const [buckets, setBuckets] = useState<TrackerBuckets>(EMPTY_BUCKETS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      // Every setState here sits after the await on purpose: setting state
      // synchronously in an effect body cascades an extra render.
      const data = await getTracker(true)
      setBuckets(data)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Answering the sheet elsewhere in the app moves an entry between buckets,
  // so this page refetches rather than showing an order it no longer has.
  useEffect(() => {
    if (answeredAt > 0) void load()
  }, [answeredAt, load])

  const handleStatusChange = useCallback(
    async (entryId: string, status: TrackerStatus) => {
      // No optimistic move here on purpose: changing an entry's status can
      // change which bucket it belongs to, and guessing that reshuffle on the
      // client would only be undone a moment later by the refetch.
      try {
        await updateStatus(entryId, status)
      } finally {
        await load()
      }
    },
    [load],
  )

  if (loading) {
    return (
      <div className="space-y-4 pt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-[74px] w-full rounded-2xl" />
            <Skeleton className="h-[74px] w-full rounded-2xl" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-body-sm text-muted-foreground">We couldn&apos;t load your tracker.</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-full border border-border px-4 py-2 text-body-sm font-medium transition-colors hover:bg-accent"
        >
          Try again
        </button>
      </div>
    )
  }

  const total = BUCKET_ORDER.reduce((sum, key) => sum + buckets[key].length, 0)

  if (total === 0) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
          <RiInboxLine className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="mt-4 text-[17px] font-semibold">Nothing tracked yet</h2>
        <p className="mx-auto mt-2 max-w-xs text-body-sm leading-relaxed text-muted-foreground">
          When you tap Apply on a listing, it lands here — and we&apos;ll ask how it went when
          you get back.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-body-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Find something to apply for
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 pt-6">
      {BUCKET_ORDER.map((bucket) => {
        const entries = buckets[bucket]
        if (entries.length === 0) return null

        return (
          <section key={bucket}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="text-caption font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {BUCKET_LABELS[bucket]}
              </h2>
              <span className="text-caption tabular-nums text-muted-foreground">
                {entries.length}
              </span>
            </div>
            <p className="mb-3 text-body-sm text-muted-foreground">{BUCKET_HINTS[bucket]}</p>

            <ul className="space-y-2.5">
              {entries.map((entry) => (
                <EntryRow key={entry._id} entry={entry} onStatusChange={handleStatusChange} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export default function TrackerPage() {
  return (
    <AuthGuard>
      <PageShell>
        <div className="mx-auto w-full max-w-[680px]">
          <header className="pt-6">
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">Tracker</h1>
            <p className="mt-1.5 text-body-sm leading-relaxed text-muted-foreground">
              Everything you left UP to apply for. We can&apos;t see other sites, so this is
              built entirely from what you tell us on the way back.
            </p>
          </header>

          <TrackerContent />
        </div>
      </PageShell>
    </AuthGuard>
  )
}
