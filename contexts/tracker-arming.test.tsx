/**
 * Regression tests for arming the honesty tracker's return watcher.
 *
 * The bug these exist for: `startTracking` used to await the enrol request and
 * only then write the armed record to localStorage. That works on a desktop,
 * where a target=_blank leaves the origin document alive to run the
 * continuation — and it fails on every phone, because the in-app browser opens
 * over the PWA and FREEZES the document. A frozen document runs no microtasks,
 * so the promise cannot settle, so the record was never written. On return the
 * listeners fired, found nothing armed, and asked nothing. `keepalive` keeps the
 * request in flight but does nothing whatsoever for the response handler.
 *
 * The net effect was that the sheet essentially never appeared on mobile, which
 * is where the applications happen. So the assertion that matters here is not
 * "the sheet opened", it is "the exit was parked before anything could suspend
 * us, and the return recovered an entry id it never received".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const ARMED_KEY = "glowup.tracker.armed"

/** Mirrors ApplicationTracker.MIN_AWAY_MS. */
const MIN_AWAY_MS = 20 * 1000

const entry = {
  _id: "entry-1",
  contentType: "opportunity" as const,
  contentId: "opp-1",
  status: "pending" as const,
  bucket: "needs_answer" as const,
  clickedAt: new Date().toISOString(),
  lastClickedAt: new Date().toISOString(),
  returnedAt: null,
  awayMs: 30 * 1000,
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
vi.mock("@/lib/tracking", () => ({ trackTrackerAnswer: vi.fn() }))

import { TrackerProvider, useTracker } from "@/contexts/tracker-context"
import TrackerReturnSheet from "@/components/tracker/return-sheet"

/** A stand-in for the Apply button on a listing page. */
function ApplyButton() {
  const { startTracking } = useTracker()
  return (
    <button type="button" onClick={() => void startTracking("opportunity", "opp-1", "apply_button")}>
      Apply
    </button>
  )
}

function renderApp() {
  return render(
    <TrackerProvider>
      <ApplyButton />
      <TrackerReturnSheet />
    </TrackerProvider>,
  )
}

function readArmed() {
  const raw = window.localStorage.getItem(ARMED_KEY)
  return raw ? JSON.parse(raw) : null
}

/** A promise that never settles — the frozen-document case, exactly. */
function neverSettles<T>(): Promise<T> {
  return new Promise<T>(() => {})
}

let nowMs = 1_700_000_000_000

beforeEach(() => {
  vi.clearAllMocks()
  nowMs = 1_700_000_000_000
  vi.spyOn(Date, "now").mockImplementation(() => nowMs)

  // Nothing in the backlog, so anything the sheet shows came from this exit.
  api.getPending.mockResolvedValue([])
  api.recordReturn.mockResolvedValue({ shouldPrompt: true, entry })
  api.snoozeEntry.mockResolvedValue(undefined)
  api.recordOutcome.mockResolvedValue(entry)

  window.localStorage.clear()
  document.body.removeAttribute("style")
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  document.body.removeAttribute("style")
})

describe("arming an outbound exit", () => {
  it("parks the exit before the enrol request settles", async () => {
    // The document is about to freeze: this request will never come back.
    api.startTracking.mockReturnValue(neverSettles())

    renderApp()
    fireEvent.click(screen.getByText("Apply"))

    // The record has to be on disk already, with no entry id yet. Waiting on the
    // request first is precisely the bug.
    await waitFor(() => expect(readArmed()).not.toBeNull())

    const armed = readArmed()
    expect(armed.entryId).toBeNull()
    expect(armed.contentId).toBe("opp-1")
    expect(armed.contentType).toBe("opportunity")
    expect(armed.leftAt).toBe(nowMs)
  })

  it("recovers an entry id the enrol response never delivered", async () => {
    // First call is lost to the freeze; the replay on return is what answers.
    api.startTracking
      .mockReturnValueOnce(neverSettles())
      .mockResolvedValue({ tracked: true, entryId: "entry-1" })

    renderApp()
    fireEvent.click(screen.getByText("Apply"))
    await waitFor(() => expect(readArmed()).not.toBeNull())

    // Eight minutes on someone else's application form, then back to the tab.
    nowMs += 8 * 60 * 1000
    fireEvent(document, new Event("visibilitychange"))

    await waitFor(() => expect(api.startTracking).toHaveBeenCalledTimes(2))

    // The replay flag is what stops this counting as a second application.
    expect(api.startTracking).toHaveBeenLastCalledWith("opportunity", "opp-1", "apply_button", {
      replay: true,
    })
    expect(api.recordReturn).toHaveBeenCalledWith("entry-1", 8 * 60 * 1000)

    // And the whole point: the question actually gets asked.
    await waitFor(() => expect(screen.getByText(/Welcome back/i)).toBeTruthy())
    expect(readArmed()).toBeNull()
  })

  it("uses the id directly when the response did arrive in time", async () => {
    // The desktop case: the origin tab stayed alive, so nothing was lost.
    api.startTracking.mockResolvedValue({ tracked: true, entryId: "entry-1" })

    renderApp()
    fireEvent.click(screen.getByText("Apply"))
    await waitFor(() => expect(readArmed()?.entryId).toBe("entry-1"))

    nowMs += 8 * 60 * 1000
    fireEvent(document, new Event("visibilitychange"))

    await waitFor(() => expect(api.recordReturn).toHaveBeenCalledWith("entry-1", 8 * 60 * 1000))

    // No replay needed, so the enrol request is not repeated.
    expect(api.startTracking).toHaveBeenCalledTimes(1)
  })

  it("stays silent about a misclick", async () => {
    api.startTracking.mockReturnValue(neverSettles())

    renderApp()
    fireEvent.click(screen.getByText("Apply"))
    await waitFor(() => expect(readArmed()).not.toBeNull())

    // Back within a few seconds: the link never loaded, and there is no honest
    // answer to "did you get it in?".
    nowMs += MIN_AWAY_MS - 1000
    fireEvent(document, new Event("visibilitychange"))

    await waitFor(() => expect(readArmed()).toBeNull())
    expect(api.recordReturn).not.toHaveBeenCalled()
    expect(screen.queryByText(/Welcome back/i)).toBeNull()
  })

  it("clears the exit for an in-app resource that never left the site", async () => {
    // tracked:false — the reader opens inside the app, so there is no return.
    api.startTracking.mockResolvedValue({ tracked: false, entryId: null })

    renderApp()
    fireEvent.click(screen.getByText("Apply"))

    await waitFor(() => expect(api.startTracking).toHaveBeenCalled())
    await waitFor(() => expect(readArmed()).toBeNull())

    nowMs += 8 * 60 * 1000
    fireEvent(document, new Event("visibilitychange"))

    expect(api.recordReturn).not.toHaveBeenCalled()
  })

  it("does not re-arm an exit the user has already come back from", async () => {
    // The response lands late — after the return already claimed and cleared the
    // record. Re-arming here would ask the same question a second time.
    let settle: (v: { tracked: boolean; entryId: string | null }) => void = () => {}
    api.startTracking.mockReturnValueOnce(
      new Promise<{ tracked: boolean; entryId: string | null }>((resolve) => {
        settle = resolve
      }),
    )
    api.startTracking.mockResolvedValue({ tracked: true, entryId: "entry-1" })

    renderApp()
    fireEvent.click(screen.getByText("Apply"))
    await waitFor(() => expect(readArmed()).not.toBeNull())

    nowMs += 8 * 60 * 1000
    fireEvent(document, new Event("visibilitychange"))
    await waitFor(() => expect(api.recordReturn).toHaveBeenCalled())

    // Now the original request finally comes back.
    settle({ tracked: true, entryId: "entry-1" })
    await Promise.resolve()

    expect(readArmed()).toBeNull()
  })
})
