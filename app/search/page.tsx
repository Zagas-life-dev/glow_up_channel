"use client"

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react"
import Link from "next/link"
import { useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import AuthGuard from "@/components/auth-guard"
import { cn } from "@/lib/utils"
import FeedCard from "@/components/feed-card"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { getPageState, savePageState } from "@/lib/page-state-session"
import { setContentCache, getContentCache, type ContentCacheType } from "@/lib/content-cache-session"
import { PageShell } from "@/components/layout/page-shell"
import { Loader2, Search, SlidersHorizontal, Sparkles, X } from "lucide-react"

const SEARCH_PATH = "/search"

type ContentTab = "all" | "opportunities" | "events" | "jobs" | "resources"

const TYPE_TABS: { id: ContentTab; label: string; short: string }[] = [
  { id: "all", label: "All", short: "All" },
  { id: "opportunities", label: "Opportunities", short: "Opp" },
  { id: "events", label: "Events", short: "Events" },
  { id: "jobs", label: "Jobs", short: "Jobs" },
  { id: "resources", label: "Resources", short: "Res" },
]

function getSearchStorageKey(
  searchQuery: string,
  activeTab: string,
  filters: { location: string; contentType: string; industry: string },
) {
  const parts = ["search", searchQuery, activeTab, filters.location, filters.contentType, filters.industry]
  return parts.filter(Boolean).join("_")
}

function SearchContent() {
  const pathname = usePathname()
  const prevPathnameRef = useRef<string | null>(null)
  const searchParams = useSearchParams()
  useAuth()

  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return ""
    const s = getPageState(SEARCH_PATH)
    return (s?.state?.searchQuery as string) ?? ""
  })
  const [activeTab, setActiveTab] = useState<ContentTab>(() => {
    if (typeof window === "undefined") return "all"
    const s = getPageState(SEARCH_PATH)
    return (s?.state?.activeTab as ContentTab) || "all"
  })
  const [filters, setFilters] = useState(() => {
    if (typeof window === "undefined") return { location: "", contentType: "", industry: "" }
    const s = getPageState(SEARCH_PATH)
    const f = s?.state?.filters as { location?: string; contentType?: string; industry?: string } | undefined
    return f
      ? { location: f.location ?? "", contentType: f.contentType ?? "", industry: f.industry ?? "" }
      : { location: "", contentType: "", industry: "" }
  })
  const [showFilters, setShowFilters] = useState(false)
  const [initialFeed] = useState<{ items: any[]; lastId: string | null } | null>(() => {
    if (typeof window === "undefined") return null
    const s = getPageState(SEARCH_PATH)
    const q = (s?.state?.searchQuery as string) ?? ""
    const tab = (s?.state?.activeTab as string) || "all"
    const f = s?.state?.filters as { location?: string; contentType?: string; industry?: string } | undefined
    const filt = f ? { location: f.location ?? "", contentType: f.contentType ?? "", industry: f.industry ?? "" } : { location: "", contentType: "", industry: "" }
    const key = getSearchStorageKey(q, tab, filt)
    if (s?.feed && s.feed.storageKey === key) {
      return { items: (s.feed.items || []) as any[], lastId: s.feed.lastId ?? null }
    }
    if (tab !== "all" && (tab === "opportunities" || tab === "events" || tab === "jobs" || tab === "resources")) {
      const cached = getContentCache(tab as ContentCacheType)
      if (cached?.items?.length) return { items: cached.items as any[], lastId: cached.lastId }
    }
    return null
  })

  const industryOptions = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Marketing",
    "Design",
    "Sales",
    "Engineering",
    "Consulting",
    "Non-profit",
  ]

  const storageKey = useMemo(() => {
    const parts = ["search", searchQuery, activeTab, filters.location, filters.contentType, filters.industry]
    return parts.filter(Boolean).join("_")
  }, [searchQuery, activeTab, filters])

  const fetchSearchResults = useCallback(
    async (lastId: string | null) => {
      const hasActiveFilters = filters.location || filters.contentType || filters.industry
      if (!searchQuery.trim() && !hasActiveFilters) {
        return { items: [], lastId: null, hasMore: false }
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        return { items: [], lastId: null, hasMore: false }
      }

      const typeToSearch = filters.contentType || (activeTab === "all" ? "" : activeTab)
      const cacheTypeMap: Record<string, ContentCacheType> = {
        opportunity: "opportunities",
        opportunities: "opportunities",
        event: "events",
        events: "events",
        job: "jobs",
        jobs: "jobs",
        resource: "resources",
        resources: "resources",
      }
      const cacheType = typeToSearch ? cacheTypeMap[typeToSearch] : null
      if (!lastId && cacheType && !hasActiveFilters) {
        const cached = getContentCache(cacheType)
        if (cached?.items?.length) {
          const singularType = cacheType === "opportunities" ? "opportunity" : cacheType.slice(0, -1)
          const items = (cached.items as any[]).map((item: any) => ({ ...item, type: item.type || singularType }))
          return { items, lastId: cached.lastId, hasMore: true }
        }
      }

      try {
        const queryParams = new URLSearchParams()
        if (searchQuery.trim()) {
          queryParams.append("search", searchQuery)
        }
        queryParams.append("limit", "20")

        if (lastId) {
          queryParams.append("lastId", lastId)
        }

        const typeToSearchInner = filters.contentType || (activeTab === "all" ? "" : activeTab)

        if (!typeToSearchInner) {
          if (lastId) {
            return { items: [], lastId: null, hasMore: false }
          }

          const oppParams = new URLSearchParams(queryParams.toString())
          const eventParams = new URLSearchParams(queryParams.toString())
          const jobParams = new URLSearchParams(queryParams.toString())
          const resourceParams = new URLSearchParams(queryParams.toString())

          if (filters.location) {
            oppParams.append("country", filters.location)
            eventParams.append("country", filters.location)
            jobParams.append("location", filters.location)
          }

          if (filters.industry) {
            const combinedSearch = [searchQuery.trim(), filters.industry].filter(Boolean).join(" ")
            oppParams.set("search", combinedSearch)
            eventParams.set("search", combinedSearch)
            jobParams.set("search", combinedSearch)
          }

          const [opportunitiesRes, eventsRes, jobsRes, resourcesRes] = await Promise.all([
            fetch(`${backendUrl}/api/opportunities?${oppParams.toString()}`),
            fetch(`${backendUrl}/api/events?${eventParams.toString()}`),
            fetch(`${backendUrl}/api/jobs?${jobParams.toString()}`),
            fetch(`${backendUrl}/api/resources?${resourceParams.toString()}`),
          ])

          const [opportunitiesData, eventsData, jobsData, resourcesData] = await Promise.all([
            opportunitiesRes.json(),
            eventsRes.json(),
            jobsRes.json(),
            resourcesRes.json(),
          ])

          const combinedItems = [
            ...(opportunitiesData.success
              ? (opportunitiesData.data?.opportunities || []).map((i: any) => ({ ...i, type: "opportunity" }))
              : []),
            ...(eventsData.success ? (eventsData.data?.events || []).map((i: any) => ({ ...i, type: "event" })) : []),
            ...(jobsData.success ? (jobsData.data?.jobs || []).map((i: any) => ({ ...i, type: "job" })) : []),
            ...(resourcesData.success
              ? (resourcesData.data?.resources || []).map((i: any) => ({ ...i, type: "resource" }))
              : []),
          ]

          combinedItems.sort((a, b) => {
            if (a.score && b.score) return b.score - a.score
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })

          return { items: combinedItems, lastId: null, hasMore: false }
        }

        let endpoint = ""
        let dataKey = ""

        if (typeToSearchInner === "opportunity" || typeToSearchInner === "opportunities") {
          endpoint = "opportunities"
          dataKey = "opportunities"
          if (filters.location) queryParams.append("country", filters.location)
          if (filters.industry) {
            const combinedSearch = [searchQuery.trim(), filters.industry].filter(Boolean).join(" ")
            queryParams.set("search", combinedSearch)
          }
        } else if (typeToSearchInner === "event" || typeToSearchInner === "events") {
          endpoint = "events"
          dataKey = "events"
          if (filters.location) queryParams.append("country", filters.location)
          if (filters.industry) {
            const combinedSearch = [searchQuery.trim(), filters.industry].filter(Boolean).join(" ")
            if (combinedSearch) queryParams.set("search", combinedSearch)
          }
        } else if (typeToSearchInner === "job" || typeToSearchInner === "jobs") {
          endpoint = "jobs"
          dataKey = "jobs"
          if (filters.location) queryParams.append("location", filters.location)
          if (filters.industry) {
            const combinedSearch = [searchQuery.trim(), filters.industry].filter(Boolean).join(" ")
            queryParams.set("search", combinedSearch)
          }
        } else if (typeToSearchInner === "resource" || typeToSearchInner === "resources") {
          endpoint = "resources"
          dataKey = "resources"
        }

        const response = await fetch(`${backendUrl}/api/${endpoint}?${queryParams.toString()}`)
        const data = await response.json()

        if (data.success) {
          const items = (data.data?.[dataKey] || []).map((item: any) => ({
            ...item,
            type: dataKey === "opportunities" ? "opportunity" : dataKey.slice(0, -1),
          }))
          const lastId = data.data?.pagination?.lastId || (items.length > 0 ? items[items.length - 1]._id : null)
          if (dataKey === "opportunities" || dataKey === "events" || dataKey === "jobs" || dataKey === "resources") {
            setContentCache(dataKey as ContentCacheType, { items, lastId })
          }
          return {
            items,
            lastId,
            hasMore: data.data?.pagination?.hasMore || false,
          }
        }
        return { items: [], lastId: null, hasMore: false }
      } catch (error) {
        console.error("Search error:", error)
        return { items: [], lastId: null, hasMore: false }
      }
    },
    [searchQuery, activeTab, filters],
  )

  const {
    items: allResults,
    isLoading,
    hasMore,
    loadMore,
    reset: resetSearch,
    getLastId,
  } = useCursorPagination<any>({
    fetchFunction: fetchSearchResults,
    storageKey,
    resetOnMount: false,
    limit: 20,
    initialItems: initialFeed?.items,
    initialLastId: initialFeed?.lastId,
  })

  const { sentinelRef, threshold } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    itemsBeforeLoad: 5,
    estimatedItemHeight: 350,
  })

  useEffect(() => {
    const query = searchParams.get("q")
    if (query) {
      setSearchQuery(query)
      resetSearch()
    }
  }, [searchParams])

  useEffect(() => {
    const prev = prevPathnameRef.current
    prevPathnameRef.current = pathname ?? null
    if (prev === SEARCH_PATH && pathname !== SEARCH_PATH) {
      savePageState(SEARCH_PATH, {
        scrollY: typeof window !== "undefined" ? window.scrollY : 0,
        state: { searchQuery, activeTab, filters },
        feed: {
          storageKey,
          items: allResults,
          lastId: getLastId?.() ?? null,
        },
      })
    }
  }, [pathname, searchQuery, activeTab, filters, storageKey, allResults, getLastId])

  useEffect(() => {
    const s = getPageState(SEARCH_PATH)
    const scrollY = s?.scrollY
    if (typeof scrollY !== "number" || scrollY <= 0) return
    const id = requestAnimationFrame(() => {
      window.scrollTo(0, scrollY)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      resetSearch()
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, resetSearch])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    resetSearch()
  }

  const selectTypeTab = (tab: ContentTab) => {
    setActiveTab(tab)
    setFilters((f) => ({ ...f, contentType: "" }))
    resetSearch()
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    if (key === "contentType") {
      setActiveTab("all")
    }
    resetSearch()
  }

  const clearFilter = (key: string) => {
    const newFilters = { ...filters, [key]: "" }
    setFilters(newFilters)
    resetSearch()
  }

  const clearAllFilters = () => {
    setFilters({ location: "", contentType: "", industry: "" })
    resetSearch()
  }

  const totalResults = allResults.length
  const activeFiltersCount = Object.values(filters).filter((v) => v).length
  const hasQuery = Boolean(searchQuery.trim()) || activeFiltersCount > 0

  const contentTypeToTab = useMemo(
    (): Partial<Record<string, ContentTab>> => ({
      opportunity: "opportunities",
      opportunities: "opportunities",
      event: "events",
      events: "events",
      job: "jobs",
      jobs: "jobs",
      resource: "resources",
      resources: "resources",
    }),
    [],
  )

  const isTabActive = (tabId: ContentTab) => {
    if (filters.contentType) {
      return contentTypeToTab[filters.contentType] === tabId
    }
    return activeTab === tabId
  }

  const selectClass =
    "w-full min-h-11 rounded-2xl border border-border/70 bg-muted/50 px-3 py-2.5 text-body-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20"

  return (
    <PageShell fullWidth className="relative font-sans">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-28 right-0 h-80 w-80 rounded-full opacity-[0.11] dark:opacity-[0.16] blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 72%)" }}
        />
        <div
          className="absolute left-0 top-1/3 h-64 w-64 -translate-x-1/4 rounded-full opacity-[0.05] blur-3xl dark:opacity-[0.09]"
          style={{ background: "radial-gradient(circle, hsl(222 41% 38%) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.32] dark:opacity-[0.18]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.48'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-page/88 pb-3 pt-1 backdrop-blur-xl supports-[backdrop-filter]:bg-page/72">
          <div className="pt-safe">
            <div className="min-w-0">
              <p className="text-overline font-semibold uppercase tracking-[0.18em] text-muted-foreground">Discover</p>
              <h1 className="mt-1 text-display-md font-bold tracking-tight text-foreground sm:text-display-lg md:text-[2.25rem] md:leading-tight">
                Search
              </h1>
              <p className="mt-2 max-w-lg text-body-sm leading-snug text-muted-foreground sm:text-body">
                Find opportunities, events, jobs, and resources in one place.
              </p>
            </div>

            <div className="relative mt-4">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                placeholder="Keywords, skills, companies…"
                className="h-12 min-h-12 rounded-2xl border-border/70 bg-card/85 pl-12 pr-12 text-base shadow-sm placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25 sm:text-body"
                aria-label="Search content"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    resetSearch()
                  }}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <nav
              className="scrollbar-hide -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1"
              aria-label="Content type"
            >
              {TYPE_TABS.map((tab) => {
                const active = isTabActive(tab.id)
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTypeTab(tab.id)}
                    className={cn(
                      "min-h-11 shrink-0 snap-start rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
                      active
                        ? "border-primary/40 bg-primary/15 text-foreground shadow-sm ring-1 ring-primary/20"
                        : "border-border/60 bg-card/50 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                    )}
                  >
                    <span className="sm:hidden">{tab.short}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            {activeFiltersCount > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-caption font-medium text-muted-foreground">Active</span>
                {filters.contentType ? (
                  <button
                    type="button"
                    onClick={() => clearFilter("contentType")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary/35 bg-primary/10 px-2.5 py-1 text-caption font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    {filters.contentType}
                    <X className="h-3 w-3 opacity-80" aria-hidden />
                  </button>
                ) : null}
                {filters.location ? (
                  <button
                    type="button"
                    onClick={() => clearFilter("location")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-muted/60 px-2.5 py-1 text-caption font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {filters.location}
                    <X className="h-3 w-3 opacity-70" aria-hidden />
                  </button>
                ) : null}
                {filters.industry ? (
                  <button
                    type="button"
                    onClick={() => clearFilter("industry")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-muted/60 px-2.5 py-1 text-caption font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {filters.industry}
                    <X className="h-3 w-3 opacity-70" aria-hidden />
                  </button>
                ) : null}
                <Button
                  type="button"
                  onClick={clearAllFilters}
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl px-3 text-caption text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between gap-3">
              <Button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                variant="outline"
                className={cn(
                  "h-11 min-h-11 shrink-0 rounded-2xl border-border/70 bg-card/60 px-4 font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                  showFilters && "border-primary/35 bg-primary/10 text-foreground ring-1 ring-primary/15",
                )}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden />
                Filters
                {activeFiltersCount > 0 ? (
                  <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                ) : null}
              </Button>
              {hasQuery && !isLoading ? (
                <p className="truncate text-right text-caption tabular-nums text-muted-foreground">
                  {totalResults} result{totalResults === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          </div>

          {showFilters ? (
            <div className="mt-4 rounded-[1.35rem] border border-border/60 bg-card/75 p-4 shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.06)] backdrop-blur-sm sm:p-5">
              <p className="mb-3 text-overline font-semibold uppercase tracking-wider text-muted-foreground">Refine</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="search-filter-type" className="text-caption font-semibold text-foreground">
                    Content type
                  </label>
                  <select
                    id="search-filter-type"
                    value={filters.contentType}
                    onChange={(e) => handleFilterChange("contentType", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">All types (use tabs above)</option>
                    <option value="opportunity">Opportunities</option>
                    <option value="event">Events</option>
                    <option value="job">Jobs</option>
                    <option value="resource">Resources</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="search-filter-loc" className="text-caption font-semibold text-foreground">
                    Location
                  </label>
                  <select
                    id="search-filter-loc"
                    value={filters.location}
                    onChange={(e) => handleFilterChange("location", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">All locations</option>
                    <option value="Remote">Remote</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                    <option value="Canada">Canada</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="search-filter-ind" className="text-caption font-semibold text-foreground">
                    Industry
                  </label>
                  <select
                    id="search-filter-ind"
                    value={filters.industry}
                    onChange={(e) => handleFilterChange("industry", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">All industries</option>
                    {industryOptions.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <main className="pb-8 pt-5 sm:pb-10 sm:pt-6">
          {isLoading && allResults.length === 0 ? (
            <ul className="space-y-3" aria-busy="true">
              {[...Array(5)].map((_, i) => (
                <li
                  key={i}
                  className="rounded-[1.25rem] border border-border/50 bg-card/50 p-4 sm:p-5"
                >
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-muted/80" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-28 rounded-lg bg-muted/80" />
                        <div className="h-3 w-20 rounded-lg bg-muted/60" />
                      </div>
                    </div>
                    <div className="h-3.5 w-full rounded-lg bg-muted/70" />
                    <div className="h-3.5 w-4/5 rounded-lg bg-muted/60" />
                  </div>
                </li>
              ))}
            </ul>
          ) : hasQuery && totalResults === 0 ? (
            <div className="rounded-[1.35rem] border border-border/70 bg-card/90 px-6 py-14 text-center backdrop-blur-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-sm">
                <Search className="h-8 w-8 text-primary opacity-80" strokeWidth={2} aria-hidden />
              </div>
              <h2 className="text-display-sm font-bold tracking-tight text-foreground">No matches</h2>
              <p className="mx-auto mt-3 max-w-md text-body-sm leading-relaxed text-muted-foreground">
                Try different words, switch the type tabs, or loosen your filters.
              </p>
              <Button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  clearAllFilters()
                }}
                variant="outline"
                className="mt-8 h-11 rounded-2xl border-border/70 px-6"
              >
                Reset search
              </Button>
            </div>
          ) : hasQuery && totalResults > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {allResults.map((item, index) => (
                <div
                  key={item._id}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${Math.min(index, 12) * 35}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <FeedCard item={item} />
                </div>
              ))}
              <div
                ref={sentinelRef}
                style={{
                  height: "1px",
                  width: "100%",
                  marginTop: `${threshold}px`,
                }}
              />
              {isLoading && allResults.length > 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
                  <span className="sr-only">Loading more</span>
                </div>
              ) : null}
              {!hasMore && allResults.length > 0 ? (
                <p className="py-8 text-center text-body-sm text-muted-foreground">You&apos;re up to date</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-border/60 bg-card/40 px-6 py-16 text-center backdrop-blur-sm sm:py-20">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5">
                <Sparkles className="h-8 w-8 text-primary" strokeWidth={2} aria-hidden />
              </div>
              <h2 className="text-display-sm font-bold tracking-tight text-foreground sm:text-display-md">Start here</h2>
              <p className="mx-auto mt-3 max-w-md text-body-sm leading-relaxed text-muted-foreground">
                Type a keyword or open <span className="font-medium text-foreground">Filters</span> to browse by place or
                industry. Use the tabs to focus on one kind of listing.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full max-w-xs rounded-2xl border-border/70 sm:w-auto"
                  onClick={() => setShowFilters(true)}
                >
                  Open filters
                </Button>
                <Button type="button" asChild variant="ghost" className="h-11 rounded-2xl text-muted-foreground">
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </PageShell>
  )
}

function SearchFallback() {
  return (
    <PageShell fullWidth className="font-sans">
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 pt-safe">
        <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
        <p className="text-body-sm text-muted-foreground">Loading search…</p>
      </div>
    </PageShell>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  )
}
