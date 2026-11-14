import { beforeEach, describe, expect, it } from "vitest"
import {
  authHref,
  captureIntentFromSearch,
  parseIntentParam,
  readPendingIntent,
  safeReturnTo,
  savePendingIntent,
  takePendingAction,
  takeReturnTo,
} from "./pending-intent"

const ID = "6adf1c0cf06027f261bbfa71"

describe("pending intent", () => {
  beforeEach(() => window.localStorage.clear())

  it("only accepts same-origin paths that are not auth pages", () => {
    expect(safeReturnTo("/jobs/abc?src=feed")).toBe("/jobs/abc?src=feed")
    expect(safeReturnTo("https://evil.com")).toBeUndefined()
    expect(safeReturnTo("//evil.com")).toBeUndefined()
    expect(safeReturnTo("/\\evil.com")).toBeUndefined()
    expect(safeReturnTo("/\t/evil.com")).toBeUndefined()
    expect(safeReturnTo("/\n/evil.com")).toBeUndefined()
    expect(safeReturnTo("/a\\evil.com")).toBeUndefined()
    expect(safeReturnTo("/login?x=1")).toBeUndefined()
    expect(safeReturnTo("/onboarding")).toBeUndefined()
  })

  it("parses only well-formed intents", () => {
    expect(parseIntentParam(`save:job:${ID}`)).toEqual({ action: "save", kind: "job", id: ID })
    expect(parseIntentParam("save:job:not-an-id")).toEqual({})
    expect(parseIntentParam(`delete:job:${ID}`)).toEqual({})
  })

  it("builds auth links that carry the page and the tap", () => {
    expect(authHref("/signup", { returnTo: "/jobs/x", action: "save", kind: "job", id: ID })).toBe(
      `/signup?callbackUrl=%2Fjobs%2Fx&intent=save%3Ajob%3A${ID}`,
    )
    expect(authHref("/login")).toBe("/login")
  })

  it("returns to the remembered page once, then falls back", () => {
    savePendingIntent({ returnTo: "/events/e1" })
    expect(takeReturnTo("/dashboard")).toBe("/events/e1")
    expect(takeReturnTo("/dashboard")).toBe("/dashboard")
  })

  it("hands the action over exactly once and keeps the page", () => {
    captureIntentFromSearch(`?callbackUrl=%2Fjobs%2Fx&intent=save%3Ajob%3A${ID}`)
    expect(takePendingAction()).toMatchObject({ action: "save", kind: "job", id: ID })
    expect(takePendingAction()).toBeNull()
    expect(readPendingIntent()?.returnTo).toBe("/jobs/x")
  })

  it("expires after a day", () => {
    savePendingIntent({ returnTo: "/jobs/x" })
    expect(readPendingIntent(Date.now() + 25 * 60 * 60 * 1000)).toBeNull()
  })
})
