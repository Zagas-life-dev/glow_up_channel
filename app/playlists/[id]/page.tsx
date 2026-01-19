"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePlaylist, Playlist, PlaylistItem } from '@/contexts/playlist-context'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import PlaylistModal from '@/components/playlist-modal'
import InviteCollaboratorModal from '@/components/invite-collaborator-modal'
import PlaylistDetailSkeleton from '@/components/skeletons/playlist-detail-skeleton'
import {
  ListMusic,
  ArrowLeft,
  Globe,
  Lock,
  Hash,
  Edit,
  Trash2,
  Target,
  Briefcase,
  Calendar,
  BookOpen,
  MoreVertical,
  Share2,
  Clock,
  Users,
  UserPlus,
  Crown,
  Bookmark,
  BookmarkCheck,
  Loader2,
  MapPin,
  Building,
  ExternalLink,
  X,
  RefreshCw,
  Grid3x3,
  List,
  Play,
  Sparkles
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'sonner'

const typeConfig = {
  opportunity: { icon: Target, color: 'orange', label: 'Opportunity', path: 'opportunities', gradient: 'from-orange-500/20 to-orange-600/10' },
  job: { icon: Briefcase, color: 'blue', label: 'Job', path: 'jobs', gradient: 'from-blue-500/20 to-blue-600/10' },
  event: { icon: Calendar, color: 'emerald', label: 'Event', path: 'events', gradient: 'from-emerald-500/20 to-emerald-600/10' },
  resource: { icon: BookOpen, color: 'violet', label: 'Resource', path: 'resources', gradient: 'from-violet-500/20 to-violet-600/10' }
}

type ViewMode = 'grid' | 'list'

export default function PlaylistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { getPlaylistById, removeFromPlaylist, deletePlaylist, fetchPublicPlaylists, fetchPlaylists, canEditPlaylist, savePlaylist, unsavePlaylist, isPlaylistSaved } = usePlaylist()
  const { user, isAuthenticated } = useAuth()
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
    user.id === playlist.createdBy._id || 
    user.email === playlist.createdBy.email
  )

  const canEdit = playlist ? canEditPlaylist(playlist) : false

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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <ListMusic className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Playlist Not Found</h2>
          <p className="text-white/50 text-sm mb-6">This playlist may have been deleted or is private.</p>
          <Link href="/playlists">
            <Button variant="outline" className="border-white/10 text-white rounded-full px-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Playlists
            </Button>
          </Link>
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
    <div className="min-h-screen bg-[#0a0a0a] pb-24 lg:pb-8">
      {/* Hero Section with Gradient Background */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-violet-500/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent" />
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-[#0a0a0a]/60 backdrop-blur-2xl border-b border-white/[0.08]">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between py-4">
              <Link 
                href="/playlists" 
                className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
              >
                <div className="p-1.5 rounded-lg bg-white/[0.05] group-hover:bg-white/[0.1] transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">Back</span>
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white hover:bg-white/[0.05] rounded-full"
                >
                  <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                </Button>

                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white hover:bg-white/[0.05] rounded-full"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#141414] border-white/[0.08] rounded-xl p-1">
                      <DropdownMenuItem
                        onClick={() => setShowEditModal(true)}
                        className="text-white hover:bg-white/[0.05] cursor-pointer rounded-lg"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Playlist
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowInviteModal(true)}
                        className="text-white hover:bg-white/[0.05] cursor-pointer rounded-lg"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Collaborators
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/[0.06]" />
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
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
              <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl bg-gradient-to-br from-orange-500/30 via-violet-500/20 to-orange-500/30 border border-white/[0.1] flex items-center justify-center shadow-2xl shadow-orange-500/20 transition-transform group-hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-violet-500/20 rounded-3xl" />
                <ListMusic className="w-24 h-24 md:w-32 md:h-32 text-orange-400 relative z-10" />
              </div>
              {playlist.items.length > 0 && (
                <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-lg border-4 border-[#0a0a0a]">
                  <Play className="w-5 h-5 text-white ml-0.5" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {playlist.isPublic ? (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 backdrop-blur-sm">
                    <Globe className="w-3 h-3 mr-1.5" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-white/30 text-white/70 bg-white/[0.05] backdrop-blur-sm">
                    <Lock className="w-3 h-3 mr-1.5" />
                    Private
                  </Badge>
                )}
                {acceptedCollaborators.length > 0 && (
                  <Badge variant="outline" className="border-violet-500/40 text-violet-400 bg-violet-500/10 backdrop-blur-sm">
                    <Users className="w-3 h-3 mr-1.5" />
                    {acceptedCollaborators.length + 1} Creators
                  </Badge>
                )}
                {(playlist.saveCount ?? 0) > 0 && (
                  <Badge variant="outline" className="border-orange-500/40 text-orange-400 bg-orange-500/10 backdrop-blur-sm">
                    <Bookmark className="w-3 h-3 mr-1.5" />
                    {playlist.saveCount} saved
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 leading-tight">
                {playlist.name}
              </h1>
              
              {playlist.description && (
                <p className="text-white/70 mb-4 text-base md:text-lg leading-relaxed max-w-2xl">
                  {playlist.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-white/50 mb-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white">
                    {(playlist.createdBy.firstName?.charAt(0) || playlist.createdBy.email?.charAt(0) || '?').toUpperCase()}
                  </div>
                  <span className="font-medium">{playlist.createdBy.firstName || playlist.createdBy.email.split('@')[0]}</span>
                </div>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {playlist.itemCount} items
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-orange-400 text-xs font-medium transition-colors border border-white/[0.08]"
                    >
                      <Hash className="w-3 h-3" />
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
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-6 backdrop-blur-sm"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
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
                        ? "bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30" 
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : isSaved ? (
                      <BookmarkCheck className="w-4 h-4 mr-2" />
                    ) : (
                      <Bookmark className="w-4 h-4 mr-2" />
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
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                    <Button 
                      onClick={() => setShowEditModal(true)} 
                      size="lg" 
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-6 backdrop-blur-sm"
                    >
                      <Edit className="w-4 h-4 mr-2" />
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
          <div className="mb-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-400" />
                Creators
              </h2>
              {isOwner && (
                <Button
                  onClick={() => setShowInviteModal(true)}
                  variant="ghost"
                  size="sm"
                  className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-full"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              {/* Owner */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-500/5 border border-orange-500/20 hover:border-orange-500/30 transition-colors">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                  {(playlist.createdBy.firstName?.charAt(0) || playlist.createdBy.email?.charAt(0) || '?').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {playlist.createdBy.firstName || playlist.createdBy.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-orange-400 flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Owner
                  </p>
                </div>
              </div>
              
              {/* Collaborators */}
              {acceptedCollaborators.map((collab) => (
                <div key={collab._id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-colors">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500/30 to-violet-600/20 flex items-center justify-center text-sm font-bold text-white border border-violet-500/20">
                    {(collab.firstName?.charAt(0) || collab.email?.charAt(0) || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {collab.firstName || collab.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-violet-400 flex items-center gap-1">
                      {collab.role === 'editor' ? (
                        <>
                          <Edit className="w-3 h-3" />
                          Editor
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3" />
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
            <h2 className="text-2xl font-bold text-white">Items ({playlist.items.length})</h2>
            
            {playlist.items.length > 0 && (
              <div className="flex items-center gap-2 p-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    viewMode === 'list' 
                      ? "bg-orange-500/20 text-orange-400" 
                      : "text-white/50 hover:text-white/70"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    viewMode === 'grid' 
                      ? "bg-orange-500/20 text-orange-400" 
                      : "text-white/50 hover:text-white/70"
                  )}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {playlist.items.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6 border border-white/[0.08]">
                <ListMusic className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Items Yet</h3>
              <p className="text-sm text-white/50 mb-8 max-w-sm mx-auto">
                Start adding opportunities, jobs, events, or resources to this playlist.
              </p>
              <Link href="/">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 rounded-full px-8">
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
                      "group relative rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-all",
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
                          config.color === 'blue' && "text-blue-400",
                          config.color === 'emerald' && "text-emerald-400",
                          config.color === 'violet' && "text-violet-400"
                        )} />
                      </div>
                      <div className="absolute top-3 right-3">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs font-medium backdrop-blur-sm",
                            config.color === 'orange' && "border-orange-500/30 text-orange-400 bg-orange-500/10",
                            config.color === 'blue' && "border-blue-500/30 text-blue-400 bg-blue-500/10",
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
                      <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-orange-400 transition-colors">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-white/60 line-clamp-2 mb-3">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Clock className="w-3 h-3" />
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
                        <X className="w-4 h-4 text-white" />
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
                      "group relative flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-200",
                      removingItemId === item._id && "opacity-50 pointer-events-none"
                    )}
                  >
                    {/* Number Badge */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                      <span className="text-xs font-bold text-white/40 group-hover:text-white/60 transition-colors">
                        {index + 1}
                      </span>
                    </div>

                    {/* Thumbnail/Icon */}
                    <div className={cn(
                      "relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden",
                      "bg-gradient-to-br",
                      config.gradient,
                      "border border-white/[0.08] group-hover:scale-105 transition-transform duration-200"
                    )}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className={cn(
                          "w-7 h-7",
                          config.color === 'orange' && "text-orange-400",
                          config.color === 'blue' && "text-blue-400",
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
                                config.color === 'orange' && "border-orange-500/40 text-orange-400 bg-orange-500/10",
                                config.color === 'blue' && "border-blue-500/40 text-blue-400 bg-blue-500/10",
                                config.color === 'emerald' && "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
                                config.color === 'violet' && "border-violet-500/40 text-violet-400 bg-violet-500/10"
                              )}
                            >
                              {config.label}
                            </Badge>
                            {(item.company || item.organization || item.author) && (
                              <>
                                <span className="text-white/20 text-xs">•</span>
                                <span className="text-xs text-white/50 truncate flex items-center gap-1">
                                  <Building className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{item.company || item.organization || item.author}</span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-base font-semibold text-white group-hover:text-orange-400 transition-colors line-clamp-1 mb-1">
                            {item.title}
                          </h3>

                          {/* Description */}
                          {item.description && (
                            <p className="text-sm text-white/60 line-clamp-1 mb-1.5">
                              {item.description}
                            </p>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center gap-2.5 text-xs text-white/40 flex-wrap">
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{item.location}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
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
                            className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/[0.08] rounded-lg"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              window.open(detailUrl, '_blank')
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>

                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleRemoveItem(item._id)
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hover Indicator */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-orange-500 rounded-l-full group-hover:h-8 transition-all duration-200 opacity-0 group-hover:opacity-100" />
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
