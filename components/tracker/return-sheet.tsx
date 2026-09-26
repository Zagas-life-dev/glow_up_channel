"use client"

/**
 * The question, asked once, at the only moment it can be answered honestly.
 *
 * Two things about this component are load-bearing rather than decorative:
 *
 * The options are weighted equally in everything except visual emphasis.
 * "Not for me" is not a hidden escape hatch — a rejection with a reason is worth
 * as much to ranking as a submission, and burying it would only teach people to
 * tap the top button to make the sheet go away.
 *
 * "Couldn't apply" exists because the sheet used to have no honest answer for
 * the commonest outcome of all: they got to the site and the listing had closed,
 * or the form was broken, or nothing loaded. Every one of those had to be filed
 * as "not for me", which is a lie in the one direction that costs the most — it
 * taught the feed to stop showing a whole category because somebody else's
 * registration page was down, and it hid the broken listing from the only two
 * people who could fix it. That answer goes to the provider and to admins
 * instead of into ranking.
 *
 * Dismissing is always available. A modal you cannot close turns an honest
 * question into a toll, and the answer it extracts is worthless.
 */

import { useEffect, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { RiCheckLine, RiCloseLine, RiLockLine } from "react-icons/ri"
import { useTracker, type TrackerAnswerOptions } from "@/contexts/tracker-context"
import { cn } from "@/lib/utils"
import { scheduleBodyLockRelease } from "@/lib/dom/body-lock-guard"
import { KindChip, toUpKind } from "@/components/up/kind"
import { Textarea } from "@/components/ui/textarea"
import {
  ISSUE_FREE_TEXT,
  ISSUE_LABELS,
  ISSUE_NOTE_MAX_LENGTH,
  ISSUE_OPTIONS,
  REASON_LABELS,
  REASON_OPTIONS,
  answersFor,
  type TrackerAnswer,
  type TrackerEntry,
  type TrackerIssue,
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

/**
 * The verb for what they went there to do.
 *
 * Only ever used in the "couldn't do it" branch, where being vague is what makes
 * the option easy to skip past: somebody who could not get onto an event's
 * registration page is looking for the word "register", not for "apply".
 */
function attemptVerb(entry: TrackerEntry): string {
  if (entry.contentType === "resource") return "open it"
  if (entry.contentType === "event") return "register"
  return "apply"
}

/** Which panel of the sheet is showing. */
type Step = "answer" | "reason" | "issue" | "remind"

interface SheetBodyProps {
  entry: TrackerEntry
  onAnswer: (status: TrackerAnswer, options?: TrackerAnswerOptions) => void
  onDismiss: () => void
}

/** An answer row in the onboarding option style; `chosen` fills navy with an orange tick. */
function Option({
  children,
  onClick,
  chosen = false,
  hint,
}: {
  children: React.ReactNode
  onClick: () => void
  chosen?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={chosen}
      className={cn(
        "flex min-h-[54px] w-full items-center gap-3 rounded-up-lg border-[1.5px] px-4 py-3 text-left text-[15px] font-semibold transition-colors",
        chosen
          ? "border-transparent bg-up-solid text-up-on-solid"
          : "border-border bg-card text-foreground hover:border-up-border-hover",
      )}
    >
      <span className="min-w-0 flex-1">
        {children}
        {hint ? <span className="mt-0.5 block text-xs font-medium opacity-70">{hint}</span> : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full",
          chosen ? "bg-up-orange text-up-navy" : "shadow-[inset_0_0_0_1.5px_var(--up-border-hover)]",
        )}
      >
        {chosen ? <RiCheckLine className="h-4 w-4" /> : null}
      </span>
    </button>
  )
}

function Chip({ children, onClick, on = false }: { children: React.ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors",
        on
          ? "border-transparent bg-up-solid text-up-on-solid"
          : "border-border bg-card text-muted-foreground hover:border-up-border-hover hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

function FollowUpHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 font-display text-base font-bold leading-snug text-foreground">{children}</h3>
}

function Quiet({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </button>
  )
}

function SheetBody({ entry, onAnswer, onDismiss }: SheetBodyProps) {
  const [step, setStep] = useState<Step>("answer")
  const [issue, setIssue] = useState<TrackerIssue | null>(null)
  const [issueNote, setIssueNote] = useState("")
  const isResource = entry.contentType === "resource"
  const { positive, middle, negative } = answersFor(entry.contentType)

  const heading = isResource
    ? "Welcome back. Did you get what you needed?"
    : entry.contentType === "event"
      ? "Welcome back. Did you register?"
      : "Welcome back. Did you get it in?"

  const labels = {
    remind: "Started, not finished — remind me",
    reason: isResource ? "Wasn't useful — less like this" : "Not for me — stop suggesting these",
    issue: `Couldn't ${attemptVerb(entry)} — something was wrong`,
  }

  const header = (
    <div className="flex items-start gap-3 pr-10">
      <KindChip kind={toUpKind(entry.contentType)} size="lg" />
      <div className="min-w-0">
        <h2 className="font-display text-[19px] font-bold leading-tight text-foreground sm:text-xl">{heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {entry.contentTitle || "This listing"}
          {subtitleFor(entry) ? ` · ${subtitleFor(entry)}` : ""}
        </p>
      </div>
    </div>
  )

  const privacy = (
    <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-muted-foreground">
      <RiLockLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
      We can&apos;t see other sites. Your answer is the only thing that teaches the feed.
    </p>
  )

  // Follow-ups slide in under the chosen answer; tapping it again goes back.
  if (step !== "answer") {
    const chosenLabel = step === "remind" ? labels.remind : step === "reason" ? labels.reason : labels.issue
    return (
      <div className="px-5 pb-6 sm:px-6">
        {header}
        <div className="mt-5">
          <Option chosen onClick={() => setStep("answer")} hint="Tap to change">
            {chosenLabel}
          </Option>
        </div>

        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {step === "reason" && (
            <>
              <FollowUpHeading>What put you off?</FollowUpHeading>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the part that actually changes what you get shown.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {REASON_OPTIONS.map((reason) => (
                  <Chip key={reason} onClick={() => onAnswer(negative, { reason })}>
                    {REASON_LABELS[reason]}
                  </Chip>
                ))}
              </div>
              {/* Skipping is a real answer. The rejection still counts without a reason. */}
              <Quiet onClick={() => onAnswer(negative)}>Rather not say</Quiet>
            </>
          )}

          {step === "issue" && (
            <>
              <FollowUpHeading>What happened?</FollowUpHeading>
              {/*
                Says who reads it, because that is the whole reason to answer. This one
                does not shape the feed — it goes to the people who can pull a dead
                listing down, and saying so is what makes the question worth a tap.
              */}
              <p className="mt-1 text-sm text-muted-foreground">
                This goes to whoever posted it, and to us. Listings that stop working
                get taken down.
              </p>
              <fieldset className="mt-3">
                <legend className="sr-only">What stopped you</legend>
                <div className="flex flex-wrap gap-2">
                  {ISSUE_OPTIONS.map((option) => (
                    <Chip key={option} on={issue === option} onClick={() => setIssue(option)}>
                      {ISSUE_LABELS[option]}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              {issue === ISSUE_FREE_TEXT && (
                <div className="mt-3">
                  <label htmlFor="issue-note" className="sr-only">
                    Tell us what happened
                  </label>
                  <Textarea
                    id="issue-note"
                    autoFocus
                    rows={3}
                    maxLength={ISSUE_NOTE_MAX_LENGTH}
                    value={issueNote}
                    onChange={(event) => setIssueNote(event.target.value)}
                    placeholder="What went wrong?"
                    className="min-h-[76px] resize-none text-[15px]"
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    {issueNote.length}/{ISSUE_NOTE_MAX_LENGTH}
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={!issue}
                onClick={() => {
                  const note = issueNote.trim()
                  onAnswer("other", {
                    issue: issue ?? undefined,
                    // Sent only for the one option that offered a box. The server
                    // drops it otherwise, and this keeps the two ends agreeing.
                    issueNote: issue === ISSUE_FREE_TEXT && note ? note : undefined,
                  })
                }}
                className="mt-4 h-11 w-full rounded-full bg-primary px-5 text-[15px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Send
              </button>
              {/* Same escape as the reason panel: the answer still counts without a detail. */}
              <Quiet onClick={() => onAnswer("other")}>Rather not say</Quiet>
            </>
          )}

          {step === "remind" && (
            <>
              <FollowUpHeading>When should we nudge you?</FollowUpHeading>
              {entry.deadline && (
                <p className="mt-1 text-sm text-muted-foreground">
                  We&apos;ll move it earlier if the deadline lands first.
                </p>
              )}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => onAnswer(middle ?? "started", { remindWeekday: day.value })}
                    className="h-11 rounded-up-md border-[1.5px] border-border bg-card text-sm font-semibold transition-colors hover:border-up-orange"
                  >
                    {day.short}
                  </button>
                ))}
              </div>
              <Quiet onClick={() => onAnswer(middle ?? "started")}>Don&apos;t remind me</Quiet>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pb-6 sm:px-6">
      {header}

      <div className="mt-5 space-y-2">
        <Option onClick={() => onAnswer(positive)}>
          {isResource ? "Got what I needed" : "Submitted it — track this one"}
        </Option>

        {middle && <Option onClick={() => setStep("remind")}>{labels.remind}</Option>}

        <Option onClick={() => setStep("reason")}>{labels.reason}</Option>

        {/*
          Last, but styled exactly like the others. Someone who could not
          get the form to load is not going to hunt for this under a "more"
          link, and the answer they would give instead — "not for me" — is the
          single most damaging thing they could tell the feed.
        */}
        <Option onClick={() => setStep("issue")}>{labels.issue}</Option>
      </div>

      {privacy}

      <button
        type="button"
        onClick={onDismiss}
        className="mt-1 w-full rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
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

  const handleAnswer = (status: TrackerAnswer, options?: TrackerAnswerOptions) => {
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
            "fixed inset-0 z-50 bg-up-scrim",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 bg-card text-card-foreground shadow-up-pop focus:outline-none",
            // Phone: a bottom sheet, clear of the home indicator.
            "inset-x-0 bottom-0 rounded-t-[28px] pb-[max(0.5rem,env(safe-area-inset-bottom))]",
            // Tall panels scroll inside the sheet rather than off the top of it.
            // dvh over vh because mobile browser chrome is what makes the
            // difference here, and overscroll-contain stops a flick at the end
            // of the list scrolling the page behind the overlay.
            "max-h-[85vh] overflow-y-auto overscroll-contain [@supports(height:100dvh)]:max-h-[85dvh]",
            // An exit animation is load-bearing, not decoration: Radix's Presence
            // keeps the content mounted until it finishes, and that is what runs
            // the effect cleanup restoring the body's pointer-events.
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:slide-out-to-bottom",
            // Desktop: a centred dialog.
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-[520px]",
            "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-up-2xl sm:pb-0",
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
            <div className="h-[5px] w-10 rounded-full bg-up-sep" />
          </div>

          <DialogPrimitive.Close
            className="absolute right-5 top-5 hidden h-9 w-9 place-items-center rounded-full bg-up-fill text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid"
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
