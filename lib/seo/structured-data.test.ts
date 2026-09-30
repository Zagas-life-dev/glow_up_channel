import { describe, expect, it } from "vitest"
import { buildEventJsonLd } from "./structured-data"
import { formatDate, formatDateTime, hasClockTime } from "@/lib/content-detail/format"
import { BRAND } from "./brand"

const base = {
  title: "SME Africa Summit",
  description: "A gathering.",
  organizer: "YYBA",
  location: { city: "Lagos", province: "Lagos", country: "Nigeria" },
}

describe("buildEventJsonLd", () => {
  it("names each place part once and uses the ISO country code", () => {
    const ld = buildEventJsonLd(base, "x") as any
    expect(ld.location.name).toBe("Lagos, Nigeria")
    expect(ld.location.address.addressCountry).toBe("NG")
  })

  it("keeps a real start time and drops an invented midnight one", () => {
    const timed = buildEventJsonLd(
      { ...base, dates: { startDate: "2026-10-03T07:30:00.000Z" } },
      "x",
    ) as any
    expect(timed.startDate).toBe("2026-10-03T07:30:00.000Z")

    const dateOnly = buildEventJsonLd(
      { ...base, dates: { startDate: "2026-10-03T00:00:00.000Z" } },
      "x",
    ) as any
    expect(dateOnly.startDate).toBe("2026-10-03")
  })

  it("has no performer, falls back to the logo, and marks full events sold out", () => {
    const ld = buildEventJsonLd({ ...base, capacity: { isFull: true } }, "x") as any
    expect(ld.performer).toBeUndefined()
    expect(ld.image).toBe(BRAND.logo)
    expect(ld.offers.availability).toBe("https://schema.org/SoldOut")
  })
})

describe("listing date formatting", () => {
  it("prints the same day wherever it runs, in the listing's zone", () => {
    // Midnight in Lagos is 23:00 UTC the day before.
    expect(formatDate("2026-10-02T23:00:00.000Z", "Africa/Lagos")).toBe("Oct 3, 2026")
    expect(formatDate("2026-10-02T23:00:00.000Z")).toBe("Oct 3, 2026")
  })

  it("shows a time only when one was published", () => {
    expect(hasClockTime("2026-10-03T00:00:00.000Z")).toBe(false)
    expect(hasClockTime("2026-10-02T23:00:00.000Z", "Africa/Lagos")).toBe(false)
    expect(formatDateTime("2026-10-03T00:00:00.000Z")).toBe("Oct 3, 2026")
    expect(formatDateTime("2026-10-03T07:30:00.000Z", "Africa/Lagos")).toMatch(
      /^Oct 3, 2026, 8:30\sAM GMT\+1$/,
    )
  })

  it("ignores an invalid zone instead of throwing", () => {
    expect(formatDate("2026-10-03T07:30:00.000Z", "Not/AZone")).toBe("Oct 3, 2026")
  })
})
