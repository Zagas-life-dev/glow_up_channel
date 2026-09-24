"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePlaylist, Playlist } from "@/contexts/playlist-context"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import PlaylistModal from "@/components/playlist-modal"
import { PlaylistCover } from "@/components/playlists/playlist-cover"
import {
  RiAddLine,
  RiMore2Line,
  RiPencilLine,
  RiDeleteBinLine,
  RiGroupLine,
  RiUserAddLine,
  RiBookmarkLine,
  RiBookmarkFill,
  RiGlobalLine,
  RiLockLine,
  RiPlayList2Fill,
  RiEyeLine,
  RiLoader4Line,
} from "react-icons/ri"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageShell } from "@/components/layout/page-shell"
import { trackPlaylistDiscover } from '@/lib/tracking'
import { useDiscoverPlaylists } from '@/hooks/use-discover-playlists'
import { formatCount, queuePlaylistImpression } from '@/lib/playlist-engagement'
import { useTranslation } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n/translate'

type TabType = "my" | "shared" | "saved" | "public"

const TAB_CONFIG: {
  id: TabType
  label: string
  count?: (ctx: { playlists: Playlist[]; sharedPlaylists: Playlist[]; savedPlaylists: Playlist[] }) => number
  authOnly?: boolean
}[] = [
  { id: "public", label: "Discover" },
  { id: "saved", label: "Saved", count: (c) => c.savedPlaylists.length, authOnly: true },
  { id: "my", label: "Mine", count: (c) => c.playlists.length, authOnly: true },
  { id: "shared", label: "Shared", count: (c) => c.sharedPlaylists.length, authOnly: true },
]

const EMPTY_COPY: Record<TabType, { title: string; body: string }> = {
  my: {
    title: "Start your first playlist",
    body: "Group jobs, events, and resources so you can revisit them in one tap.",
  },
  shared: {
    title: "No shared playlists yet",
    body: "When someone invites you to collaborate, it will show up here.",
  },
  saved: {
    title: "Nothing saved yet",
    body: "Save public playlists you love — they will live here for quick access.",
  },
  public: {
    title: "Nothing in Discover yet",
    body: "Public playlists shared by the community will show up here.",
  },
}

function PlaylistsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const {
    playlists,
    sharedPlaylists,
    savedPlaylists,
    isLoading: isLibraryLoading,
    deletePlaylist,
    fetchPlaylists,
    fetchSavedPlaylists,
    isPlaylistSaved,
    savePlaylist,
    unsavePlaylist,
  } = usePlaylist()
  const { isAuthenticated, user } = useAuth()
  const t = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>("public")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Discover is its own ranked, paged feed; the other tabs are the reader's library.
  const discover = useDiscoverPlaylists(user?._id ?? "anon", activeTab === "public")
  const isDiscover = activeTab === "public"
  const isLoading = isDiscover ? discover.isLoading && discover.playlists.length === 0 : isLibraryLoading
  const listRef = useRef<HTMLUListElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam === "my" || tabParam === "shared" || tabParam === "saved") {
      if (isAuthenticated) {
        setActiveTab(tabParam as TabType)
      } else {
        setActiveTab("public")
        router.replace("/playlists")
      }
      return
    }
    setActiveTab("public")
    if (tabParam !== null && tabParam !== "public") {
      router.replace("/playlists")
    }
  }, [searchParams, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlaylists()
      fetchSavedPlaylists()
    }
  }, [fetchPlaylists, fetchSavedPlaylists, isAuthenticated])

  /** Infinite scroll: ask for the next page a screen before the end. */
  const { loadMore } = discover
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!isDiscover || !sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: "600px 0px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isDiscover, loadMore, discover.playlists.length])

  /**
   * Impressions: a card counts as seen once half of it has been on screen. These are
   * the denominator of open rate in the ranking, so only Discover reports them — the
   * reader's own shelves are not somewhere a list competes for attention.
   */
  useEffect(() => {
    const list = listRef.current
    if (!isDiscover || !list) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = (entry.target as HTMLElement).dataset.playlistId
          if (id) queuePlaylistImpression(id)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.5 },
    )
    list.querySelectorAll<HTMLElement>("[data-playlist-id]").forEach((row) => observer.observe(row))
    return () => observer.disconnect()
  }, [isDiscover, discover.playlists])

  /**
   * Browsing Discover — the explore-and-find-more surface for playlists.
   *
   * Only the public tab reports. Landing on "Mine" is looking at your own shelf,
   * which the playlist_open on the detail page already covers. trackPlaylistDiscover
   * throttles itself, because this effect re-runs whenever the tab regains focus.
   */
  useEffect(() => {
    if (activeTab === "public") trackPlaylistDiscover()
  }, [activeTab])

  const handleDelete = async (playlist: Playlist) => {
    if (!confirm(`Delete "${playlist.name}"? This action cannot be undone.`)) return

    setDeletingId(playlist._id)
    try {
      await deletePlaylist(playlist._id)
    } catch (err) {
      console.error("Error deleting playlist:", err)
    } finally {
      setDeletingId(null)
    }
  }

  const getCurrentPlaylists = (): Playlist[] => {
    switch (activeTab) {
      case "my":
        return playlists
      case "shared":
        return sharedPlaylists
      case "saved":
        return savedPlaylists
      case "public":
        return discover.playlists
      default:
        return []
    }
  }

  const setTab = (tab: TabType) => {
    setActiveTab(tab)
    router.replace(tab === "public" ? "/playlists" : `/playlists?tab=${tab}`)
  }

  const currentPlaylists = getCurrentPlaylists()

  const isOwner = (playlist: Playlist) => {
    if (!user || !playlist.createdBy) return false
    return user._id === playlist.createdBy._id || user.email === playlist.createdBy.email
  }

  const countCtx = { playlists, sharedPlaylists, savedPlaylists }
  const visibleTabs = TAB_CONFIG.filter((t) => !(t.authOnly && !isAuthenticated))
  const empty = EMPTY_COPY[activeTab]

  return (
    <PageShell fullWidth className="relative font-sans">
      <div className="mx-auto max-w-3xl">
        <header className="sticky top-0 z-30 -mx-4 border-b border-border bg-up-bar px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-3 pb-4 pt-4 pt-safe">
            <div className="min-w-0">
              <h1 className="font-display text-[26px] font-bold leading-[1.15] text-foreground sm:text-[34px]">
                Playlists
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Opportunities, jobs, and events — grouped the way you think about them.
              </p>
            </div>
            {isAuthenticated ? (
              <Button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="h-11 w-11 shrink-0 rounded-full p-0 transition-transform active:scale-95 sm:w-auto sm:px-5"
                aria-label="New playlist"
              >
                <RiAddLine className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">New</span>
              </Button>
            ) : null}
          </div>

          {/* Segmented control — four tabs share the width on mobile, no horizontal scroll. */}
          <nav className="mb-3 flex w-full gap-1 rounded-full bg-up-fill p-1 sm:w-max" aria-label="Playlist categories">
            {visibleTabs.map((tab) => {
              const count = tab.count?.(countCtx) ?? 0
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold transition-colors sm:flex-none sm:px-4",
                    active
                      ? "bg-up-solid text-up-on-solid"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {tab.count && count > 0 ? (
                    <span className="text-xs tabular-nums opacity-70">
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>
        </header>

        <main className="pb-8 pt-2">
          {isLoading ? (
            <ul className="overflow-hidden rounded-up-xl border border-border bg-card divide-y divide-up-hairline" aria-busy="true">
              {[...Array(6)].map((_, i) => (
                <li key={i} className="flex animate-pulse items-center gap-3.5 px-[18px] py-3.5">
                  <div className="h-14 w-14 shrink-0 rounded-up-lg bg-up-fill" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded-full bg-up-fill" />
                    <div className="h-3 w-3/5 rounded-full bg-up-hairline" />
                  </div>
                </li>
              ))}
            </ul>
          ) : currentPlaylists.length === 0 ? (
            <div className="mx-auto mt-8 max-w-sm animate-fade-in-up rounded-up-xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-up-md bg-up-fill">
                {activeTab === "shared" ? (
                  <RiUserAddLine className="h-5 w-5 text-muted-foreground" />
                ) : activeTab === "saved" ? (
                  <RiBookmarkLine className="h-5 w-5 text-muted-foreground" />
                ) : activeTab === "public" ? (
                  <RiGlobalLine className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <RiPlayList2Fill className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">{empty.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{empty.body}</p>
              {isAuthenticated && (activeTab === "my" || activeTab === "public") ? (
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 h-11 px-6"
                >
                  <RiAddLine className="mr-2 h-4 w-4" />
                  Create playlist
                </Button>
              ) : null}
            </div>
          ) : (
            <>
            <ul ref={listRef} className="overflow-hidden rounded-up-xl border border-border bg-card divide-y divide-up-hairline">
              {currentPlaylists.map((playlist, index) => {
                const acceptedCollaborators =
                  playlist.collaborators?.filter((c) => c.status === "accepted") || []
                const canManage = activeTab === "my" && isOwner(playlist)
                const saved = isPlaylistSaved(playlist._id)
                const byline =
                  activeTab !== "my" && playlist.createdBy
                    ? playlist.createdBy.firstName || playlist.createdBy.email?.split("@")[0] || "Unknown"
                    : null

                return (
                  <li
                    key={playlist._id}
                    data-playlist-id={isDiscover ? playlist._id : undefined}
                    className={cn(
                      "group relative animate-fade-in-up",
                      deletingId === playlist._id && "pointer-events-none opacity-40",
                    )}
                    style={{
                      // Stagger by position within its page, so page 3 doesn't wait 800ms to appear.
                      animationDelay: `${Math.min(index % 20, 8) * 35}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <div className="flex items-center gap-3.5 px-[18px] py-3.5 transition-colors group-hover:bg-up-fill">
                      <PlaylistCover
                        seed={playlist._id}
                        types={(playlist.items ?? []).map((item) => item.contentType)}
                        empty={(playlist.itemCount || 0) === 0}
                        imageUrl={playlist.coverImage}
                        className="h-14 w-14 transition-transform duration-200 group-hover:scale-[1.04] sm:h-16 sm:w-16"
                      />

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-bold leading-snug text-foreground">
                          <Link
                            href={`/playlists/${playlist._id}`}
                            className="line-clamp-1 transition-colors before:absolute before:inset-0 group-hover:text-up-orange-ink"
                          >
                            {playlist.name}
                          </Link>
                        </h3>

                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            {playlist.isPublic ? (
                              <RiGlobalLine className="h-3.5 w-3.5" />
                            ) : (
                              <RiLockLine className="h-3.5 w-3.5" />
                            )}
                            {playlist.isPublic ? "Public" : "Private"}
                          </span>
                          <span aria-hidden>·</span>
                          <span className="tabular-nums">{playlist.itemCount || 0} items</span>
                          {(playlist.metrics?.viewCount ?? 0) > 0 ? (
                            <>
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <RiEyeLine className="h-3.5 w-3.5" aria-hidden />
                                {formatCount(playlist.metrics?.viewCount)}
                                <span className="sr-only">views</span>
                              </span>
                            </>
                          ) : null}
                          {(playlist.saveCount ?? 0) > 0 ? (
                            <>
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <RiBookmarkLine className="h-3.5 w-3.5" aria-hidden />
                                {formatCount(playlist.saveCount)}
                                <span className="sr-only">saves</span>
                              </span>
                            </>
                          ) : null}
                          {acceptedCollaborators.length > 0 ? (
                            <>
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-1">
                                <RiGroupLine className="h-3.5 w-3.5" />
                                {acceptedCollaborators.length + 1}
                              </span>
                            </>
                          ) : null}
                          {byline ? (
                            <>
                              <span aria-hidden>·</span>
                              <span className="truncate">{byline}</span>
                            </>
                          ) : null}
                        </p>

                        {playlist.description ? (
                          <p className="mt-1 line-clamp-1 text-[13px] text-muted-foreground/80">
                            {playlist.description}
                          </p>
                        ) : null}

                        {isDiscover && playlist.reason ? (
                          <p className="mt-1 text-[12px] font-bold text-up-orange-ink">
                            {t(`reasons.${playlist.reason}` as TranslationKey)}
                          </p>
                        ) : null}
                      </div>

                      {/* One secondary control per row: save for lists you don't own, manage for the ones you do. */}
                      <div className="relative z-10 flex shrink-0 items-center">
                        {canManage ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                                aria-label={`Actions for ${playlist.name}`}
                              >
                                <RiMore2Line className="h-5 w-5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[10rem]">
                              <DropdownMenuItem
                                onClick={() => setEditingPlaylist(playlist)}
                                className="cursor-pointer rounded-lg"
                              >
                                <RiPencilLine className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(playlist)}
                                className="cursor-pointer rounded-lg text-destructive focus:text-destructive"
                              >
                                <RiDeleteBinLine className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : isAuthenticated && activeTab !== "shared" ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                if (saved) await unsavePlaylist(playlist._id)
                                else await savePlaylist(playlist._id)
                                // Keep the card's count in step without refetching the feed.
                                discover.patch(playlist._id, (p) => ({
                                  ...p,
                                  saveCount: Math.max(0, (p.saveCount ?? 0) + (saved ? -1 : 1)),
                                }))
                              } catch (err) {
                                console.error(err)
                              }
                            }}
                            aria-pressed={saved}
                            aria-label={saved ? `Unsave ${playlist.name}` : `Save ${playlist.name}`}
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                              saved
                                ? "text-foreground hover:bg-card"
                                : "text-muted-foreground hover:bg-card hover:text-foreground",
                            )}
                          >
                            {saved ? <RiBookmarkFill className="h-5 w-5" /> : <RiBookmarkLine className="h-5 w-5" />}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {isDiscover ? (
              <div ref={sentinelRef} className="flex min-h-16 items-center justify-center py-6" aria-live="polite">
                {discover.isLoadingMore ? (
                  <RiLoader4Line className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading more playlists" />
                ) : discover.error ? (
                  <button
                    type="button"
                    onClick={discover.reload}
                    className="min-h-11 rounded-full px-4 text-sm font-bold text-up-orange-ink hover:bg-up-orange-tint"
                  >
                    Try again
                  </button>
                ) : !discover.hasMore && currentPlaylists.length > 20 ? (
                  <p className="text-[13px] text-muted-foreground">You&apos;ve reached the end — refresh for a new mix.</p>
                ) : null}
              </div>
            ) : null}
            </>
          )}
        </main>
      </div>

      <PlaylistModal
        isOpen={showCreateModal || editingPlaylist !== null}
        onClose={() => {
          setShowCreateModal(false)
          setEditingPlaylist(null)
        }}
        editPlaylist={editingPlaylist || undefined}
      />
    </PageShell>
  )
}

export default function PlaylistsPage() {
  return (
    <Suspense fallback={null}>
      <PlaylistsPageInner />
    </Suspense>
  )
}
