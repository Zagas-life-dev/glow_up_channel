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
import { FlaticonIcon } from "@/components/ui/flaticon-icon"
import { Globe, Lock } from 'lucide-react'
import { RiPlayList2Fill } from "react-icons/ri"
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
        <SheetContent side="bottom" className="h-[70vh] bg-page border-border rounded-t-3xl p-0 overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-page border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <RiPlayList2Fill className="w-5 h-5 text-orange-500" />
              </div>
                <div>
                  <SheetTitle className="text-foreground">Add to Playlist</SheetTitle>
                  <SheetDescription className="text-muted-foreground text-xs truncate max-w-[200px]">
                    {item.title}
                  </SheetDescription>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-lg hover:bg-muted">
                <FlaticonIcon name="cross" className="w-5 h-5 text-muted-foreground" aria-hidden />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-[calc(70vh-80px)] p-6">
            {/* Create New Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-orange-500/50 hover:bg-primary/5 transition-all flex items-center gap-4 mb-4"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FlaticonIcon name="add" className="w-5 h-5 text-orange-500" aria-hidden />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Create New Playlist</p>
                <p className="text-sm text-muted-foreground">Start a new collection</p>
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
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <RiPlayList2Fill className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">No Playlists Yet</h3>
                <p className="text-sm text-muted-foreground">Create your first playlist to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* User's Own Playlists */}
                {playlists.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Your Playlists</p>
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
                              : "bg-card border-border hover:bg-muted hover:border-border"
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                            isAdded ? "bg-emerald-500/20" : "bg-gradient-to-br from-orange-500/20 to-violet-500/20"
                          )}>
                            {isAdding ? (
                              <FlaticonIcon name="spinner" className="w-5 h-5 text-orange-500 animate-spin" aria-hidden />
                            ) : isAdded ? (
                              <FlaticonIcon name="check" className="w-5 h-5 text-emerald-500" aria-hidden />
                            ) : (
                              <RiPlayList2Fill className="w-5 h-5 text-orange-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{playlist.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {playlist.isPublic ? (
                                <Globe className="w-3 h-3 text-muted-foreground" />
                              ) : (
                                <Lock className="w-3 h-3 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">{playlist.itemCount} items</span>
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
                      <FlaticonIcon name="users" className="w-3 h-3" aria-hidden />
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
                              : "bg-card border-violet-500/10 hover:bg-violet-500/5 hover:border-violet-500/20"
                          )}
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                            isAdded ? "bg-emerald-500/20" : "bg-gradient-to-br from-violet-500/20 to-purple-500/20"
                          )}>
                            {isAdding ? (
                              <FlaticonIcon name="spinner" className="w-5 h-5 text-violet-500 animate-spin" aria-hidden />
                            ) : isAdded ? (
                              <FlaticonIcon name="check" className="w-5 h-5 text-emerald-500" aria-hidden />
                            ) : (
                              <FlaticonIcon name="users" className="w-5 h-5 text-violet-500" aria-hidden />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{playlist.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {playlist.isPublic ? (
                                <FlaticonIcon name="globe" className="w-3 h-3 text-muted-foreground" aria-hidden />
                              ) : (
                                <FlaticonIcon name="lock" className="w-3 h-3 text-muted-foreground" aria-hidden />
                              )}
                              <span className="text-xs text-muted-foreground">{playlist.itemCount} items</span>
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
