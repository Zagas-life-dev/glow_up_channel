import { afterEach, describe, expect, it } from "vitest"
import {
  PULL_MAX,
  PULL_THRESHOLD,
  classifyMove,
  resistedPull,
  touchBelongsElsewhere,
} from "@/lib/dom/pull-gesture"

describe("resistedPull", () => {
  it("does not move for an upward or absent drag", () => {
    expect(resistedPull(0)).toBe(0)
    expect(resistedPull(-40)).toBe(0)
    expect(resistedPull(Number.NaN)).toBe(0)
  })

  it("needs more finger travel than indicator travel to arm", () => {
    expect(resistedPull(PULL_THRESHOLD)).toBeLessThan(PULL_THRESHOLD)
    expect(resistedPull(PULL_THRESHOLD * 2)).toBeGreaterThanOrEqual(PULL_THRESHOLD)
  })

  it("stops at the cap however far the finger goes", () => {
    expect(resistedPull(5000)).toBe(PULL_MAX)
  })
})

describe("classifyMove", () => {
  it("waits until the finger has moved enough to have a direction", () => {
    expect(classifyMove(2, 3)).toBe("pending")
  })

  it("claims a mostly-downward move", () => {
    expect(classifyMove(4, 20)).toBe("pull")
  })

  it("leaves sideways swipes to carousels and tab strips", () => {
    expect(classifyMove(30, 12)).toBe("ignore")
    expect(classifyMove(-30, 12)).toBe("ignore")
  })

  it("leaves upward moves to the page scroll", () => {
    expect(classifyMove(0, -20)).toBe("ignore")
  })
})

describe("touchBelongsElsewhere", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("lets a plain page element start a pull", () => {
    document.body.innerHTML = `<main><p id="t">hi</p></main>`
    expect(touchBelongsElsewhere(document.getElementById("t"))).toBe(false)
  })

  it("keeps form fields and opted-out regions out of it", () => {
    document.body.innerHTML = `<input id="i" /><div data-no-pull-refresh><span id="s"></span></div>`
    expect(touchBelongsElsewhere(document.getElementById("i"))).toBe(true)
    expect(touchBelongsElsewhere(document.getElementById("s"))).toBe(true)
  })

  it("defers to a scroll panel that can still scroll up", () => {
    document.body.innerHTML = `<div id="panel" style="overflow-y:auto"><span id="s"></span></div>`
    const panel = document.getElementById("panel")!
    Object.defineProperty(panel, "scrollTop", { value: 40, configurable: true })
    expect(touchBelongsElsewhere(document.getElementById("s"))).toBe(true)
  })

  it("ignores a panel already at its top", () => {
    document.body.innerHTML = `<div style="overflow-y:auto"><span id="s"></span></div>`
    expect(touchBelongsElsewhere(document.getElementById("s"))).toBe(false)
  })
})
