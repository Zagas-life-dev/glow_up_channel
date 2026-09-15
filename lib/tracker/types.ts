/**
 * Shapes for the honesty tracker.
 *
 * These mirror `latest-glowup-channel/src/models/ApplicationTracker.js`. If a
 * status or reason is added there, it has to be added here too — the union
 * types are what stop a typo reaching the API as a silently invalid answer.
 */

export type TrackerContentType = "opportunity" | "job" | "event" | "resource"

/** The answers the return sheet can produce. */
export type TrackerAnswer =
  | "submitted"
  | "started"
  | "not_for_me"
  | "used"
  | "not_useful"
  /** Got there, and neither applied nor ruled it out. Carries a TrackerIssue. */
  | "other"

/** Every state an entry can hold, including the ones only the tracker page sets. */
export type TrackerStatus =
  | "pending"
  | TrackerAnswer
  | "accepted"
  | "declined"
  | "no_response"
  | "unknown"

export type TrackerReason =
  | "too_senior"
  | "too_junior"
  | "wrong_location"
  | "looks_like_a_scam"
  | "deadline_too_tight"
  | "not_my_field"
  | "changed_my_mind"

/**
 * What stopped someone applying, behind the `other` answer.
 *
 * Separate from TrackerReason on purpose. A reason is a verdict on fit — "too
 * senior", "not my field" — and it is a preference, so it feeds ranking. An
 * issue is a report that the listing could not be acted on at all, which says
 * nothing about whether the person wanted it and everything about whether the
 * posting still works. Those go to whoever posted it, not into a taste profile.
 *
 * `just_looking` is the odd one out and deliberately so: it is not a fault
 * report, it is the honest "I only wanted a look", and having it here is what
 * stops that answer being smuggled in as a rejection it never was.
 */
export type TrackerIssue =
  | "listing_closed"
  | "registration_faulty"
  | "could_not_register"
  | "site_down"
  | "just_looking"
  | "something_else"

/** Which section of the tracker page an entry renders in. */
export type TrackerBucket =
  | "needs_answer"
  | "unfinished"
  | "submitted"
  | "awaiting_answer"
  | "closed"

export interface TrackerEntry {
  _id: string
  contentType: TrackerContentType
  contentId: string
  status: TrackerStatus
  bucket: TrackerBucket
  clickedAt: string
  lastClickedAt: string
  returnedAt: string | null
  awayMs: number | null
  answeredAt: string | null
  reason: TrackerReason | null
  issue: TrackerIssue | null
  /** Their own words. Only ever set alongside issue === "something_else". */
  issueNote: string | null
  reminderAt: string | null
  clickCount: number
  /**
   * Denormalised by the backend at enrol time, deliberately — scraped listings
   * get deleted once they go past, and a tracker that rendered from a join
   * would quietly empty out someone's own history as listings aged out.
   */
  contentTitle: string | null
  contentCategory: string | null
  contentProvider: string | null
  contentUrl: string | null
  deadline: string | null
}

export type TrackerBuckets = Record<TrackerBucket, TrackerEntry[]>

export interface TrackerSignal {
  contentType: TrackerContentType
  contentId: string
  status: TrackerStatus
  reason: TrackerReason | null
  issue: TrackerIssue | null
  category: string | null
  provider: string | null
  answeredAt: string | null
}

export const EMPTY_BUCKETS: TrackerBuckets = {
  needs_answer: [],
  unfinished: [],
  submitted: [],
  awaiting_answer: [],
  closed: [],
}

/** Ordered for render. "Needs answer" leads because it is the only one that asks something of the user. */
export const BUCKET_ORDER: TrackerBucket[] = [
  "needs_answer",
  "unfinished",
  "submitted",
  "awaiting_answer",
  "closed",
]

export const BUCKET_LABELS: Record<TrackerBucket, string> = {
  needs_answer: "Needs an answer",
  unfinished: "Unfinished",
  submitted: "Submitted",
  awaiting_answer: "Awaiting answer",
  closed: "Closed",
}

export const STATUS_LABELS: Record<TrackerStatus, string> = {
  pending: "Not answered",
  started: "Started, not finished",
  submitted: "Submitted",
  not_for_me: "Not for me",
  used: "Used it",
  not_useful: "Wasn't useful",
  other: "Couldn't apply",
  accepted: "Accepted",
  declined: "Declined",
  no_response: "No response",
  unknown: "Unanswered",
}

export const REASON_LABELS: Record<TrackerReason, string> = {
  too_senior: "Too senior",
  too_junior: "Too junior",
  wrong_location: "Wrong location",
  looks_like_a_scam: "Looks like a scam",
  deadline_too_tight: "Deadline too tight",
  not_my_field: "Not my field",
  changed_my_mind: "Changed my mind",
}

/** The reasons offered on the sheet, in tap order. */
export const REASON_OPTIONS: TrackerReason[] = [
  "not_my_field",
  "too_senior",
  "too_junior",
  "wrong_location",
  "deadline_too_tight",
  "looks_like_a_scam",
  "changed_my_mind",
]

export const ISSUE_LABELS: Record<TrackerIssue, string> = {
  listing_closed: "The listing had already closed",
  registration_faulty: "The registration form was faulty",
  could_not_register: "I couldn't register at all",
  site_down: "The site wouldn't load",
  just_looking: "I was only checking the site out",
  something_else: "Something else",
}

/**
 * The issues offered on the sheet, in reading order.
 *
 * Ordered by how often they are the real answer, with the two that need no
 * explanation last. ISSUE_FREE_TEXT must stay at the end — it is the only one
 * that opens a text box, and an escape hatch in the middle of a list reads as
 * just another option.
 */
export const ISSUE_OPTIONS: TrackerIssue[] = [
  "listing_closed",
  "registration_faulty",
  "could_not_register",
  "site_down",
  "just_looking",
  "something_else",
]

/** The one issue that asks for their own words. Mirrors the backend constant. */
export const ISSUE_FREE_TEXT: TrackerIssue = "something_else"

/** Mirrors ApplicationTracker.ISSUE_NOTE_MAX_LENGTH. The server re-clamps it. */
export const ISSUE_NOTE_MAX_LENGTH = 300

/**
 * How an `other` answer reads on one line: the issue, or their own words.
 *
 * The note wins when there is one, because "the form threw a 500 on submit" is
 * strictly more use to the person reading it than "Something else".
 */
export function issueSummary(
  entry: Pick<TrackerEntry, "status" | "issue" | "issueNote">,
): string | null {
  if (entry.status !== "other") return null
  if (entry.issueNote) return entry.issueNote
  return entry.issue ? ISSUE_LABELS[entry.issue] : null
}

/**
 * Resources ask a different question, because they have no deadline and nothing
 * to submit. "Did you get it in?" has no honest answer for a PDF.
 */
export function isResource(entry: Pick<TrackerEntry, "contentType">): boolean {
  return entry.contentType === "resource"
}

/** The three answers offered for a given entry, in the order the sheet shows them. */
export function answersFor(contentType: TrackerContentType): {
  positive: TrackerAnswer
  middle: TrackerAnswer | null
  negative: TrackerAnswer
} {
  if (contentType === "resource") {
    // No half-finished state for a resource — you either got what you needed or you didn't.
    return { positive: "used", middle: null, negative: "not_useful" }
  }
  return { positive: "submitted", middle: "started", negative: "not_for_me" }
}

/** The route a tracked entry points back to. */
export function hrefFor(entry: Pick<TrackerEntry, "contentType" | "contentId">): string {
  const segment =
    entry.contentType === "opportunity"
      ? "opportunities"
      : entry.contentType === "job"
        ? "jobs"
        : entry.contentType === "event"
          ? "events"
          : "resources"
  return `/${segment}/${entry.contentId}`
}
