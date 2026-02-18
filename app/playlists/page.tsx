"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { usePlaylist, Playlist } from '@/contexts/playlist-context'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import PlaylistModal from '@/components/playlist-modal'
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
} from 'react-icons/ri'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type TabType = 'my' | 'shared' | 'saved' | 'public'

export default function PlaylistsPage() {
  const { playlists, publicPlaylists, sharedPlaylists, savedPlaylists, isLoading, deletePlaylist, fetchPublicPlaylists, fetchPlaylists, fetchSavedPlaylists } = usePlaylist()
  const { isAuthenticated, user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>(isAuthenticated ? 'my' : 'public')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    // Fetch data - loading state is managed by context
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
      console.error('Error deleting playlist:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const getCurrentPlaylists = () => {
    switch (activeTab) {
      case 'my': return playlists
      case 'shared': return sharedPlaylists
      case 'saved': return savedPlaylists
      case 'public': return publicPlaylists
      default: return []
    }
  }

  const currentPlaylists = getCurrentPlaylists()

  const isOwner = (playlist: Playlist) => {
    if (!user || !playlist.createdBy) return false
    return user._id === playlist.createdBy._id || user.email === playlist.createdBy.email
  }

  return (
    <div className="min-h-screen bg-page pb-24 lg:pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-page/80 backdrop-blur-2xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="py-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center">
                  <RiPlayList2Fill className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Playlists</h1>
                  <p className="text-xs text-muted-foreground">Organize your favorite content</p>
                </div>
              </div>
              {isAuthenticated && (
                <Button 
                  onClick={() => setShowCreateModal(true)} 
                  className="bg-primary hover:bg-primary/90 text-foreground rounded-full h-9 px-4"
                >
                  <RiAddLine className="w-4 h-4 mr-2" />
                  New Playlist
                </Button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border">
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => setActiveTab('my')}
                    className={cn(
                      "px-4 py-3 text-sm font-semibold relative transition-colors",
                      activeTab === 'my'
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-muted-foreground"
                    )}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <RiPlayList2Fill className="w-4 h-4" />
                      My Playlists
                      {playlists.length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-muted rounded-full">
                          {playlists.length}
                        </span>
                      )}
                    </span>
                    {activeTab === 'my' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('shared')}
                    className={cn(
                      "px-4 py-3 text-sm font-semibold relative transition-colors",
                      activeTab === 'shared'
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-muted-foreground"
                    )}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <RiUserAddLine className="w-4 h-4" />
                      Shared
                      {sharedPlaylists.length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded-full">
                          {sharedPlaylists.length}
                        </span>
                      )}
                    </span>
                    {activeTab === 'shared' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('saved')}
                    className={cn(
                      "px-4 py-3 text-sm font-semibold relative transition-colors",
                      activeTab === 'saved'
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-muted-foreground"
                    )}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <RiBookmarkLine className="w-4 h-4" />
                      Saved
                      {savedPlaylists.length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-primary/20 text-orange-400 rounded-full">
                          {savedPlaylists.length}
                        </span>
                      )}
                    </span>
                    {activeTab === 'saved' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab('public')}
                className={cn(
                  "px-4 py-3 text-sm font-semibold relative transition-colors",
                  activeTab === 'public'
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-muted-foreground"
                )}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <RiGlobalLine className="w-4 h-4" />
                  Discover
                </span>
                {activeTab === 'public' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : currentPlaylists.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mx-auto mb-4">
              {activeTab === 'my' ? (
                <RiPlayList2Fill className="w-10 h-10 text-orange-500/50" />
              ) : activeTab === 'shared' ? (
                <RiUserAddLine className="w-10 h-10 text-violet-500/50" />
              ) : activeTab === 'saved' ? (
                <RiBookmarkLine className="w-10 h-10 text-orange-500/50" />
              ) : (
                <RiGlobalLine className="w-10 h-10 text-emerald-500/50" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {activeTab === 'my' ? 'No Playlists Yet' : 
               activeTab === 'shared' ? 'No Shared Playlists' :
               activeTab === 'saved' ? 'No Saved Playlists' :
               'No Public Playlists'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {activeTab === 'my'
                ? 'Create your first playlist to organize opportunities, jobs, events, and resources.'
                : activeTab === 'shared'
                ? 'You haven\'t been invited to any playlists yet. When someone invites you to collaborate, it will appear here.'
                : activeTab === 'saved'
                ? 'You haven\'t saved any playlists yet. Browse public playlists and save the ones you like!'
                : 'Be the first to share a public playlist with the community!'}
            </p>
            {isAuthenticated && activeTab !== 'shared' && activeTab !== 'saved' && (
              <Button 
                onClick={() => setShowCreateModal(true)} 
                className="bg-primary hover:bg-primary/90 text-foreground rounded-full"
              >
                <RiAddLine className="w-4 h-4 mr-2" />
                Create Playlist
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentPlaylists.map((playlist) => {
              const acceptedCollaborators = playlist.collaborators?.filter(c => c.status === 'accepted') || []
              const canManage = activeTab === 'my' && isOwner(playlist)
              
              return (
                <div
                  key={playlist._id}
                  className={cn(
                    "group rounded-2xl border transition-all duration-200",
                    "bg-card border-border",
                    "hover:bg-muted hover:border-border",
                    deletingId === playlist._id && "opacity-50"
                  )}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Cover */}
                      <Link href={`/playlists/${playlist._id}`} className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-violet-500/30 transition-all shadow-lg">
                          <RiPlayList2Fill className="w-9 h-9 text-orange-500" />
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <Link href={`/playlists/${playlist._id}`}>
                              <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-orange-400 transition-colors mb-1">
                                {playlist.name}
                              </h3>
                            </Link>
                            
                            {playlist.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {playlist.description}
                              </p>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center flex-wrap gap-2">
                              {playlist.isPublic ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                                  <RiGlobalLine className="w-3 h-3" />
                                  Public
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                                  <RiLockLine className="w-3 h-3" />
                                  Private
                                </span>
                              )}
                              {acceptedCollaborators.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 text-xs font-medium">
                                  <RiGroupLine className="w-3 h-3" />
                                  {acceptedCollaborators.length + 1} members
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{playlist.itemCount || 0} items</span>
                              {(playlist.saveCount ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-400">
                                  <RiBookmarkLine className="w-3 h-3" />
                                  {playlist.saveCount} saved
                                </span>
                              )}
                            </div>

                            {/* Creator info for shared/public playlists */}
                            {activeTab !== 'my' && playlist.createdBy && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                <RiVipCrownLine className="w-3 h-3" />
                                <span>By {playlist.createdBy.firstName || playlist.createdBy.email?.split('@')[0] || 'Unknown'}</span>
                              </div>
                            )}

                            {/* Hashtags */}
                            {playlist.hashtags && playlist.hashtags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {playlist.hashtags.slice(0, 4).map((tag) => (
                                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
                                    #{tag}
                                  </span>
                                ))}
                                {playlist.hashtags.length > 4 && (
                                  <span className="text-xs text-muted-foreground">+{playlist.hashtags.length - 4}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <RiMore2Line className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-surface border-border rounded-xl">
                                <DropdownMenuItem
                                  onClick={() => setEditingPlaylist(playlist)}
                                  className="text-muted-foreground hover:text-foreground focus:text-foreground focus:bg-muted cursor-pointer"
                                >
                                  <RiPencilLine className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-muted" />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(playlist)}
                                  className="text-red-400 hover:text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                                >
                                  <RiDeleteBinLine className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* View Link */}
                    <Link
                      href={`/playlists/${playlist._id}`}
                      className="flex items-center justify-end gap-1 mt-4 pt-4 border-t border-border text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors"
                    >
                      View Playlist
                      <RiArrowRightLine className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <PlaylistModal
        isOpen={showCreateModal || editingPlaylist !== null}
        onClose={() => {
          setShowCreateModal(false)
          setEditingPlaylist(null)
        }}
        editPlaylist={editingPlaylist || undefined}
      />
    </div>
  )
}
