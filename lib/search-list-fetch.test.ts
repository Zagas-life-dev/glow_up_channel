import { afterEach, describe, expect, it, vi } from "vitest"

import {
  categoryCanMatch,
  fetchSearchAllCategoriesPage,
  fetchSearchCategoryPage,
  createInitialSearchCursors,
  createInitialSearchHasMore,
  hasActiveFilters,
  parseSearchFilters,
  searchFiltersKey,
  searchFiltersToParams,
} from "@/lib/search-list-fetch"
import type { SearchFilters } from "@/lib/fetch-home-list-page"

describe("hasActiveFilters", () => {
  it("is false for nothing, and for blank strings", () => {
    expect(hasActiveFilters(undefined)).toBe(false)
    expect(hasActiveFilters({})).toBe(false)
    expect(hasActiveFilters({ country: "   " })).toBe(false)
  })

  it("ignores a date basis with no range behind it", () => {
    // Otherwise switching "dates measure" with no dates set would fire a
    // filters-only search — that is, a request for the whole platform.
    expect(hasActiveFilters({ dateField: "posted" })).toBe(false)
    expect(hasActiveFilters({ dateField: "posted", dateFrom: "2026-09-14" })).toBe(true)
  })

  it("counts a false boolean as a filter", () => {
    expect(hasActiveFilters({ isRemote: false })).toBe(true)
  })
})

describe("searchFiltersToParams / parseSearchFilters", () => {
  const full: SearchFilters = {
    country: "Nigeria",
    city: "Lagos",
    type: "Scholarship",
    dateFrom: "2026-09-14",
    dateTo: "2026-09-21",
    dateField: "deadline",
    isRemote: true,
    isPaid: false,
  }

  it("round-trips every filter", () => {
    expect(parseSearchFilters(searchFiltersToParams(full))).toEqual(full)
  })

  it("leaves empty and absent values out of the query string", () => {
    const params = searchFiltersToParams({ country: "  ", city: "Lagos" })
    expect(params.has("country")).toBe(false)
    expect(params.get("city")).toBe("Lagos")
  })

  it("keeps other params already in the target", () => {
    const params = new URLSearchParams({ q: "grants" })
    searchFiltersToParams({ dateFrom: "2026-09-14" }, params)
    expect(params.get("q")).toBe("grants")
    expect(params.get("dateFrom")).toBe("2026-09-14")
  })

  it("drops a date basis it does not recognise", () => {
    expect(parseSearchFilters("dateField=whenever").dateField).toBeUndefined()
    expect(parseSearchFilters("dateField=posted").dateField).toBe("posted")
  })

  it("reads booleans only from the exact words", () => {
    expect(parseSearchFilters("isRemote=true").isRemote).toBe(true)
    expect(parseSearchFilters("isRemote=false").isRemote).toBe(false)
    expect(parseSearchFilters("isRemote=yes").isRemote).toBeUndefined()
  })

  it("ignores params that are not filters", () => {
    expect(parseSearchFilters("q=grants&page=3")).toEqual({})
  })
})

describe("searchFiltersKey", () => {
  it("is the same string for the same filters, whatever order they were built in", () => {
    const a: SearchFilters = { dateTo: "2026-09-21", country: "Kenya", dateFrom: "2026-09-14" }
    const b: SearchFilters = { country: "Kenya", dateFrom: "2026-09-14", dateTo: "2026-09-21" }
    expect(searchFiltersKey(a)).toBe(searchFiltersKey(b))
  })

  it("changes when a filter changes", () => {
    expect(searchFiltersKey({ dateFrom: "2026-09-14" })).not.toBe(
      searchFiltersKey({ dateFrom: "2026-09-15" }),
    )
  })

  it("is empty for no filters", () => {
    expect(searchFiltersKey({})).toBe("")
    expect(searchFiltersKey(undefined)).toBe("")
  })
})

describe("categoryCanMatch", () => {
  const closing: SearchFilters = { dateFrom: "2026-09-14", dateTo: "2026-09-21" }

  it("skips resources under a closing window — they never close", () => {
    expect(categoryCanMatch("resources", closing)).toBe(false)
  })

  it("keeps resources for a posted window", () => {
    expect(categoryCanMatch("resources", { ...closing, dateField: "posted" })).toBe(true)
  })

  it("keeps resources when no date is filtered", () => {
    expect(categoryCanMatch("resources", { country: "Kenya" })).toBe(true)
    expect(categoryCanMatch("resources", undefined)).toBe(true)
  })

  it("never skips a category that has deadlines", () => {
    for (const type of ["opportunities", "events", "jobs"] as const) {
      expect(categoryCanMatch(type, closing)).toBe(true)
    }
  })
})

describe("the request the filters produce", () => {
  const BACKEND = "http://backend.test"

  /** Records every URL asked for and answers each with an empty page. */
  function stubFetch() {
    const urls: string[] = []
    const spy = vi.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input))
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { opportunities: [], events: [], jobs: [], resources: [], pagination: {} },
        }),
      } as Response
    })
    vi.stubGlobal("fetch", spy)
    return urls
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends the date range and its basis as query params", async () => {
    const urls = stubFetch()
    await fetchSearchCategoryPage({
      type: "opportunities",
      cursorLastId: null,
      backendUrl: BACKEND,
      search: "grant",
      filters: { dateFrom: "2026-09-14", dateTo: "2026-09-21", dateField: "deadline" },
    })

    const url = new URL(urls[0])
    expect(url.pathname).toBe("/api/opportunities")
    expect(url.searchParams.get("search")).toBe("grant")
    expect(url.searchParams.get("dateFrom")).toBe("2026-09-14")
    expect(url.searchParams.get("dateTo")).toBe("2026-09-21")
    expect(url.searchParams.get("dateField")).toBe("deadline")
  })

  it("searches on a date range with no keyword at all", async () => {
    const urls = stubFetch()
    await fetchSearchCategoryPage({
      type: "jobs",
      cursorLastId: null,
      backendUrl: BACKEND,
      search: "",
      filters: { dateFrom: "2026-09-14" },
    })

    expect(urls).toHaveLength(1)
    expect(new URL(urls[0]).searchParams.has("search")).toBe(false)
  })

  it("still asks for nothing when neither a keyword nor a filter is set", async () => {
    const urls = stubFetch()
    await fetchSearchCategoryPage({
      type: "jobs",
      cursorLastId: null,
      backendUrl: BACKEND,
      search: "  ",
      filters: {},
    })
    expect(urls).toHaveLength(0)
  })

  it("does not call the resources endpoint under a closing window", async () => {
    const urls = stubFetch()
    await fetchSearchAllCategoriesPage({
      backendUrl: BACKEND,
      search: "grant",
      cursors: createInitialSearchCursors(),
      hasMoreByType: createInitialSearchHasMore(),
      reset: true,
      filters: { dateFrom: "2026-09-14", dateTo: "2026-09-21" },
    })

    expect(urls).toHaveLength(3)
    expect(urls.some((url) => url.includes("/api/resources"))).toBe(false)
  })

  it("calls all four when the range measures when things were added", async () => {
    const urls = stubFetch()
    await fetchSearchAllCategoriesPage({
      backendUrl: BACKEND,
      search: "grant",
      cursors: createInitialSearchCursors(),
      hasMoreByType: createInitialSearchHasMore(),
      reset: true,
      filters: { dateFrom: "2026-09-14", dateField: "posted" },
    })

    expect(urls).toHaveLength(4)
    expect(urls.some((url) => url.includes("/api/resources"))).toBe(true)
  })

  it("reports no more resources to load once they are skipped", async () => {
    stubFetch()
    const result = await fetchSearchAllCategoriesPage({
      backendUrl: BACKEND,
      search: "grant",
      cursors: createInitialSearchCursors(),
      hasMoreByType: createInitialSearchHasMore(),
      reset: true,
      filters: { dateFrom: "2026-09-14" },
    })
    expect(result.hasMoreByType.resources).toBe(false)
  })
})
