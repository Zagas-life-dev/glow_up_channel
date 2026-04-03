"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePlaylist, Playlist } from "@/contexts/playlist-context"
import { useAuth } from "@/lib/auth-context"
import { canViewPremiumPlaylist } from "@/lib/roles"
import { cn } from "@/lib/utils"
import PlaylistModal from "@/components/playlist-modal"
import {
  RiAddLine,
  RiMore2Line,
  RiPencilLine,
  RiDeleteBinLine,
  RiArrowRightLine,
  RiGroupLine,
  RiUserAddLine,
  RiBookmarkLine,
  RiGlobalLine,
  RiLockLine,
  RiStarLine,
  RiVipCrownLine,
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

type TabType = "my" | "shared" | "saved" | "public" | "premium"

const TAB_CONFIG: {
  id: TabType
  label: string
  shortLabel: string
  icon: typeof RiPlayList2Fill
  count?: (ctx: { playlists: Playlist[]; sharedPlaylists: Playlist[]; savedPlaylists: Playlist[]; premiumPlaylists: Playlist[] }) => number
  authOnly?: boolean
  premiumOnly?: boolean
}[] = [
  { id: "public", label: "Discover", shortLabel: "Discover", icon: RiGlobalLine },
  { id: "saved", label: "Saved", shortLabel: "Saved", icon: RiBookmarkLine, count: (c) => c.savedPlaylists.length, authOnly: true },
  { id: "premium", label: "Premium", shortLabel: "Pro", icon: RiVipCrownLine, count: (c) => c.premiumPlaylists.length, authOnly: true, premiumOnly: true },
  { id: "my", label: "Mine", shortLabel: "Mine", icon: RiPlayList2Fill, count: (c) => c.playlists.length, authOnly: true },
  { id: "shared", label: "Shared", shortLabel: "Shared", icon: RiUserAddLine, count: (c) => c.sharedPlaylists.length, authOnly: true },
]

function PlaylistsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const {
    playlists,
    publicPlaylists,
    sharedPlaylists,
    savedPlaylists,
    premiumPlaylists,
    isLoading,
    deletePlaylist,
    fetchPublicPlaylists,
    fetchPlaylists,
    fetchSavedPlaylists,
    fetchPremiumPlaylists,
    isPlaylistSaved,
    savePlaylist,
    unsavePlaylist,
  } = usePlaylist()
  const { isAuthenticated, user, normalizedUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("public")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canViewPremium = canViewPremiumPlaylist(normalizedUser?.isPremium ?? user?.isPremium, user?.role)

  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam === "premium") {
      if (canViewPremium) {
        setActiveTab("premium")
      } else {
        setActiveTab("public")
        router.replace("/playlists")
      }
      return
    }
    if (tabParam === "my" || tabParam === "shared" || tabParam === "saved") {
      if (isAuthenticated) {
        setActiveTab(tabParam as TabType)
      } else {
        setActiveTab("public")
        router.replace("/playlists")
      }
      return
    }
    if (tabParam === "public" || tabParam === null) {
      setActiveTab("public")
    }
  }, [searchParams, canViewPremium, isAuthenticated, router])

  useEffect(() => {
    fetchPublicPlaylists()
    if (isAuthenticated) {
      fetchPlaylists()
      fetchSavedPlaylists()
    }
  }, [fetchPublicPlaylists, fetchPlaylists, fetchSavedPlaylists, isAuthenticated])

  useEffect(() => {
    if (activeTab === "premium" && canViewPremium) {
      fetchPremiumPlaylists()
    }
  }, [activeTab, canViewPremium, fetchPremiumPlaylists])

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

  const getCurrentPlaylists = () => {
    let list: Playlist[]
    switch (activeTab) {
      case "my":
        list = playlists
        break
      case "shared":
        list = sharedPlaylists
        break
      case "saved":
        list = savedPlaylists
        break
      case "public":
        list = publicPlaylists
        break
      case "premium":
        list = canViewPremium ? premiumPlaylists : []
        break
      default:
        list = []
    }
    if (!canViewPremium && (activeTab === "public" || activeTab === "saved")) {
      return list.filter((p) => !p.isPremiumPlaylist)
    }
    return list
  }

  const setTab = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === "premium") {
      router.replace("/playlists?tab=premium")
    } else {
      const path = tab === "public" ? "/playlists" : `/playlists?tab=${tab}`
      router.replace(path)
    }
  }

  const currentPlaylists = getCurrentPlaylists()

  const isOwner = (playlist: Playlist) => {
    if (!user || !playlist.createdBy) return false
    return user._id === playlist.createdBy._id || user.email === playlist.createdBy.email
  }

  const countCtx = { playlists, sharedPlaylists, savedPlaylists, premiumPlaylists }
  const visibleTabs = TAB_CONFIG.filter((t) => {
    if (t.authOnly && !isAuthenticated) return false
    if (t.premiumOnly && !canViewPremium) return false
    return true
  })

  return (
    <PageShell fullWidth className="font-sans">
      {/* Atmospheric backdrop — warm paper / deep page, single accent */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-32 -right-24 h-80 w-80 rounded-full opacity-[0.12] dark:opacity-[0.18] blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -left-20 h-64 w-64 rounded-full opacity-[0.06] dark:opacity-[0.1] blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(222 41% 35%) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Sticky top: title + primary action — thumb-friendly */}
        <header className="sticky top-0 z-30 border-b border-border/50 bg-page/85 pb-3 pt-2 backdrop-blur-xl supports-[backdrop-filter]:bg-page/70">
          <div className="flex items-end justify-between gap-3 pt-safe">
            <div className="min-w-0 flex-1 pl-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
                Your library
              </p>
              <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Playlists
              </h1>
              <p className="mt-2 max-w-md text-sm leading-snug text-muted-foreground sm:text-[0.9375rem]">
                Curate opportunities, jobs, and events—pick up where you left off on any device.
              </p>
            </div>
            {isAuthenticated ? (
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  size="icon"
                  className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95 sm:hidden"
                  aria-label="New playlist"
                >
                  <RiAddLine className="h-6 w-6" />
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="hidden h-11 rounded-2xl bg-primary px-5 text-primary-foreground shadow-md shadow-primary/20 sm:inline-flex"
                >
                  <RiAddLine className="mr-2 h-4 w-4" />
                  New playlist
                </Button>
              </div>
            ) : null}
          </div>

          {/* Horizontal tab rail — core mobile pattern */}
          <nav
            className="scrollbar-hide -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-1 sm:-mx-0 sm:px-0"
            aria-label="Playlist categories"
          >
            {visibleTabs.map((tab) => {
              const Icon = tab.icon
              const count = tab.count?.(countCtx) ?? 0
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={cn(
                    "flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    "active:scale-[0.98]",
                    active
                      ? "border-primary/40 bg-primary/15 text-foreground shadow-sm ring-1 ring-primary/20"
                      : "border-border/60 bg-card/60 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "opacity-80")} aria-hidden />
                  <span className="whitespace-nowrap sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden whitespace-nowrap sm:inline">{tab.label}</span>
                  {tab.count && count > 0 ? (
                    <span
                      className={cn(
                        "min-w-[1.25rem] rounded-lg px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums",
                        active ? "bg-primary/25 text-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>
        </header>

        <main className="px-0 pb-6 pt-5 sm:pb-8 sm:pt-6">
          {isLoading ? (
            <ul className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2" aria-busy="true">
              {[...Array(6)].map((_, i) => (
                <li
                  key={i}
                  className="animate-pulse rounded-3xl border border-border/50 bg-card/50 p-4 sm:p-5"
                >
                  <div className="flex gap-4">
                    <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
                      <div className="absolute left-0 top-1 h-14 w-14 rounded-2xl bg-muted/70" />
                      <div className="absolute left-2 top-0 h-14 w-14 rounded-2xl bg-muted/50" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2 pt-1">
                      <div className="h-4 w-3/4 max-w-[14rem] rounded-full bg-muted/70" />
                      <div className="h-3 w-3/5 max-w-[10rem] rounded-full bg-muted/50" />
                      <div className="flex gap-2 pt-2">
                        <div className="h-6 w-16 rounded-lg bg-muted/50" />
                        <div className="h-6 w-20 rounded-lg bg-muted/40" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : currentPlaylists.length === 0 ? (
            <div
              className={cn(
                "mx-auto max-w-lg rounded-[1.75rem] border border-border/70 bg-card/90 px-6 py-12 text-center shadow-sm backdrop-blur-sm",
                "animate-fade-in-up",
              )}
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                {activeTab === "my" ? (
                  <RiPlayList2Fill className="h-7 w-7 text-primary" />
                ) : activeTab === "shared" ? (
                  <RiUserAddLine className="h-7 w-7 text-primary" />
                ) : activeTab === "saved" ? (
                  <RiBookmarkLine className="h-7 w-7 text-primary" />
                ) : activeTab === "premium" ? (
                  <RiVipCrownLine className="h-7 w-7 text-amber-500" />
                ) : (
                  <RiGlobalLine className="h-7 w-7 text-primary" />
                )}
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {activeTab === "my"
                  ? "Start your first playlist"
                  : activeTab === "shared"
                    ? "No shared playlists yet"
                    : activeTab === "saved"
                      ? "Nothing saved yet"
                      : activeTab === "premium"
                        ? "No premium lists yet"
                        : "Nothing in Discover yet"}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                {activeTab === "my"
                  ? "Group jobs, events, and resources so you can revisit them in one tap."
                  : activeTab === "shared"
                    ? "When someone invites you to collaborate, it will show up here."
                    : activeTab === "saved"
                      ? "Save public playlists you love—they will live here for quick access."
                      : activeTab === "premium"
                        ? "Premium playlists you can access will appear here."
                        : "Be the first to publish a playlist for the community."}
              </p>
              {isAuthenticated && activeTab !== "shared" && activeTab !== "saved" ? (
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-8 h-11 rounded-2xl bg-primary px-8 text-primary-foreground"
                >
                  <RiAddLine className="mr-2 h-4 w-4" />
                  Create playlist
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              {currentPlaylists.map((playlist, index) => {
                const acceptedCollaborators =
                  playlist.collaborators?.filter((c) => c.status === "accepted") || []
                const canManage = activeTab === "my" && isOwner(playlist)
                const premium = playlist.isPremiumPlaylist

                return (
                  <li
                    key={playlist._id}
                    className={cn(
                      "group animate-fade-in-up rounded-[1.35rem] border transition-all duration-200",
                      premium
                        ? "border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] to-transparent"
                        : "border-border/60 bg-card/70 backdrop-blur-sm",
                      deletingId === playlist._id && "pointer-events-none opacity-45",
                    )}
                    style={{
                      animationDelay: `${Math.min(index, 8) * 45}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex gap-3 sm:gap-4">
                        <Link
                          href={`/playlists/${playlist._id}`}
                          className="group/cover relative shrink-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          aria-label={`Open ${playlist.name}`}
                        >
                          <div className="relative h-[4.5rem] w-[4.5rem] sm:h-[5rem] sm:w-[5rem]">
                            <div
                              className={cn(
                                "absolute left-0 top-2 h-[3.25rem] w-[3.25rem] rotate-[-6deg] rounded-2xl border sm:h-14 sm:w-14",
                                premium
                                  ? "border-amber-500/30 bg-amber-500/15"
                                  : "border-border/50 bg-muted/80",
                              )}
                            />
                            <div
                              className={cn(
                                "absolute left-2 top-1 h-[3.25rem] w-[3.25rem] rotate-[4deg] rounded-2xl border sm:h-14 sm:w-14",
                                premium
                                  ? "border-amber-500/35 bg-amber-500/20"
                                  : "border-primary/25 bg-primary/10",
                              )}
                            />
                            <div
                              className={cn(
                                "absolute left-3 top-0 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl border shadow-sm transition-transform duration-200 group-hover/cover:scale-[1.03] sm:h-14 sm:w-14",
                                premium
                                  ? "border-amber-500/40 bg-gradient-to-br from-amber-500/30 to-amber-600/15"
                                  : "border-primary/30 bg-gradient-to-br from-primary/25 to-primary/5",
                              )}
                            >
                              <RiPlayList2Fill
                                className={cn("h-7 w-7 sm:h-8 sm:w-8", premium ? "text-amber-400" : "text-primary")}
                              />
                            </div>
                          </div>
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/playlists/${playlist._id}`}
                                className="block outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/45"
                              >
                                <h3 className="text-lg font-bold leading-tight text-foreground transition-colors hover:text-primary sm:text-xl">
                                  <span className="line-clamp-2">{playlist.name}</span>
                                </h3>
                              </Link>
                              {playlist.description ? (
                                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{playlist.description}</p>
                              ) : null}
                            </div>
                            {canManage ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors",
                                      "hover:border-border hover:bg-muted/80 hover:text-foreground",
                                      "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                                    )}
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
                            ) : null}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-1.5 gap-y-2">
                            {premium ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                <RiStarLine className="h-3 w-3" />
                                Premium
                              </span>
                            ) : playlist.isPublic ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                <RiGlobalLine className="h-3 w-3" />
                                Public
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <RiLockLine className="h-3 w-3" />
                                Private
                              </span>
                            )}
                            {acceptedCollaborators.length > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                <RiGroupLine className="h-3 w-3" />
                                {acceptedCollaborators.length + 1} people
                              </span>
                            ) : null}
                            <span className="text-xs tabular-nums text-muted-foreground">{playlist.itemCount || 0} items</span>
                            {(playlist.saveCount ?? 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-primary">
                                <RiBookmarkLine className="h-3.5 w-3.5" />
                                {playlist.saveCount}
                              </span>
                            ) : null}
                          </div>

                          {activeTab !== "my" && playlist.createdBy ? (
                            <p className="mt-2 truncate text-xs text-muted-foreground">
                              By{" "}
                              <span className="font-medium text-foreground/90">
                                {playlist.createdBy.firstName || playlist.createdBy.email?.split("@")[0] || "Unknown"}
                              </span>
                            </p>
                          ) : null}

                          {playlist.hashtags && playlist.hashtags.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {playlist.hashtags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {playlist.hashtags.length > 3 ? (
                                <span className="self-center text-[11px] text-muted-foreground">
                                  +{playlist.hashtags.length - 3}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-stretch gap-2 border-t border-border/40 pt-4 sm:flex-nowrap">
                        {(activeTab === "public" || activeTab === "premium") && isAuthenticated ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 min-h-11 flex-1 rounded-xl border-border/80 sm:flex-initial sm:px-4"
                            onClick={async () => {
                              try {
                                if (isPlaylistSaved(playlist._id)) await unsavePlaylist(playlist._id)
                                else await savePlaylist(playlist._id)
                              } catch (err) {
                                console.error(err)
                              }
                            }}
                          >
                            <RiBookmarkLine
                              className={cn(
                                "mr-2 h-4 w-4",
                                isPlaylistSaved(playlist._id) && "fill-primary text-primary",
                              )}
                            />
                            {isPlaylistSaved(playlist._id) ? "Saved" : "Save"}
                          </Button>
                        ) : null}
                        <Button
                          asChild
                          className="h-11 min-h-11 flex-1 rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/15 sm:ml-auto sm:flex-initial sm:px-6"
                        >
                          <Link href={`/playlists/${playlist._id}`} className="inline-flex items-center justify-center gap-2">
                            Open
                            <RiArrowRightLine className="h-4 w-4" />
                          </Link>
                        </Button>
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
