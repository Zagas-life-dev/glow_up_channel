"use client"

/**
 * Bring a post back out of a `past_*` collection, with edits and — mandatorily — new dates.
 *
 * The date fields are the point of this dialog, not a detail of it. A post is in past
 * because its dates ran out, so restoring it unchanged accomplishes nothing: the nightly
 * cleanup sweep re-reads those dates, finds them expired and archives it again, after a
 * day of showing readers a deadline that has already gone. The form therefore opens
 * seeded with the archived dates and *invalid* — the primary action stays disabled,
 * naming the date that has to move, until the admin actually moves it.
 *
 * The rules live in `lib/listings/restore-dates.ts`, which mirrors the server's copy and
 * is parity-tested against it. The server re-runs them before it writes, so this is an
 * affordance rather than the guard: it exists to tell the admin what is wrong while they
 * are still typing, instead of after a round trip.
 */

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { AlertTriangle, CalendarClock, ExternalLink, Loader2, RotateCcw } from "lucide-react"
import ApiClient from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  COLLECTION_TO_TYPE,
  EDITABLE_DATE_FIELDS,
  labelFor,
  readCurrentDates,
  toDateInputValue,
  validateRestoreDates,
  type PastCollection,
} from "@/lib/listings/restore-dates"
import {
  LINK_PRECEDENCE,
  isLinkFieldUsed,
  isOpenableLink,
  linkFieldsFor,
  linkHost,
  linkLabelFor,
  resolveOutboundLink,
} from "@/lib/listings/listing-links"

const DATE_HINTS: Record<string, string> = {
  applicationDeadline: "The date people have to apply by.",
  startDate: "When it begins.",
  endDate: "When it finishes. Leave empty for a single-day event.",
  registrationDeadline: "When registration closes.",
}

export interface RestorePastPostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The archived document, straight from the past-posts list. */
  post: Record<string, any> | null
  collection: PastCollection
  /** Called after a successful restore so the list can drop the row and refresh counts. */
  onRestored?: (result: { restoredId: string; restoredTo: string; isLive: boolean }) => void
}

function formatDay(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export function RestorePastPostDialog({
  open,
  onOpenChange,
  post,
  collection,
  onRestored,
}: RestorePastPostDialogProps) {
  // Held here rather than in the form so closing can be blocked mid-request — the form
  // below is remounted per post and would lose the flag.
  const [submitting, setSubmitting] = useState(false)

  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent
        className="flex max-h-[88vh] max-w-lg flex-col overflow-hidden rounded-3xl border-border bg-card shadow-2xl"
        onInteractOutside={(event) => { if (submitting) event.preventDefault() }}
        onEscapeKeyDown={(event) => { if (submitting) event.preventDefault() }}
      >
        {post ? (
          // Keyed by the post: opening a different row remounts the form with that row's
          // dates as its initial state, instead of an effect writing over what the admin
          // may already have typed.
          <RestoreForm
            key={`${collection}:${post._id}`}
            post={post}
            collection={collection}
            submitting={submitting}
            setSubmitting={setSubmitting}
            onRestored={onRestored}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function RestoreForm({
  post,
  collection,
  submitting,
  setSubmitting,
  onRestored,
  onClose,
}: {
  post: Record<string, any>
  collection: PastCollection
  submitting: boolean
  setSubmitting: (value: boolean) => void
  onRestored?: (result: { restoredId: string; restoredTo: string; isLive: boolean }) => void
  onClose: () => void
}) {
  const type = COLLECTION_TO_TYPE[collection]
  const dateFields = EDITABLE_DATE_FIELDS[type] ?? []
  // Fixed at mount so the set of rows cannot change under the admin as they type — an
  // off-chain field that holds a link is listed because it holds one, and clearing it
  // should not make its own row disappear mid-edit.
  const [linkFields] = useState<string[]>(() => linkFieldsFor(post, type))

  // Seeded with the archived dates on purpose: the admin sees what expired, and the form
  // is invalid in that state until one of them moves.
  const [dates, setDates] = useState<Record<string, string>>(() => {
    const archived = readCurrentDates(post, type)
    const seeded: Record<string, string> = {}
    for (const field of dateFields) seeded[field] = toDateInputValue(archived[field])
    return seeded
  })
  const [title, setTitle] = useState<string>(post.title ?? "")
  const [description, setDescription] = useState<string>(post.description ?? "")
  const [links, setLinks] = useState<Record<string, string>>(() => {
    const seeded: Record<string, string> = {}
    for (const field of linkFieldsFor(post, type)) {
      seeded[field] = typeof post[field] === "string" ? post[field].trim() : ""
    }
    return seeded
  })
  const [note, setNote] = useState("")
  // Errors show once the admin has engaged with the form or tried to submit. Opening onto
  // a red field for a date they have not been given a chance to set reads as a broken
  // dialog rather than a requirement.
  const [touched, setTouched] = useState(false)

  const verdict = useMemo(() => validateRestoreDates(post, dates, type, new Date()), [post, dates, type])
  /** The link a reader's click will actually follow once this is restored. */
  const outbound = useMemo(() => resolveOutboundLink(links, type), [links, type])

  const archivedOn = formatDay(post.movedToPastAt)
  const expiredOn = formatDay(post.expiredOn)

  const setDate = (field: string, value: string) => {
    setTouched(true)
    setDates((prev) => ({ ...prev, [field]: value }))
  }

  const handleRestore = async () => {
    setTouched(true)
    if (!verdict.ok) {
      toast.error(verdict.message)
      return
    }
    if (!title.trim()) {
      toast.error("A restored post needs a title.")
      return
    }

    setSubmitting(true)
    try {
      // Every editable date goes in the payload, nulls included — that is how the server
      // is told a field was cleared rather than left alone.
      const payloadDates: Record<string, string | null> = {}
      for (const field of dateFields) payloadDates[field] = dates[field]?.trim() ? dates[field] : null

      // Links go up as-is, blanks included, so clearing a dead one actually removes it.
      const payloadLinks: Record<string, string> = {}
      for (const field of linkFields) payloadLinks[field] = (links[field] ?? "").trim()

      const result = await ApiClient.restorePastPost(collection, String(post._id), {
        dates: payloadDates,
        updates: {
          title: title.trim(),
          description: description.trim(),
          ...payloadLinks,
        },
        note: note.trim() || undefined,
      })

      toast.success(
        result.isLive
          ? `Restored and live again until ${formatDay(result.expiryDate) ?? "its new date"}.`
          : `Restored to ${result.restoredTo}. Approve it in Moderation to publish it.`
      )
      onRestored?.({ restoredId: result.restoredId, restoredTo: result.restoredTo, isLive: result.isLive })
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore this post")
    } finally {
      setSubmitting(false)
    }
  }

  const blocking = verdict.ok ? null : verdict
  const showBlocking = touched ? blocking : null

  return (
    <>
      <DialogHeader>
        <DialogTitle>Restore post</DialogTitle>
        <DialogDescription>
          {archivedOn ? `Archived ${archivedOn}. ` : ""}
          Give it new dates and edit anything that has changed. Without a new date it would be
          archived again on the next cleanup run.
        </DialogDescription>
      </DialogHeader>

      <div className="-mx-6 flex-1 space-y-5 overflow-y-auto px-6 py-1">
        {post.reason ? (
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Why it was archived: </span>
            {post.reason}
            {expiredOn ? ` (expired ${expiredOn})` : ""}
          </p>
        ) : null}

        {/* Dates first: they are the required part, and putting them below the text fields
            made them read as optional trailing detail. */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">New dates</h3>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
              Required
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {dateFields.map((field) => {
              // Two different signals, deliberately styled apart. The blocking field is
              // the one refusing the restore; a `fieldIssue` on any other field is a
              // past date that is allowed but almost never intended — a programme that
              // already started can still be taking applications. Before these were
              // shown, a stale seeded date on an untouched field rejected the restore
              // with a message about a box the admin had no reason to look at.
              const isBlocking = showBlocking?.field === field
              const issue = verdict.fieldIssues[field]
              const governs = verdict.governingField === field

              return (
                <div key={field} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Label htmlFor={`restore-${field}`} className="text-xs font-medium">
                      {labelFor(field)}
                    </Label>
                    {governs ? (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        decides expiry
                      </span>
                    ) : null}
                  </div>
                  <Input
                    id={`restore-${field}`}
                    type="date"
                    value={dates[field] ?? ""}
                    onChange={(event) => setDate(field, event.target.value)}
                    className={cn(
                      "h-10 rounded-xl",
                      isBlocking && "border-destructive focus-visible:ring-destructive",
                      !isBlocking && issue && "border-amber-500 focus-visible:ring-amber-500"
                    )}
                  />
                  <p
                    className={cn(
                      "text-[11px] leading-snug",
                      isBlocking
                        ? "text-destructive"
                        : issue
                          ? "text-amber-600 dark:text-amber-500"
                          : "text-muted-foreground"
                    )}
                  >
                    {issue ?? DATE_HINTS[field]}
                  </p>
                </div>
              )
            })}
          </div>

          {showBlocking ? (
            <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{showBlocking.message}</span>
            </p>
          ) : verdict.ok ? (
            <p className="text-xs text-muted-foreground">
              Stays live until {formatDay(verdict.expiryDate)}, based on{" "}
              {labelFor(verdict.expiryField).toLowerCase()}.
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Details</h3>

          <div className="space-y-1.5">
            <Label htmlFor="restore-title" className="text-xs font-medium">
              Title
            </Label>
            <Input
              id="restore-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="restore-description" className="text-xs font-medium">
              Description
            </Label>
            <Textarea
              id="restore-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs font-semibold text-foreground">Links</h4>
              <span className="text-[11px] text-muted-foreground">
                Open each one to check it still works before restoring.
              </span>
            </div>

            {linkFields.map((field) => {
              const value = links[field] ?? ""
              // `url` outranks the rest, so only one of these is ever the link a reader
              // follows. Marking it is the difference between editing the link and
              // appearing to — a job's apply button, for instance, reads `url` alone.
              const isOutbound = outbound.field === field
              const unused = !isLinkFieldUsed(field, type)
              const openable = isOpenableLink(value)
              const host = linkHost(value)

              return (
                <div key={field} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Label htmlFor={`restore-link-${field}`} className="text-xs font-medium">
                      {linkLabelFor(field)}
                    </Label>
                    {isOutbound ? (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        readers get this
                      </span>
                    ) : null}
                    {unused ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        not used here
                      </span>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      id={`restore-link-${field}`}
                      value={value}
                      onChange={(event) => setLinks((prev) => ({ ...prev, [field]: event.target.value }))}
                      placeholder="https://"
                      className="h-10 flex-1 rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!openable}
                      onClick={() => window.open(value.trim(), "_blank", "noopener,noreferrer")}
                      className="h-10 shrink-0 rounded-xl px-3"
                      title={openable ? `Open ${host} in a new tab` : "Enter a full http(s) link to open it"}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">Open {linkLabelFor(field)}</span>
                    </Button>
                  </div>

                  {value && !openable ? (
                    <p className="text-[11px] leading-snug text-amber-600 dark:text-amber-500">
                      Not a full http(s) link, so it cannot be opened or checked.
                    </p>
                  ) : unused && value ? (
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      The listing page never reads this field — move it into{" "}
                      {linkLabelFor(LINK_PRECEDENCE[type]?.[0] ?? "url")} if this is the one to use.
                    </p>
                  ) : null}
                </div>
              )
            })}

            {!outbound.url ? (
              <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  No link set, so this will restore with nothing for readers to click. Fill in{" "}
                  {linkLabelFor(LINK_PRECEDENCE[type]?.[0] ?? "url")} if you have one.
                </span>
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="restore-note" className="text-xs font-medium">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="restore-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why this is being restored"
              className="h-10 rounded-xl"
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Saved on the post alongside who restored it.
            </p>
          </div>
        </section>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting} className="h-10 rounded-xl">
          Cancel
        </Button>
        <Button
          onClick={handleRestore}
          disabled={submitting || !verdict.ok || !title.trim()}
          className="h-10 rounded-xl"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Restoring…
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

export default RestorePastPostDialog
