"use client"

/**
 * When the install and notification prompts may open by themselves.
 *
 * Product call (Oct 2026): ask, and if the reader says "Later", ask again the
 * next day, then the next day, then every other day, until they install or
 * turn notifications on. Nothing turns it off for good; "Later" only snoozes.
 * At most once per visit either way (lib/interruptions.ts).
 *
 * The keys are new, so every earlier dismissal is forgotten and everyone is
 * asked again from the start.
 */

export type CadencedPrompt = "install" | "push"

const DAY_MS = 24 * 60 * 60 * 1000
const UNTIL_KEY = (name: CadencedPrompt) => `up-prompt-snooze-until-v3-${name}`
const COUNT_KEY = (name: CadencedPrompt) => `up-prompt-snooze-count-v3-${name}`

/** Days to wait after the 1st, 2nd, 3rd ... "Later": 1, 1, then 2 from then on. */
export function snoozeDays(laterCount: number): number {
  return laterCount <= 2 ? 1 : 2
}

/** Whether the prompt may open now. True when storage is blocked: one ask per visit still applies. */
export function isPromptDue(name: CadencedPrompt, now = Date.now()): boolean {
  try {
    const until = parseInt(localStorage.getItem(UNTIL_KEY(name)) ?? "0", 10) || 0
    return now >= until
  } catch {
    return true
  }
}

/** "Later": snooze until the next ask (next day, next day, then every other day). */
export function snoozePrompt(name: CadencedPrompt, now = Date.now()): void {
  try {
    const count = (parseInt(localStorage.getItem(COUNT_KEY(name)) ?? "0", 10) || 0) + 1
    localStorage.setItem(COUNT_KEY(name), String(count))
    localStorage.setItem(UNTIL_KEY(name), String(now + snoozeDays(count) * DAY_MS))
  } catch {
    /* storage blocked: the visit's own dismissal still applies */
  }
}
