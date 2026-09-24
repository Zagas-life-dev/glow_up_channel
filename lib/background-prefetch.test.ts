import { beforeEach, describe, expect, it } from "vitest"
import { getContentCache, setContentCache } from "@/lib/content-cache-session"
import { planPrefetch } from "@/lib/background-prefetch"

const BACKEND = "http://api.test"

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe("owner-scoped cache", () => {
  it("never hands one reader's For You to another", () => {
    setContentCache("unified_auth", { items: [{ _id: "a" }], lastId: "a", owner: "user-1" })
    expect(getContentCache("unified_auth", { owner: "user-1" })?.items).toHaveLength(1)
    expect(getContentCache("unified_auth", { owner: "user-2" })).toBeNull()
  })

  it("leaves callers that do not ask about owners unchanged", () => {
    setContentCache("unified_auth", { items: [{ _id: "a" }], lastId: "a", owner: "user-1" })
    expect(getContentCache("unified_auth")?.items).toHaveLength(1)
  })
})

describe("planPrefetch", () => {
  const names = (userId: string | null) =>
    planPrefetch({ userId, normalizedUser: null }, BACKEND).map((t) => t.name)

  it("warms For You first for a signed-in reader, then everything else", () => {
    const plan = names("user-1")
    expect(plan[0]).toBe("for-you")
    expect(plan).toContain("discover")
    expect(plan).toContain("tab:events")
    expect(plan).toContain("hub:events")
  })

  it("gives a visitor Discover and the hubs, not For You or the home tabs", () => {
    const plan = names(null)
    expect(plan).not.toContain("for-you")
    expect(plan.some((n) => n.startsWith("tab:"))).toBe(false)
    expect(plan).toContain("hub:jobs")
  })

  it("skips anything already warm", () => {
    setContentCache("unified_auth", { items: [{ _id: "a" }], lastId: "a", owner: "user-1" })
    setContentCache("events", { items: [{ _id: "e" }], lastId: "e" })
    setContentCache("hub_jobs", { items: [{ _id: "j" }], lastId: "j" })
    const plan = names("user-1")
    expect(plan).not.toContain("for-you")
    expect(plan).not.toContain("tab:events")
    expect(plan).not.toContain("hub:jobs")
  })

  it("does not treat someone else's warm For You as this reader's", () => {
    setContentCache("unified_auth", { items: [{ _id: "a" }], lastId: "a", owner: "user-1" })
    expect(names("user-2")[0]).toBe("for-you")
  })
})
