"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePlaylist, Playlist, PlaylistItem } from '@/contexts/playlist-context'
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
import { toast } from 'sonner'

const typeConfig = {
  opportunity: { icon: RiFocus3Line, color: 'orange', label: 'Opportunity', path: 'opportunities', gradient: 'from-orange-500/20 to-orange-600/10' },
  job: { icon: RiBriefcaseLine, color: 'primary', label: 'Job', path: 'jobs', gradient: 'from-primary/20 to-primary/10' },
  event: { icon: RiCalendarLine, color: 'emerald', label: 'Event', path: 'events', gradient: 'from-emerald-500/20 to-emerald-600/10' },
  resource: { icon: RiBookLine, color: 'violet', label: 'Resource', path: 'resources', gradient: 'from-violet-500/20 to-violet-600/10' }
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

  const playlistId = params.id as string
  const [isLoading, setIsLoading] = useState(true)
  const isSaved = isPlaylistSaved(playlistId)

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
      } catch (err) {
        console.error('Error loading playlist:', err)
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
  const isPremiumGated = playlist?.isPremiumPlaylist && !canViewPremium && !isOwner

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

  // Premium gate: only premium users (or playlist owner) can view premium playlists
  if (isPremiumGated) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
            <RiStarLine className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Premium Playlist</h1>
          <p className="text-muted-foreground mb-6">
            This playlist is for premium members only. Upgrade to view and save premium playlists.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white rounded-full">
              <Link href="/premium">Upgrade to Premium</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-border">
              <Link href="/playlists">
                <RiArrowLeftLine className="w-4 h-4 mr-2 inline" />
                Back to Playlists
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Group items by type for better organization
  const groupedItems = playlist.items.reduce((acc, item) => {
    const type = item.contentType || 'opportunity'
    if (!acc[type]) acc[type] = []
    acc[type].push(item)
    return acc
  }, {} as Record<string, typeof playlist.items>)

  return (
    <div className="min-h-screen bg-page pb-24 lg:pb-8">
      {/* Hero Section with Gradient Background */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-violet-500/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent" />
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-page/60 backdrop-blur-2xl border-b border-border">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between py-4">
              <Link 
                href="/playlists" 
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
              >
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-card/[0.1] transition-colors">
                  <RiArrowLeftLine className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">Back</span>
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                >
                  <RiRefreshLine className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                </Button>

                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                      >
                        <RiMore2Line className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="p-1">
                      <DropdownMenuItem
                        onClick={() => setShowEditModal(true)}
                        className="text-foreground hover:bg-muted cursor-pointer rounded-lg"
                      >
                        <RiPencilLine className="w-4 h-4 mr-2" />
                        Edit Playlist
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowInviteModal(true)}
                        className="text-foreground hover:bg-muted cursor-pointer rounded-lg"
                      >
                        <RiUserAddLine className="w-4 h-4 mr-2" />
                        Invite Collaborators
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-muted" />
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer rounded-lg"
                      >
                        <RiDeleteBinLine className="w-4 h-4 mr-2" />
                        Delete Playlist
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8">
            {/* Cover Art */}
            <div className="relative group">
              <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl bg-gradient-to-br from-orange-500/30 via-violet-500/20 to-orange-500/30 border border-border flex items-center justify-center shadow-2xl shadow-primary/20 transition-transform group-hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-violet-500/20 rounded-3xl" />
                <RiPlayList2Fill className="w-24 h-24 md:w-32 md:h-32 text-orange-400 relative z-10" />
              </div>
              {playlist.items.length > 0 && (
                <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-[#0a0a0a]">
                  <RiPlayLine className="w-5 h-5 text-foreground ml-0.5" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {playlist.isPremiumPlaylist && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 backdrop-blur-sm">
                    <RiStarLine className="w-3 h-3 mr-1.5" />
                    Premium
                  </Badge>
                )}
                {playlist.isPublic ? (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 backdrop-blur-sm">
                    <RiGlobalLine className="w-3 h-3 mr-1.5" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-border text-muted-foreground bg-muted backdrop-blur-sm">
                    <RiLockLine className="w-3 h-3 mr-1.5" />
                    Private
                  </Badge>
                )}
                {acceptedCollaborators.length > 0 && (
                  <Badge variant="outline" className="border-violet-500/40 text-violet-400 bg-violet-500/10 backdrop-blur-sm">
                    <RiGroupLine className="w-3 h-3 mr-1.5" />
                    {acceptedCollaborators.length + 1} Creators
                  </Badge>
                )}
                {(playlist.saveCount ?? 0) > 0 && (
                  <Badge variant="outline" className="border-orange-500/40 text-orange-400 bg-primary/10 backdrop-blur-sm">
                    <RiBookmarkLine className="w-3 h-3 mr-1.5" />
                    {playlist.saveCount} saved
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-3 leading-tight">
                {playlist.name}
              </h1>
              
              {playlist.description && (
                <p className="text-muted-foreground mb-4 text-base md:text-lg leading-relaxed max-w-2xl">
                  {playlist.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold text-foreground">
                    {(playlist.createdBy.firstName?.charAt(0) || playlist.createdBy.email?.charAt(0) || '?').toUpperCase()}
                  </div>
                  <span className="font-medium">{playlist.createdBy.firstName || playlist.createdBy.email.split('@')[0]}</span>
                </div>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <RiStarLine className="w-4 h-4" />
                  {playlist.itemCount} items
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <RiTimeLine className="w-4 h-4" />
                  Updated {new Date(playlist.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Hashtags */}
              {playlist.hashtags && playlist.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {playlist.hashtags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/community?hashtag=${tag}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-card/[0.1] text-orange-400 text-xs font-medium transition-colors border border-border"
                    >
                      <RiHashtag className="w-3 h-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                {playlist.isPublic && (
                  <Button 
                    onClick={handleShare} 
                    size="lg" 
                    className="bg-muted hover:bg-muted text-foreground border border-border rounded-full px-6 backdrop-blur-sm"
                  >
                    <RiShareLine className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                )}
                {isAuthenticated && !isOwner && (
                  <Button 
                    onClick={handleSavePlaylist} 
                    disabled={isSaving}
                    size="lg" 
                    className={cn(
                      "rounded-full px-6 transition-all backdrop-blur-sm",
                      isSaved 
                        ? "bg-primary/20 hover:bg-primary/30 text-orange-400 border border-orange-500/30" 
                        : "bg-muted hover:bg-muted text-foreground border border-border"
                    )}
                  >
                    {isSaving ? (
                      <RiLoader4Line className="w-4 h-4 mr-2 animate-spin" />
                    ) : isSaved ? (
                      <RiBookmarkFill className="w-4 h-4 mr-2" />
                    ) : (
                      <RiBookmarkLine className="w-4 h-4 mr-2" />
                    )}
                    {isSaved ? 'Saved' : 'Save'}
                  </Button>
                )}
                {isOwner && (
                  <>
                    <Button 
                      onClick={() => setShowInviteModal(true)} 
                      size="lg" 
                      className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 rounded-full px-6 backdrop-blur-sm"
                    >
                      <RiUserAddLine className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                    <Button 
                      onClick={() => setShowEditModal(true)} 
                      size="lg" 
                      className="bg-muted hover:bg-muted text-foreground border border-border rounded-full px-6 backdrop-blur-sm"
                    >
                      <RiPencilLine className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Collaborators Section */}
        {(acceptedCollaborators.length > 0 || isOwner) && (
          <div className="mb-8 rounded-2xl bg-card border border-border p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <RiGroupLine className="w-5 h-5 text-violet-400" />
                Creators
              </h2>
              {isOwner && (
                <Button
                  onClick={() => setShowInviteModal(true)}
                  variant="ghost"
                  size="sm"
                  className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-full"
                >
                  <RiUserAddLine className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              {/* Owner */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 hover:border-orange-500/30 transition-colors">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-bold text-foreground shadow-lg">
                  {(playlist.createdBy.firstName?.charAt(0) || playlist.createdBy.email?.charAt(0) || '?').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {playlist.createdBy.firstName || playlist.createdBy.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-orange-400 flex items-center gap-1">
                    <RiVipCrownLine className="w-3 h-3" />
                    Owner
                  </p>
                </div>
              </div>
              
              {/* Collaborators */}
              {acceptedCollaborators.map((collab) => (
                <div key={collab._id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted border border-border hover:bg-muted hover:border-border transition-colors">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500/30 to-violet-600/20 flex items-center justify-center text-sm font-bold text-foreground border border-violet-500/20">
                    {(collab.firstName?.charAt(0) || collab.email?.charAt(0) || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {collab.firstName || collab.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-violet-400 flex items-center gap-1">
                      {collab.role === 'editor' ? (
                        <>
                          <RiPencilLine className="w-3 h-3" />
                          Editor
                        </>
                      ) : (
                        <>
                          <RiGroupLine className="w-3 h-3" />
                          Viewer
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Items ({playlist.items.length})</h2>
            
            {playlist.items.length > 0 && (
              <div className="flex items-center gap-2 p-1 rounded-full bg-muted border border-border">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    viewMode === 'list' 
                      ? "bg-primary/20 text-orange-400" 
                      : "text-muted-foreground hover:text-muted-foreground"
                  )}
                >
                  <RiListUnordered className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    viewMode === 'grid' 
                      ? "bg-primary/20 text-orange-400" 
                      : "text-muted-foreground hover:text-muted-foreground"
                  )}
                >
                  <RiDashboardLine className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {playlist.items.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6 border border-border">
                <RiPlayList2Fill className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No Items Yet</h3>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                Start adding opportunities, jobs, events, or resources to this playlist.
              </p>
              <Link href="/">
                <Button size="lg" className="bg-primary hover:bg-primary/90 rounded-full px-8">
                  Browse Content
                </Button>
              </Link>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlist.items.map((item) => {
                const itemType = item.contentType || 'opportunity'
                const config = typeConfig[itemType] || typeConfig.opportunity
                const Icon = config.icon
                const detailUrl = `/${config.path}/${item.contentId || item._id}`

                return (
                  <Link
                    key={item._id}
                    href={detailUrl}
                    className={cn(
                      "group relative rounded-2xl bg-card border border-border overflow-hidden hover:border-border transition-all",
                      removingItemId === item._id && "opacity-50 pointer-events-none"
                    )}
                  >
                    {/* Image/Icon Header */}
                    <div className={cn(
                      "relative h-32 bg-gradient-to-br",
                      config.gradient
                    )}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className={cn(
                          "w-12 h-12",
                          config.color === 'orange' && "text-orange-400",
                          config.color === 'primary' && "text-primary",
                          config.color === 'emerald' && "text-emerald-400",
                          config.color === 'violet' && "text-violet-400"
                        )} />
                      </div>
                      <div className="absolute top-3 right-3">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs font-medium backdrop-blur-sm",
                            config.color === 'orange' && "border-orange-500/30 text-orange-400 bg-primary/10",
                            config.color === 'primary' && "border-primary/30 text-primary bg-primary/10",
                            config.color === 'emerald' && "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
                            config.color === 'violet' && "border-violet-500/30 text-violet-400 bg-violet-500/10"
                          )}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-orange-400 transition-colors">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <RiTimeLine className="w-3 h-3" />
                        <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Remove Button (if can edit) */}
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleRemoveItem(item._id)
                        }}
                        className="absolute top-2 left-2 p-2 rounded-full bg-black/60 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <RiCloseLine className="w-4 h-4 text-foreground" />
                      </button>
                    )}
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {playlist.items.map((item, index) => {
                const itemType = item.contentType || 'opportunity'
                const config = typeConfig[itemType] || typeConfig.opportunity
                const Icon = config.icon
                const detailUrl = `/${config.path}/${item.contentId || item._id}`

                return (
                  <Link
                    key={item._id}
                    href={detailUrl}
                    className={cn(
                      "group relative flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted hover:border-border transition-all duration-200",
                      removingItemId === item._id && "opacity-50 pointer-events-none"
                    )}
                  >
                    {/* Number Badge */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center">
                      <span className="text-xs font-bold text-muted-foreground group-hover:text-muted-foreground transition-colors">
                        {index + 1}
                      </span>
                    </div>

                    {/* Thumbnail/Icon */}
                    <div className={cn(
                      "relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden",
                      "bg-gradient-to-br",
                      config.gradient,
                      "border border-border group-hover:scale-105 transition-transform duration-200"
                    )}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className={cn(
                          "w-7 h-7",
                          config.color === 'orange' && "text-orange-400",
                          config.color === 'primary' && "text-primary",
                          config.color === 'emerald' && "text-emerald-400",
                          config.color === 'violet' && "text-violet-400"
                        )} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex-1 min-w-0">
                          {/* Type Badge & Provider */}
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5",
                                config.color === 'orange' && "border-orange-500/40 text-orange-400 bg-primary/10",
                                config.color === 'primary' && "border-primary/30 text-primary bg-primary/10",
                                config.color === 'emerald' && "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
                                config.color === 'violet' && "border-violet-500/40 text-violet-400 bg-violet-500/10"
                              )}
                            >
                              {config.label}
                            </Badge>
                            {(item.company || item.organization || item.author) && (
                              <>
                                <span className="text-muted-foreground text-xs">•</span>
                                <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                  <RiBuildingLine className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{item.company || item.organization || item.author}</span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-base font-semibold text-foreground group-hover:text-orange-400 transition-colors line-clamp-1 mb-1">
                            {item.title}
                          </h3>

                          {/* Description */}
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-1.5">
                              {item.description}
                            </p>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <RiMapPinLine className="w-3 h-3" />
                                <span className="truncate">{item.location}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
<RiTimeLine className="w-3 h-3" />
                        Added {new Date(item.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            {item.addedBy && (
                              <>
                                <span>•</span>
                                <span className="truncate">
                                  by {item.addedBy.firstName || item.addedBy.email.split('@')[0]}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              window.open(detailUrl, '_blank')
                            }}
                          >
                            <RiExternalLinkLine className="w-4 h-4" />
                          </Button>

                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleRemoveItem(item._id)
                              }}
                            >
                              <RiCloseLine className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hover Indicator */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-l-full group-hover:h-8 transition-all duration-200 opacity-0 group-hover:opacity-100" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
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
