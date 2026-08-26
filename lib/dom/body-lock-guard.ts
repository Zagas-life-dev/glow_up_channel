/**
 * Releases scroll/interaction locks that a dismissed overlay failed to clean up.
 *
 * Why this exists rather than a fix to whichever overlay is at fault:
 *
 * Modal libraries lock the page by mutating `document.body` — `pointer-events:
 * none` to swallow background clicks, `overflow: hidden` or `position: fixed` to
 * stop background scroll. Every one of them releases the lock from a teardown
 * path, and every one of them has edge cases where that path does not run: an
 * unmount mid-open, an exit animation that never fires, two layers racing their
 * counters, a bfcache restore.
 *
 * When it happens the page is not broken in any visible way. It renders
 * perfectly and ignores every tap. Users call that "frozen", and there is
 * nothing they can do about it except kill the tab.
 *
 * The tracker sheet has caused exactly this in production twice, on mechanisms
 * that could not be reproduced off real hardware. So this stops trying to be
 * clever about causes: after an overlay closes, if nothing is legitimately open
 * any more, whatever is still on the body is orphaned and gets removed.
 *
 * The safety of that rests entirely on `hasOpenOverlay()` being conservative —
 * it must never report "nothing open" while something is.
 */

/** Selectors for overlays that legitimately hold a body lock while open. */
const OPEN_OVERLAY_SELECTORS = [
  // Radix dialog/alert-dialog/sheet content, and popovers that trap focus.
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  "[data-radix-popper-content-wrapper]",
  // vaul, whether or not it is behind a Radix role.
  '[data-vaul-drawer][data-state="open"]',
  "[vaul-drawer][data-state='open']",
] as const

/**
 * Is any overlay still genuinely open?
 *
 * Deliberately errs towards "yes". A false positive costs nothing — the guard
 * simply does not run and tries again later. A false negative would rip the
 * lock out from under a dialog that is still on screen.
 */
export function hasOpenOverlay(): boolean {
  if (typeof document === "undefined") return true
  return OPEN_OVERLAY_SELECTORS.some((selector) => {
    try {
      return document.querySelector(selector) !== null
    } catch {
      // An invalid selector in some engine — assume something is open.
      return true
    }
  })
}

/** The lock styles, and what an unlocked body looks like. */
const LOCK_CHECKS: { prop: string; lockedValue: string }[] = [
  { prop: "pointer-events", lockedValue: "none" },
  { prop: "overflow", lockedValue: "hidden" },
  { prop: "position", lockedValue: "fixed" },
]

export interface ReleaseResult {
  /** True when something orphaned was found and cleared. */
  released: boolean
  /** Which properties were removed, for logging. */
  cleared: string[]
}

/**
 * Clear any body lock left behind when nothing is open.
 *
 * Restores the scroll offset when the lock was the `position: fixed` variety,
 * which parks the page by setting a negative `top` — removing that without
 * scrolling back would teleport the user to the top of the page.
 */
export function releaseOrphanedBodyLock(): ReleaseResult {
  if (typeof document === "undefined") return { released: false, cleared: [] }
  if (hasOpenOverlay()) return { released: false, cleared: [] }

  const body = document.body
  if (!body) return { released: false, cleared: [] }

  const cleared: string[] = []
  const wasPinned = body.style.position === "fixed"
  const pinnedTop = wasPinned ? parseInt(body.style.top || "0", 10) : 0
  const pinnedLeft = wasPinned ? parseInt(body.style.left || "0", 10) : 0

  for (const { prop, lockedValue } of LOCK_CHECKS) {
    if (body.style.getPropertyValue(prop) === lockedValue) {
      body.style.removeProperty(prop)
      cleared.push(prop)
    }
  }

  if (wasPinned) {
    // These only carry meaning alongside `position: fixed`.
    for (const prop of ["top", "left", "right", "height"]) {
      if (body.style.getPropertyValue(prop)) {
        body.style.removeProperty(prop)
        cleared.push(prop)
      }
    }

    // The lock stores the scroll offset as a negative inset.
    if (typeof window !== "undefined" && (pinnedTop || pinnedLeft)) {
      try {
        window.scrollTo(-pinnedLeft, -pinnedTop)
      } catch {
        // Restoring the offset is a courtesy. Failing to do it must never
        // prevent the lock itself from being released.
      }
    }
  }

  // An emptied style attribute left on the element is noise in the inspector.
  if (cleared.length > 0 && body.getAttribute("style") === "") {
    body.removeAttribute("style")
  }

  return { released: cleared.length > 0, cleared }
}

/**
 * Run the guard once the close animation has had time to finish.
 *
 * Two passes: one after a typical exit animation, one well clear of it, because
 * a lock released late by a slow teardown would otherwise be re-reported. Both
 * are no-ops when the body is already clean.
 *
 * Returns a cancel function for the caller's effect cleanup.
 */
export function scheduleBodyLockRelease(
  onReleased?: (result: ReleaseResult) => void,
): () => void {
  if (typeof window === "undefined") return () => {}

  const timers = [350, 1200].map((delay) =>
    window.setTimeout(() => {
      const result = releaseOrphanedBodyLock()
      if (result.released) onReleased?.(result)
    }, delay),
  )

  return () => timers.forEach((id) => window.clearTimeout(id))
}
