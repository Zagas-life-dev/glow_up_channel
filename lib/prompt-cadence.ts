"use client"

/**
 * How often the install and notification prompts open by themselves.
 *
 * Product call (Oct 2026): on each of the next three opens, then every other
 * open (5th, 7th, 9th ...) until the reader installs or turns notifications on.
 * "Not now" does not stop it; it only waits for the next due open.
 *
 * An open is one browser session, counted once per prompt however many times
 * the page reloads. The keys are new, so every earlier dismissal is forgotten
 * and everyone starts again at open 1.
 */

export type CadencedPrompt = "install" | "push"

const COUNT_KEY = (name: CadencedPrompt) => `up-prompt-opens-v2-${name}`
const COUNTED_KEY = (name: CadencedPrompt) => `up-prompt-counted-v2-${name}`

/** The first opens that always prompt. */
const ALWAYS_FIRST = 3

/** Counts this session as an open (once) and returns which open it is. 0 if storage is blocked. */
export function countOpen(name: CadencedPrompt): number {
  try {
    const seen = parseInt(localStorage.getItem(COUNT_KEY(name)) ?? "0", 10) || 0
    if (sessionStorage.getItem(COUNTED_KEY(name))) return seen
    sessionStorage.setItem(COUNTED_KEY(name), "1")
    localStorage.setItem(COUNT_KEY(name), String(seen + 1))
    return seen + 1
  } catch {
    return 0
  }
}

/** Whether open number `n` should prompt: 1, 2, 3, then 5, 7, 9 ... */
export function isDueOpen(n: number): boolean {
  if (n <= 0) return false
  if (n <= ALWAYS_FIRST) return true
  return (n - ALWAYS_FIRST) % 2 === 0
}
