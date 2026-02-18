"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { usePlaylist, Playlist } from '@/contexts/playlist-context'
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
import { RiPlayList2Fill } from "react-icons/ri"

interface PlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  editPlaylist?: Playlist
  onSuccess?: (playlist: Playlist) => void
}

export default function PlaylistModal({ isOpen, onClose, editPlaylist, onSuccess }: PlaylistModalProps) {
  const { createPlaylist, updatePlaylist } = usePlaylist()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset form when modal opens/closes or editPlaylist changes
  useEffect(() => {
    if (isOpen) {
      if (editPlaylist) {
        setName(editPlaylist.name)
        setDescription(editPlaylist.description || '')
        setHashtags(editPlaylist.hashtags || [])
        setIsPublic(editPlaylist.isPublic || false)
      } else {
        setName('')
        setDescription('')
        setHashtags([])
        setIsPublic(false)
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
        const updated = await updatePlaylist(editPlaylist._id, {
          name: name.trim(),
          description: description.trim(),
          hashtags,
          isPublic
        })
        onSuccess?.(updated)
      } else {
        // Create new playlist
        const newPlaylist = await createPlaylist({
          name: name.trim(),
          description: description.trim(),
          hashtags,
          isPublic
        })
        onSuccess?.(newPlaylist)
      }
      
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save playlist')
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
      <SheetContent side="bottom" className="h-[85vh] bg-page border-border rounded-t-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-page border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <RiPlayList2Fill className="w-5 h-5 text-orange-500" />
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
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
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
              className="bg-card border-border text-foreground placeholder:text-muted-foreground"
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
              className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
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
              className="bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-orange-400 text-xs"
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
          <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-card border border-border">
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

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-foreground"
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