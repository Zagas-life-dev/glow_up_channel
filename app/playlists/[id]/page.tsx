"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePlaylist, Playlist } from "@/contexts/playlist-context"
import { useAuth } from '@/lib/auth-context'
import { canViewPremiumPlaylist } from '@/lib/roles'
import { cn } from '@/lib/utils'
import PlaylistModal from '@/components/playlist-modal'
import InviteCollaboratorModal from '@/components/invite-collaborator-modal'
import PlaylistDetailSkeleton from '@/components/skeletons/playlist-detail-skeleton'
import {
  RiArrowLeftLine,
  RiGlobalLine,
  RiLockLine,
  RiHashtag,
  RiPencilLine,
  RiDeleteBinLine,
  RiFocus3Line,
  RiBriefcaseLine,
  RiCalendarLine,
  RiBookLine,
  RiMore2Line,
  RiShareLine,
  RiTimeLine,
  RiGroupLine,
  RiUserAddLine,
  RiVipCrownLine,
  RiBookmarkLine,
  RiBookmarkFill,
  RiLoader4Line,
  RiMapPinLine,
  RiBuildingLine,
  RiExternalLinkLine,
  RiCloseLine,
  RiRefreshLine,
  RiDashboardLine,
  RiListUnordered,
  RiPlayLine,
  RiStarLine,
  RiPlayList2Fill,
} from 'react-icons/ri'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

const typeConfig = {
  opportunity: { icon: RiFocus3Line, color: "orange", label: "Opportunity", path: "opportunities", gradient: "from-orange-500/20 to-orange-600/10" },
  job: { icon: RiBriefcaseLine, color: "primary", label: "Job", path: "jobs", gradient: "from-primary/20 to-primary/10" },
  event: { icon: RiCalendarLine, color: "emerald", label: "Event", path: "events", gradient: "from-emerald-500/20 to-emerald-600/10" },
  resource: { icon: RiBookLine, color: "slate", label: "Resource", path: "resources", gradient: "from-slate-500/15 to-slate-600/8" },
} as const

type TypeColor = (typeof typeConfig)[keyof typeof typeConfig]["color"]

function typeIconClass(color: TypeColor) {
  return cn(
    color === "orange" && "text-orange-400",
    color === "primary" && "text-primary",
    color === "emerald" && "text-emerald-400",
    color === "slate" && "text-slate-500 dark:text-slate-400",
  )
}

function typeBadgeClass(color: TypeColor) {
  return cn(
    "text-xs font-medium backdrop-blur-sm",
    color === "orange" && "border-orange-500/30 text-orange-400 bg-primary/10",
    color === "primary" && "border-primary/30 text-primary bg-primary/10",
    color === "emerald" && "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
    color === "slate" && "border-slate-500/30 text-slate-600 bg-slate-500/10 dark:text-slate-300",
  )
}

function typeBadgeSmallClass(color: TypeColor) {
  return cn(
    "text-[10px] font-semibold px-2 py-0.5",
    color === "orange" && "border-orange-500/40 text-orange-400 bg-primary/10",
    color === "primary" && "border-primary/30 text-primary bg-primary/10",
    color === "emerald" && "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    color === "slate" && "border-slate-500/40 text-slate-600 bg-slate-500/10 dark:text-slate-300",
  )
}

type ViewMode = 'grid' | 'list'

export default function PlaylistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { getPlaylistById, removeFromPlaylist, deletePlaylist, fetchPublicPlaylists, fetchPlaylists, canEditPlaylist, savePlaylist, unsavePlaylist, isPlaylistSaved } = usePlaylist()
  const { user, isAuthenticated, normalizedUser } = useAuth()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [premiumGatedBy403, setPremiumGatedBy403] = useState(false)

  const playlistId = params.id as string
  const [isLoading, setIsLoading] = useState(true)
  const isSaved = isPlaylistSaved(playlistId)

  // Initial fetch
  useEffect(() => {
    let isMounted = true
    setPremiumGatedBy403(false)

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
          setPremiumGatedBy403(true)
          setPlaylist(null)
        } else {
          console.error('Error loading playlist:', err)
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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const updated = await getPlaylistById(playlistId)
      if (updated) setPlaylist(updated)
      toast.success('Playlist refreshed')
    } catch (err) {
      console.error('Error refreshing playlist:', err)
      toast.error('Failed to refresh playlist')
    } finally {
      setIsRefreshing(false)
    }
  }

  const isOwner = user && playlist && (
    user._id === playlist.createdBy._id ||
    user.email === playlist.createdBy.email
  )

  const canEdit = playlist ? canEditPlaylist(playlist) : false

  const canViewPremium = canViewPremiumPlaylist(normalizedUser?.isPremium ?? user?.isPremium, user?.role)
  // Explicitly check isPremium as a boolean — canViewPremiumPlaylist may return true
  // for undefined/missing isPremium values, so we also guard directly on the flag.
  const userIsPremium = Boolean(normalizedUser?.isPremium ?? user?.isPremium)
  const isPremiumGated = Boolean(playlist?.isPremiumPlaylist) && (!canViewPremium || !userIsPremium) && !isOwner

  const handleRemoveItem = async (itemId: string) => {
    if (!playlist) return
    
    setRemovingItemId(itemId)
    try {
      await removeFromPlaylist(playlist._id, itemId)
      const updated = await getPlaylistById(playlistId)
      if (updated) setPlaylist(updated)
      toast.success('Item removed from playlist')
    } catch (err) {
      console.error('Error removing item:', err)
      toast.error('Failed to remove item')
    } finally {
      setRemovingItemId(null)
    }
  }

  const handleDelete = async () => {
    if (!playlist || !confirm(`Delete "${playlist.name}"? This action cannot be undone.`)) return
    
    try {
      await deletePlaylist(playlist._id)
      toast.success('Playlist deleted')
      router.push('/playlists')
    } catch (err) {
      console.error('Error deleting playlist:', err)
      toast.error('Failed to delete playlist')
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
      toast.success('Link copied to clipboard!')
    }
  }

  const handleSavePlaylist = async () => {
    if (!playlist || !isAuthenticated) return
    
    setIsSaving(true)
    try {
      if (isSaved) {
        await unsavePlaylist(playlist._id)
        toast.success('Playlist unsaved')
      } else {
        await savePlaylist(playlist._id)
        toast.success('Playlist saved')
      }
    } catch (err) {
      console.error('Error saving playlist:', err)
      toast.error('Failed to save playlist')
    } finally {
      setIsSaving(false)
    }
  }

  // Get accepted collaborators
  const acceptedCollaborators = playlist?.collaborators?.filter(c => c.status === 'accepted') || []

  // Show skeleton immediately while loading
  if (isLoading) {
    return <PlaylistDetailSkeleton />
  }

  // ─── PREMIUM WALL ────────────────────────────────────────────────────────────
  // Fires when: playlist is premium + user isn't premium + user isn't owner,
  // OR the API returned a 403 (server-side premium check).
  // Show wall if:
  // 1. Playlist loaded but is premium-gated for this user, OR
  // 2. API returned 403 (server enforced — catches authenticated non-premium users too)
  const showPremiumWall = (playlist != null && isPremiumGated) || premiumGatedBy403

  if (showPremiumWall) {
    return (
      <div className="min-h-screen bg-page flex flex-col">
        {/* Atmosphere blobs — match the rest of the page */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -top-24 right-0 h-72 w-72 rounded-full opacity-[0.14] dark:opacity-[0.2] blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(38 92% 50%) 0%, transparent 72%)" }}
          />
          <div
            className="absolute bottom-0 -left-16 h-56 w-56 rounded-full opacity-[0.07] blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(38 92% 50%) 0%, transparent 70%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.25] dark:opacity-[0.15]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Sticky back header */}
        <div className="sticky top-0 z-40 bg-page/70 backdrop-blur-2xl border-b border-border/60">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex items-center py-3">
              <Link
                href="/playlists"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-muted/80">
                  <RiArrowLeftLine className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium hidden sm:inline">Back to Playlists</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Premium gate content */}
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center">

            {/* Crown icon with lock badge */}
            <div className="mx-auto mb-7 relative w-24 h-24">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/30 via-amber-600/15 to-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-xl shadow-amber-500/10">
                <RiVipCrownLine className="w-12 h-12 text-amber-400" />
              </div>
              <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-md ring-2 ring-page">
                <RiLockLine className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Badge */}
            <div className="flex justify-center mb-3">
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1">
                <RiStarLine className="mr-1.5 h-3 w-3" />
                Premium Playlist
              </Badge>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight leading-tight">
              This is a premium playlist
            </h1>

            {/* Body */}
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8 max-w-sm mx-auto">
              This playlist is curated exclusively for premium members. Upgrade your account to unlock it and get full access to all premium content on the platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/premium" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="h-12 w-full px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-lg shadow-amber-500/20 transition-all duration-200 hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.99]"
                >
                  <RiVipCrownLine className="mr-2 h-4 w-4" />
                  Become a premium member
                </Button>
              </Link>
              <Link href="/playlists" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full px-8 rounded-2xl border-border/80 text-foreground hover:bg-muted/60"
                >
                  <RiArrowLeftLine className="mr-2 h-4 w-4" />
                  Browse free playlists
                </Button>
              </Link>
            </div>

            {/* Sign-in nudge for unauthenticated users */}
            {!isAuthenticated && (
              <p className="mt-7 text-xs text-muted-foreground/70">
                Already a member?{" "}
                <Link href="/login" className="text-primary hover:underline underline-offset-2 font-medium">
                  Sign in
                </Link>{" "}
                to access your content.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }
  // ─── END PREMIUM WALL ────────────────────────────────────────────────────────

  if (!playlist) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
            <RiPlayList2Fill className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Playlist Not Found</h2>
          <p className="text-muted-foreground text-sm mb-6">This playlist may have been deleted or is private.</p>
          <Link href="/playlists">
            <Button variant="outline" className="border-border text-foreground rounded-full px-6">
              <RiArrowLeftLine className="w-4 h-4 mr-2" />
              Back to Playlists
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const showMobileStickyActions =
    (playlist.isPublic || playlist.isPremiumPlaylist) || (isAuthenticated && !isOwner)

  return (
    <div className="min-h-screen bg-page pb-24 font-sans lg:pb-8">
      {/* Atmosphere: orange-led depth, subtle grain (frontend-design) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-24 right-0 h-72 w-72 rounded-full opacity-[0.14] dark:opacity-[0.2] blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 72%)" }}
        />
        <div
          className="absolute top-1/4 -left-16 h-56 w-56 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(222 41% 40%) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.3] dark:opacity-[0.18]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent" />

        {/* Sticky header + mobile Share/Save (always reachable while scrolling) */}
        <div className="sticky top-0 z-50 border-b border-border/60 bg-page/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-page/65">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="flex items-center justify-between gap-3 py-3">
              <Link
                href="/playlists"
                className="group inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl text-muted-foreground transition-colors hover:text-foreground sm:justify-start"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-muted/80">
                  <RiArrowLeftLine className="h-5 w-5" />
                </span>
                <span className="hidden text-sm font-medium sm:inline">Playlists</span>
              </Link>

              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Refresh playlist"
                >
                  <RiRefreshLine className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                </Button>
                {isOwner ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Playlist menu"
                      >
                        <RiMore2Line className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="p-1">
                      <DropdownMenuItem
                        onClick={() => setShowEditModal(true)}
                        className="cursor-pointer rounded-lg text-foreground hover:bg-muted"
                      >
                        <RiPencilLine className="mr-2 h-4 w-4" />
                        Edit playlist
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowInviteModal(true)}
                        className="cursor-pointer rounded-lg text-foreground hover:bg-muted"
                      >
                        <RiUserAddLine className="mr-2 h-4 w-4" />
                        Invite collaborators
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-muted" />
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="cursor-pointer rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <RiDeleteBinLine className="mr-2 h-4 w-4" />
                        Delete playlist
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>

            {showMobileStickyActions ? (
              <div className="flex gap-2 border-t border-border/50 pb-3 pt-3 md:hidden">
                {(playlist.isPublic || playlist.isPremiumPlaylist) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 flex-1 rounded-xl border-border/80"
                    onClick={handleShare}
                  >
                    <RiShareLine className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                )}
                {isAuthenticated && !isOwner ? (
                  <Button
                    type="button"
                    disabled={isSaving}
                    className={cn(
                      "h-11 min-h-11 flex-1 rounded-xl",
                      isSaved
                        ? "border border-primary/35 bg-primary/15 text-primary hover:bg-primary/20"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                    onClick={handleSavePlaylist}
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
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Hero: compact row on mobile, editorial scale on desktop */}
        <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-8 md:gap-10">
            <div className="relative shrink-0 sm:mx-0">
              <div className="group/cover relative mx-auto w-[7.5rem] sm:mx-0 md:w-64">
                <div
                  className={cn(
                    "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.35rem] border shadow-xl transition-transform duration-300 sm:rounded-3xl md:group-hover/cover:scale-[1.02]",
                    playlist.isPremiumPlaylist
                      ? "border-amber-500/30 bg-gradient-to-br from-amber-500/35 via-amber-600/20 to-amber-500/25 shadow-amber-500/15"
                      : "border-border/80 bg-gradient-to-br from-primary/30 via-primary/10 to-primary/25 shadow-primary/15",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-0 rounded-[1.35rem] sm:rounded-3xl",
                      playlist.isPremiumPlaylist
                        ? "bg-gradient-to-br from-amber-500/15 to-amber-700/10"
                        : "bg-gradient-to-br from-primary/20 to-transparent",
                    )}
                  />
                  <RiPlayList2Fill
                    className={cn(
                      "relative z-10 h-14 w-14 sm:h-20 sm:w-20 md:h-32 md:w-32",
                      playlist.isPremiumPlaylist ? "text-amber-400" : "text-primary",
                    )}
                  />
                </div>
                {playlist.items && playlist.items.length > 0 ? (
                  <div className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full border-4 border-page bg-primary shadow-lg md:-bottom-2 md:-right-2 md:h-12 md:w-12">
                    <RiPlayLine className="ml-0.5 h-5 w-5 text-primary-foreground" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {playlist.isPremiumPlaylist ? (
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 backdrop-blur-sm dark:text-amber-400">
                    <RiStarLine className="mr-1.5 h-3 w-3" />
                    Premium
                  </Badge>
                ) : playlist.isPublic ? (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 backdrop-blur-sm dark:text-emerald-400">
                    <RiGlobalLine className="mr-1.5 h-3 w-3" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-border bg-muted text-muted-foreground backdrop-blur-sm">
                    <RiLockLine className="mr-1.5 h-3 w-3" />
                    Private
                  </Badge>
                )}
                {acceptedCollaborators.length > 0 ? (
                  <Badge variant="outline" className="border-border/80 bg-muted/60 text-muted-foreground backdrop-blur-sm">
                    <RiGroupLine className="mr-1.5 h-3 w-3" />
                    {acceptedCollaborators.length + 1} creators
                  </Badge>
                ) : null}
                {(playlist.saveCount ?? 0) > 0 ? (
                  <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary backdrop-blur-sm">
                    <RiBookmarkLine className="mr-1.5 h-3 w-3" />
                    {playlist.saveCount} saved
                  </Badge>
                ) : null}
              </div>

              <h1 className="mb-2 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                {playlist.name}
              </h1>

              {playlist.description ? (
                <p className="mx-auto mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mx-0 sm:text-base md:text-lg">
                  {playlist.description}
                </p>
              ) : null}

              <div className="mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-muted-foreground sm:justify-start">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-xs font-bold text-primary-foreground">
                    {(playlist.createdBy.firstName?.charAt(0) || playlist.createdBy.email?.charAt(0) || "?").toUpperCase()}
                  </div>
                  <span className="font-medium text-foreground/90">
                    {playlist.createdBy.firstName || playlist.createdBy.email.split("@")[0]}
                  </span>
                </div>
                <span className="hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5">
                  <RiStarLine className="h-4 w-4 text-primary" />
                  {playlist.itemCount} items
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5">
                  <RiTimeLine className="h-4 w-4" />
                  Updated{" "}
                  {new Date(playlist.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {playlist.hashtags && playlist.hashtags.length > 0 ? (
                <div className="mb-6 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {playlist.hashtags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/community?hashtag=${tag}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <RiHashtag className="h-3 w-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              ) : null}

              {/* Desktop / tablet primary actions */}
              <div className="hidden flex-wrap items-center justify-center gap-3 md:flex md:justify-start">
                {(playlist.isPublic || playlist.isPremiumPlaylist) && (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="h-11 min-h-11 rounded-2xl border-border px-6"
                    onClick={handleShare}
                  >
                    <RiShareLine className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                )}
                {isAuthenticated && !isOwner ? (
                  <Button
                    type="button"
                    size="lg"
                    disabled={isSaving}
                    className={cn(
                      "h-11 min-h-11 rounded-2xl px-6",
                      isSaved
                        ? "border border-primary/35 bg-primary/15 text-primary hover:bg-primary/20"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                    onClick={handleSavePlaylist}
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
                ) : null}
                {isOwner ? (
                  <>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="h-11 min-h-11 rounded-2xl border-border px-6"
                      onClick={() => setShowInviteModal(true)}
                    >
                      <RiUserAddLine className="mr-2 h-4 w-4" />
                      Invite
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="secondary"
                      className="h-11 min-h-11 rounded-2xl px-6"
                      onClick={() => setShowEditModal(true)}
                    >
                      <RiPencilLine className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        {(acceptedCollaborators.length > 0 || isOwner) && (
          <section className="mb-8 rounded-[1.35rem] border border-border/70 bg-card/80 p-4 backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
                <RiGroupLine className="h-5 w-5 text-primary" />
                Creators
              </h2>
              {isOwner ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 shrink-0 rounded-xl text-primary hover:bg-primary/10"
                  onClick={() => setShowInviteModal(true)}
                >
                  <RiUserAddLine className="mr-2 h-4 w-4" />
                  Invite
                </Button>
              ) : null}
            </div>
            <div className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              <div className="flex min-w-[min(100%,16rem)] shrink-0 items-center gap-3 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-sm font-bold text-primary-foreground shadow-md">
                  {(playlist.createdBy.firstName?.charAt(0) || playlist.createdBy.email?.charAt(0) || "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {playlist.createdBy.firstName || playlist.createdBy.email.split("@")[0]}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-primary">
                    <RiVipCrownLine className="h-3 w-3" />
                    Owner
                  </p>
                </div>
              </div>
              {acceptedCollaborators.map((collab) => (
                <div
                  key={collab._id}
                  className="flex min-w-[min(100%,16rem)] shrink-0 items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold text-foreground">
                    {(collab.firstName?.charAt(0) || collab.email?.charAt(0) || "?").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {collab.firstName || collab.email.split("@")[0]}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {collab.role === "editor" ? (
                        <>
                          <RiPencilLine className="h-3 w-3" />
                          Editor
                        </>
                      ) : (
                        <>
                          <RiGroupLine className="h-3 w-3" />
                          Viewer
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Items <span className="text-muted-foreground">({playlist.items.length})</span>
            </h2>
            {playlist.items.length > 0 ? (
              <div className="flex h-11 w-full items-center gap-1 rounded-2xl border border-border/80 bg-muted/50 p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors sm:flex-initial sm:px-4",
                    viewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                  )}
                  aria-pressed={viewMode === "list"}
                >
                  <RiListUnordered className="h-4 w-4" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors sm:flex-initial sm:px-4",
                    viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                  )}
                  aria-pressed={viewMode === "grid"}
                >
                  <RiDashboardLine className="h-4 w-4" />
                  Grid
                </button>
              </div>
            ) : null}
          </div>

          {playlist.items.length === 0 ? (
            <div className="rounded-[1.35rem] border border-border/70 bg-card/90 px-6 py-14 text-center backdrop-blur-sm sm:py-16">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                <RiPlayList2Fill className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground">No items yet</h3>
              <p className="mx-auto mb-8 max-w-sm text-sm text-muted-foreground">
                Add opportunities, jobs, events, or resources to this playlist.
              </p>
              <Link href="/">
                <Button type="button" size="lg" className="h-11 min-h-11 rounded-2xl px-8">
                  Browse content
                </Button>
              </Link>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {playlist.items.map((item, gi) => {
                const itemType = item.contentType || "opportunity"
                const config = typeConfig[itemType as keyof typeof typeConfig] || typeConfig.opportunity
                const Icon = config.icon
                const detailUrl = `/${config.path}/${item.contentId || item._id}`

                return (
                  <Link
                    key={item._id}
                    href={detailUrl}
                    className={cn(
                      "group relative overflow-hidden rounded-[1.25rem] border border-border/70 bg-card/80 transition-all duration-200 animate-fade-in-up hover:border-primary/25",
                      removingItemId === item._id && "pointer-events-none opacity-50",
                    )}
                    style={{
                      animationDelay: `${Math.min(gi, 10) * 40}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <div className={cn("relative h-28 bg-gradient-to-br sm:h-32", config.gradient)}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className={cn("h-11 w-11 sm:h-12 sm:w-12", typeIconClass(config.color))} />
                      </div>
                      <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
                        <Badge variant="outline" className={typeBadgeClass(config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="mb-2 line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      {item.description ? (
                        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                      ) : null}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <RiTimeLine className="h-3 w-3" />
                        <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleRemoveItem(item._id)
                        }}
                        className={cn(
                          "absolute left-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-foreground transition-opacity hover:bg-black/80",
                          "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                        )}
                        aria-label="Remove from playlist"
                      >
                        <RiCloseLine className="h-5 w-5" />
                      </button>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          ) : (
            <ul className="space-y-2">
              {playlist.items.map((item, index) => {
                const itemType = item.contentType || "opportunity"
                const config = typeConfig[itemType as keyof typeof typeConfig] || typeConfig.opportunity
                const Icon = config.icon
                const detailUrl = `/${config.path}/${item.contentId || item._id}`

                return (
                  <li
                    key={item._id}
                    className="animate-fade-in-up"
                    style={{
                      animationDelay: `${Math.min(index, 12) * 35}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <Link
                      href={detailUrl}
                      className={cn(
                        "group flex min-h-[4.5rem] items-center gap-3 rounded-[1.15rem] border border-border/70 bg-card/70 p-3 transition-all duration-200 active:scale-[0.99] sm:gap-4 sm:p-4",
                        "hover:border-primary/20 hover:bg-muted/40",
                        removingItemId === item._id && "pointer-events-none opacity-50",
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </div>
                      <div
                        className={cn(
                          "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br transition-transform duration-200 sm:h-16 sm:w-16",
                          config.gradient,
                          "group-hover:scale-[1.03]",
                        )}
                      >
                        <Icon className={cn("h-7 w-7 sm:h-8 sm:w-8", typeIconClass(config.color))} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={typeBadgeSmallClass(config.color)}>
                                {config.label}
                              </Badge>
                              {(item.company || item.organization || item.author) && (
                                <span className="flex min-w-0 max-w-full items-center gap-1 truncate text-xs text-muted-foreground">
                                  <RiBuildingLine className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{item.company || item.organization || item.author}</span>
                                </span>
                              )}
                            </div>
                            <h3 className="line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-primary sm:line-clamp-1">
                              {item.title}
                            </h3>
                            {item.description ? (
                              <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{item.description}</p>
                            ) : null}
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              {item.location ? (
                                <span className="flex max-w-[10rem] items-center gap-1 truncate sm:max-w-none">
                                  <RiMapPinLine className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{item.location}</span>
                                </span>
                              ) : null}
                              <span className="flex items-center gap-1">
                                <RiTimeLine className="h-3 w-3" />
                                {new Date(item.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                              {item.addedBy ? (
                                <span className="truncate">
                                  · {item.addedBy.firstName || item.addedBy.email.split("@")[0]}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                window.open(detailUrl, "_blank")
                              }}
                              aria-label="Open in new tab"
                            >
                              <RiExternalLinkLine className="h-4 w-4" />
                            </Button>
                            {canEdit ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-destructive"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleRemoveItem(item._id)
                                }}
                                aria-label="Remove from playlist"
                              >
                                <RiCloseLine className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

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
