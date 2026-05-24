"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { usePlaylist, Playlist } from '@/contexts/playlist-context'
import { useAuth } from '@/lib/auth-context'
import { canCreatePremiumPlaylist } from '@/lib/roles'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { FlaticonIcon } from "@/components/ui/flaticon-icon"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { X } from 'lucide-react'
import { RiPlayList2Fill, RiVipCrownLine } from "react-icons/ri"

interface PlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  editPlaylist?: Playlist
  onSuccess?: (playlist: Playlist) => void
}

function getErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object' || !('status' in err)) return undefined
  const s = (err as { status: unknown }).status
  return typeof s === 'number' ? s : undefined
}

function formatPlaylistSaveError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const status = getErrorStatus(err)

  if (status === 403) {
    if (/premium membership is required/i.test(msg)) {
      return `${msg} If you subscribed recently, try refreshing the page or signing out and back in.`
    }
    return `${msg} You may not have permission for this action.`
  }
  if (status === 502 || /cannot reach backend/i.test(msg)) {
    return `${msg} Check NEXT_PUBLIC_BACKEND_URL or BACKEND_URL and that the API server is running.`
  }
  return msg
}

export default function PlaylistModal({ isOpen, onClose, editPlaylist, onSuccess }: PlaylistModalProps) {
  const { createPlaylist, updatePlaylist } = usePlaylist()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [isPremiumPlaylist, setIsPremiumPlaylist] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canCreatePremium =
    !!user &&
    canCreatePremiumPlaylist(
      user.role,
      user.isPremium,
      user.premiumExpiresAt ?? user.premiumEndsAt ?? null
    )
  const showPremiumSection =
    canCreatePremium ||
    !!(editPlaylist?.isPremiumPlaylist || editPlaylist?.is_premium)

  // Reset form when modal opens/closes or editPlaylist changes
  useEffect(() => {
    if (isOpen) {
      if (editPlaylist) {
        setName(editPlaylist.name)
        setDescription(editPlaylist.description || '')
        setHashtags(editPlaylist.hashtags || [])
        setIsPublic(editPlaylist.isPublic || false)
        setIsPremiumPlaylist(
          !!(editPlaylist.isPremiumPlaylist || editPlaylist.is_premium)
        )
      } else {
        setName('')
        setDescription('')
        setHashtags([])
        setIsPublic(false)
        setIsPremiumPlaylist(false)
      }
      setError('')
    }
  }, [isOpen, editPlaylist])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Playlist name is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      if (editPlaylist) {
        // Update existing playlist
        const updatePayload: Parameters<typeof updatePlaylist>[1] = {
          name: name.trim(),
          description: description.trim(),
          hashtags,
          isPublic,
          // Always send so MongoDB updates; omitting left the field unchanged. Backend authorizes true.
          isPremiumPlaylist
        }
        const updated = await updatePlaylist(editPlaylist._id, updatePayload)
        onSuccess?.(updated)
      } else {
        // Create new playlist
        const newPlaylist = await createPlaylist({
          name: name.trim(),
          description: description.trim(),
          hashtags,
          isPublic,
          isPremiumPlaylist: canCreatePremium ? isPremiumPlaylist : false
        })
        onSuccess?.(newPlaylist)
      }
      
      onClose()
    } catch (err: unknown) {
      setError(formatPlaylistSaveError(err) || 'Failed to save playlist')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHashtagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = e.currentTarget.value.trim().replace('#', '').replace(/\s+/g, '')
      if (value && !hashtags.includes(value)) {
        setHashtags([...hashtags, value])
        e.currentTarget.value = ''
      }
    }
  }

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag))
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] bg-card/95 backdrop-blur-xl border-border/70 rounded-t-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/15 border border-orange-500/20 flex items-center justify-center">
                <RiPlayList2Fill className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <SheetTitle className="text-foreground">
                  {editPlaylist ? 'Edit Playlist' : 'Create Playlist'}
                </SheetTitle>
                <SheetDescription className="text-muted-foreground text-xs">
                  {editPlaylist ? 'Update your playlist details' : 'Start a new collection'}
                </SheetDescription>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted/70 transition-colors">
              <FlaticonIcon name="cross" className="w-5 h-5 text-muted-foreground" aria-hidden />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto h-[calc(85vh-80px)] p-6">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Name */}
          <div className="mb-4">
            <Label htmlFor="name" className="text-muted-foreground mb-2 block">
              Playlist Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Playlist"
              className="bg-muted/60 border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/30"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <Label htmlFor="description" className="text-muted-foreground mb-2 block">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this playlist about?"
              rows={3}
              className="bg-muted/60 border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground resize-none focus:border-orange-500/60 focus:ring-orange-500/30"
            />
          </div>

          {/* Hashtags */}
          <div className="mb-4">
            <Label htmlFor="hashtags" className="text-muted-foreground mb-2 block">
              Hashtags
            </Label>
            <Input
              id="hashtags"
              onKeyDown={handleHashtagInput}
              placeholder="Type and press Enter or comma to add"
              className="bg-muted/60 border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-orange-500/60 focus:ring-orange-500/30"
            />
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/20 text-orange-400 text-xs font-medium"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeHashtag(tag)}
                      className="hover:text-orange-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Public/Private Toggle */}
          <div className="mb-4 flex items-center justify-between p-4 rounded-2xl bg-muted/60 border border-border/60">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <FlaticonIcon name="globe" className="w-5 h-5 text-orange-500" aria-hidden />
              ) : (
                <FlaticonIcon name="lock" className="w-5 h-5 text-muted-foreground" aria-hidden />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {isPublic ? 'Public Playlist' : 'Private Playlist'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? 'Anyone can view this playlist' : 'Only you can see this playlist'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Premium playlist: active subscribers or admins; existing premium lists stay editable to turn off */}
          {showPremiumSection && (
            <div className="mb-6 flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <RiVipCrownLine className="w-5 h-5 text-amber-500" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">
                    Premium Playlist
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {canCreatePremium
                      ? 'Shown in the Premium hub; only members with premium access can open it (private or public there).'
                      : 'Renew premium to turn this back on. You can turn premium off for this list.'}
                  </p>
                </div>
              </div>
              <Switch
                checked={isPremiumPlaylist}
                onCheckedChange={(on) => {
                  if (on && !canCreatePremium) return
                  setIsPremiumPlaylist(on)
                }}
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-md shadow-orange-500/20 font-semibold"
          >
            {isSubmitting ? (
              <>
                <FlaticonIcon name="spinner" className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                {editPlaylist ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editPlaylist ? 'Update Playlist' : 'Create Playlist'
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}