"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { usePlaylist, Playlist } from '@/contexts/playlist-context'
import { cn } from '@/lib/utils'
import { trackAddToPlaylist } from '@/lib/tracking'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  ListMusic,
  X,
  Plus,
  Check,
  Globe,
  Lock,
  Loader2,
  Users
} from 'lucide-react'
import PlaylistModal from './playlist-modal'

interface AddToPlaylistItem {
  _id: string
  title: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  company?: string
  organization?: string
  author?: string
  description?: string
}

interface AddToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  item: AddToPlaylistItem
}

export default function AddToPlaylistModal({ isOpen, onClose, item }: AddToPlaylistModalProps) {
  const { playlists, sharedPlaylists, addToPlaylist, canEditPlaylist } = usePlaylist()
  
  // Filter shared playlists to only show those the user can edit
  const editableSharedPlaylists = sharedPlaylists.filter(p => canEditPlaylist(p))
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addedTo, setAddedTo] = useState<string[]>([])
  const [error, setError] = useState('')

  const handleAddToPlaylist = async (playlist: Playlist) => {
    // Check if already in playlist (by contentId)
    if (playlist.items.some(i => i.contentId === item._id)) {
      setError(`Already in "${playlist.name}"`)
      setTimeout(() => setError(''), 2000)
      return
    }

    setAddingTo(playlist._id)
    setError('')

    try {
      await addToPlaylist(playlist._id, item)
      setAddedTo([...addedTo, playlist._id])
      
      // Track active user activity (fire-and-forget, won't throw errors)
      trackAddToPlaylist(item.type, item._id)
    } catch (err: any) {
      setError(err.message || 'Failed to add to playlist')
    } finally {
      setAddingTo(null)
    }
  }

  const handleClose = () => {
    setAddedTo([])
    setError('')
    onClose()
  }

  const handlePlaylistCreated = (playlist: Playlist) => {
    // Automatically add item to newly created playlist
    handleAddToPlaylist(playlist)
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[70vh] bg-[#0a0a0a] border-white/[0.08] rounded-t-3xl p-0 overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <ListMusic className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <SheetTitle className="text-white">Add to Playlist</SheetTitle>
                  <SheetDescription className="text-white/40 text-xs truncate max-w-[200px]">
                    {item.title}
                  </SheetDescription>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/[0.05]">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-[calc(70vh-80px)] p-6">
            {/* Create New Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full p-4 rounded-xl border-2 border-dashed border-white/[0.1] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex items-center gap-4 mb-4"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Create New Playlist</p>
                <p className="text-sm text-white/40">Start a new collection</p>
              </div>
            </button>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Playlists */}
            {playlists.length === 0 && editableSharedPlaylists.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
                  <ListMusic className="w-7 h-7 text-white/30" />
                </div>
                <h3 className="font-medium text-white mb-1">No Playlists Yet</h3>
                <p className="text-sm text-white/50">Create your first playlist to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* User's Own Playlists */}
                {playlists.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Your Playlists</p>
                    {playlists.map((playlist) => {
                      const isAdded = addedTo.includes(playlist._id) || playlist.items.some(i => i.contentId === item._id)
                      const isAdding = addingTo === playlist._id

                      return (
                        <button
                          key={playlist._id}
                          onClick={() => !isAdded && handleAddToPlaylist(playlist)}
                          disabled={isAdded || isAdding}
                          className={cn(
                            "w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left",
                            isAdded
                              ? "bg-emerald-500/10 border-emerald-500/20"
                              : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                            isAdded ? "bg-emerald-500/20" : "bg-gradient-to-br from-orange-500/20 to-violet-500/20"
                          )}>
                            {isAdding ? (
                              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                            ) : isAdded ? (
                              <Check className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <ListMusic className="w-5 h-5 text-orange-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{playlist.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {playlist.isPublic ? (
                                <Globe className="w-3 h-3 text-white/30" />
                              ) : (
                                <Lock className="w-3 h-3 text-white/30" />
                              )}
                              <span className="text-xs text-white/40">{playlist.itemCount} items</span>
                            </div>
                          </div>
                          {isAdded && (
                            <span className="text-xs text-emerald-400 font-medium">Added</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Shared Playlists (where user can edit) */}
                {editableSharedPlaylists.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-violet-400/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      Shared With You
                    </p>
                    {editableSharedPlaylists.map((playlist) => {
                      const isAdded = addedTo.includes(playlist._id) || playlist.items.some(i => i.contentId === item._id)
                      const isAdding = addingTo === playlist._id

                      return (
                        <button
                          key={playlist._id}
                          onClick={() => !isAdded && handleAddToPlaylist(playlist)}
                          disabled={isAdded || isAdding}
                          className={cn(
                            "w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left",
                            isAdded
                              ? "bg-emerald-500/10 border-emerald-500/20"
                              : "bg-white/[0.02] border-violet-500/10 hover:bg-violet-500/5 hover:border-violet-500/20"
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                            isAdded ? "bg-emerald-500/20" : "bg-gradient-to-br from-violet-500/20 to-purple-500/20"
                          )}>
                            {isAdding ? (
                              <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                            ) : isAdded ? (
                              <Check className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Users className="w-5 h-5 text-violet-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{playlist.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {playlist.isPublic ? (
                                <Globe className="w-3 h-3 text-white/30" />
                              ) : (
                                <Lock className="w-3 h-3 text-white/30" />
                              )}
                              <span className="text-xs text-white/40">{playlist.itemCount} items</span>
                              <span className="text-xs text-violet-400/60">• by {playlist.createdBy?.firstName || playlist.createdBy?.email?.split('@')[0] || 'Unknown'}</span>
                            </div>
                          </div>
                          {isAdded && (
                            <span className="text-xs text-emerald-400 font-medium">Added</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Playlist Modal */}
      <PlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handlePlaylistCreated}
      />
    </>
  )
}
