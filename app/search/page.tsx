"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import FeedCard from "@/components/feed-card"
import type { ComponentProps } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useSearchFeed, type SearchTab } from "@/hooks/use-search-feed"
import { PageShell } from "@/components/layout/page-shell"
import { Loader2, Search, Sparkles, X } from "lucide-react"

const TYPE_TABS: { id: SearchTab; label: string; short: string }[] = [
  { id: "all", label: "All", short: "All" },
  { id: "opportunities", label: "Opportunities", short: "Opp" },
  { id: "events", label: "Events", short: "Events" },
  { id: "jobs", label: "Jobs", short: "Jobs" },
  { id: "resources", label: "Resources", short: "Res" },
]

function SearchContent() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<SearchTab>("all")

  const { items, isLoading, hasMore, error, loadMore, reset, hasQuery } =
    useSearchFeed(searchQuery, activeTab)

  const { sentinelRef, threshold } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    itemsBeforeLoad: 5,
    estimatedItemHeight: 350,
  })

  useEffect(() => {
    const q = searchParams.get("q")
    if (q) {
      setSearchQuery(q)
    }
  }, [searchParams])

  const selectTab = (tab: SearchTab) => {
    setActiveTab(tab)
  }

  const clearSearch = () => {
    setSearchQuery("")
    reset()
  }

  const activeTabLabel =
    TYPE_TABS.find((t) => t.id === activeTab)?.label ?? "All"

  return (
    <PageShell fullWidth className="relative font-sans">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-28 right-0 h-80 w-80 rounded-full opacity-[0.11] blur-3xl dark:opacity-[0.16]"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 72%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-page/88 pb-3 pt-1 backdrop-blur-xl supports-[backdrop-filter]:bg-page/72">
          <div className="pt-safe">
            <div className="min-w-0">
              <p className="text-overline font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Discover
              </p>
              <h1 className="mt-1 text-display-md font-bold tracking-tight text-foreground sm:text-display-lg">
                Search
              </h1>
              <p className="mt-2 max-w-lg text-body-sm text-muted-foreground">
                Same listings as home — search by keyword across opportunities,
                events, jobs, and resources.
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
                placeholder="Search titles, descriptions, tags…"
                className="h-12 min-h-12 rounded-2xl border-border/70 bg-card/85 pl-12 pr-12 text-base shadow-sm placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25"
                aria-label="Search content"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
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
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
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

            {hasQuery && !isLoading ? (
              <p className="mt-3 text-caption tabular-nums text-muted-foreground">
                {items.length} result{items.length === 1 ? "" : "s"}
                {activeTab !== "all" ? ` in ${activeTabLabel}` : ""}
              </p>
            ) : null}
          </div>
        </header>

        <main className="pb-8 pt-5 sm:pb-10 sm:pt-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-body-sm text-destructive">
              {error}
            </div>
          ) : null}

          {isLoading && items.length === 0 ? (
            <ul className="space-y-3" aria-busy="true">
              {[...Array(5)].map((_, i) => (
                <li
                  key={i}
                  className="rounded-[1.25rem] border border-border/50 bg-card/50 p-4 sm:p-5"
                >
                  <div className="animate-pulse space-y-4">
                    <div className="h-3.5 w-2/3 rounded-lg bg-muted/80" />
                    <div className="h-3 w-full rounded-lg bg-muted/60" />
                  </div>
                </li>
              ))}
            </ul>
          ) : hasQuery && items.length === 0 && !isLoading ? (
            <div className="rounded-[1.35rem] border border-border/70 bg-card/90 px-6 py-14 text-center">
              <Search
                className="mx-auto mb-4 h-10 w-10 text-primary opacity-80"
                aria-hidden
              />
              <h2 className="text-display-sm font-bold text-foreground">
                No matches
              </h2>
              <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">
                Try different keywords or switch to another tab (
                {activeTabLabel}).
              </p>
              <Button
                type="button"
                onClick={clearSearch}
                variant="outline"
                className="mt-6 rounded-2xl"
              >
                Clear search
              </Button>
            </div>
          ) : hasQuery && items.length > 0 ? (
            <div className="space-y-5 w-full max-w-full">
              {items.map((item, index) => (
                <div
                  key={item._id}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${Math.min(index, 12) * 35}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <FeedCard
                    item={
                      item as ComponentProps<typeof FeedCard>["item"]
                    }
                  />
                </div>
              ))}
              <div
                ref={sentinelRef}
                style={{ height: 1, width: "100%", marginTop: threshold }}
              />
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2
                    className="h-7 w-7 animate-spin text-primary"
                    aria-hidden
                  />
                </div>
              ) : null}
              {!hasMore && items.length > 0 ? (
                <p className="py-8 text-center text-body-sm text-muted-foreground">
                  End of results
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-border/60 bg-card/40 px-6 py-16 text-center sm:py-20">
              <Sparkles
                className="mx-auto mb-4 h-10 w-10 text-primary"
                aria-hidden
              />
              <h2 className="text-display-sm font-bold text-foreground">
                Start searching
              </h2>
              <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">
                Enter a keyword, then use the tabs to focus on opportunities,
                events, jobs, or resources.
              </p>
              <Button type="button" asChild variant="ghost" className="mt-6">
                <Link href="/">Back to home</Link>
              </Button>
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
