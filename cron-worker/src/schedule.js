/**
 * When the Worker wakes the backend, and for which job. All times UTC
 * (Africa/Lagos is UTC+1, so 08:00 here is 09:00 Lagos).
 *
 * Local-time jobs (dailyPicks at 09:00, weeklyDigest Sunday 18:00) run every
 * hour and act only on the users for whom it is that hour now; the backend
 * works that out per user from their timezone.
 */

// [UTC "HH:MM", job]: once a day.
export const DAILY = [
  ["08:00", "countdowns"], // 09:00 Lagos: 4d / 1d / day-of before saved + tracked deadlines
  ["09:00", "lockedInReminder"], // 10:00
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
]

// Unanswered tracker asks every 15 minutes, 08:00–21:45 Lagos (07–20 UTC), so the
// "did you get it in?" lands about 4 hours after leaving, never at night.
export const ASKS = { minutes: [0, 15, 30, 45], fromHour: 7, toHour: 20, job: "trackerPendingAsks" }

// Reminders the user set fire at the minute they chose: checked every tick (5 min).
export const EVERY_TICK = ["trackerReminders"]

export function dueJobs(date) {
  const hh = String(date.getUTCHours()).padStart(2, "0")
  const mm = String(date.getUTCMinutes()).padStart(2, "0")
  const minute = date.getUTCMinutes()
  const hour = date.getUTCHours()
  const due = [...EVERY_TICK]
  for (const [t, job] of DAILY) if (t === `${hh}:${mm}`) due.push(job)
  for (const [m, job] of HOURLY) if (m === minute) due.push(job)
  if (ASKS.minutes.includes(minute) && hour >= ASKS.fromHour && hour <= ASKS.toHour) due.push(ASKS.job)
  return due
}
