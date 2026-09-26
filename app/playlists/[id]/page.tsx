"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { ConfirmDialog } from "@/components/up/confirm-dialog"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePlaylist, Playlist } from "@/contexts/playlist-context"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import PlaylistModal from "@/components/playlist-modal"
import InviteCollaboratorModal from "@/components/invite-collaborator-modal"
import PlaylistDetailSkeleton from "@/components/skeletons/playlist-detail-skeleton"
import { PlaylistCover } from "@/components/playlists/playlist-cover"
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
  RiHeartLine,
  RiHeartFill,
  RiEyeLine,
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
import { typeConfigFor, playlistItemHref } from "@/lib/playlist-item-display"
import { KindChip, toUpKind } from "@/components/up/kind"
import { trackPlaylistOpen, trackPlaylistShare } from '@/lib/tracking'
import {
  formatCount,
  recordPlaylistClick,
  recordPlaylistShare,
  recordPlaylistView,
  setPlaylistLiked,
} from '@/lib/playlist-engagement'

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
  const [isLiking, setIsLiking] = useState(false)
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
          // Primary tier: opening a playlist and looking at what is in it counts
          // on its own. Reported only on a playlist that actually resolved — a
          // 403 or a dead id is not someone using their library.
          if (found) {
            trackPlaylistOpen(playlistId)
            // The public view count. Deduped server-side to one per viewer per day,
            // and the owner's own visits never count, so this is safe on every open.
            void recordPlaylistView(playlistId)
          }
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

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const handleDelete = () => setConfirmDelete(true)

  const performDelete = async () => {
    if (!playlist) return
    setDeleting(true)
    try {
      await deletePlaylist(playlist._id)
      toast.success("Playlist deleted")
      router.push("/playlists")
    } catch (err) {
      console.error("Error deleting playlist:", err)
      toast.error("Failed to delete playlist")
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleShare = async () => {
    if (!playlist) return

    // Only a completed share counts — a cancelled share sheet is not one.
    const counted = (source: string) => {
      trackPlaylistShare(playlist._id)
      void recordPlaylistShare(playlist._id, source)
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: playlist.name,
          text: playlist.description,
          url: window.location.href
        })
        counted("native")
      } catch (err) {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success("Link copied to clipboard!")
        counted("copy_link")
      } catch {
        toast.error("Couldn't copy the link")
      }
    }
  }

  const handleLike = async () => {
    if (!playlist || !isAuthenticated || isLiking) return
    const next = !playlist.isLiked
    const before = playlist
    const likeCount = Math.max(0, (playlist.metrics?.likeCount ?? 0) + (next ? 1 : -1))
    // Optimistic: the heart answers the tap, and rolls back if the server says no.
    setPlaylist({ ...playlist, isLiked: next, metrics: { ...playlist.metrics, likeCount } })
    setIsLiking(true)
    try {
      const result = await setPlaylistLiked(playlist._id, next)
      setPlaylist((current) =>
        current
          ? { ...current, isLiked: result.isLiked, metrics: { ...current.metrics, likeCount: result.likeCount } }
          : current,
      )
    } catch (err) {
      console.error("Error updating like:", err)
      setPlaylist(before)
      toast.error("Couldn't update your like")
    } finally {
      setIsLiking(false)
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
      setPlaylist((current) =>
        current ? { ...current, saveCount: Math.max(0, (current.saveCount ?? 0) + (isSaved ? -1 : 1)) } : current,
      )
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-up-lg bg-up-fill">
            <RiPlayList2Fill className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Playlist not found</h2>
          <p className="mb-6 text-sm text-muted-foreground">This playlist may have been deleted or is private.</p>
          <Link href="/playlists">
            <Button variant="outline" className="h-11 px-6">
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
    const base = compact ? "h-10 px-4 text-sm" : "h-11 min-h-11 flex-1 px-5 lg:w-full lg:flex-none"

    if (primaryAction === "save") {
      return (
        <Button
          type="button"
          disabled={isSaving}
          onClick={handleSavePlaylist}
          className={cn(
            base,
            isSaved
              ? "border-[1.5px] border-border bg-card text-foreground hover:bg-accent"
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
          className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
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


  return (
    <div className="relative min-h-screen bg-page pb-24 font-sans lg:pb-12">

      {/* Top bar: back at rest, title + primary action once the header scrolls away. */}
      <header className="sticky top-0 z-40 border-b border-border bg-up-bar backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6 lg:h-16">
          <Link
            href="/playlists"
            className="group -ml-2 inline-flex h-11 min-w-11 items-center gap-2 rounded-full px-2 text-muted-foreground transition-colors hover:text-foreground"
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
                imageUrl={playlist.coverImage}
                className="h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24 lg:mb-6 lg:h-60 lg:w-full lg:rounded-up-xl"
                rounded="rounded-2xl lg:rounded-[1.75rem]"
              />

              <div className="min-w-0 flex-1">
                <h1 className="font-display text-[24px] font-bold leading-[1.15] text-foreground sm:text-[30px] lg:text-[34px]">
                  {playlist.name}
                </h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    {playlist.isPublic ? <RiGlobalLine className="h-3.5 w-3.5" /> : <RiLockLine className="h-3.5 w-3.5" />}
                    {playlist.isPublic ? "Public" : "Private"}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{playlist.itemCount ?? items.length} items</span>
                  {(playlist.metrics?.viewCount ?? 0) > 0 ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <RiEyeLine className="h-3.5 w-3.5" aria-hidden />
                        {formatCount(playlist.metrics?.viewCount)} views
                      </span>
                    </>
                  ) : null}
                  {(playlist.saveCount ?? 0) > 0 ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="tabular-nums">{formatCount(playlist.saveCount)} saved</span>
                    </>
                  ) : null}
                  {(playlist.metrics?.likeCount ?? 0) > 0 ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="tabular-nums">{formatCount(playlist.metrics?.likeCount)} likes</span>
                    </>
                  ) : null}
                </p>
                {/* Reach is the owner's number: only owners and collaborators receive these fields. */}
                {playlist.metrics?.impressionCount !== undefined ? (
                  <p className="mt-1 text-[12px] tabular-nums text-muted-foreground/80">
                    Seen {formatCount(playlist.metrics.impressionCount)} times in Discover
                    {" · "}
                    {formatCount(playlist.metrics.shareCount)} shares
                    {" · "}
                    {formatCount(playlist.metrics.clickCount)} click-throughs
                  </p>
                ) : null}
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
              className="mt-4 -ml-1 flex min-h-11 w-full items-center gap-2.5 rounded-full px-1 text-left transition-colors hover:bg-up-fill"
            >
              <span className="flex -space-x-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-up-lime font-display text-[10px] font-bold text-up-navy ring-2 ring-page">
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
              {isAuthenticated && !canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLike}
                  disabled={isLiking}
                  aria-pressed={Boolean(playlist.isLiked)}
                  aria-label={playlist.isLiked ? "Unlike playlist" : "Like playlist"}
                  className={cn(
                    "h-11 min-w-11 px-3 lg:w-full",
                    playlist.isLiked && "border-transparent bg-up-orange-tint text-up-orange-ink hover:bg-up-orange-tint",
                  )}
                >
                  {playlist.isLiked ? <RiHeartFill className="h-5 w-5" /> : <RiHeartLine className="h-5 w-5" />}
                  <span className="ml-1.5 hidden text-sm lg:inline">{playlist.isLiked ? "Liked" : "Like"}</span>
                </Button>
              ) : null}
              {isOwner ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteModal(true)}
                  className="hidden h-11 lg:inline-flex"
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
                    className="text-[13px] font-semibold text-muted-foreground transition-colors hover:text-up-orange-ink"
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
            <div className="flex items-center justify-between gap-3 pb-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"}
              </h2>
              {canEdit && items.length > 0 ? (
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-up-orange-ink transition-colors hover:opacity-80"
                >
                  <RiAddLine className="h-4 w-4" />
                  Add items
                </Link>
              ) : null}
            </div>

            {showTypeFilter ? (
              <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
                {[["all", `All ${items.length}`] as const, ...Array.from(typeCounts.entries()).map(
                  ([type, count]) => [type, `${typeConfigFor(type).label} ${count}`] as const,
                )].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTypeFilter(value)}
                    aria-pressed={typeFilter === value}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[13px] font-semibold transition-colors",
                      typeFilter === value
                        ? "border-up-solid bg-up-solid text-up-on-solid"
                        : "border-border bg-card text-muted-foreground hover:border-up-border-hover hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {items.length === 0 ? (
              <div className="mt-2 rounded-up-xl border border-dashed border-border bg-card px-6 py-14 text-center">
                <h3 className="font-display text-lg font-bold text-foreground">Nothing here yet</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
                  Add opportunities, jobs, events, or resources to build this playlist out.
                </p>
                <Link href="/">
                  <Button type="button" className="mt-6 h-11 px-6">
                    Browse content
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="overflow-hidden rounded-up-xl border border-border bg-card divide-y divide-up-hairline">
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
                      <div className="flex items-center gap-3.5 px-4 py-3.5 transition-colors group-hover:bg-up-fill sm:gap-4 sm:px-[18px]">
                        {/* The item's type chip, the same one the feed card leads with. */}
                        <KindChip kind={toUpKind(item.contentType)} />

                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-bold leading-snug text-foreground">
                            <Link
                              href={detailUrl}
                              onClick={() => void recordPlaylistClick(playlist._id)}
                              className="line-clamp-2 transition-colors before:absolute before:inset-0 group-hover:text-up-orange-ink sm:line-clamp-1"
                            >
                              {item.title}
                            </Link>
                          </h3>
                          <p className="mt-1 truncate text-[13px] text-muted-foreground">
                            <span className="font-bold text-foreground">{config.label}</span>
                            {meta ? ` · ${meta}` : null}
                          </p>
                        </div>

                        <div className="relative z-10 flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => {
                              void recordPlaylistClick(playlist._id)
                              window.open(detailUrl, "_blank")
                            }}
                            className="hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-card hover:text-foreground group-hover:opacity-100 sm:flex"
                            aria-label={`Open ${item.title} in a new tab`}
                          >
                            <RiExternalLinkLine className="h-4 w-4" />
                          </button>
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item._id)}
                              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-up-lime font-display text-xs font-bold text-up-navy">
                {initialOf(playlist.createdBy)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{displayNameOf(playlist.createdBy)}</p>
                <p className="flex items-center gap-1 text-xs font-semibold text-up-orange-ink">
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
              className="mt-5 h-11 w-full"
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
      {playlist ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this playlist?"
          description={`"${playlist.name}" and its ${playlist.itemCount || 0} ${playlist.itemCount === 1 ? "item" : "items"} will be removed${playlist.collaborators?.length ? ` for you and ${playlist.collaborators.length} ${playlist.collaborators.length === 1 ? "collaborator" : "collaborators"}` : ""}. This can't be undone.`}
          confirmLabel="Delete playlist"
          busyLabel="Deleting…"
          busy={deleting}
          onConfirm={performDelete}
        />
      ) : null}

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
