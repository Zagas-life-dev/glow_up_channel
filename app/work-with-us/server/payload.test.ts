import { describe, expect, it } from "vitest"

import { normaliseLink } from "../config"
import { parsePayload } from "./payload"

describe("normaliseLink", () => {
  it("adds https:// to a bare address", () => {
    expect(normaliseLink("mysite.com/apply")).toBe("https://mysite.com/apply")
    expect(normaliseLink("  www.mysite.com ")).toBe("https://www.mysite.com")
  })

  it("leaves a link that already has a scheme alone", () => {
    expect(normaliseLink("http://mysite.com")).toBe("http://mysite.com")
    expect(normaliseLink("HTTPS://mysite.com")).toBe("HTTPS://mysite.com")
    expect(normaliseLink("mailto:jobs@mysite.com")).toBe("mailto:jobs@mysite.com")
  })

  it("does not mistake a port for a scheme", () => {
    expect(normaliseLink("mysite.com:8080/apply")).toBe("https://mysite.com:8080/apply")
  })

  it("keeps an empty value empty", () => {
    expect(normaliseLink("   ")).toBe("")
  })
})

describe("parsePayload", () => {
  it("accepts a link typed without https://", () => {
    const parsed = parsePayload({
      kind: "job",
      entries: [
        { title: "Designer", description: "Design things", location: "Lagos", link: "mysite.com/apply" },
      ],
      duration: "standard",
      contact: { name: "Ada", email: "ada@example.com", phone: "0800", organisation: "" },
    })
    expect("payload" in parsed && parsed.payload.entries[0].link).toBe("https://mysite.com/apply")
  })
})
