/**
 * The guard's whole job is to be safe. These tests are weighted accordingly:
 * more of them check that it does nothing than that it does something.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { hasOpenOverlay, releaseOrphanedBodyLock } from "@/lib/dom/body-lock-guard"

function wedgeBodyWithPointerEventsLock() {
  document.body.style.pointerEvents = "none"
  document.body.style.overflow = "hidden"
}

function wedgeBodyWithPositionLock(scrollY = 420) {
  document.body.style.setProperty("position", "fixed", "important")
  document.body.style.top = `-${scrollY}px`
  document.body.style.left = "-0px"
  document.body.style.right = "0px"
  document.body.style.height = "auto"
}

function mountOpenDialog() {
  const el = document.createElement("div")
  el.setAttribute("role", "dialog")
  el.setAttribute("data-state", "open")
  el.id = "open-dialog"
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  document.body.removeAttribute("style")
  document.getElementById("open-dialog")?.remove()
})

afterEach(() => {
  document.body.removeAttribute("style")
  document.getElementById("open-dialog")?.remove()
})

describe("hasOpenOverlay", () => {
  it("is false on a clean document", () => {
    expect(hasOpenOverlay()).toBe(false)
  })

  it("is true while a dialog is open", () => {
    mountOpenDialog()
    expect(hasOpenOverlay()).toBe(true)
  })

  it("is false once that dialog is gone", () => {
    const el = mountOpenDialog()
    el.remove()
    expect(hasOpenOverlay()).toBe(false)
  })
})

describe("releaseOrphanedBodyLock", () => {
  it("does nothing to an already clean body", () => {
    const result = releaseOrphanedBodyLock()
    expect(result.released).toBe(false)
    expect(document.body.getAttribute("style")).toBeNull()
  })

  it("clears a pointer-events lock left with nothing open", () => {
    wedgeBodyWithPointerEventsLock()

    const result = releaseOrphanedBodyLock()

    expect(result.released).toBe(true)
    expect(result.cleared).toContain("pointer-events")
    expect(document.body.style.pointerEvents).toBe("")
    expect(document.body.style.overflow).toBe("")
  })

  it("clears a position:fixed lock and restores the scroll offset", () => {
    wedgeBodyWithPositionLock(420)

    const result = releaseOrphanedBodyLock()

    expect(result.released).toBe(true)
    expect(document.body.style.position).toBe("")
    expect(document.body.style.top).toBe("")
    expect(document.body.style.height).toBe("")
  })

  it("REFUSES to touch the body while a dialog is genuinely open", () => {
    mountOpenDialog()
    wedgeBodyWithPointerEventsLock()

    const result = releaseOrphanedBodyLock()

    // The single most important assertion here: a legitimate lock is sacred.
    expect(result.released).toBe(false)
    expect(document.body.style.pointerEvents).toBe("none")
    expect(document.body.style.overflow).toBe("hidden")
  })

  it("leaves unrelated body styles alone", () => {
    document.body.style.backgroundColor = "rgb(1, 2, 3)"
    document.body.style.pointerEvents = "none"

    releaseOrphanedBodyLock()

    expect(document.body.style.pointerEvents).toBe("")
    expect(document.body.style.backgroundColor).toBe("rgb(1, 2, 3)")
  })

  it("ignores a body whose overflow is hidden for some other reason", () => {
    // `overflow: hidden` alone is only treated as a lock alongside the others;
    // clearing it is still safe, but it must not invent a scroll restore.
    document.body.style.overflow = "hidden"

    const result = releaseOrphanedBodyLock()

    expect(result.cleared).toEqual(["overflow"])
    expect(document.body.style.position).toBe("")
  })

  it("is idempotent", () => {
    wedgeBodyWithPointerEventsLock()

    expect(releaseOrphanedBodyLock().released).toBe(true)
    expect(releaseOrphanedBodyLock().released).toBe(false)
    expect(releaseOrphanedBodyLock().released).toBe(false)
  })
})
