/**
 * What the semantic signal is actually worth.
 *
 * `semantic` carries 0.42 of a resource's weight — the largest single share —
 * but weight only matters if the signal uses its range. It used to score an
 * ideal match 0.44 and an unrelated one 0.19, so the dominant weight moved the
 * result less than freshness did. These tests pin the two properties that make
 * the weight mean something: relevant content separates from irrelevant, and it
 * clears `REASON_THRESHOLD` so the feed can say why it recommended anything.
 */

import { describe, expect, it } from "vitest"

import { matchTags } from "@/lib/nlp/taxonomy"
import { profileContent, profileUser } from "@/lib/nlp/profile-text"
import { semanticSimilarity } from "@/lib/nlp/similarity"
import { REASON_THRESHOLD } from "@/lib/ranking/weights"

/** A reader who ticked three interests and one sector. */
const reader = profileUser(
  {
    interests: [
      "Entrepreneurship & Funding",
      "Jobs & Career Opportunities",
      "Training & Workshops",
    ],
    skills: ["business plan", "pitching"],
    industrySectors: ["Business & Finance"],
    fieldOfStudy: "Business Administration",
  },
  "en",
)

const resource = (item: Record<string, unknown>) =>
  profileContent({ type: "resource", ...item })

const ideal = resource({
  _id: "ideal",
  title: "Startup Funding Toolkit: Seed Funding and Pitch Deck Templates for Entrepreneurs",
  tags: ["entrepreneurship", "startup", "funding", "pitch", "venture capital"],
  category: "Entrepreneurship & Funding",
  description:
    "A complete guide for founders raising seed funding. Covers investment terms, pitch decks, incubator and accelerator applications, and small business financing.",
})

/** Squarely serves one of the three stated interests, and nothing else. */
const oneInterest = resource({
  _id: "partial",
  title: "CV and Interview Preparation Workbook",
  tags: ["career", "jobs", "cv"],
  category: "Jobs & Career Opportunities",
  description: "Templates for your CV, cover letter and interview answers for graduate roles.",
})

const tangential = resource({
  _id: "tangential",
  title: "Guide to Volunteering Abroad",
  tags: ["volunteering", "ngo"],
  category: "Volunteering & Community Service",
  description: "How to find humanitarian volunteer placements with NGOs and charities overseas.",
})

const unrelated = resource({
  _id: "unrelated",
  title: "Wedding Photography Price List 2026",
  tags: [],
  category: "Other",
  description: "Rates and packages.",
})

describe("semanticSimilarity", () => {
  it("separates relevant content from irrelevant by a wide margin", () => {
    const relevant = Math.min(
      semanticSimilarity(reader, ideal),
      semanticSimilarity(reader, oneInterest),
    )
    const irrelevant = Math.max(
      semanticSimilarity(reader, tangential),
      semanticSimilarity(reader, unrelated),
    )

    expect(relevant).toBeGreaterThan(irrelevant + 0.25)
  })

  it("rewards a resource that nails one of several interests", () => {
    // Coverage alone cannot: one resource can only ever cover a fraction of a
    // multi-interest profile, which is what capped the whole signal near 0.5.
    expect(semanticSimilarity(reader, oneInterest)).toBeGreaterThan(REASON_THRESHOLD)
  })

  it("clears the reason threshold for relevant content and not otherwise", () => {
    expect(semanticSimilarity(reader, ideal)).toBeGreaterThan(REASON_THRESHOLD)
    expect(semanticSimilarity(reader, tangential)).toBeLessThan(REASON_THRESHOLD)
    expect(semanticSimilarity(reader, unrelated)).toBeLessThan(REASON_THRESHOLD)
  })

  it("scores nothing for content with no overlap at all", () => {
    expect(semanticSimilarity(reader, unrelated)).toBe(0)
  })
})

describe("coreTags", () => {
  it("holds only what the reader's own words matched", () => {
    // `tags` carries the `expandRelated` inferences too. Dividing coverage by
    // those padded the denominator with interests nobody chose.
    expect(reader.coreTags.size).toBeLessThan(reader.tags.size)
    for (const tagId of reader.coreTags.keys()) {
      expect(reader.tags.has(tagId)).toBe(true)
    }
  })
})

describe("weak aliases", () => {
  it("treats a hint word as weaker evidence than a real alias", () => {
    const seed = matchTags("seed funding")
    expect(seed.get("entrepreneurship-funding") ?? 0).toBeGreaterThan(
      seed.get("scholarships-grants") ?? 0,
    )

    const online = matchTags("online course")
    expect(online.get("training-workshops") ?? 0).toBeGreaterThan(
      online.get("remote-digital-skills") ?? 0,
    )
  })

  it("keeps hint words below a real match even in a heavily weighted field", () => {
    // "Funding" twice in a title (weight 3) used to clear the clamp and read as
    // certainty, so a startup toolkit profiled as being exactly as much about
    // scholarships as about entrepreneurship.
    const scholarships = ideal.coreTags.get("scholarships-grants") ?? 0
    const entrepreneurship = ideal.coreTags.get("entrepreneurship-funding") ?? 0

    expect(entrepreneurship).toBeGreaterThan(scholarships)
    expect(scholarships).toBeLessThan(0.5)
  })

  it("still lets an unambiguous alias reach full strength", () => {
    expect(matchTags("scholarship").get("scholarships-grants") ?? 0).toBeGreaterThan(0.7)
  })

  it("does not read a business degree as an interest in the public sector", () => {
    const study = profileUser({ fieldOfStudy: "Business Administration" }, "en")
    expect(study.coreTags.get("government-public") ?? 0).toBeLessThan(0.5)
  })
})
