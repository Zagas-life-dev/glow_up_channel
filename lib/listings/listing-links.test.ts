/**
 * Which link field wins, and which ones are decoration.
 *
 * The thing worth pinning here is precedence. `url` outranks every other link field on
 * all three types, so an admin who fills in "Application link" on a listing that already
 * has a `url` has changed nothing a reader will see — and on a job, where the apply
 * button reads `url` alone, has changed nothing at all. The restore dialog marks the
 * field that is actually in effect, and these are the chains it marks from.
 */

import { describe, expect, it } from "vitest"

import {
  LINK_PRECEDENCE,
  isLinkFieldUsed,
  isOpenableLink,
  linkFieldsFor,
  linkHost,
  resolveOutboundLink,
} from "@/lib/listings/listing-links"

describe("resolveOutboundLink", () => {
  it("prefers url over every other field, on every type", () => {
    const doc = {
      url: "https://example.test/canonical",
      applicationLink: "https://example.test/apply",
      registrationLink: "https://example.test/register",
      externalLink: "https://example.test/external",
    }
    for (const type of ["opportunity", "event", "job"] as const) {
      expect(resolveOutboundLink(doc, type)).toEqual({
        field: "url",
        url: "https://example.test/canonical",
      })
    }
  })

  it("falls back down the opportunity chain in order", () => {
    expect(resolveOutboundLink({ applicationLink: "https://a.test" }, "opportunity").field).toBe("applicationLink")
    expect(resolveOutboundLink({ application_link: "https://a.test" }, "opportunity").field).toBe("application_link")
    expect(resolveOutboundLink({ externalUrl: "https://a.test" }, "opportunity").field).toBe("externalUrl")
    expect(resolveOutboundLink({ externalLink: "https://a.test" }, "opportunity").field).toBe("externalLink")
  })

  it("uses registrationLink for events, which opportunities never consult", () => {
    expect(resolveOutboundLink({ registrationLink: "https://a.test" }, "event").field).toBe("registrationLink")
    expect(resolveOutboundLink({ registrationLink: "https://a.test" }, "opportunity").field).toBeNull()
  })

  it("reads nothing but url for jobs", () => {
    // The job apply button is hidden entirely when `url` is empty, so a job carrying only
    // an applicationLink has no way to apply — the dialog has to be able to say so.
    expect(resolveOutboundLink({ applicationLink: "https://a.test" }, "job")).toEqual({ field: null, url: null })
    expect(resolveOutboundLink({ url: "https://a.test" }, "job").field).toBe("url")
  })

  it("treats blank and whitespace-only values as absent", () => {
    expect(resolveOutboundLink({ url: "   ", applicationLink: "https://a.test" }, "opportunity").field).toBe(
      "applicationLink",
    )
  })

  it("reports no link rather than guessing", () => {
    expect(resolveOutboundLink({}, "opportunity")).toEqual({ field: null, url: null })
  })
})

describe("linkFieldsFor", () => {
  it("offers the type's whole chain even when the fields are empty", () => {
    expect(linkFieldsFor({}, "opportunity")).toEqual([...LINK_PRECEDENCE.opportunity])
    expect(linkFieldsFor({}, "job")).toEqual(["url"])
  })

  it("adds an off-chain field that actually holds a link, so it can be rescued", () => {
    // A job whose only link sits in applicationLink renders no apply button at all.
    // Hiding that field would leave the admin unable to see why.
    expect(linkFieldsFor({ applicationLink: "https://a.test" }, "job")).toEqual(["url", "applicationLink"])
  })

  it("does not add off-chain fields that are empty", () => {
    expect(linkFieldsFor({ applicationLink: "" }, "job")).toEqual(["url"])
  })

  it("knows which fields the listing page consults", () => {
    expect(isLinkFieldUsed("url", "job")).toBe(true)
    expect(isLinkFieldUsed("applicationLink", "job")).toBe(false)
    expect(isLinkFieldUsed("applicationLink", "opportunity")).toBe(true)
  })
})

describe("isOpenableLink", () => {
  it("accepts http and https", () => {
    expect(isOpenableLink("https://example.test/apply")).toBe(true)
    expect(isOpenableLink("http://example.test")).toBe(true)
  })

  it("refuses anything an admin tool must not turn into a clickable link", () => {
    expect(isOpenableLink("javascript:alert(1)")).toBe(false)
    expect(isOpenableLink("data:text/html,<script>")).toBe(false)
    expect(isOpenableLink("file:///etc/passwd")).toBe(false)
  })

  it("refuses bare hosts and junk rather than opening something unintended", () => {
    expect(isOpenableLink("example.com/apply")).toBe(false)
    expect(isOpenableLink("")).toBe(false)
    expect(isOpenableLink(null)).toBe(false)
    expect(isOpenableLink("   ")).toBe(false)
  })
})

describe("linkHost", () => {
  it("strips www so the hint stays short", () => {
    expect(linkHost("https://www.example.test/apply?x=1")).toBe("example.test")
  })

  it("is empty for anything not openable", () => {
    expect(linkHost("javascript:alert(1)")).toBe("")
    expect(linkHost("nonsense")).toBe("")
  })
})
