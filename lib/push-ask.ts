/**
 * "A moment of value": the reader just saved or applied to something with a deadline.
 * PushAfterValue listens for it and offers deadline reminders right then.
 *
 * Why: 39% of countdown sends (408 of 1,048) and reminder sends (51 of 130) in the
 * two weeks to 9 Nov hit readers who saved something but had no device. The generic
 * prompt waits 3 s after load, queues behind the install prompt and says "Get the best
 * experience"; asking right after a save says exactly what the push is for.
 */

export const VALUE_EVENT = "up-value-moment"

export type ValueMoment = "save" | "apply"

export function markValueMoment(kind: ValueMoment): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(VALUE_EVENT, { detail: { kind } }))
}

const ASKED_KEY = "up-push-after-value-asked"
/** Ask at most once a fortnight; a "not now" is respected. */
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000

export function mayAsk(now = Date.now()): boolean {
  try {
    const at = Number(window.localStorage.getItem(ASKED_KEY) || 0)
    return !at || now - at > COOLDOWN_MS
  } catch {
    return false
  }
}

export function markAsked(now = Date.now()): void {
  try {
    window.localStorage.setItem(ASKED_KEY, String(now))
  } catch {
    // ignore
  }
}
