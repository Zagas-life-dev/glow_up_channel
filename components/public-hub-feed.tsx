"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import FeedCard from "@/components/feed-card"
import FeedContainer from "@/components/feed-container"
import FeedSponsoredSlot from "@/components/feed-sponsored-slot"
import ErrorState from "@/components/error-state"
import SearchBar from "@/components/search-bar"
import PublicHubDisclaimer from "@/components/public-hub-disclaimer"
import { PageShell } from "@/components/layout/page-shell"
import { FeedCardSkeleton } from "@/components/skeletons/feed-card-skeleton"
import { buildFeedWithSponsored } from "@/lib/feed-ads"
import { normalizeFeedListItem } from "@/lib/feed-content-type"
import { getFeedSessionSeed } from "@/lib/feed-session-seed"
import { isExtremePromotion, isPromoted } from "@/lib/promotion-boost"
import {
  MAX_EXTREME_IN_SPONSORED_TOP,
  enforcePromotedCaps,
  leadWithExtreme,
  railCarries,
} from "@/lib/promotion-placement"
import { fetchPublicHubPage, type HomeListType } from "@/lib/fetch-public-hub-page"
import { getPageState, savePageState } from "@/lib/page-state-session"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

/** Per-hub copy and styling. Everything else on these pages is identical. */
export interface PublicHubConfig {
  type: HomeListType
  /** Route this hub lives at, e.g. "/jobs". Keys the session page state. */
  path: string
  heading: string
  /** Singular noun for prose: "job", "event". Used by the disclaimer. */
  noun: string
  subheading: string
  searchPlaceholder: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  /** Tailwind classes for the header icon tile. */
  iconClassName: string
  tileClassName: string
  suggestionTags: string[]
}

const SEARCH_DEBOUNCE_MS = 300

/**
 * The public hub pages: /opportunities, /jobs, /events, /resources.
 *
 * One component behind all four, because they differ only in copy, icon, and
 * which list API they read. Each route's `hub-client` is now a config object
 * and a render of this.
 *
 * Structurally this is the signed-in home feed: the same `FeedCard`, the same
 * `useCursorPagination` + `useInfiniteScroll` pair over the same 20-item cursor
 * contract, the same sponsored slots, the same session scroll restore. What
 * differs is where the items come from and how they are ordered — the public
 * list API rather than the recommendation endpoint, ordered by
 * `public-hub-order` rather than by a score. Hence the disclaimer.
 *
 * These pages are public in the strict sense: no auth header is sent and
 * nothing waits on auth resolving, so the first request goes out immediately
 * and a signed-in reader sees exactly what a signed-out one does.
 */
export default function PublicHubFeed({ config }: { config: PublicHubConfig }) {
  const {
    type,
    path,
    heading,
    noun,
    subheading,
    searchPlaceholder,
    icon: Icon,
    iconClassName,
    tileClassName,
    suggestionTags,
  } = config

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

  const [searchInput, setSearchInput] = useState(() => searchParams.get("tag") ?? "")
  /** The debounced term actually sent to the API. */
  const [activeSearch, setActiveSearch] = useState(searchInput)
  const [promoted, setPromoted] = useState<Record<string, unknown>[]>([])

  // Restore a feed left behind by an earlier visit in this session. Only the
  // unsearched list is ever restored — a saved search would strand the reader
  // in results they no longer have the query for.
  const [restored] = useState<{ items: unknown[]; lastId: string | null } | null>(() => {
    if (typeof window === "undefined") return null
    const saved = getPageState(path)
    if (!saved?.feed || saved.feed.storageKey !== `hub_${type}`) return null
    if (saved.state?.search) return null
    return { items: saved.feed.items ?? [], lastId: saved.feed.lastId ?? null }
  })
  const restoredFromSessionRef = useRef(Boolean(restored?.items?.length))

  useEffect(() => {
    const tag = searchParams.get("tag")
    if (tag) {
      setSearchInput(tag)
      setActiveSearch(tag)
    }
  }, [searchParams])

  useEffect(() => {
    const timer = setTimeout(() => setActiveSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchPage = useCallback(
    async (cursorLastId: string | null) => {
      if (!backendUrl) {
        throw new Error("Backend URL is not configured")
      }
      return fetchPublicHubPage({
        type,
        cursorLastId,
        backendUrl,
        search: activeSearch,
        sessionSeed: getFeedSessionSeed(),
      })
    },
    [backendUrl, type, activeSearch],
  )

  const {
    items,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    loadMore,
    reset,
    getLastId,
  } = useCursorPagination<any>({
    fetchFunction: fetchPage,
    storageKey: `hub_${type}`,
    initialItems: restored?.items as any[] | undefined,
    initialLastId: restored?.lastId,
  })

  const { sentinelRef, threshold } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    itemsBeforeLoad: 5,
    estimatedItemHeight: 350,
  })

  // Re-run from page one when the search term changes. Skipped on mount, where
  // the hook has already issued (or restored) the first page — running it there
  // too would fire every visit's first request twice.
  const searchMountedRef = useRef(false)
  useEffect(() => {
    if (!searchMountedRef.current) {
      searchMountedRef.current = true
      return
    }
    restoredFromSessionRef.current = false
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the term changes
  }, [activeSearch])

  // Promoted placements for this content type, deferred a tick so the listing
  // request gets the connection first.
  useEffect(() => {
    if (!backendUrl) return
    const id = setTimeout(() => {
      // Optional auth: with a token the category rail ranks promotions against
      // the reader's profile; without one it still answers, unpersonalised.
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      const headers: HeadersInit = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      fetch(`${backendUrl}/api/promoted/${type}?limit=20`, { headers })
        .then((res) => (res.ok ? res.json() : { success: false }))
        .then((data) => {
          const rows = data?.success ? data?.data?.[type] : null
          if (Array.isArray(rows)) setPromoted(rows)
        })
        .catch(() => {})
    }, 0)
    return () => clearTimeout(id)
  }, [backendUrl, type])

  // The per-type promoted endpoints return bare documents with no `type` field,
  // which is what the sponsored slot routes its detail link on. Stamping it
  // through the same normalizer the listings use also gives these cards the
  // card fields the rest of the feed has.
  //
  // Anything already in the listing is dropped. The list endpoints now flag
  // promoted rows themselves, and the hub orderer pulls them toward the top, so
  // a promotion that is on this page inline would otherwise be drawn a second
  // time in a sponsored slot a few rows below — the same listing twice, both
  // labelled "Sponsored". The rail's job is what the listing did *not* surface,
  // which is exactly the set left after this filter.
  /** This session's draw, read once. See the twin in `home-client`. */
  const sessionSeed = useMemo(() => getFeedSessionSeed(), [])

  /**
   * The inline list, with a live extreme campaign pulled to the top row.
   *
   * `fetchPublicHubPage` already leads with it on the first page, so on that
   * page this is a no-op. It is restated here because this component also
   * renders lists it did not fetch — a session restore, and the pages appended
   * by infinite scroll, both of which arrive as one array through `items`.
   *
   * Nothing steps out of the list any more. This used to withhold an extreme
   * campaign whose coin came up "sponsored", handing the listing to the rail
   * instead; the coin now only decides whether the rail carries it *as well*.
   */
  const routedItems = useMemo(
    () => leadWithExtreme(items, { isExtreme: isExtremePromotion, sessionSeed }),
    [items, sessionSeed],
  )

  const promotedCards = useMemo(() => {
    // Deduped against what the list actually renders — except for an extreme
    // campaign whose coin picked the rail this session, which is carried in
    // both places on purpose. See `railCarries`.
    const onPage = new Set(routedItems.map((item) => item._id))
    const cards = promoted
      .map((row) => normalizeFeedListItem(type, row))
      .filter(
        (card) =>
          !onPage.has(card._id) ||
          railCarries(card, sessionSeed, isExtremePromotion),
      )

    // No combined cap: the rail is paid placement by definition, so the only
    // question is how much of it one tier may hold.
    return enforcePromotedCaps(cards, {
      isPromoted,
      isExtreme: isExtremePromotion,
      maxExtreme: MAX_EXTREME_IN_SPONSORED_TOP,
    })
  }, [promoted, type, routedItems, sessionSeed])

  // Hand the feed back to the next visit in this session, so returning from a
  // detail page lands on the same list at the same scroll position rather than
  // a freshly drawn one.
  const prevPathnameRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevPathnameRef.current
    prevPathnameRef.current = pathname ?? null
    if (prev === path && pathname !== path) {
      savePageState(path, {
        scrollY: typeof window !== "undefined" ? window.scrollY : 0,
        state: { search: activeSearch },
        feed: {
          storageKey: `hub_${type}`,
          items,
          lastId: getLastId?.() ?? null,
        },
      })
    }
  }, [pathname, path, type, activeSearch, items, getLastId])

  // Restore scroll only for a session-restored list, never for a fresh load.
  const scrollRestoredRef = useRef(false)
  useEffect(() => {
    if (scrollRestoredRef.current || !restoredFromSessionRef.current) return
    const saved = getPageState(path)
    const scrollY = saved?.scrollY
    if (typeof scrollY !== "number" || scrollY <= 0 || items.length === 0) return

    let timeoutId: ReturnType<typeof setTimeout>
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        timeoutId = setTimeout(() => {
          window.scrollTo(0, scrollY)
          scrollRestoredRef.current = true
        }, 80)
      })
    })
    return () => {
      cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [items.length, path])

  // True only while there is nothing on screen yet. Paging in more keeps the
  // existing cards up and uses the skeletons below the sentinel instead.
  const feedLoading = (isLoading || isRefreshing) && items.length === 0
  const showError = Boolean(error) && items.length === 0

  return (
    <PageShell fullWidth>
      <div className="mx-auto max-w-2xl pb-[max(5rem,env(safe-area-inset-bottom)+4.5rem)] pt-4 sm:pb-10 sm:pt-6">
        <header className="mb-5">
          <div className="mb-4 flex items-center gap-3">
            <div
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${tileClassName}`}
            >
              <Icon className={`h-5 w-5 ${iconClassName}`} aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">{heading}</h1>
              <p className="text-sm text-muted-foreground">{subheading}</p>
            </div>
          </div>

          <div className="mb-3">
            <SearchBar
              value={searchInput}
              onValueChange={setSearchInput}
              placeholder={searchPlaceholder}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Popular:</span>
            {suggestionTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchInput(tag)}
                className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                {tag}
              </button>
            ))}
          </div>
        </header>

        <PublicHubDisclaimer label={noun} />

        {activeSearch && !feedLoading && !showError && (
          <p className="mb-4 text-sm text-muted-foreground">
            {items.length} result{items.length === 1 ? "" : "s"} for{" "}
            <span className="font-semibold text-foreground">
              &ldquo;{activeSearch}&rdquo;
            </span>
          </p>
        )}

        {showError ? (
          <ErrorState isNetworkError onRetry={reset} />
        ) : (
          <>
            {/* Sponsored slots are for browsing, not for search: a query is a
                request for specific listings, and padding the answer with
                placements that do not match it is noise. */}
            {!activeSearch && items.length > 0 ? (
              <div className="w-full max-w-full space-y-5">
                {buildFeedWithSponsored(routedItems, promotedCards, { postsBetween: 4 }).map(
                  (entry) =>
                    entry.type === "post" ? (
                      <FeedCard key={entry.post._id} item={entry.post} />
                    ) : (
                      <FeedSponsoredSlot
                        key={entry.key}
                        kind={entry.kind}
                        content={entry.kind === "promoted" ? (entry.content as any) : undefined}
                      />
                    ),
                )}
              </div>
            ) : (
              <FeedContainer
                items={items}
                loading={feedLoading}
                skeletonCount={6}
                loadingMessage={`Loading ${heading.toLowerCase()}…`}
                emptyMessage={
                  activeSearch
                    ? `Nothing matches “${activeSearch}”. Try a different search.`
                    : `No ${heading.toLowerCase()} are listed right now. Check back soon.`
                }
              />
            )}

            <div
              ref={sentinelRef}
              style={{ height: "1px", width: "100%", marginTop: `${threshold}px` }}
            />

            {isLoading && items.length > 0 && (
              <div className="space-y-4 pt-4">
                <FeedCardSkeleton />
                <FeedCardSkeleton />
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                You&apos;ve reached the end
              </p>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
