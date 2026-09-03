import { describe, expect, it } from "vitest"

import { buildListingPayload, type ListingDraft } from "@/lib/listings/payload"
import { INDUSTRY_SECTORS, CAREER_STAGES, EDUCATION_LEVELS } from "@/lib/listings/taxonomy"

const MONEY = {
  amount: 450000,
  currency: "NGN",
  amountUsd: 304.05,
  fxRate: 0.000676,
  fxAsOf: "2026-09-01",
}

function draft(overrides: Partial<ListingDraft> = {}): ListingDraft {
  return {
    kind: "job",
    title: "  Engineer  ",
    description: "  Builds things  ",
    url: "https://example.com/apply",
    organizationName: "Acme",
    type: "Full-time",
    tags: ["remote", "remote", "  react  "],
    industrySectors: ["Technology"],
    targetAudience: ["Student"],
    location: { country: "Nigeria", countryCode: "ng", city: "Lagos", isRemote: false },
    money: MONEY,
    isPaid: true,
    period: "monthly",
    ...overrides,
  }
}

describe("field names the models actually read", () => {
  it("sends jobType, not type", () => {
    // No job in the database has a type: all three posting paths sent `type`,
    // the model reads `jobType`, and the controller dropped it in silence.
    const payload = buildListingPayload(draft({ kind: "job" }))
    expect(payload.jobType).toBe("Full-time")
    expect(payload.type).toBeUndefined()
  })

  it("sends provider for an opportunity, not company", () => {
    const payload = buildListingPayload(draft({ kind: "opportunity", type: "Scholarship" }))
    expect(payload.provider).toBe("Acme")
    expect(payload.company).toBeUndefined()
    // The model carries both, and the list filters read `category`.
    expect(payload.type).toBe("Scholarship")
    expect(payload.category).toBe("Scholarship")
  })

  it("sends organizer and eventType for an event", () => {
    const payload = buildListingPayload(draft({ kind: "event", type: "Workshop" }))
    expect(payload.organizer).toBe("Acme")
    expect(payload.eventType).toBe("Workshop")
  })

  it("sends a resource's link as paymentLink, the only link field the model has", () => {
    const payload = buildListingPayload(draft({ kind: "resource", type: "Guide" }))
    expect(payload.paymentLink).toBe("https://example.com/apply")
    expect(payload.url).toBeUndefined()
    expect(payload.category).toBe("Guide")
  })
})

describe("money", () => {
  it("writes the canonical pricing object on all four types", () => {
    for (const kind of ["opportunity", "job", "event", "resource"] as const) {
      const payload = buildListingPayload(draft({ kind })) as any
      expect(payload.pricing, kind).toMatchObject({
        isPaid: true,
        amount: 450000,
        currency: "NGN",
        amountUsd: 304.05,
      })
    }
  })

  it("keeps each type's legacy container in step", () => {
    expect((buildListingPayload(draft({ kind: "job" })) as any).pay).toMatchObject({
      amount: 450000,
      currency: "NGN",
      period: "monthly",
    })
    expect((buildListingPayload(draft({ kind: "opportunity" })) as any).financial).toMatchObject({
      amount: 450000,
      currency: "NGN",
    })
    const event = buildListingPayload(draft({ kind: "event" })) as any
    expect(event.price).toBe(450000)
    expect(event.currency).toBe("NGN")
    expect(event.priceUsd).toBe(304.05)
  })

  it("never leaves the currency unset", () => {
    // The models default an absent currency to USD while every form hardcoded
    // NGN, so an amount with no currency read as dollars and the same amount
    // with one read as naira.
    const payload = buildListingPayload(draft({ money: null, isPaid: false })) as any
    expect(payload.pricing.currency).toBe("USD")
    expect(payload.pricing.amount).toBeNull()
  })

  it("gives a resource a real price rather than only a premium flag", () => {
    const payload = buildListingPayload(draft({ kind: "resource", isPremium: true })) as any
    expect(payload.isPremium).toBe(true)
    expect(payload.price).toBe(450000)
    expect(payload.priceUsd).toBe(304.05)
  })
})

describe("requirements", () => {
  it("puts free text where it can be read back", () => {
    // Assigning the string straight to `requirements` meant the model read
    // `.educationLevel` off it, got undefined for everything, and lost the text.
    const payload = buildListingPayload(
      draft({ kind: "opportunity", requirements: "Must be enrolled", targetAudience: [] }),
    ) as any
    expect(payload.requirements).toEqual({ other: "Must be enrolled" })
  })

  it("fills the structured fields from the audience selection", () => {
    const payload = buildListingPayload(
      draft({
        kind: "opportunity",
        requirements: "Open to all",
        targetAudience: ["Student", "Undergraduate"],
      }),
    ) as any
    expect(payload.requirements).toEqual({
      educationLevel: "Undergraduate",
      careerStage: "Student",
      other: "Open to all",
    })
  })

  it("is omitted entirely when nothing was given", () => {
    const payload = buildListingPayload(
      draft({ kind: "opportunity", requirements: "  ", targetAudience: [] }),
    ) as any
    expect(payload.requirements).toBeUndefined()
  })
})

describe("taxonomy and tags", () => {
  it("drops values outside the closed vocabularies", () => {
    const payload = buildListingPayload(
      draft({
        industrySectors: ["Technology", "Astrology"],
        targetAudience: ["Student", "wizards"],
      }),
    ) as any
    expect(payload.industrySectors).toEqual(["Technology"])
    expect(payload.targetAudience).toEqual(["Student"])
  })

  it("accepts every documented vocabulary value", () => {
    const payload = buildListingPayload(
      draft({
        industrySectors: [...INDUSTRY_SECTORS],
        targetAudience: [...CAREER_STAGES, ...EDUCATION_LEVELS],
      }),
    ) as any
    expect(payload.industrySectors).toHaveLength(INDUSTRY_SECTORS.length)
    expect(payload.targetAudience).toHaveLength(CAREER_STAGES.length + EDUCATION_LEVELS.length)
  })

  it("trims, de-duplicates and caps tags", () => {
    const payload = buildListingPayload(draft()) as any
    expect(payload.tags).toEqual(["remote", "react"])

    const many = buildListingPayload(
      draft({ tags: Array.from({ length: 20 }, (_, i) => `tag${i}`) }),
    ) as any
    expect(many.tags).toHaveLength(10)
  })

  it("sends the arrays on every type, including resources", () => {
    for (const kind of ["opportunity", "job", "event", "resource"] as const) {
      const payload = buildListingPayload(draft({ kind })) as any
      expect(Array.isArray(payload.industrySectors), kind).toBe(true)
      expect(Array.isArray(payload.targetAudience), kind).toBe(true)
      expect(Array.isArray(payload.tags), kind).toBe(true)
    }
  })
})

describe("location", () => {
  it("upper-cases the ISO code the ranker matches on", () => {
    const payload = buildListingPayload(draft()) as any
    expect(payload.location.countryCode).toBe("NG")
    expect(payload.location.country).toBe("Nigeria")
  })

  it("omits an empty location rather than writing a hollow object", () => {
    const payload = buildListingPayload(
      draft({ location: { country: "", city: "", isRemote: false } }),
    ) as any
    expect(payload.location).toBeUndefined()
  })

  it("keeps a remote-only location", () => {
    const payload = buildListingPayload(draft({ location: { isRemote: true } })) as any
    expect(payload.location).toMatchObject({ isRemote: true })
  })

  it("omits location for resources, which have none", () => {
    const payload = buildListingPayload(draft({ kind: "resource" })) as any
    expect(payload.location).toBeUndefined()
  })
})

describe("dates", () => {
  it("sends ISO instants so Mongo stores real Dates", () => {
    // Range queries are type-bracketed: a deadline left as a bare string is
    // invisible to every { $gte: <Date> } filter the list endpoints run.
    const payload = buildListingPayload(
      draft({ dates: { applicationDeadline: "2026-11-30" } }),
    ) as any
    expect(payload.dates.applicationDeadline).toBe(new Date("2026-11-30").toISOString())
  })

  it("carries an event's registration deadline", () => {
    // The provider form read this field from the start but never rendered an
    // input for it, so it was always undefined — and Event.isValid is computed
    // from exactly this date.
    const payload = buildListingPayload(
      draft({ kind: "event", dates: { startDate: "2026-12-01", registrationDeadline: "2026-11-20" } }),
    ) as any
    expect(payload.dates.registrationDeadline).toBe(new Date("2026-11-20").toISOString())
  })

  it("drops unparseable dates instead of sending them", () => {
    const payload = buildListingPayload(
      draft({ dates: { applicationDeadline: "not a date" } }),
    ) as any
    expect(payload.dates).toBeUndefined()
  })
})

describe("title and description", () => {
  it("trims", () => {
    const payload = buildListingPayload(draft()) as any
    expect(payload.title).toBe("Engineer")
    expect(payload.description).toBe("Builds things")
  })
})
