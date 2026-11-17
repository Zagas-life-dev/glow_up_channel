/**
 * When the Worker wakes the backend, and for which job. All times UTC
 * (Africa/Lagos is UTC+1, so 08:00 here is 09:00 Lagos).
 *
 * Local-time jobs (dailyPicks at 09:00, weeklyDigest Sunday 18:00, buildStories
 * at 23:00) run every hour and act only on the users for whom it is that hour
 * now; the backend works that out per user from their timezone.
 */

// [UTC "HH:MM", job]: once a day.
export const DAILY = [
  ["00:30", "statsSnapshot"], // 01:30 Lagos: yesterday's (UTC) platform stats row
  ["01:45", "archives"], // 02:45 Lagos: old story decks + past listings to Cloudinary, then out of Mongo
  ["02:00", "deadItemsSweep"], // 03:00: dead listings out of playlists, their saves archived
  ["02:30", "metricsReconcile"], // 03:30: engagement counters recounted from the ledgers
  ["07:30", "programDaily"], // 08:30 Lagos: Creators Program holds released, invite reminders, ring check
  ["08:00", "countdowns"], // 09:00 Lagos: 4d / 1d / day-of before saved + tracked deadlines
  ["08:30", "groupDeadlineNudges"], // 09:30: group members who have not applied, 2 days out
  ["09:00", "savedNudge"], // 10:00: saved, not applied yet, closing in 6-14 days
  ["09:00", "emailTrickle"], // 10:00: campaign emails, best users first
  ["10:00", "funReminders"], // 11:00
  ["10:00", "onboarding"], // 11:00
  ["11:00", "havenVisitedReminder"], // 12:00
  ["11:00", "playlistNudge"], // 12:00
  ["11:30", "extremeAnnouncements"], // 12:30
  ["12:00", "trackerOutcomeNudges"], // 13:00
  ["13:00", "socialProof"], // 14:00, the job itself only acts on Tue and Fri
]

// [minute, job]: every hour.
export const HOURLY = [
  [5, "flushOutbox"], // quiet-hours outbox: 07:00 reaches a new timezone every hour
  [10, "dailyPicks"], // 09:00 local for whoever it is 09:00 for
  [10, "newMatches"], // listings that went live in the last hour
  [20, "weeklyDigest"], // Sunday 18:00 local
  [15, "buildStories"], // 23:15 local: tomorrow's stories built ahead, so the morning open is a read
  [25, "playlistSpikeCheck"], // Creators Program: flag playlists whose last hour of unique views looks farmed
]

// Unanswered tracker asks every 15 minutes, 08:00–21:45 Lagos (07–20 UTC), so the
// "did you get it in?" lands about 4 hours after leaving, never at night.
export const ASKS = { minutes: [0, 15, 30, 45], fromHour: 7, toHour: 20, job: "trackerPendingAsks" }

// [UTC weekday (0 = Sunday), UTC "HH:MM", job]: once a week.
export const WEEKLY = [
  [1, "02:00", "authCleanup"], // Monday 03:00 Lagos: expired verification + reset codes
]

// ["first" | "last" day of the UTC month, UTC "HH:MM", job]: twice a month.
export const MONTHLY = [
  ["first", "02:30", "playlistCleanup"], // 03:30 Lagos: drop public lists dead and idle 30+ days
  ["last", "02:30", "playlistCleanup"],
]

// Reminders the user set fire at the minute they chose: checked every tick (5 min).
// notificationBatches: playlist updates (2h windows) and creator updates (15 min) go out
// as their windows close; a cheap indexed query when nothing is due.
export const EVERY_TICK = ["trackerReminders", "notificationBatches"]

export function dueJobs(date) {
  const hh = String(date.getUTCHours()).padStart(2, "0")
  const mm = String(date.getUTCMinutes()).padStart(2, "0")
  const minute = date.getUTCMinutes()
  const hour = date.getUTCHours()
  const day = date.getUTCDay()
  const due = [...EVERY_TICK]
  for (const [t, job] of DAILY) if (t === `${hh}:${mm}`) due.push(job)
  for (const [d, t, job] of WEEKLY) if (d === day && t === `${hh}:${mm}`) due.push(job)
  const isFirst = date.getUTCDate() === 1
  const isLast = new Date(date.getTime() + 864e5).getUTCDate() === 1
  for (const [which, t, job] of MONTHLY) {
    if (t === `${hh}:${mm}` && (which === "first" ? isFirst : isLast)) due.push(job)
  }
  for (const [m, job] of HOURLY) if (m === minute) due.push(job)
  if (ASKS.minutes.includes(minute) && hour >= ASKS.fromHour && hour <= ASKS.toHour) due.push(ASKS.job)
  return due
}
