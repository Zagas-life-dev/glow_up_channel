"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import AdSlot from "@/components/ad-slot"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { hasPremiumAccess } from "@/lib/roles"
import ApiClient, { Channel, type PremiumPlaylistSummary } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { PageShell } from "@/components/layout/page-shell"
import { Hash, AlertTriangle, Plus } from "lucide-react"
import { RiVipCrownLine } from "react-icons/ri"
import { ChannelsSurface } from "./_components/channels-surface"

type FilterTab = "all" | "public" | "private" | "pro" | "mine"

const PREMIUM_FETCH_LIMIT = 100
const PREMIUM_PAGE_SIZE = 20

export default function ChannelsPage() {
  const { isAuthenticated, user } = useAuth()
  const canCreateChannel = hasPremiumAccess({ isPremium: user?.isPremium, role: user?.role })
  /** Pro tab + premium playlists: paying subscribers only (not admins without premium). */
  const isPremiumSubscriber = user?.isPremium === true
  const canShowProTab = isAuthenticated && isPremiumSubscriber

  const filterTabs = useMemo(() => {
    const rows: { id: FilterTab; label: string; short: string }[] = [
      { id: "all", label: "All", short: "All" },
      { id: "public", label: "Public", short: "Public" },
      { id: "private", label: "Private", short: "Private" },
    ]
    if (canShowProTab) {
      rows.push({ id: "pro", label: "Pro", short: "Pro" })
    }
    rows.push({ id: "mine", label: "Mine", short: "Mine" })
    return rows
  }, [canShowProTab])

  const [channels, setChannels] = useState<Channel[]>([])
  const [premiumPlaylists, setPremiumPlaylists] = useState<PremiumPlaylistSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterTab>("all")

  useEffect(() => {
    if (filter === "pro" && !canShowProTab) {
      setFilter("all")
      setPage(1)
    }
  }, [filter, canShowProTab])

  useEffect(() => {
    setPage(1)
  }, [search, filter])

  useEffect(() => {
    if (filter !== "pro") return
    let cancelled = false
    const loadPremium = async () => {
      if (!canShowProTab) {
        setPremiumPlaylists([])
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        setError(null)
        const data = await ApiClient.getPremiumPlaylists({ page: 1, limit: PREMIUM_FETCH_LIMIT })
        if (!cancelled) {
          setPremiumPlaylists(data.playlists || [])
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError((err as { message?: string })?.message || "Failed to load premium playlists")
          setPremiumPlaylists([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadPremium()
    return () => {
      cancelled = true
    }
  }, [filter, canShowProTab])

  useEffect(() => {
    if (filter === "pro") return
    let cancelled = false
    const loadChannels = async () => {
      try {
        setLoading(true)
        setError(null)
        const type =
          filter === "public" ? "public" : filter === "private" ? "private" : undefined
        const data = await ApiClient.getChannels({
          page,
          limit: 20,
          type: filter === "mine" ? undefined : type,
          search: search || undefined,
        })
        if (!cancelled) {
          const all = data.channels
          setChannels(filter === "mine" ? all.filter((c) => c.isOwner) : all)
          setTotalPages(data.totalPages)
        }
      } catch (err: unknown) {
        if (!cancelled) setError((err as { message?: string })?.message || "Failed to load channels")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadChannels()
    return () => {
      cancelled = true
    }
  }, [page, filter, search])

  const filteredPremiumPlaylists = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return premiumPlaylists
    return premiumPlaylists.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.hashtags || []).some((h) => h.toLowerCase().includes(q)),
    )
  }, [premiumPlaylists, search])

  const premiumListTotalPages = Math.max(1, Math.ceil(filteredPremiumPlaylists.length / PREMIUM_PAGE_SIZE))

  const paginatedPremiumPlaylists = useMemo(() => {
    const start = (page - 1) * PREMIUM_PAGE_SIZE
    return filteredPremiumPlaylists.slice(start, start + PREMIUM_PAGE_SIZE)
  }, [filteredPremiumPlaylists, page])

  useEffect(() => {
    if (filter !== "pro") return
    if (page > premiumListTotalPages) setPage(Math.max(1, premiumListTotalPages))
  }, [filter, page, premiumListTotalPages])

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const showPagination = filter === "pro" ? premiumListTotalPages > 1 : totalPages > 1
  const paginationPage = page
  const paginationTotal = filter === "pro" ? premiumListTotalPages : totalPages

  return (
    <ChannelsSurface withAtmosphere>
      <PageShell fullWidth className="relative">
        <div className="mx-auto max-w-5xl">
          <header className="sticky top-0 z-30 border-b border-border/50 bg-page/85 pb-3 pt-1 backdrop-blur-xl supports-[backdrop-filter]:bg-page/70">
            <div className="flex items-end justify-between gap-3 pt-safe">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
                  Sub-communities
                </p>
                <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  Channels
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-snug text-muted-foreground">
                  {filter === "pro"
                    ? "Premium playlists curated for subscribers — open any list to explore items."
                    : "Topic-focused spaces for conversations, posts, and members who care about the same things."}
                </p>
              </div>
              {isAuthenticated && canCreateChannel ? (
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Button
                    type="button"
                    asChild
                    size="icon"
                    className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95 sm:hidden"
                    aria-label="Create channel"
                  >
                    <Link href="/channels/create">
                      <Plus className="h-6 w-6" strokeWidth={2.5} />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    asChild
                    className="hidden h-11 rounded-2xl bg-primary px-5 text-primary-foreground shadow-md shadow-primary/20 sm:inline-flex"
                  >
                    <Link href="/channels/create">
                      <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
                      Create channel
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>

            <nav
              className="scrollbar-hide -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
              aria-label="Filter channels"
            >
              {filterTabs.map((tab) => {
                const active = filter === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setFilter(tab.id)
                      setPage(1)
                    }}
                    className={cn(
                      "min-h-11 shrink-0 snap-start rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
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

            <form onSubmit={onSearchSubmit} className="mt-3">
              <Input
                placeholder={filter === "pro" ? "Search premium playlists…" : "Search channels…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 rounded-2xl border-border/70 bg-card/80 text-base sm:text-sm"
              />
            </form>
          </header>

          <main className="pb-6 pt-5 sm:pb-8 sm:pt-6">
            {loading ? (
              <ul className="space-y-3" aria-busy="true">
                {[...Array(5)].map((_, i) => (
                  <li key={i} className="h-[4.75rem] animate-pulse rounded-[1.25rem] border border-border/50 bg-card/50" />
                ))}
              </ul>
            ) : error ? (
              <div className="rounded-[1.35rem] border border-destructive/25 bg-card/90 px-6 py-10 text-center backdrop-blur-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Something went wrong</h2>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </div>
            ) : filter === "pro" ? (
              paginatedPremiumPlaylists.length === 0 ? (
                <div className="rounded-[1.35rem] border border-border/70 bg-card/90 px-6 py-12 text-center backdrop-blur-sm animate-fade-in-up">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                    <RiVipCrownLine className="h-7 w-7 text-amber-600 dark:text-amber-400" aria-hidden />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">No premium playlists</h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
                    {search.trim()
                      ? "Nothing matches your search. Try different keywords."
                      : "There are no premium playlists yet. Check back later."}
                  </p>
                  <Button type="button" asChild variant="outline" className="mt-8 h-11 rounded-2xl">
                    <Link href="/playlists?tab=premium">Open in Playlists</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <ul className="space-y-3 sm:space-y-4">
                    {paginatedPremiumPlaylists.map((pl, index) => (
                      <Fragment key={pl._id}>
                      <li
                        className="animate-fade-in-up"
                        style={{
                          animationDelay: `${Math.min(index, 10) * 40}ms`,
                          animationFillMode: "both",
                        }}
                      >
                        <Link
                          href={`/playlists/${encodeURIComponent(pl._id)}`}
                          className="group flex min-h-[4.5rem] items-center gap-3 rounded-[1.25rem] border border-border/60 bg-card/70 p-3 backdrop-blur-sm transition-all duration-200 active:scale-[0.99] sm:gap-4 sm:p-4 sm:hover:border-amber-500/30 sm:hover:bg-card"
                        >
                          <div className="relative h-14 w-14 shrink-0 sm:h-[3.75rem] sm:w-[3.75rem]">
                            <div className="absolute left-0 top-1.5 h-11 w-11 rounded-2xl border border-border/60 bg-muted/70 sm:h-12 sm:w-12" />
                            <div className="absolute left-1.5 top-0.5 h-11 w-11 rounded-2xl border border-amber-500/25 bg-amber-500/10 sm:h-12 sm:w-12" />
                            <div className="absolute left-3 top-0 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/25 to-amber-600/5 shadow-sm transition-transform duration-200 group-hover:scale-[1.04] sm:h-12 sm:w-12">
                              <RiVipCrownLine className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-bold text-foreground transition-colors group-hover:text-primary sm:text-lg">
                                <span className="line-clamp-1">{pl.name}</span>
                              </h2>
                              <span className="rounded-lg border border-amber-500/40 bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-400">
                                Premium
                              </span>
                            </div>
                            {pl.description ? (
                              <p className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-1">{pl.description}</p>
                            ) : null}
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {pl.itemCount} item{pl.itemCount === 1 ? "" : "s"}
                              {pl.createdBy?.firstName ? ` · ${pl.createdBy.firstName}` : ""}
                            </p>
                          </div>
                        </Link>
                      </li>
                      {(index + 1) % 5 === 0 && (
                        <li>
                          <AdSlot variant="banner" />
                        </li>
                      )}
                      </Fragment>
                    ))}
                  </ul>
                  {showPagination ? (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={paginationPage <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="h-11 min-w-[6.5rem] rounded-xl border-border/70"
                      >
                        Previous
                      </Button>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {paginationPage} / {paginationTotal}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={paginationPage >= paginationTotal}
                        onClick={() => setPage((p) => p + 1)}
                        className="h-11 min-w-[6.5rem] rounded-xl border-border/70"
                      >
                        Next
                      </Button>
                    </div>
                  ) : null}
                </>
              )
            ) : channels.length === 0 ? (
              <div className="rounded-[1.35rem] border border-border/70 bg-card/90 px-6 py-12 text-center backdrop-blur-sm animate-fade-in-up">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                  <Hash className="h-7 w-7 text-primary" strokeWidth={2} aria-hidden />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">No channels yet</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
                  {isAuthenticated
                    ? "Try another filter or be the first to start a channel for your topic."
                    : "Sign in to discover more, or adjust your search."}
                </p>
                {isAuthenticated && canCreateChannel ? (
                  <Button type="button" asChild className="mt-8 h-11 rounded-2xl px-8">
                    <Link href="/channels/create">Create a channel</Link>
                  </Button>
                ) : null}
                {isAuthenticated && !canCreateChannel ? (
                  <p className="mt-6 text-xs text-muted-foreground">
                    <Link href="/premium" className="font-medium text-primary hover:underline">
                      Upgrade to Premium
                    </Link>{" "}
                    to create channels.
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <ul className="space-y-3 sm:space-y-4">
                  {channels.map((channel, index) => (
                    <Fragment key={channel._id}>
                    <li
                      className="animate-fade-in-up"
                      style={{
                        animationDelay: `${Math.min(index, 10) * 40}ms`,
                        animationFillMode: "both",
                      }}
                    >
                      <Link
                        href={`/channels/${encodeURIComponent(channel.slug)}`}
                        className="group flex min-h-[4.5rem] items-center gap-3 rounded-[1.25rem] border border-border/60 bg-card/70 p-3 backdrop-blur-sm transition-all duration-200 active:scale-[0.99] sm:gap-4 sm:p-4 sm:hover:border-primary/25 sm:hover:bg-card"
                      >
                        <div className="relative h-14 w-14 shrink-0 sm:h-[3.75rem] sm:w-[3.75rem]">
                          <div className="absolute left-0 top-1.5 h-11 w-11 rounded-2xl border border-border/60 bg-muted/70 sm:h-12 sm:w-12" />
                          <div className="absolute left-1.5 top-0.5 h-11 w-11 rounded-2xl border border-primary/25 bg-primary/10 sm:h-12 sm:w-12" />
                          <div className="absolute left-3 top-0 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/25 to-primary/5 shadow-sm transition-transform duration-200 group-hover:scale-[1.04] sm:h-12 sm:w-12">
                            <Hash className="h-5 w-5 text-primary sm:h-6 sm:w-6" strokeWidth={2.25} />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-foreground transition-colors group-hover:text-primary sm:text-lg">
                              <span className="line-clamp-1">{channel.name}</span>
                            </h2>
                            <span
                              className={cn(
                                "rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                channel.type === "public"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : channel.type === "pro"
                                    ? "border-amber-500/40 bg-amber-500/12 text-amber-900 dark:text-amber-400"
                                    : "border-border/70 bg-muted/60 text-muted-foreground",
                              )}
                            >
                              {channel.type === "pro" ? "Pro" : channel.type}
                            </span>
                            {channel.isOwner ? (
                              <span className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                Owner
                              </span>
                            ) : null}
                          </div>
                          {channel.description ? (
                            <p className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-1">{channel.description}</p>
                          ) : null}
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {channel.memberCount} member{channel.memberCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </Link>
                    </li>
                    {(index + 1) % 5 === 0 && (
                      <li>
                        <AdSlot variant="banner" />
                      </li>
                    )}
                    </Fragment>
                  ))}
                </ul>

                {showPagination ? (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={paginationPage <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="h-11 min-w-[6.5rem] rounded-xl border-border/70"
                    >
                      Previous
                    </Button>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {paginationPage} / {paginationTotal}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={paginationPage >= paginationTotal}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-11 min-w-[6.5rem] rounded-xl border-border/70"
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </main>
        </div>
      </PageShell>
    </ChannelsSurface>
  )
}
