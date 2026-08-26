"use client"

/**
 * The question, asked once, at the only moment it can be answered honestly.
 *
 * Two things about this component are load-bearing rather than decorative:
 *
 * The three options are weighted equally in everything except visual emphasis.
 * "Not for me" is not a hidden escape hatch — a rejection with a reason is worth
 * as much to ranking as a submission, and burying it would only teach people to
 * tap the top button to make the sheet go away.
 *
 * Dismissing is always available. A modal you cannot close turns an honest
 * question into a toll, and the answer it extracts is worthless.
 */

import { useEffect, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { RiArrowLeftLine, RiCloseLine } from "react-icons/ri"
import { useTracker } from "@/contexts/tracker-context"
import { cn } from "@/lib/utils"
import { scheduleBodyLockRelease } from "@/lib/dom/body-lock-guard"
import {
  REASON_LABELS,
  REASON_OPTIONS,
  answersFor,
  type TrackerAnswer,
  type TrackerEntry,
  type TrackerReason,
} from "@/lib/tracker/types"

/** The weekday choices offered with "started, not finished". */
const WEEKDAYS = [
  { value: "monday", short: "Mon" },
  { value: "tuesday", short: "Tue" },
  { value: "wednesday", short: "Wed" },
  { value: "thursday", short: "Thu" },
  { value: "friday", short: "Fri" },
  { value: "saturday", short: "Sat" },
  { value: "sunday", short: "Sun" },
]

/** "you were away 14 minutes" — the detail that shows the ask is grounded in something real. */
function formatAway(awayMs: number | null): string | null {
  if (!awayMs || awayMs < 60 * 1000) return null

  const minutes = Math.round(awayMs / 60000)
  if (minutes < 60) return `you were away ${minutes} minute${minutes === 1 ? "" : "s"}`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `you were away ${hours} hour${hours === 1 ? "" : "s"}`

  const days = Math.round(hours / 24)
  return `you left this ${days} day${days === 1 ? "" : "s"} ago`
}

/** The accessible name of the sheet, matching the visible heading. */
function titleFor(entry: TrackerEntry): string {
  if (entry.contentType === "resource") return "Did you get what you needed?"
  if (entry.contentType === "event") return "Did you register?"
  return "Did you get it in?"
}

function subtitleFor(entry: TrackerEntry): string {
  const away = formatAway(entry.awayMs)
  return [entry.contentProvider, away].filter(Boolean).join(" · ")
}

/** Which panel of the sheet is showing. */
type Step = "answer" | "reason" | "remind"

interface SheetBodyProps {
  entry: TrackerEntry
  onAnswer: (status: TrackerAnswer, options?: { reason?: TrackerReason; remindWeekday?: string }) => void
  onDismiss: () => void
}

function SheetBody({ entry, onAnswer, onDismiss }: SheetBodyProps) {
  const [step, setStep] = useState<Step>("answer")
  const isResource = entry.contentType === "resource"
  const { positive, middle, negative } = answersFor(entry.contentType)

  const heading = isResource
    ? "Welcome back. Did you get what you needed?"
    : entry.contentType === "event"
      ? "Welcome back. Did you register?"
      : "Welcome back. Did you get it in?"

  if (step === "reason") {
    return (
      <div className="px-5 pb-6 pt-2">
        <button
          type="button"
          onClick={() => setStep("answer")}
          className="-ml-2 mb-3 flex items-center gap-1.5 rounded-full px-2 py-1 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <RiArrowLeftLine className="h-4 w-4" aria-hidden />
          Back
        </button>

        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.01em]">
          What put you off?
        </h2>
        <p className="mt-2 text-body-sm text-muted-foreground">
          This is the part that actually changes what you get shown.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {REASON_OPTIONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onAnswer(negative, { reason })}
              className="rounded-full border border-border bg-card px-3.5 py-2 text-body-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent"
            >
              {REASON_LABELS[reason]}
            </button>
          ))}
        </div>

        {/* Skipping is a real answer. The rejection still counts without a reason. */}
        <button
          type="button"
          onClick={() => onAnswer(negative)}
          className="mt-4 w-full rounded-full px-4 py-2.5 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Rather not say
        </button>
      </div>
    )
  }

  if (step === "remind") {
    return (
      <div className="px-5 pb-6 pt-2">
        <button
          type="button"
          onClick={() => setStep("answer")}
          className="-ml-2 mb-3 flex items-center gap-1.5 rounded-full px-2 py-1 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <RiArrowLeftLine className="h-4 w-4" aria-hidden />
          Back
        </button>

        <h2 className="text-[22px] font-bold leading-tight tracking-[-0.01em]">
          When should we nudge you?
        </h2>
        {entry.deadline && (
          <p className="mt-2 text-body-sm text-muted-foreground">
            We&apos;ll move it earlier if the deadline lands first.
          </p>
        )}

        <div className="mt-4 grid grid-cols-4 gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => onAnswer(middle ?? "started", { remindWeekday: day.value })}
              className="rounded-xl border border-border bg-card px-2 py-3 text-body-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent"
            >
              {day.short}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onAnswer(middle ?? "started")}
          className="mt-4 w-full rounded-full px-4 py-2.5 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Don&apos;t remind me
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 pb-6 pt-2">
      <h2 className="text-[22px] font-bold leading-tight tracking-[-0.01em]">{heading}</h2>

      <p className="mt-2 text-body-sm text-muted-foreground">
        {entry.contentTitle || "This listing"}
        {subtitleFor(entry) ? ` · ${subtitleFor(entry)}` : ""}
      </p>

      <div className="mt-5 space-y-2.5">
        <button
          type="button"
          onClick={() => onAnswer(positive)}
          className="w-full rounded-2xl bg-primary px-5 py-4 text-left text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {isResource ? "Got what I needed" : "Submitted it — track this one"}
        </button>

        {middle && (
          <button
            type="button"
            onClick={() => setStep("remind")}
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-left text-[15px] font-medium transition-colors hover:border-primary/40 hover:bg-accent"
          >
            Started, not finished — remind me
          </button>
        )}

        <button
          type="button"
          onClick={() => setStep("reason")}
          className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-left text-[15px] font-medium transition-colors hover:border-primary/40 hover:bg-accent"
        >
          {isResource ? "Wasn't useful — less like this" : "Not for me — stop suggesting these"}
        </button>
      </div>

      <p className="mt-4 text-center text-caption leading-relaxed text-muted-foreground">
        We can&apos;t see other sites. Your answer is the only thing that teaches the feed.
      </p>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 w-full rounded-full px-4 py-2 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Ask me later
      </button>
    </div>
  )
}

/**
 * Mounted once, app-wide. Renders nothing until the tracker raises an entry.
 *
 * A drawer on mobile and a dialog on desktop: the same question, in whichever
 * shape does not cover the thing the user came back to look at.
 */
export function TrackerReturnSheet() {
  const { activeEntry, answer, dismiss } = useTracker()

  /**
   * The entry the sheet is currently rendering.
   *
   * Held separately from `activeEntry` because answering clears that
   * immediately, and the sheet still needs something to draw while it animates
   * closed. Adjusted during render rather than in an effect — this is React's
   * documented pattern for deriving state from a changed input, and it avoids a
   * second render pass.
   */
  const [rendered, setRendered] = useState<TrackerEntry | null>(null)
  if (activeEntry && activeEntry._id !== rendered?._id) {
    setRendered(activeEntry)
  }

  /**
   * Closing is driven by this prop, never by unmounting.
   *
   * Radix puts `pointer-events: none` on the body while a modal is open and
   * releases it through ordinary effect cleanup, which runs correctly when
   * `open` flips. Tearing the whole tree out instead skips that and leaves the
   * page unclickable.
   *
   * This deliberately does NOT use vaul's Drawer for the phone layout. vaul
   * pins the body to `position: fixed !important` on iOS and only undoes it
   * from inside its own onOpenChange — which never fires for a parent-driven
   * close like this one, leaving the page frozen on every iPhone. One Radix
   * tree, restyled per breakpoint, also means no component swap at 768px that
   * could unmount a dialog mid-open.
   */
  const open = Boolean(activeEntry)

  /**
   * Safety net for the freeze this component caused in production twice.
   *
   * Closing correctly is the actual fix; this only catches the case where some
   * overlay teardown does not run on a device we cannot reproduce. It is inert
   * whenever anything is legitimately open, and inert when the body is clean.
   */
  useEffect(() => {
    if (open) return
    return scheduleBodyLockRelease((result) => {
      // Worth knowing about: it means a teardown path is still misbehaving.
      console.warn("[tracker] released an orphaned body lock:", result.cleared.join(", "))
    })
  }, [open])

  if (!rendered) return null

  const entry = rendered

  const handleAnswer = (
    status: TrackerAnswer,
    options?: { reason?: TrackerReason; remindWeekday?: string },
  ) => {
    void answer(entry._id, status, options)
  }

  const handleDismiss = () => {
    void dismiss(entry._id)
  }

  const onOpenChange = (next: boolean) => {
    // Only a real dismissal counts — escape, outside click, the close button.
    // Guarded on `activeEntry` so a stray escape during the close animation
    // cannot snooze an entry the user has already answered.
    if (!next && activeEntry) handleDismiss()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 border border-border bg-card text-card-foreground shadow-2xl focus:outline-none",
            // Phone: a bottom sheet, clear of the home indicator.
            "inset-x-0 bottom-0 rounded-t-3xl pb-[max(0.5rem,env(safe-area-inset-bottom))]",
            // An exit animation is load-bearing, not decoration: Radix's Presence
            // keeps the content mounted until it finishes, and that is what runs
            // the effect cleanup restoring the body's pointer-events.
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom",
            // Desktop: a centred dialog.
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-[440px]",
            "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:pb-0",
            "sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
            "sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:fade-out-0",
          )}
        >
          <DialogPrimitive.Title className="sr-only">{titleFor(entry)}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {entry.contentTitle
              ? `About ${entry.contentTitle}. Your answer is private and only shapes what you get shown.`
              : "Your answer is private and only shapes what you get shown."}
          </DialogPrimitive.Description>

          {/* Grab handle. Decorative on desktop, so it goes away there. */}
          <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
            <div className="h-1 w-9 rounded-full bg-muted-foreground/25" />
          </div>

          <DialogPrimitive.Close
            className="absolute right-4 top-4 hidden rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block"
            aria-label="Ask me later"
          >
            <RiCloseLine className="h-4 w-4" aria-hidden />
          </DialogPrimitive.Close>

          <div className="pt-4 sm:pt-6">
            <SheetBody
              key={entry._id}
              entry={entry}
              onAnswer={handleAnswer}
              onDismiss={handleDismiss}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export default TrackerReturnSheet
