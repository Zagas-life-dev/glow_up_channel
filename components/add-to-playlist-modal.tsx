"use client"

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, Globe, Loader2, Lock, Plus, Users } from 'lucide-react'
import { usePlaylist, Playlist, type PlaylistContentType } from '@/contexts/playlist-context'
import { cn } from '@/lib/utils'
import { trackAddToPlaylist } from '@/lib/tracking'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PlaylistCover } from '@/components/playlists/playlist-cover'
import { KindChip, toUpKind } from '@/components/up/kind'
import PlaylistModal from './playlist-modal'

interface AddToPlaylistItem {
  _id: string
  title: string
  type: PlaylistContentType
  company?: string
  organization?: string
  author?: string
  description?: string
}

interface AddToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  item: AddToPlaylistItem
  /** Called once each time the item is successfully added to a playlist (not when already in list). */
  onItemAddedToPlaylist?: () => void
}

export default function AddToPlaylistModal({ isOpen, onClose, item, onItemAddedToPlaylist }: AddToPlaylistModalProps) {
  const { playlists, sharedPlaylists, addToPlaylist, removeFromPlaylist, canEditPlaylist } = usePlaylist()

  // Filter shared playlists to only show those the user can edit
  const editableSharedPlaylists = sharedPlaylists.filter(p => canEditPlaylist(p))
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [busyOn, setBusyOn] = useState<string | null>(null)
  const [error, setError] = useState('')

  const entryIn = (playlist: Playlist) => playlist.items.find(i => i.contentId === item._id)

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (entryIn(playlist)) return

    setBusyOn(playlist._id)
    setError('')

    try {
      await addToPlaylist(playlist._id, item)

      // Track active user activity (fire-and-forget, won't throw errors).
      // Gifts are excluded on purpose: this signal feeds the activity and
      // recommendation pipeline, and a gift must never influence or appear in
      // a feed. Adding one to a list is a private act, not a ranking signal.
      if (item.type !== 'gift') {
        trackAddToPlaylist(item.type, item._id)
      }
      onItemAddedToPlaylist?.()
      toast.success(`Added to ${playlist.name}`, {
        action: { label: 'Undo', onClick: () => void removeByContent(playlist._id) },
      })
    } catch (err: any) {
      setError(err.message || 'Failed to add to playlist')
    } finally {
      setBusyOn(null)
    }
  }

  // The toast's Undo fires after the context has refreshed, so read the
  // latest lists through a ref rather than this render's closure.
  const latest = useRef<Playlist[]>([])
  latest.current = [...playlists, ...sharedPlaylists]

  const removeByContent = async (playlistId: string) => {
    const fresh = latest.current.find(p => p._id === playlistId)
    const entry = fresh ? entryIn(fresh) : undefined
    if (!entry) return
    try {
      await removeFromPlaylist(playlistId, entry._id)
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove from playlist')
    }
  }

  const handleRemove = async (playlist: Playlist) => {
    const entry = entryIn(playlist)
    if (!entry) return
    setBusyOn(playlist._id)
    setError('')
    try {
      await removeFromPlaylist(playlist._id, entry._id)
      toast(`Removed from ${playlist.name}`)
    } catch (err: any) {
      setError(err.message || 'Failed to remove from playlist')
    } finally {
      setBusyOn(null)
    }
  }

  const handleClose = () => {
    setError('')
    onClose()
  }

  const handlePlaylistCreated = (playlist: Playlist) => {
    // Automatically add item to newly created playlist
    handleAddToPlaylist(playlist)
  }

  const renderRow = (playlist: Playlist, shared: boolean) => {
    const isAdded = Boolean(entryIn(playlist))
    const isBusy = busyOn === playlist._id
    const owner = playlist.createdBy?.firstName || playlist.createdBy?.email?.split('@')[0] || 'Unknown'

    return (
      <li key={playlist._id}>
        <button
          type="button"
          onClick={() => (isAdded ? handleRemove(playlist) : handleAddToPlaylist(playlist))}
          disabled={isBusy}
          aria-pressed={isAdded}
          className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-up-fill disabled:cursor-wait"
        >
          <PlaylistCover
            seed={playlist._id}
            types={(playlist.items ?? []).map((i) => i.contentType)}
            empty={(playlist.itemCount || 0) === 0}
            imageUrl={playlist.coverImage}
            rounded="rounded-up-md"
            className="h-12 w-12"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-foreground">{playlist.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {playlist.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {playlist.itemCount} {playlist.itemCount === 1 ? 'item' : 'items'}
              {shared ? <span className="truncate">· by {owner}</span> : null}
            </p>
          </div>
          {isBusy ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" aria-label="Saving" />
          ) : isAdded ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-up-lime px-2.5 py-[5px] text-xs font-bold text-up-navy">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              Added
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-[5px] text-xs font-bold text-foreground shadow-[inset_0_0_0_1.5px_var(--up-border-hover)]">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Add
            </span>
          )}
        </button>
      </li>
    )
  }

  const kind = toUpKind(item.type)
  const hasAny = playlists.length > 0 || editableSharedPlaylists.length > 0

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="gap-0 p-0 sm:p-0">
          <DialogHeader className="px-5 pb-4 pt-7 sm:px-6 sm:pt-6">
            <DialogTitle>Add to playlist</DialogTitle>
            <DialogDescription className="flex items-center gap-2 pr-10 pt-1">
              {item.type !== 'gift' ? <KindChip kind={kind} size="sm" /> : null}
              <span className="truncate font-semibold text-foreground">{item.title}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(60vh,460px)] overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mb-4 flex w-full items-center gap-3 rounded-up-lg border-[1.5px] border-dashed border-up-border-hover bg-up-fill px-3.5 py-3 text-left transition-colors hover:border-up-orange"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-up-md bg-up-orange text-up-navy">
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span>
                <span className="block text-[15px] font-bold text-foreground">Create new playlist</span>
                <span className="block text-xs text-muted-foreground">Start a new collection</span>
              </span>
            </button>

            {error && (
              <p role="alert" className="mb-4 rounded-up-md bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}

            {!hasAny ? (
              <div className="px-4 py-8 text-center">
                <p className="font-display text-base font-bold text-foreground">No playlists yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create your first playlist to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {playlists.length > 0 && (
                  <section>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Your playlists</p>
                    <ul className="divide-y divide-up-hairline overflow-hidden rounded-up-xl border border-border bg-card">
                      {playlists.map((p) => renderRow(p, false))}
                    </ul>
                  </section>
                )}

                {editableSharedPlaylists.length > 0 && (
                  <section>
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      <Users className="h-3 w-3" />
                      Shared with you
                    </p>
                    <ul className="divide-y divide-up-hairline overflow-hidden rounded-up-xl border border-border bg-card">
                      {editableSharedPlaylists.map((p) => renderRow(p, true))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Playlist Modal */}
      <PlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handlePlaylistCreated}
      />
    </>
  )
}
