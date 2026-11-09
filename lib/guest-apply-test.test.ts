import { beforeEach, describe, expect, it } from "vitest"
import { guestApplyArm } from "./guest-apply-test"

describe("guest-apply arm", () => {
  beforeEach(() => window.localStorage.clear())

  it("draws once and then keeps the same arm", () => {
    expect(guestApplyArm(() => 0.9)).toBe("open")
    expect(guestApplyArm(() => 0.1)).toBe("open")
  })

  it("splits roughly 50/50", () => {
    let open = 0
    for (let i = 0; i < 2000; i++) {
      window.localStorage.clear()
      if (guestApplyArm() === "open") open++
    }
    expect(open).toBeGreaterThan(850)
    expect(open).toBeLessThan(1150)
  })
})
