"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { usePlaylist, Playlist } from '@/contexts/playlist-context'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import PlaylistModal from '@/components/playlist-modal'
import {
  ListMusic,
  Plus,
  Globe,
  Lock,
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight,
  Users,
  UserPlus,
  Crown,
  Bookmark,
  Loader2,
  Sparkles
} from 'lucide-react'
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
    return user.id === playlist.createdBy._id || user.email === playlist.createdBy.email
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 lg:pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="py-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center">
                  <ListMusic className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Playlists</h1>
                  <p className="text-xs text-white/50">Organize your favorite content</p>
                </div>
              </div>
              {isAuthenticated && (
                <Button 
                  onClick={() => setShowCreateModal(true)} 
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full h-9 px-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Playlist
                </Button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-white/[0.08]">
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => setActiveTab('my')}
                    className={cn(
                      "px-4 py-3 text-sm font-semibold relative transition-colors",
                      activeTab === 'my'
                        ? "text-white"
                        : "text-white/50 hover:text-white/70"
                    )}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <ListMusic className="w-4 h-4" />
                      My Playlists
                      {playlists.length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-white/10 rounded-full">
                          {playlists.length}
                        </span>
                      )}
                    </span>
                    {activeTab === 'my' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('shared')}
                    className={cn(
                      "px-4 py-3 text-sm font-semibold relative transition-colors",
                      activeTab === 'shared'
                        ? "text-white"
                        : "text-white/50 hover:text-white/70"
                    )}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
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
                        ? "text-white"
                        : "text-white/50 hover:text-white/70"
                    )}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Bookmark className="w-4 h-4" />
                      Saved
                      {savedPlaylists.length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded-full">
                          {savedPlaylists.length}
                        </span>
                      )}
                    </span>
                    {activeTab === 'saved' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                    )}
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab('public')}
                className={cn(
                  "px-4 py-3 text-sm font-semibold relative transition-colors",
                  activeTab === 'public'
                    ? "text-white"
                    : "text-white/50 hover:text-white/70"
                )}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
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
              <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/[0.08] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/[0.08] rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-white/[0.08] rounded w-1/2 animate-pulse" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-5 w-16 bg-white/[0.08] rounded animate-pulse" />
                      <div className="h-5 w-20 bg-white/[0.08] rounded animate-pulse" />
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
                <ListMusic className="w-10 h-10 text-orange-500/50" />
              ) : activeTab === 'shared' ? (
                <UserPlus className="w-10 h-10 text-violet-500/50" />
              ) : activeTab === 'saved' ? (
                <Bookmark className="w-10 h-10 text-orange-500/50" />
              ) : (
                <Globe className="w-10 h-10 text-emerald-500/50" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {activeTab === 'my' ? 'No Playlists Yet' : 
               activeTab === 'shared' ? 'No Shared Playlists' :
               activeTab === 'saved' ? 'No Saved Playlists' :
               'No Public Playlists'}
            </h3>
            <p className="text-sm text-white/50 mb-6 max-w-sm mx-auto">
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
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
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
                    "bg-white/[0.02] border-white/[0.06]",
                    "hover:bg-white/[0.04] hover:border-white/[0.1]",
                    deletingId === playlist._id && "opacity-50"
                  )}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Cover */}
                      <Link href={`/playlists/${playlist._id}`} className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-violet-500/30 transition-all shadow-lg">
                          <ListMusic className="w-9 h-9 text-orange-500" />
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <Link href={`/playlists/${playlist._id}`}>
                              <h3 className="text-lg font-semibold text-white truncate group-hover:text-orange-400 transition-colors mb-1">
                                {playlist.name}
                              </h3>
                            </Link>
                            
                            {playlist.description && (
                              <p className="text-sm text-white/60 line-clamp-2 mb-3">
                                {playlist.description}
                              </p>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center flex-wrap gap-2">
                              {playlist.isPublic ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                                  <Globe className="w-3 h-3" />
                                  Public
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.05] text-white/50 text-xs font-medium">
                                  <Lock className="w-3 h-3" />
                                  Private
                                </span>
                              )}
                              {acceptedCollaborators.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 text-xs font-medium">
                                  <Users className="w-3 h-3" />
                                  {acceptedCollaborators.length + 1} members
                                </span>
                              )}
                              <span className="text-xs text-white/40">{playlist.itemCount || 0} items</span>
                              {(playlist.saveCount ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-400">
                                  <Bookmark className="w-3 h-3" />
                                  {playlist.saveCount} saved
                                </span>
                              )}
                            </div>

                            {/* Creator info for shared/public playlists */}
                            {activeTab !== 'my' && playlist.createdBy && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-white/40">
                                <Crown className="w-3 h-3" />
                                <span>By {playlist.createdBy.firstName || playlist.createdBy.email?.split('@')[0] || 'Unknown'}</span>
                              </div>
                            )}

                            {/* Hashtags */}
                            {playlist.hashtags && playlist.hashtags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {playlist.hashtags.slice(0, 4).map((tag) => (
                                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.03] text-white/50 text-xs">
                                    #{tag}
                                  </span>
                                ))}
                                {playlist.hashtags.length > 4 && (
                                  <span className="text-xs text-white/30">+{playlist.hashtags.length - 4}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 rounded-lg hover:bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <MoreVertical className="w-4 h-4 text-white/50" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#141414] border-white/[0.08] rounded-xl">
                                <DropdownMenuItem
                                  onClick={() => setEditingPlaylist(playlist)}
                                  className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.05] cursor-pointer"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/[0.06]" />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(playlist)}
                                  className="text-red-400 hover:text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
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
                      className="flex items-center justify-end gap-1 mt-4 pt-4 border-t border-white/[0.06] text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors"
                    >
                      View Playlist
                      <ChevronRight className="w-4 h-4" />
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
        editPlaylist={editingPlaylist}
      />
    </div>
  )
}
