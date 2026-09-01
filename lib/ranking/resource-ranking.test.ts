/**
 * Resource ranking, end to end.
 *
 * Resources are the content type where the weighting is most lopsided —
 * `location` is zero and `urgency` is 0.02, so meaning, language, freshness and
 * engagement decide everything. That made two defects load-bearing: engagement
 * ignored the one thing people do with a resource, and the semantic signal was
 * too compressed to outweigh recency.
 */

import { describe, expect, it } from "vitest"

import { profileUser } from "@/lib/nlp/profile-text"
import { rankItems } from "@/lib/ranking/rank"
import { engagementSignal } from "@/lib/ranking/signals"
import { EMPTY_HISTORY } from "@/lib/tracker/history"
import type { RankingContext } from "@/lib/ranking/types"

const NOW = Date.parse("2026-09-01T00:00:00Z")
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString()

const context: RankingContext = {
  location: { country: "Nigeria", countryCode: "NG", city: "Lagos", contributors: ["profile"] },
  language: "en",
  secondaryLanguages: [],
  interests: profileUser(
    {
      interests: [
        "Entrepreneurship & Funding",
        "Jobs & Career Opportunities",
        "Training & Workshops",
      ],
      skills: ["business plan", "pitching"],
      industrySectors: ["Business & Finance"],
    },
    "en",
  ),
  history: EMPTY_HISTORY,
  now: NOW,
}

const relevantButOld = {
  _id: "relevant-old",
  type: "resource",
  contentType: "resource",
  title: "Startup Funding Toolkit: Seed Funding and Pitch Deck Templates for Entrepreneurs",
  tags: ["entrepreneurship", "startup", "funding", "pitch", "venture capital"],
  category: "Entrepreneurship & Funding",
  description:
    "A complete guide for founders raising seed funding. Covers investment terms, pitch decks, incubator and accelerator applications, and small business financing.",
  createdAt: daysAgo(45),
  metrics: { viewCount: 900, downloadCount: 400, likeCount: 30, saveCount: 20 },
}

const irrelevantButFresh = {
  _id: "irrelevant-fresh",
  type: "resource",
  contentType: "resource",
  title: "Guide to Volunteering Abroad",
  tags: ["volunteering", "ngo"],
  category: "Volunteering & Community Service",
  description: "How to find humanitarian volunteer placements with NGOs and charities overseas.",
  createdAt: daysAgo(0),
  metrics: { viewCount: 10, downloadCount: 0 },
}

const offTopicAndFresh = {
  _id: "off-topic",
  type: "resource",
  contentType: "resource",
  title: "Wedding Photography Price List 2026",
  tags: [],
  category: "Other",
  description: "Rates and packages.",
  createdAt: daysAgo(1),
  metrics: {},
}

describe("resource ranking", () => {
  it("puts relevance above recency", () => {
    // A 45-day-old resource that matches beat nothing before this: freshness and
    // language between them had more swing than the signal carrying 42% of the
    // weight, so a volunteering guide posted today outranked it.
    const ranked = rankItems(
      [irrelevantButFresh, offTopicAndFresh, relevantButOld],
      context,
      { dropExpired: false },
    )

    expect(ranked[0].item._id).toBe("relevant-old")
  })

  it("leaves a wide gap between a match and a listing about nothing", () => {
    const [match] = rankItems([relevantButOld], context, { dropExpired: false })
    const [offTopic] = rankItems([offTopicAndFresh], context, { dropExpired: false })

    // These two used to sit 13 points apart, with an unrelated price list one
    // point behind a genuinely relevant listing.
    expect(match.score - offTopic.score).toBeGreaterThan(20)
  })

  it("says the recommendation matched an interest, rather than that it is new", () => {
    const [match] = rankItems([relevantButOld], context, { dropExpired: false })
    const keys = match.reasons.map((reason) => reason.key)

    expect(keys).toContain("matchesTag")
  })

  it("reads a Portuguese resource as Portuguese", () => {
    const [ranked] = rankItems(
      [
        {
          _id: "pt",
          type: "resource",
          contentType: "resource",
          title: "Guia de Empreendedorismo e Captacao de Recursos",
          tags: ["empreendedorismo", "startup", "investimento"],
          category: "Entrepreneurship & Funding",
          description:
            "Um guia completo para fundadores que buscam capital semente, investimento anjo e aceleradoras.",
          createdAt: daysAgo(10),
        },
      ],
      context,
      { dropExpired: false },
    )

    expect(ranked.contentLanguage).toBe("pt")
  })
})

describe("engagementSignal", () => {
  it("counts a download, which is what people do with a resource", () => {
    // Resources record downloadCount, playlistAddCount, shareCount and
    // clickCount. All four were read as zero, so a workbook with five thousand
    // downloads scored exactly like one nobody had opened.
    const popular = engagementSignal({
      metrics: {
        viewCount: 0,
        downloadCount: 5000,
        playlistAddCount: 300,
        shareCount: 200,
        clickCount: 900,
      },
    })

    expect(popular).not.toBeNull()
    expect(popular).toBeGreaterThan(0.5)
    expect(engagementSignal({ metrics: { viewCount: 0, downloadCount: 0 } })).toBeNull()
  })

  it("counts an event registration, under the name the model uses", () => {
    // The key list said "registrations"; the Event model writes
    // "registrationCount". Nothing wrote the former, so the conversion event
    // for the whole events catalogue was read as zero.
    expect(engagementSignal({ metrics: { viewCount: 0, registrationCount: 800 } })).not.toBeNull()
  })

  it("still ranks intent above attention", () => {
    const downloaded = engagementSignal({ metrics: { downloadCount: 100 } }) ?? 0
    const viewed = engagementSignal({ metrics: { viewCount: 100 } }) ?? 0

    expect(downloaded).toBeGreaterThan(viewed)
  })

  it("leaves room above a merely popular listing", () => {
    // The old divisor saturated at ~500 weighted points, so the whole top of
    // the catalogue tied at 1.0 and the signal stopped separating anything.
    const popular = engagementSignal({ metrics: { viewCount: 1000, likeCount: 50 } }) ?? 0
    expect(popular).toBeLessThan(1)
  })

  it("abstains when a listing carries no engagement at all", () => {
    expect(engagementSignal({})).toBeNull()
  })
})
