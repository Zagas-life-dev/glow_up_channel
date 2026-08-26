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

import { useState } from "react"
import { RiArrowLeftLine } from "react-icons/ri"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTracker } from "@/contexts/tracker-context"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
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
  const isMobile = useIsMobile()

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
   * Radix and vaul both put `pointer-events: none` on the body while open and
   * restore it on the close transition. Unmounting an open dialog skips that
   * cleanup and leaves the whole page unclickable, which is exactly what
   * answering the sheet used to do.
   */
  const open = Boolean(activeEntry)

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

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="border-border">
          <DrawerTitle className="sr-only">Did you apply?</DrawerTitle>
          <SheetBody key={entry._id} entry={entry} onAnswer={handleAnswer} onDismiss={handleDismiss} />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[440px] gap-0 overflow-hidden rounded-3xl p-0",
          // The stock close button sits over the heading at this padding.
          "[&>button]:right-4 [&>button]:top-4",
        )}
      >
        <DialogTitle className="sr-only">Did you apply?</DialogTitle>
        <div className="pt-6">
          <SheetBody key={entry._id} entry={entry} onAnswer={handleAnswer} onDismiss={handleDismiss} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TrackerReturnSheet
