import { describe, expect, it } from "vitest"

import {
  CLOSING_PRESETS,
  POSTED_PRESETS,
  activeDatePresetId,
  clearDateFilter,
  dateFilterExcludesResources,
  describeDateFilter,
  findDatePreset,
  hasDateFilter,
  resolveDatePreset,
  setDateBasis,
  toLocalISODate,
  toggleDatePreset,
} from "@/lib/search-date-filters"
import type { SearchFilters } from "@/lib/fetch-home-list-page"

/** Mid-afternoon, so a local day and a UTC day agree for any plausible offset. */
const NOW = new Date(2026, 8, 14, 15, 0, 0) // 14 Sep 2026, local

const preset = (id: string) => {
  const found = findDatePreset(id)
  if (!found) throw new Error(`no preset ${id}`)
  return found
}

describe("toLocalISODate", () => {
  it("reads the reader's calendar day, not the UTC one", () => {
    // 23:30 on the 14th somewhere west of Greenwich is already the 15th in UTC.
    expect(toLocalISODate(new Date(2026, 8, 14, 23, 30))).toBe("2026-09-14")
    expect(toLocalISODate(new Date(2026, 8, 14, 0, 30))).toBe("2026-09-14")
  })

  it("pads single-digit months and days", () => {
    expect(toLocalISODate(new Date(2026, 0, 5))).toBe("2026-01-05")
  })
})

describe("resolveDatePreset", () => {
  it("looks forward from today for a closing window", () => {
    expect(resolveDatePreset(preset("closing-7d"), NOW)).toEqual({
      dateFrom: "2026-09-14",
      dateTo: "2026-09-21",
      dateField: "deadline",
    })
  })

  it("makes 'closing today' a single day", () => {
    expect(resolveDatePreset(preset("closing-today"), NOW)).toEqual({
      dateFrom: "2026-09-14",
      dateTo: "2026-09-14",
      dateField: "deadline",
    })
  })

  it("looks back from today for a posted window", () => {
    expect(resolveDatePreset(preset("posted-7d"), NOW)).toEqual({
      dateFrom: "2026-09-07",
      dateTo: "2026-09-14",
      dateField: "posted",
    })
  })

  it("crosses month and year boundaries", () => {
    const newYear = new Date(2026, 11, 28, 12, 0, 0)
    expect(resolveDatePreset(preset("closing-7d"), newYear).dateTo).toBe("2027-01-04")
  })

  it("never opens a closing window into the past", () => {
    for (const p of CLOSING_PRESETS) {
      const range = resolveDatePreset(p, NOW)
      expect(range.dateFrom).toBe("2026-09-14")
      expect(range.dateTo >= range.dateFrom).toBe(true)
    }
  })

  it("never opens a posted window into the future", () => {
    for (const p of POSTED_PRESETS) {
      const range = resolveDatePreset(p, NOW)
      expect(range.dateTo).toBe("2026-09-14")
      expect(range.dateFrom <= range.dateTo).toBe(true)
    }
  })
})

describe("activeDatePresetId", () => {
  it("recognises a range it resolved itself", () => {
    for (const p of [...CLOSING_PRESETS, ...POSTED_PRESETS]) {
      const filters = resolveDatePreset(p, NOW) as SearchFilters
      expect(activeDatePresetId(filters, NOW)).toBe(p.id)
    }
  })

  it("is null with no date filter at all", () => {
    expect(activeDatePresetId({}, NOW)).toBeNull()
    expect(activeDatePresetId({ country: "Nigeria" }, NOW)).toBeNull()
  })

  it("is null for a hand-picked range", () => {
    expect(
      activeDatePresetId({ dateFrom: "2026-09-14", dateTo: "2026-09-16" }, NOW),
    ).toBeNull()
  })

  it("does not match a window across bases", () => {
    // 7 days back is not the same question as 7 days forward, even though both
    // presets are called "7 days" on their chips.
    const posted = resolveDatePreset(preset("posted-7d"), NOW) as SearchFilters
    expect(activeDatePresetId({ ...posted, dateField: "deadline" }, NOW)).toBeNull()
  })

  it("stops recognising a shared link once the window has moved on", () => {
    // A link shared yesterday still says 14–21 September; read today that is a
    // fixed range, not a live "closing within 7 days".
    const yesterday = resolveDatePreset(preset("closing-7d"), NOW) as SearchFilters
    const tomorrow = new Date(2026, 8, 15, 15, 0, 0)
    expect(activeDatePresetId(yesterday, tomorrow)).toBeNull()
  })

  it("treats a missing basis as the deadline default", () => {
    expect(
      activeDatePresetId({ dateFrom: "2026-09-14", dateTo: "2026-09-21" }, NOW),
    ).toBe("closing-7d")
  })
})

describe("toggleDatePreset", () => {
  it("sets the range and its basis", () => {
    expect(toggleDatePreset({}, "closing-30d", NOW)).toEqual({
      dateFrom: "2026-09-14",
      dateTo: "2026-10-14",
      dateField: "deadline",
    })
  })

  it("clears when the active preset is tapped again", () => {
    const on = toggleDatePreset({ country: "Kenya" }, "closing-7d", NOW)
    expect(toggleDatePreset(on, "closing-7d", NOW)).toEqual({ country: "Kenya" })
  })

  it("replaces one window with another rather than merging them", () => {
    const seven = toggleDatePreset({}, "closing-7d", NOW)
    const posted = toggleDatePreset(seven, "posted-30d", NOW)
    expect(posted).toEqual({
      dateFrom: "2026-08-15",
      dateTo: "2026-09-14",
      dateField: "posted",
    })
  })

  it("keeps the other filters untouched", () => {
    const filters: SearchFilters = { country: "Ghana", isRemote: true }
    expect(toggleDatePreset(filters, "closing-3d", NOW)).toMatchObject(filters)
  })

  it("ignores an unknown preset id", () => {
    const filters: SearchFilters = { country: "Ghana" }
    expect(toggleDatePreset(filters, "closing-400d", NOW)).toBe(filters)
  })
})

describe("hasDateFilter and clearDateFilter", () => {
  it("a basis with no dates narrows nothing", () => {
    expect(hasDateFilter({ dateField: "posted" })).toBe(false)
    expect(hasDateFilter({ dateFrom: "2026-09-14" })).toBe(true)
    expect(hasDateFilter({ dateTo: "2026-09-14" })).toBe(true)
  })

  it("drops the basis along with the dates", () => {
    expect(
      clearDateFilter({
        country: "Kenya",
        dateFrom: "2026-09-14",
        dateTo: "2026-09-21",
        dateField: "deadline",
      }),
    ).toEqual({ country: "Kenya" })
  })
})

describe("setDateBasis", () => {
  it("keeps the dates and changes only what they measure", () => {
    const filters: SearchFilters = { dateFrom: "2026-09-14", dateTo: "2026-09-21" }
    expect(setDateBasis(filters, "posted")).toEqual({ ...filters, dateField: "posted" })
  })
})

describe("describeDateFilter", () => {
  it("names the preset when there is one", () => {
    const filters = resolveDatePreset(preset("closing-7d"), NOW) as SearchFilters
    expect(describeDateFilter(filters, NOW)).toBe("Closing within 7 days")
  })

  it("spells out a hand-picked range", () => {
    const text = describeDateFilter({ dateFrom: "2026-09-14", dateTo: "2026-09-16" }, NOW)
    expect(text).toMatch(/^Closing /)
    expect(text).toContain("–")
  })

  it("says which end is open", () => {
    expect(describeDateFilter({ dateFrom: "2026-09-14", dateField: "posted" }, NOW)).toMatch(
      /^Added on or after /,
    )
    expect(describeDateFilter({ dateTo: "2026-09-14" }, NOW)).toMatch(/^Closing on or before /)
  })

  it("is null with nothing to describe", () => {
    expect(describeDateFilter({ country: "Kenya" }, NOW)).toBeNull()
  })

  it("does not slip a day when formatting", () => {
    // Parsed at UTC noon, so neither end can land on its neighbour whatever
    // timezone the reader is in.
    const text = describeDateFilter({ dateFrom: "2026-09-14", dateTo: "2026-09-16" }, NOW)
    expect(text).toContain("14")
    expect(text).toContain("16")
    expect(text).not.toContain("13")
    expect(text).not.toContain("17")
  })
})

describe("dateFilterExcludesResources", () => {
  it("is true only for a closing window", () => {
    expect(dateFilterExcludesResources({ dateFrom: "2026-09-14" })).toBe(true)
    expect(
      dateFilterExcludesResources({ dateFrom: "2026-09-14", dateField: "deadline" }),
    ).toBe(true)
  })

  it("is false once the range measures when things were added", () => {
    expect(
      dateFilterExcludesResources({ dateFrom: "2026-09-14", dateField: "posted" }),
    ).toBe(false)
  })

  it("is false with no date range at all", () => {
    expect(dateFilterExcludesResources({})).toBe(false)
    expect(dateFilterExcludesResources({ dateField: "deadline" })).toBe(false)
  })
})
