/**
 * Drives the component with raw touch events on window, the way a phone does.
 * jsdom has no display-mode, so matchMedia is stubbed to say "installed".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act } from "react"
import { cleanup, render, screen } from "@testing-library/react"

const { reload } = vi.hoisted(() => ({ reload: vi.fn(() => Promise.resolve()) }))
vi.mock("@/lib/offline/fresh-reload", () => ({ reloadWithFreshData: reload }))

import PullToRefresh from "@/components/pull-to-refresh"

function stubDisplayMode(standalone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: standalone && query.includes("standalone"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

function touch(type: string, x: number, y: number, target: EventTarget = document.body) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  const points = type === "touchend" ? [] : [{ clientX: x, clientY: y, target }]
  Object.defineProperty(event, "touches", { value: points })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

function swipe(dx: number, dy: number, target?: EventTarget) {
  touch("touchstart", 100, 100, target)
  const steps = 8
  for (let i = 1; i <= steps; i++) {
    touch("touchmove", 100 + (dx * i) / steps, 100 + (dy * i) / steps, target)
  }
}

beforeEach(() => {
  reload.mockClear()
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true })
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
  document.body.removeAttribute("style")
})

afterEach(() => cleanup())

describe("PullToRefresh", () => {
  it("does nothing in a browser tab, which has its own", () => {
    stubDisplayMode(false)
    render(<PullToRefresh />)
    swipe(0, 300)
    expect(screen.queryByRole("status")).toBeNull()
    touch("touchend", 0, 0)
    expect(reload).not.toHaveBeenCalled()
  })

  it("refreshes onto fresh data after a long enough pull", () => {
    stubDisplayMode(true)
    render(<PullToRefresh />)
    swipe(0, 300)
    expect(screen.getByRole("status").textContent).toContain("Release to refresh")
    touch("touchend", 0, 0)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("status").textContent).toContain("Refreshing")
  })

  it("springs back without refreshing after a short pull", () => {
    stubDisplayMode(true)
    render(<PullToRefresh />)
    swipe(0, 60)
    expect(screen.getByRole("status").textContent).toContain("Pull to refresh")
    touch("touchend", 0, 0)
    expect(reload).not.toHaveBeenCalled()
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("stops the page rubber-banding only once it owns the pull", () => {
    stubDisplayMode(true)
    render(<PullToRefresh />)
    touch("touchstart", 100, 100)
    expect(touch("touchmove", 101, 102).defaultPrevented).toBe(false) // still in the slop
    expect(touch("touchmove", 101, 140).defaultPrevented).toBe(true)
  })

  it.each([
    ["scrolled down the page", () => Object.defineProperty(window, "scrollY", { value: 400, configurable: true })],
    ["offline", () => Object.defineProperty(navigator, "onLine", { value: false, configurable: true })],
    ["a popup is holding the page", () => { document.body.style.overflow = "hidden" }],
  ])("stands down when %s", (_label, arrange) => {
    stubDisplayMode(true)
    render(<PullToRefresh />)
    arrange()
    swipe(0, 300)
    touch("touchend", 0, 0)
    expect(screen.queryByRole("status")).toBeNull()
    expect(reload).not.toHaveBeenCalled()
  })

  it("leaves sideways swipes alone", () => {
    stubDisplayMode(true)
    render(<PullToRefresh />)
    swipe(300, 80)
    touch("touchend", 0, 0)
    expect(screen.queryByRole("status")).toBeNull()
    expect(reload).not.toHaveBeenCalled()
  })
})
