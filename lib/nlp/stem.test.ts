/**
 * Stemmer invariants.
 *
 * Keyword overlap is a cosine over stemmed tokens, so a singular and its plural
 * that stem apart are simply two unrelated words as far as ranking is
 * concerned. "course"/"courses" splitting is not a rounding error on a
 * catalogue of resources — it is the match disappearing.
 */

import { describe, expect, it } from "vitest"

import { stem } from "@/lib/nlp/stem"

describe("stem", () => {
  it("collapses a plural onto its own singular", () => {
    const pairs: [string, string][] = [
      ["skill", "skills"],
      ["resource", "resources"],
      ["scholarship", "scholarships"],
      ["course", "courses"],
      ["case", "cases"],
      ["service", "services"],
      ["internship", "internships"],
    ]

    for (const [singular, plural] of pairs) {
      expect(stem(plural, "en"), `${plural} -> ${singular}`).toBe(stem(singular, "en"))
    }
  })

  it("keeps an ss ending intact, in both numbers", () => {
    // The plain "s" rule used to shorten these to "busines", "clas", "proces" —
    // none of which their own plural ever reached.
    const pairs: [string, string][] = [
      ["business", "businesses"],
      ["class", "classes"],
      ["process", "processes"],
      ["access", "accesses"],
      ["address", "addresses"],
    ]

    for (const [singular, plural] of pairs) {
      expect(stem(singular, "en")).toBe(singular)
      expect(stem(plural, "en"), `${plural} -> ${singular}`).toBe(singular)
    }
  })

  it("does not strip an ss ending through another language's ruleset", () => {
    // With no language, every ruleset is tried and the shortest wins — so the
    // guard has to hold for all of them, not just English.
    expect(stem("business")).toBe("business")
    expect(stem("businesses")).toBe("business")
  })

  it("is idempotent", () => {
    const words = [
      "businesses",
      "classes",
      "courses",
      "formacoes",
      "ciudades",
      "nationales",
      "bolsas",
      "scholarships",
    ]

    for (const word of words) {
      const once = stem(word)
      expect(stem(once), `stem(stem(${word}))`).toBe(once)
    }
  })

  it("leaves short words alone", () => {
    expect(stem("job", "en")).toBe("job")
    expect(stem("jobs", "en")).toBe("jobs")
  })
})
