"use client"

/**
 * When an extreme promotion announces itself, and to whom.
 *
 * The tier buys a handful of announcement days inside its run: on each, the
 * listing takes over the screen once, the way a gift does. The interesting
 * question is which days, and the answer is per reader rather than per
 * campaign.
 *
 * **How many.** Scaled to the length of the run by `ANNOUNCEMENT_BANDS`, not
 * fixed. A run is sold on how long it is, so the announcements have to keep
 * pace with it: two interruptions is right for three weeks and insulting for a
 * year. See the ladder below for the bands.
 *
 * **Why per reader.** Fixed dates would make the announcement a broadcast:
 * every signed-in user meets the same popup within the same few hours. That
 * concentrates the whole delivery into a few spikes, makes the product feel
 * like an ad break rather than a discovery, and wastes the reach the tier is
 * sold on — a reader who happens not to open the app on those days never sees
 * it at all. Drawing per reader spreads the same impressions across the full
 * run and gives each person their own days.
 *
 * **Why derived rather than stored.** The obvious implementation is a row per
 * (reader, campaign, day), written when the campaign starts. That is a table
 * the size of the user base multiplied by the number of live campaigns, written
 * in a burst, for data that is a pure function of its inputs. Deriving it from
 * `hash(userId, promotionId)` costs nothing, needs no migration, survives a
 * cache wipe, and answers identically on every device the reader signs in on.
 * It is the same trick `public-hub-order` uses to keep a shuffle stable across
 * a session, applied to a calendar instead of a list.
 *
 * The only thing that genuinely has to be remembered is what has already been
 * shown, and that is per-device by nature — it lives in `localStorage`, below.
 */

/**
 * Upper bounds, in days, of the bands an extreme run's announcement count is
 * read off. A run of `span` days buys `i + 1` announcements, where `i` is the
 * first band it fits inside; anything past the last band buys the last count.
 *
 * The first four bands are the product's, given as ranges: up to a week buys
 * one, up to three weeks two, up to six weeks three, up to two months four.
 * From there it is one more per further thirty days, so a long campaign
 * announces itself roughly monthly and a full year buys fourteen.
 *
 * **The 21 is load bearing and must stay the second band.** Every extreme
 * campaign issued before this ladder existed ran for exactly 21 days and drew
 * two days; `announcementCount(21)` has to keep returning 2 or every live
 * campaign re-draws mid-run, and the ledger cannot catch the repeat because
 * its key is the day index. Same reason `pickDays` has to reduce to the old
 * two-day draw at `count === 2`, which the tests pin.
 *
 * Mirrored by `ANNOUNCEMENT_BANDS` in `promotionAnnouncementService.js`.
 */
export const ANNOUNCEMENT_BANDS = [
  7, 21, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365,
]

/**
 * How many announcement days a run of `spanDays` buys.
 *
 * Never more than the run has days to put them on — a three-day run cannot
 * hold four distinct announcements — and never fewer than one, so even a
 * one-day run announces itself once.
 */
export function announcementCount(spanDays: number): number {
  const span = Math.max(1, Math.round(spanDays))
  const band = ANNOUNCEMENT_BANDS.findIndex((upper) => span <= upper)
  const wanted = band === -1 ? ANNOUNCEMENT_BANDS.length : band + 1
  return Math.max(1, Math.min(wanted, span))
}

const DAY_MS = 24 * 60 * 60 * 1000

/** One ledger per signed-in account, so switching users cannot leak state. */
const LEDGER_PREFIX = "glowup_promo_popup_v1_"

/**
 * How many "already shown" marks to keep.
 *
 * Sized off the worst case now that the count scales: a year-long run buys
 * fourteen, so this holds a dozen such campaigns at once and still stops the
 * entry growing without bound on a long-lived device. It was 60, which was
 * generous against two per campaign and would have started dropping marks —
 * and so repeating popups — against fourteen.
 */
const MAX_SEEN_ENTRIES = 200

export type ExtremeCampaign = {
  /** The promotion's id — what the draw is keyed on, not the listing's. */
  _id: string
  contentId: string
  contentType: "opportunity" | "job" | "event" | "resource"
  title: string
  description?: string
  image?: string | null
  startDate: string
  endDate: string
  /**
   * The window the announcement days are drawn from, pinned at creation. It
   * also decides how many there are, via `announcementCount`. Absent on
   * campaigns created before the field existed.
   */
  announcementSpanDays?: number | null
}

export type SelectedAnnouncement = {
  campaign: ExtremeCampaign
  /** Which day of the run this is, 0-based. Part of the ledger key. */
  dayIndex: number
}

function toTime(value: unknown): number | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

/** FNV-1a, 32-bit — the same fold used across the orderers. */
function deriveSeed(...parts: string[]): number {
  let hash = 0x811c9dc5
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      hash ^= part.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
    // Fold a separator in, so ("ab","c") and ("a","bc") do not collide onto the
    // same two days.
    hash ^= 0x2f
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * `count` distinct days in `[0, span)`, drawn uniformly.
 *
 * Each draw comes from a range one shorter than the last and is then shifted
 * past every day already taken, ascending — the standard bijection between
 * `[0, span - i)` and the gaps left in `[0, span)`. That yields a uniform
 * distinct set without rejection sampling, which is the obvious alternative
 * and can loop; looping is not something worth doing on a render path.
 *
 * **At `count === 2` this is exactly the two-day draw it replaces**, down to
 * the order the two randoms are consumed in. That is not a coincidence to be
 * grateful for, it is the requirement: every campaign issued before the ladder
 * existed is mid-run with two days already derived for every reader, and a
 * different answer would re-announce to people the ledger thinks are done.
 */
export function pickDays(seed: number, span: number, count: number): number[] {
  const width = Math.max(1, Math.floor(span))
  if (width <= 1) return [0]

  const wanted = Math.max(1, Math.min(Math.floor(count), width))
  const rand = mulberry32(seed)

  // Kept sorted as it fills, so the shift below can walk it ascending.
  const picked: number[] = []

  for (let i = 0; i < wanted; i += 1) {
    let day = Math.floor(rand() * (width - i))
    let at = 0
    while (at < picked.length && day >= picked[at]) {
      day += 1
      at += 1
    }
    picked.splice(at, 0, day)
  }

  return picked
}

/**
 * The window the announcement days are drawn from, in days.
 *
 * `announcementSpanDays` takes precedence over the start/end distance, and that
 * precedence is the whole point: a campaign's duration is editable, so if the
 * span followed it, extending a run from 21 days to 30 would re-draw every
 * reader's days. Someone already announced to on day 5 could be announced
 * again on the new day 5 — and the ledger would not catch it, because its key
 * is the day index, which just moved underneath it. Now that the span also
 * sets the *count*, an edit would change how many they get as well.
 *
 * Falls back to the start/end distance for campaigns created before the field
 * existed, which is exactly what those were already using.
 */
export function runLengthDays(campaign: ExtremeCampaign): number {
  const pinned = campaign.announcementSpanDays
  if (typeof pinned === "number" && Number.isFinite(pinned) && pinned >= 1) {
    return Math.max(1, Math.round(pinned))
  }

  const start = toTime(campaign.startDate)
  const end = toTime(campaign.endDate)
  if (start === null || end === null || end <= start) return 1
  return Math.max(1, Math.round((end - start) / DAY_MS))
}

/**
 * Which day of the run `now` falls on, 0-based, or null if outside it.
 *
 * Elapsed days since the campaign started rather than calendar days, so the
 * answer does not depend on the reader's timezone. Two people in different
 * countries are on the same day of the same campaign at the same moment.
 */
export function runDayIndex(campaign: ExtremeCampaign, now: number): number | null {
  const start = toTime(campaign.startDate)
  const end = toTime(campaign.endDate)
  if (start === null || now < start) return null
  if (end !== null && now > end) return null
  return Math.floor((now - start) / DAY_MS)
}

/** The days this reader gets for this campaign. */
export function announcementDays(userId: string, campaign: ExtremeCampaign): number[] {
  const span = runLengthDays(campaign)
  return pickDays(deriveSeed(userId, campaign._id), span, announcementCount(span))
}

/** True when today is one of this reader's days for this campaign. */
export function isAnnouncementDay(
  userId: string,
  campaign: ExtremeCampaign,
  now: number,
): boolean {
  const day = runDayIndex(campaign, now)
  if (day === null) return false
  return announcementDays(userId, campaign).includes(day)
}

// ------------------------------------------------------------------ ledger

type Ledger = {
  /** `${promotionId}:${dayIndex}` marks, most recent last. */
  seen: string[]
  /** Local calendar date of the last promo popup, `YYYY-MM-DD`. */
  lastShown: string | null
}

const EMPTY: Ledger = { seen: [], lastShown: null }

/**
 * The reader's local calendar date.
 *
 * Local rather than the run-day arithmetic above, deliberately: this one backs
 * "do not interrupt me twice in a day", which is a statement about the reader's
 * day, not about any campaign's.
 */
export function localDateKey(now: number): string {
  const d = new Date(now)
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${month}-${day}`
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readLedger(userId: string): Ledger {
  const store = storage()
  if (!store) return EMPTY
  try {
    const raw = store.getItem(LEDGER_PREFIX + userId)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<Ledger>
    return {
      seen: Array.isArray(parsed.seen) ? parsed.seen.filter((s) => typeof s === "string") : [],
      lastShown: typeof parsed.lastShown === "string" ? parsed.lastShown : null,
    }
  } catch {
    // Corrupt or unreadable: behave as a fresh device rather than throwing on a
    // render path. The cost of forgetting is one repeated popup.
    return EMPTY
  }
}

function writeLedger(userId: string, ledger: Ledger): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(
      LEDGER_PREFIX + userId,
      JSON.stringify({
        seen: ledger.seen.slice(-MAX_SEEN_ENTRIES),
        lastShown: ledger.lastShown,
      } satisfies Ledger),
    )
  } catch {
    // Quota or private mode. The announcement was still shown; the worst case
    // is showing it again, which is better than failing the interaction.
  }
}

const markOf = (promotionId: string, dayIndex: number) => `${promotionId}:${dayIndex}`

/** Record that this announcement has been shown. */
export function markAnnounced(
  userId: string,
  campaign: ExtremeCampaign,
  dayIndex: number,
  now: number,
): void {
  const ledger = readLedger(userId)
  const mark = markOf(campaign._id, dayIndex)
  if (ledger.seen.includes(mark)) return

  writeLedger(userId, {
    seen: [...ledger.seen, mark],
    lastShown: localDateKey(now),
  })
}

/**
 * The announcement to show this reader right now, or null.
 *
 * Order of the checks matters. The one-a-day rule is tested first and against
 * the whole set, so a reader who has already been interrupted today is not
 * interrupted again no matter how many campaigns picked the same day for them.
 */
export function selectAnnouncement(
  campaigns: ExtremeCampaign[],
  userId: string,
  now: number,
): SelectedAnnouncement | null {
  if (!userId || campaigns.length === 0) return null

  const ledger = readLedger(userId)
  if (ledger.lastShown === localDateKey(now)) return null

  for (const campaign of campaigns) {
    const dayIndex = runDayIndex(campaign, now)
    if (dayIndex === null) continue
    if (!announcementDays(userId, campaign).includes(dayIndex)) continue
    if (ledger.seen.includes(markOf(campaign._id, dayIndex))) continue
    return { campaign, dayIndex }
  }

  return null
}
