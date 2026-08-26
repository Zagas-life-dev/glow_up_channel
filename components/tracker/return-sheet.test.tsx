/**
 * Regression tests for the honesty tracker's return sheet.
 *
 * These exist because the sheet froze production twice, both times by leaving
 * a style on `document.body` that no user action could undo:
 *
 *   1. The sheet unmounted an open Radix dialog, skipping the cleanup that
 *      releases `pointer-events: none`.
 *   2. The fix for that introduced a controlled close, which vaul's Drawer does
 *      not restore from — it pins the body to `position: fixed !important` on
 *      iOS and only undoes it inside its own onOpenChange, which a parent-driven
 *      close never triggers.
 *
 * So the assertion that matters is not "the dialog closed", it is "the body is
 * left exactly as it was found". Every test here ends on that.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { act } from "react"

const entry = {
  _id: "entry-1",
  contentType: "opportunity" as const,
  contentId: "opp-1",
  status: "pending" as const,
  bucket: "needs_answer" as const,
  clickedAt: new Date().toISOString(),
  lastClickedAt: new Date().toISOString(),
  returnedAt: null,
  awayMs: 14 * 60 * 1000,
  answeredAt: null,
  reason: null,
  reminderAt: null,
  clickCount: 1,
  contentTitle: "Vital Impacts Photography Grant",
  contentCategory: "Grant",
  contentProvider: "Vital Impacts",
  contentUrl: "https://example.test/apply",
  deadline: null,
}

const api = vi.hoisted(() => ({
  getPending: vi.fn(),
  recordOutcome: vi.fn(),
  recordReturn: vi.fn(),
  snoozeEntry: vi.fn(),
  startTracking: vi.fn(),
  getTracker: vi.fn(),
  getSignals: vi.fn(),
  updateStatus: vi.fn(),
}))

vi.mock("@/lib/tracker/api", () => api)
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ isAuthenticated: true }) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { TrackerProvider } from "@/contexts/tracker-context"
import TrackerReturnSheet from "@/components/tracker/return-sheet"

/**
 * Everything the two freezes actually left behind. A style that is empty string
 * or absent is fine; anything else means the page is wedged.
 */
function bodyLockState() {
  const body = document.body
  return {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    height: body.style.height,
    overflow: body.style.overflow,
    pointerEvents: body.style.pointerEvents,
  }
}

const UNLOCKED = {
  position: "",
  top: "",
  left: "",
  height: "",
  overflow: "",
  pointerEvents: "",
}

function renderSheet() {
  return render(
    <TrackerProvider>
      <TrackerReturnSheet />
    </TrackerProvider>,
  )
}

/** Open the sheet by letting the provider pick the entry off the backlog. */
async function openSheet() {
  renderSheet()
  await waitFor(() => {
    expect(screen.getByText(/Welcome back/i)).toBeTruthy()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getPending.mockResolvedValue([entry])
  api.recordOutcome.mockResolvedValue(entry)
  api.recordReturn.mockResolvedValue({ shouldPrompt: false, entry: null })
  api.snoozeEntry.mockResolvedValue(undefined)
  api.startTracking.mockResolvedValue({ tracked: false, entryId: null })

  // Every iOS browser matches vaul's isSafari() check, which is the only place
  // the position:fixed lock engages. Pinning the UA here means a reintroduced
  // Drawer would fail these tests instead of only failing on real hardware.
  Object.defineProperty(window.navigator, "userAgent", {
    value:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    configurable: true,
  })

  window.localStorage.clear()
  document.body.removeAttribute("style")
})

afterEach(() => {
  cleanup()
  document.body.removeAttribute("style")
})

describe("TrackerReturnSheet", () => {
  it("stays out of the DOM and off the body until there is something to ask", async () => {
    api.getPending.mockResolvedValue([])
    renderSheet()

    await waitFor(() => expect(api.getPending).toHaveBeenCalled())

    expect(screen.queryByText(/Welcome back/i)).toBeNull()
    expect(bodyLockState()).toEqual(UNLOCKED)
  })

  it("raises the backlog entry and shows its title", async () => {
    await openSheet()
    // Twice over: once in the visible subtitle, once in the sr-only description.
    expect(screen.getAllByText(/Vital Impacts Photography Grant/).length).toBeGreaterThan(0)
  })

  it("releases the body after the answer is submitted", async () => {
    await openSheet()

    await act(async () => {
      screen.getByText(/Submitted it/i).click()
    })

    await waitFor(() =>
      expect(api.recordOutcome).toHaveBeenCalledWith("entry-1", "submitted", undefined),
    )
    await waitFor(() => expect(screen.queryByText(/Welcome back/i)).toBeNull())

    // The regression. Both production freezes failed exactly here.
    expect(bodyLockState()).toEqual(UNLOCKED)
  })

  it("releases the body after the full 'not for me' path, reason and all", async () => {
    await openSheet()

    await act(async () => {
      screen.getByText(/Not for me/i).click()
    })
    await waitFor(() => expect(screen.getByText(/What put you off/i)).toBeTruthy())

    await act(async () => {
      screen.getByText(/Looks like a scam/i).click()
    })

    await waitFor(() =>
      expect(api.recordOutcome).toHaveBeenCalledWith("entry-1", "not_for_me", {
        reason: "looks_like_a_scam",
      }),
    )
    await waitFor(() => expect(screen.queryByText(/What put you off/i)).toBeNull())

    expect(bodyLockState()).toEqual(UNLOCKED)
  })

  it("releases the body after 'ask me later'", async () => {
    await openSheet()

    await act(async () => {
      screen.getByText(/Ask me later/i).click()
    })

    await waitFor(() => expect(api.snoozeEntry).toHaveBeenCalledWith("entry-1"))
    await waitFor(() => expect(screen.queryByText(/Welcome back/i)).toBeNull())

    expect(bodyLockState()).toEqual(UNLOCKED)
  })

  it("does not snooze an entry that was already answered", async () => {
    await openSheet()

    await act(async () => {
      screen.getByText(/Submitted it/i).click()
    })
    await waitFor(() => expect(api.recordOutcome).toHaveBeenCalled())

    // Answering must never also register as a dismissal — that would bump
    // promptCount and snooze a settled entry.
    expect(api.snoozeEntry).not.toHaveBeenCalled()
  })

  it("survives a failed save without wedging the page", async () => {
    api.recordOutcome.mockResolvedValue(null)
    await openSheet()

    await act(async () => {
      screen.getByText(/Submitted it/i).click()
    })

    await waitFor(() => expect(screen.queryByText(/Welcome back/i)).toBeNull())
    expect(bodyLockState()).toEqual(UNLOCKED)
  })

  it("asks about at most one backlog entry per app open", async () => {
    api.getPending.mockResolvedValue([entry, { ...entry, _id: "entry-2", contentTitle: "Second" }])
    await openSheet()

    await act(async () => {
      screen.getByText(/Submitted it/i).click()
    })
    await waitFor(() => expect(screen.queryByText(/Welcome back/i)).toBeNull())

    // A queue of stale questions fired in sequence is an interrogation.
    expect(screen.queryByText(/Second/)).toBeNull()
    expect(bodyLockState()).toEqual(UNLOCKED)
  })
})
