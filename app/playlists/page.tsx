"use client"

import { useState, useEffect, Suspense } from "react"
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
} from "react-icons/ri"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageShell } from "@/components/layout/page-shell"

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
    publicPlaylists,
    sharedPlaylists,
    savedPlaylists,
    isLoading,
    deletePlaylist,
    fetchPublicPlaylists,
    fetchPlaylists,
    fetchSavedPlaylists,
    isPlaylistSaved,
    savePlaylist,
    unsavePlaylist,
  } = usePlaylist()
  const { isAuthenticated, user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("public")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    fetchPublicPlaylists()
    if (isAuthenticated) {
      fetchPlaylists()
      fetchSavedPlaylists()
    }
  }, [fetchPublicPlaylists, fetchPlaylists, fetchSavedPlaylists, isAuthenticated])

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
        return publicPlaylists
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
      {/* A single soft wash at the top — the page's only decoration. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 opacity-70"
        style={{ background: "linear-gradient(to bottom, hsl(var(--primary) / 0.07), transparent)" }}
      />

      <div className="mx-auto max-w-3xl">
        <header className="sticky top-0 z-30 -mx-4 border-b border-border/50 bg-page/85 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-page/70 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-3 pb-4 pt-4 pt-safe">
            <div className="min-w-0">
              <h1 className="text-[1.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-4xl">
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
                className="h-11 w-11 shrink-0 rounded-2xl bg-primary p-0 text-primary-foreground shadow-sm shadow-primary/20 transition-transform active:scale-95 sm:w-auto sm:px-5"
                aria-label="New playlist"
              >
                <RiAddLine className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">New</span>
              </Button>
            ) : null}
          </div>

          {/* Segmented control — four tabs share the width on mobile, no horizontal scroll. */}
          <nav className="flex gap-1 pb-3" aria-label="Playlist categories">
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
                    "flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium transition-colors sm:flex-none sm:px-4",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {tab.count && count > 0 ? (
                    <span className={cn("text-xs tabular-nums", active ? "text-muted-foreground" : "text-muted-foreground/70")}>
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
            <ul className="divide-y divide-border/50" aria-busy="true">
              {[...Array(6)].map((_, i) => (
                <li key={i} className="flex animate-pulse items-center gap-3.5 py-4">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-muted/70" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded-full bg-muted/70" />
                    <div className="h-3 w-3/5 rounded-full bg-muted/50" />
                  </div>
                </li>
              ))}
            </ul>
          ) : currentPlaylists.length === 0 ? (
            <div className="mx-auto mt-8 max-w-sm animate-fade-in-up rounded-3xl border border-dashed border-border px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
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
              <h2 className="text-base font-semibold text-foreground">{empty.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{empty.body}</p>
              {isAuthenticated && (activeTab === "my" || activeTab === "public") ? (
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 h-11 rounded-2xl px-6"
                >
                  <RiAddLine className="mr-2 h-4 w-4" />
                  Create playlist
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
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
                    className={cn(
                      "group relative animate-fade-in-up",
                      deletingId === playlist._id && "pointer-events-none opacity-40",
                    )}
                    style={{
                      animationDelay: `${Math.min(index, 8) * 35}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <div className="-mx-3 flex items-center gap-3.5 rounded-2xl px-3 py-4 transition-colors group-hover:bg-muted/40">
                      <PlaylistCover
                        seed={playlist._id}
                        types={(playlist.items ?? []).map((item) => item.contentType)}
                        empty={(playlist.itemCount || 0) === 0}
                        className="h-16 w-16 shadow-md shadow-black/10 transition-transform duration-200 group-hover:scale-[1.04] sm:h-[4.5rem] sm:w-[4.5rem]"
                      />

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-semibold leading-snug text-foreground sm:text-base">
                          <Link
                            href={`/playlists/${playlist._id}`}
                            className="line-clamp-1 transition-colors before:absolute before:inset-0 group-hover:text-primary"
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
                      </div>

                      {/* One secondary control per row: save for lists you don't own, manage for the ones you do. */}
                      <div className="relative z-10 flex shrink-0 items-center">
                        {canManage ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                              } catch (err) {
                                console.error(err)
                              }
                            }}
                            aria-pressed={saved}
                            aria-label={saved ? `Unsave ${playlist.name}` : `Save ${playlist.name}`}
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                              saved
                                ? "text-primary hover:bg-primary/10"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
