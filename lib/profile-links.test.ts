import { describe, expect, it } from "vitest"
import { normalizeProfileLink, profileLinkHost } from "./profile-links"

describe("normalizeProfileLink", () => {
  it("adds https to a bare domain", () => {
    expect(normalizeProfileLink("mysite.com")).toBe("https://mysite.com")
    expect(normalizeProfileLink("  linkedin.com/in/ada ", "linkedin")).toBe("https://linkedin.com/in/ada")
  })

  it("keeps a full http(s) link as typed", () => {
    expect(normalizeProfileLink("https://github.com/ada")).toBe("https://github.com/ada")
    expect(normalizeProfileLink("http://ada.dev")).toBe("http://ada.dev")
  })

  it("expands a bare handle onto its platform", () => {
    expect(normalizeProfileLink("@ada", "instagram")).toBe("https://www.instagram.com/ada")
    expect(normalizeProfileLink("ada.lovelace", "instagram")).toBe("https://www.instagram.com/ada.lovelace")
    expect(normalizeProfileLink("@ada", "tiktok")).toBe("https://www.tiktok.com/@ada")
    expect(normalizeProfileLink("ada", "linkedin")).toBe("https://www.linkedin.com/in/ada")
  })

  it("treats empty input as no link", () => {
    expect(normalizeProfileLink("")).toBe("")
    expect(normalizeProfileLink("   ")).toBe("")
    expect(normalizeProfileLink(null)).toBe("")
  })

  it("rejects what cannot be a web link", () => {
    expect(normalizeProfileLink("javascript:alert(1)")).toBeNull()
    expect(normalizeProfileLink("mailto:ada@site.com")).toBeNull()
    expect(normalizeProfileLink("my site")).toBeNull()
    expect(normalizeProfileLink("localhost")).toBeNull()
    expect(normalizeProfileLink("ada")).toBeNull()
  })
})

describe("profileLinkHost", () => {
  it("labels stored links, including legacy ones without a scheme", () => {
    expect(profileLinkHost("https://www.mysite.com/about")).toBe("mysite.com")
    expect(profileLinkHost("mysite.com")).toBe("mysite.com")
  })

  it("returns null instead of throwing on junk", () => {
    expect(profileLinkHost("not a link")).toBeNull()
    expect(profileLinkHost(null)).toBeNull()
  })
})
