"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePlaylist, Playlist } from "@/contexts/playlist-context"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import PlaylistModal from "@/components/playlist-modal"
import InviteCollaboratorModal from "@/components/invite-collaborator-modal"
import PlaylistDetailSkeleton from "@/components/skeletons/playlist-detail-skeleton"
import { PlaylistCover, playlistArt } from "@/components/playlists/playlist-cover"
import {
  RiArrowLeftLine,
  RiGlobalLine,
  RiLockLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiMore2Line,
  RiShareLine,
  RiUserAddLine,
  RiVipCrownLine,
  RiBookmarkLine,
  RiBookmarkFill,
  RiLoader4Line,
  RiExternalLinkLine,
  RiCloseLine,
  RiRefreshLine,
  RiPlayList2Fill,
  RiAddLine,
  RiArrowRightUpLine,
} from "react-icons/ri"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { typeConfigFor, typeIconClass, playlistItemHref } from "@/lib/playlist-item-display"

/** Type filter chips only earn their space on a playlist long and mixed enough to need them. */
const FILTER_MIN_ITEMS = 8

const initialOf = (person: { firstName?: string; email?: string }) =>
  (person.firstName?.charAt(0) || person.email?.charAt(0) || "?").toUpperCase()

const displayNameOf = (person: { firstName?: string; email?: string }) =>
  person.firstName || person.email?.split("@")[0] || "Unknown"

export default function PlaylistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const {
    getPlaylistById,
    removeFromPlaylist,
    deletePlaylist,
    canEditPlaylist,
    savePlaylist,
    unsavePlaylist,
    isPlaylistSaved,
  } = usePlaylist()
  const { user, isAuthenticated } = useAuth()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showCreators, setShowCreators] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isCondensed, setIsCondensed] = useState(false)

  const playlistId = params.id as string
  const [isLoading, setIsLoading] = useState(true)
  const isSaved = isPlaylistSaved(playlistId)
  const headerEndRef = useRef<HTMLDivElement | null>(null)

  // Initial fetch
  useEffect(() => {
    let isMounted = true

    const loadPlaylist = async () => {
      setIsLoading(true)
      try {
        const found = await getPlaylistById(playlistId)
        if (isMounted) {
          setPlaylist(found)
        }
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status
        if (status === 403 && isMounted) {
          // Not visible to this user (private playlist) — render the not-found state.
          setPlaylist(null)
        } else {
          console.error("Error loading playlist:", err)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadPlaylist()

    return () => { isMounted = false }
  }, [playlistId, getPlaylistById])

  /**
   * The title and primary action only move into the top bar once the page header has scrolled
   * past it — so the bar stays near-empty at rest, and nothing is ever out of reach.
   */
  useEffect(() => {
    const sentinel = headerEndRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsCondensed(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [playlist?._id])

  const items = useMemo(() => playlist?.items ?? [], [playlist])

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      const type = item.contentType || "opportunity"
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }
    return counts
  }, [items])

  const showTypeFilter = items.length >= FILTER_MIN_ITEMS && typeCounts.size > 1
  const visibleItems = showTypeFilter && typeFilter !== "all"
    ? items.filter((item) => (item.contentType || "opportunity") === typeFilter)
    : items

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const updated = await getPlaylistById(playlistId)
      if (updated) setPlaylist(updated)
      toast.success("Playlist refreshed")
    } catch (err) {
      console.error("Error refreshing playlist:", err)
      toast.error("Failed to refresh playlist")
    } finally {
      setIsRefreshing(false)
    }
  }

  const isOwner = Boolean(user && playlist && (
    user._id === playlist.createdBy._id ||
    user.email === playlist.createdBy.email
  ))

  const canEdit = playlist ? canEditPlaylist(playlist) : false

  const handleRemoveItem = async (itemId: string) => {
    if (!playlist) return

    setRemovingItemId(itemId)
    try {
      await removeFromPlaylist(playlist._id, itemId)
      const updated = await getPlaylistById(playlistId)
      if (updated) setPlaylist(updated)
      toast.success("Item removed from playlist")
    } catch (err) {
      console.error("Error removing item:", err)
      toast.error("Failed to remove item")
    } finally {
      setRemovingItemId(null)
    }
  }

  const handleDelete = async () => {
    if (!playlist || !confirm(`Delete "${playlist.name}"? This action cannot be undone.`)) return

    try {
      await deletePlaylist(playlist._id)
      toast.success("Playlist deleted")
      router.push("/playlists")
    } catch (err) {
      console.error("Error deleting playlist:", err)
      toast.error("Failed to delete playlist")
    }
  }

  const handleShare = async () => {
    if (!playlist) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: playlist.name,
          text: playlist.description,
          url: window.location.href
        })
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied to clipboard!")
    }
  }

  const handleSavePlaylist = async () => {
    if (!playlist || !isAuthenticated) return

    setIsSaving(true)
    try {
      if (isSaved) {
        await unsavePlaylist(playlist._id)
        toast.success("Playlist unsaved")
      } else {
        await savePlaylist(playlist._id)
        toast.success("Playlist saved")
      }
    } catch (err) {
      console.error("Error saving playlist:", err)
      toast.error("Failed to save playlist")
    } finally {
      setIsSaving(false)
    }
  }

  // Show skeleton immediately while loading
  if (isLoading) {
    return <PlaylistDetailSkeleton />
  }

  if (!playlist) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
            <RiPlayList2Fill className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Playlist not found</h2>
          <p className="mb-6 text-sm text-muted-foreground">This playlist may have been deleted or is private.</p>
          <Link href="/playlists">
            <Button variant="outline" className="h-11 rounded-2xl px-6">
              <RiArrowLeftLine className="mr-2 h-4 w-4" />
              Back to playlists
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const acceptedCollaborators = playlist.collaborators?.filter((c) => c.status === "accepted") || []
  const creatorCount = acceptedCollaborators.length + 1

  /**
   * One visible action, chosen by what this viewer is most likely to want; everything else
   * lives in the overflow menu. Save for visitors, Share for owners of a public list, Edit
   * for owners of a private one.
   */
  const primaryAction: "save" | "share" | "edit" | null =
    isAuthenticated && !isOwner ? "save" : playlist.isPublic ? "share" : canEdit ? "edit" : null

  const renderPrimaryAction = (variant: "full" | "compact") => {
    if (!primaryAction) return null
    const compact = variant === "compact"
    const base = compact ? "h-10 rounded-xl px-4 text-sm" : "h-11 min-h-11 flex-1 rounded-2xl px-5 lg:w-full lg:flex-none"

    if (primaryAction === "save") {
      return (
        <Button
          type="button"
          disabled={isSaving}
          onClick={handleSavePlaylist}
          className={cn(
            base,
            isSaved
              ? "border border-primary/35 bg-primary/10 text-primary hover:bg-primary/15"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {isSaving ? (
            <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
          ) : isSaved ? (
            <RiBookmarkFill className="mr-2 h-4 w-4" />
          ) : (
            <RiBookmarkLine className="mr-2 h-4 w-4" />
          )}
          {isSaved ? "Saved" : "Save"}
        </Button>
      )
    }

    if (primaryAction === "share") {
      return (
        <Button type="button" onClick={handleShare} className={cn(base, "bg-primary text-primary-foreground hover:bg-primary/90")}>
          <RiShareLine className="mr-2 h-4 w-4" />
          Share
        </Button>
      )
    }

    return (
      <Button type="button" onClick={() => setShowEditModal(true)} className={cn(base, "bg-primary text-primary-foreground hover:bg-primary/90")}>
        <RiPencilLine className="mr-2 h-4 w-4" />
        Edit
      </Button>
    )
  }

  const overflowMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="More playlist actions"
        >
          <RiMore2Line className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem] p-1">
        {playlist.isPublic && primaryAction !== "share" ? (
          <DropdownMenuItem onClick={handleShare} className="cursor-pointer rounded-lg">
            <RiShareLine className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>
        ) : null}
        {canEdit && primaryAction !== "edit" ? (
          <DropdownMenuItem onClick={() => setShowEditModal(true)} className="cursor-pointer rounded-lg">
            <RiPencilLine className="mr-2 h-4 w-4" />
            Edit playlist
          </DropdownMenuItem>
        ) : null}
        {isOwner ? (
          <DropdownMenuItem onClick={() => setShowInviteModal(true)} className="cursor-pointer rounded-lg">
            <RiUserAddLine className="mr-2 h-4 w-4" />
            Invite collaborators
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing} className="cursor-pointer rounded-lg">
          <RiRefreshLine className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
          Refresh
        </DropdownMenuItem>
        {isOwner ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="cursor-pointer rounded-lg text-destructive focus:text-destructive"
            >
              <RiDeleteBinLine className="mr-2 h-4 w-4" />
              Delete playlist
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const art = playlistArt(playlist._id, items.map((item) => item.contentType))

  return (
    <div className="relative min-h-screen bg-page pb-24 font-sans lg:pb-12">
      {/* Ambient wash pulled from this playlist's cover art, so every page carries its own colour. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem]"
        style={{
          background: `radial-gradient(115% 62% at 50% 0%, hsl(${art.hue} 92% 55% / 0.22), transparent 68%)`,
        }}
      />

      {/* Top bar: back at rest, title + primary action once the header scrolls away. */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-page/85 backdrop-blur-xl supports-[backdrop-filter]:bg-page/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6 lg:h-16">
          <Link
            href="/playlists"
            className="group -ml-2 inline-flex h-11 min-w-11 items-center gap-2 rounded-xl px-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <RiArrowLeftLine className="h-5 w-5" />
            <span className={cn("text-sm font-medium", isCondensed ? "hidden" : "hidden sm:inline")}>Playlists</span>
          </Link>

          <p
            className={cn(
              "min-w-0 flex-1 truncate text-sm font-semibold text-foreground transition-all duration-200",
              isCondensed ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {playlist.name}
          </p>

          <div className={cn("ml-auto flex items-center gap-1 transition-opacity duration-200", !isCondensed && "opacity-0 pointer-events-none")}>
            {renderPrimaryAction("compact")}
          </div>
          {overflowMenu}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 xl:gap-14">
          {/* Header column — inline row on mobile, a sticky panel beside the list on desktop. */}
          <aside className="py-5 lg:sticky lg:top-20 lg:self-start lg:py-8">
            <div className="flex items-center gap-4 lg:block">
              <PlaylistCover
                seed={playlist._id}
                types={items.map((item) => item.contentType)}
                empty={items.length === 0}
                className="h-[4.5rem] w-[4.5rem] shadow-lg shadow-black/10 sm:h-24 sm:w-24 lg:mb-6 lg:h-44 lg:w-44 lg:shadow-2xl lg:shadow-black/25"
                rounded="rounded-2xl lg:rounded-[1.75rem]"
              />

              <div className="min-w-0 flex-1">
                <h1 className="text-[1.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-4xl lg:text-[2.75rem]">
                  {playlist.name}
                </h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    {playlist.isPublic ? <RiGlobalLine className="h-3.5 w-3.5" /> : <RiLockLine className="h-3.5 w-3.5" />}
                    {playlist.isPublic ? "Public" : "Private"}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{playlist.itemCount ?? items.length} items</span>
                  {(playlist.saveCount ?? 0) > 0 ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="tabular-nums">{playlist.saveCount} saved</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            {playlist.description ? (
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground lg:line-clamp-none">
                {playlist.description}
              </p>
            ) : null}

            {/* Creators condense to an avatar stack; the full roster opens in a sheet. */}
            <button
              type="button"
              onClick={() => setShowCreators(true)}
              className="mt-4 -ml-1 flex min-h-11 w-full items-center gap-2.5 rounded-xl px-1 text-left transition-colors hover:bg-muted/50"
            >
              <span className="flex -space-x-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground ring-2 ring-page">
                  {initialOf(playlist.createdBy)}
                </span>
                {acceptedCollaborators.slice(0, 2).map((collab) => (
                  <span
                    key={collab._id}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground ring-2 ring-page"
                  >
                    {initialOf(collab)}
                  </span>
                ))}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                <span className="font-medium text-foreground/90">{displayNameOf(playlist.createdBy)}</span>
                {creatorCount > 1 ? ` +${creatorCount - 1}` : ""}
              </span>
            </button>

            <div className="mt-4 flex items-center gap-2 lg:flex-col lg:items-stretch">
              {renderPrimaryAction("full")}
              {isOwner ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteModal(true)}
                  className="hidden h-11 rounded-2xl lg:inline-flex"
                >
                  <RiUserAddLine className="mr-2 h-4 w-4" />
                  Invite
                </Button>
              ) : null}
            </div>

            {playlist.hashtags && playlist.hashtags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
                {playlist.hashtags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/community?hashtag=${tag}`}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-primary"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : null}

            <div ref={headerEndRef} className="h-px" aria-hidden />
          </aside>

          {/* Items — one list at every width, hairline-separated instead of stacked cards. */}
          <section className="pb-8 lg:py-8">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"}
              </h2>
              {canEdit && items.length > 0 ? (
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  <RiAddLine className="h-4 w-4" />
                  Add items
                </Link>
              ) : null}
            </div>

            {showTypeFilter ? (
              <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 py-3 sm:mx-0 sm:px-0">
                {[["all", `All ${items.length}`] as const, ...Array.from(typeCounts.entries()).map(
                  ([type, count]) => [type, `${typeConfigFor(type).label} ${count}`] as const,
                )].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTypeFilter(value)}
                    aria-pressed={typeFilter === value}
                    className={cn(
                      "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                      typeFilter === value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {items.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
                <h3 className="text-base font-semibold text-foreground">Nothing here yet</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
                  Add opportunities, jobs, events, or resources to build this playlist out.
                </p>
                <Link href="/">
                  <Button type="button" className="mt-6 h-11 rounded-2xl px-6">
                    Browse content
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {visibleItems.map((item, index) => {
                  const config = typeConfigFor(item.contentType)
                  const detailUrl = playlistItemHref(item)
                  const source = item.company || item.organization || item.author
                  const meta = [source, item.location].filter(Boolean).join(" · ")

                  return (
                    <li
                      key={item._id}
                      className={cn(
                        "group relative animate-fade-in-up",
                        removingItemId === item._id && "pointer-events-none opacity-40",
                      )}
                      style={{
                        animationDelay: `${Math.min(index, 10) * 30}ms`,
                        animationFillMode: "both",
                      }}
                    >
                      <div className="-mx-3 flex items-center gap-3.5 rounded-2xl px-3 py-3.5 transition-colors group-hover:bg-muted/40 sm:gap-4">
                        {/* Track number, trading places with an open glyph on hover. */}
                        <span className="relative flex h-6 w-7 shrink-0 items-center justify-center">
                          <span className="text-[13px] font-semibold tabular-nums text-muted-foreground/60 transition-opacity group-hover:opacity-0">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <RiArrowRightUpLine className="absolute h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-medium leading-snug text-foreground">
                            <Link
                              href={detailUrl}
                              className="line-clamp-2 transition-colors before:absolute before:inset-0 group-hover:text-primary sm:line-clamp-1"
                            >
                              {item.title}
                            </Link>
                          </h3>
                          <p className="mt-1 truncate text-[13px] text-muted-foreground">
                            <span className={cn("font-semibold", typeIconClass(config.color))}>{config.label}</span>
                            {meta ? ` · ${meta}` : null}
                          </p>
                        </div>

                        <div className="relative z-10 flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => window.open(detailUrl, "_blank")}
                            className="hidden h-10 w-10 items-center justify-center rounded-xl text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 sm:flex"
                            aria-label={`Open ${item.title} in a new tab`}
                          >
                            <RiExternalLinkLine className="h-4 w-4" />
                          </button>
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item._id)}
                              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                              aria-label={`Remove ${item.title} from playlist`}
                            >
                              <RiCloseLine className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {items.length > 0 && visibleItems.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No {typeConfigFor(typeFilter).label.toLowerCase()} items in this playlist.
              </p>
            ) : null}
          </section>
        </div>
      </div>

      {/* Creators roster */}
      <Sheet open={showCreators} onOpenChange={setShowCreators}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-md">
          <SheetHeader className="mb-4">
            <SheetTitle>Creators</SheetTitle>
            <SheetDescription>
              {creatorCount === 1 ? "This playlist has one creator." : `${creatorCount} people build this playlist.`}
            </SheetDescription>
          </SheetHeader>

          <ul className="space-y-1">
            <li className="flex items-center gap-3 rounded-xl px-1 py-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initialOf(playlist.createdBy)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{displayNameOf(playlist.createdBy)}</p>
                <p className="flex items-center gap-1 text-xs text-primary">
                  <RiVipCrownLine className="h-3 w-3" />
                  Owner
                </p>
              </div>
            </li>
            {acceptedCollaborators.map((collab) => (
              <li key={collab._id} className="flex items-center gap-3 rounded-xl px-1 py-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                  {initialOf(collab)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{displayNameOf(collab)}</p>
                  <p className="text-xs capitalize text-muted-foreground">{collab.role}</p>
                </div>
              </li>
            ))}
          </ul>

          {isOwner ? (
            <Button
              type="button"
              variant="outline"
              className="mt-5 h-11 w-full rounded-2xl"
              onClick={() => {
                setShowCreators(false)
                setShowInviteModal(true)
              }}
            >
              <RiUserAddLine className="mr-2 h-4 w-4" />
              Invite collaborators
            </Button>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Edit Modal */}
      <PlaylistModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editPlaylist={playlist}
        onSuccess={async (updated) => {
          setPlaylist(updated)
          const refreshed = await getPlaylistById(playlistId)
          if (refreshed) setPlaylist(refreshed)
        }}
      />

      {/* Invite Collaborator Modal */}
      {isOwner && (
        <InviteCollaboratorModal
          isOpen={showInviteModal}
          onClose={async () => {
            setShowInviteModal(false)
            const updated = await getPlaylistById(playlistId)
            if (updated) setPlaylist(updated)
          }}
          playlist={playlist}
        />
      )}
    </div>
  )
}
