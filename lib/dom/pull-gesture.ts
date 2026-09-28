/**
 * The decisions behind pull-to-refresh, kept apart from the component so they
 * can be tested without simulating touch streams.
 */

/** How far the indicator has to travel before letting go refreshes. */
export const PULL_THRESHOLD = 72
/** The indicator stops here however far the finger keeps going. */
export const PULL_MAX = 120
/** Finger travel is halved so the indicator feels weighted, like native pulls. */
const RESISTANCE = 0.5
/** Movement below this is a tap or a jitter, not a direction yet. */
export const DIRECTION_SLOP = 6

/** Indicator travel for a given downward finger travel. */
export function resistedPull(dy: number): number {
  if (!Number.isFinite(dy) || dy <= 0) return 0
  return Math.min(PULL_MAX, dy * RESISTANCE)
}

/**
 * Which way a touch is going, once it has moved far enough to say.
 *
 * Only a mostly-downward move is a pull. Anything sideways belongs to the
 * carousel or tab strip under the finger, and anything upward is a scroll.
 */
export function classifyMove(dx: number, dy: number): "pending" | "pull" | "ignore" {
  if (Math.abs(dx) < DIRECTION_SLOP && Math.abs(dy) < DIRECTION_SLOP) return "pending"
  return dy > 0 && dy > Math.abs(dx) ? "pull" : "ignore"
}

/**
 * Is the touch inside something that should keep the gesture for itself?
 *
 * Form fields (selecting text, dragging a caret), anything opted out with
 * `data-no-pull-refresh`, and any scroll panel that is not at its own top —
 * pulling down there scrolls the panel back up, not the page.
 */
export function touchBelongsElsewhere(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false
  if (target.closest('input, textarea, select, [contenteditable="true"], [data-no-pull-refresh]')) {
    return true
  }

  for (let el: Element | null = target; el && el !== document.body; el = el.parentElement) {
    if (el.scrollTop > 0) {
      const overflowY = getComputedStyle(el).overflowY
      if (overflowY === "auto" || overflowY === "scroll") return true
    }
  }
  return false
}
