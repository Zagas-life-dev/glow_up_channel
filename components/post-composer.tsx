"use client"

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { usePlaylist } from '@/contexts/playlist-context'
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Image as ImageIcon,
  ListMusic,
  Globe,
  Lock,
  X,
  Loader2,
  Hash,
  AtSign,
  Smile,
  Send,
  BarChart3,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import HashtagAutocomplete from '@/components/ui/hashtag-autocomplete'

interface PostComposerProps {
  onPostCreated: (post: any) => void
  replyToPostId?: string
  placeholder?: string
  compact?: boolean
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export default function PostComposer({ 
  onPostCreated, 
  replyToPostId,
  placeholder = "What's on your mind?",
  compact = false
}: PostComposerProps) {
  const { user } = useAuth()
  const { playlists, sharedPlaylists, publicPlaylists } = usePlaylist()
  
  const [text, setText] = useState('')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [uploadedImages, setUploadedImages] = useState<{ url: string; publicId: string }[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null)
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false)
  
  // Poll state
  const [showPollCreator, setShowPollCreator] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [pollDuration, setPollDuration] = useState<number>(1) // days
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }, [])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed')
      return
    }

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))

    setImages(prev => [...prev, ...newImages])
    setIsExpanded(true)
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const uploadImages = async (): Promise<{ url: string; publicId: string }[]> => {
    if (images.length === 0) return []

    setIsUploading(true)
    try {
      const formData = new FormData()
      images.forEach(img => formData.append('images', img.file))

      const response = await fetch(`${API_BASE_URL}/api/posts/upload-images`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        return data.data.images
      } else {
        throw new Error(data.message || 'Failed to upload images')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload images')
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async () => {
    const hasPoll = showPollCreator && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2
    
    if (!text.trim() && images.length === 0 && !selectedPlaylist && !hasPoll) {
      toast.error('Please add some content to your post')
      return
    }

    // Validate poll
    if (showPollCreator) {
      if (!pollQuestion.trim()) {
        toast.error('Please enter a poll question')
        return
      }
      const validOptions = pollOptions.filter(o => o.trim())
      if (validOptions.length < 2) {
        toast.error('Poll must have at least 2 options')
        return
      }
      if (validOptions.length > 4) {
        toast.error('Poll can have at most 4 options')
        return
      }
    }

    setIsPosting(true)
    try {
      // Upload images first if any
      let uploadedImgs: { url: string; publicId: string }[] = []
      if (images.length > 0) {
        uploadedImgs = await uploadImages()
      }

      const postData: any = {
        text: text.trim(),
        images: uploadedImgs,
        visibility
      }

      if (selectedPlaylist) {
        postData.playlistId = selectedPlaylist._id
      }

      // Add poll data if present
      if (hasPoll) {
        const validOptions = pollOptions.filter(o => o.trim())
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + pollDuration)
        
        postData.poll = {
          question: pollQuestion.trim(),
          options: validOptions.map(option => ({
            text: option.trim(),
            votes: 0
          })),
          endDate: endDate.toISOString(),
          totalVotes: 0
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Post created!')
        
        // Track active user activity (fire-and-forget, won't throw errors)
        if (data.data.post?._id) {
          trackPostCreated(data.data.post._id)
        }
        onPostCreated(data.data.post)
        
        // Reset form
        setText('')
        setImages([])
        setUploadedImages([])
        setSelectedPlaylist(null)
        setShowPollCreator(false)
        setPollQuestion('')
        setPollOptions(['', ''])
        setPollDuration(1)
        setIsExpanded(false)
      } else {
        throw new Error(data.message || 'Failed to create post')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post')
    } finally {
      setIsPosting(false)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // Get available playlists (own + shared with edit access + public)
  const availablePlaylists = [
    ...playlists,
    ...sharedPlaylists,
    ...publicPlaylists.filter(p => 
      !playlists.some(own => own._id === p._id) && 
      !sharedPlaylists.some(shared => shared._id === p._id)
    )
  ]

  if (!user) return null

  return (
    <>
      <div className={cn(
        "rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden transition-all",
        isExpanded && "ring-1 ring-orange-500/20"
      )}>
        {/* Main Input Area */}
        <div className="p-4">
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
              {user.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profileImage}
                  alt={user.firstName || user.email || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                (user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()
              )}
            </div>

            {/* Input */}
            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onFocus={() => setIsExpanded(true)}
                placeholder={placeholder}
                className="w-full bg-transparent text-white placeholder:text-white/30 resize-none outline-none min-h-[60px] text-[15px] leading-relaxed"
                rows={compact ? 1 : 2}
              />
              <HashtagAutocomplete
                text={text}
                onTextChange={setText}
                textareaRef={textareaRef}
              />

              {/* Image Previews */}
              {images.length > 0 && (
                <div className={cn(
                  "grid gap-2 mt-3",
                  images.length === 1 && "grid-cols-1",
                  images.length === 2 && "grid-cols-2",
                  images.length >= 3 && "grid-cols-3"
                )}>
                  {images.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-white/[0.05]">
                      <Image
                        src={img.preview}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Playlist Preview */}
              {selectedPlaylist && (
                <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center">
                        <ListMusic className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{selectedPlaylist.name}</p>
                        <p className="text-xs text-white/40">{selectedPlaylist.itemCount || 0} items</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPlaylist(null)}
                      className="p-1 rounded-lg hover:bg-white/[0.05]"
                    >
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                </div>
              )}

              {/* Poll Creator */}
              {showPollCreator && (
                <div className="mt-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Create Poll</h3>
                    <button
                      onClick={() => {
                        setShowPollCreator(false)
                        setPollQuestion('')
                        setPollOptions(['', ''])
                        setPollDuration(1)
                      }}
                      className="p-1 rounded-lg hover:bg-white/[0.05]"
                    >
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Poll Question */}
                    <div>
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white placeholder:text-white/30 outline-none focus:border-orange-500/50 text-sm"
                        maxLength={200}
                      />
                    </div>

                    {/* Poll Options */}
                    <div className="space-y-2">
                      {pollOptions.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const updated = [...pollOptions]
                              updated[index] = e.target.value
                              setPollOptions(updated)
                            }}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1 px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white placeholder:text-white/30 outline-none focus:border-orange-500/50 text-sm"
                            maxLength={100}
                          />
                          {pollOptions.length > 2 && (
                            <button
                              onClick={() => {
                                if (pollOptions.length > 2) {
                                  setPollOptions(pollOptions.filter((_, i) => i !== index))
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Option Button */}
                    {pollOptions.length < 4 && (
                      <button
                        onClick={() => {
                          if (pollOptions.length < 4) {
                            setPollOptions([...pollOptions, ''])
                          }
                        }}
                        className="w-full px-3 py-2 text-sm text-white/70 hover:text-white bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors"
                      >
                        + Add Option
                      </button>
                    )}

                    {/* Poll Duration */}
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">Poll Duration</label>
                      <select
                        value={pollDuration}
                        onChange={(e) => setPollDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white outline-none focus:border-orange-500/50 text-sm"
                      >
                        <option value={1}>1 day</option>
                        <option value={3}>3 days</option>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        {isExpanded && (
          <div className="px-4 pb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {/* Image Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 5}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  images.length >= 5
                    ? "text-white/20 cursor-not-allowed"
                    : "text-white/50 hover:text-orange-500 hover:bg-orange-500/10"
                )}
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              {/* Playlist */}
              <button
                onClick={() => setShowPlaylistPicker(true)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  selectedPlaylist
                    ? "text-orange-500 bg-orange-500/10"
                    : "text-white/50 hover:text-violet-500 hover:bg-violet-500/10"
                )}
              >
                <ListMusic className="w-5 h-5" />
              </button>

              {/* Poll */}
              <button
                onClick={() => setShowPollCreator(!showPollCreator)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  showPollCreator
                    ? "text-orange-500 bg-orange-500/10"
                    : "text-white/50 hover:text-orange-500 hover:bg-orange-500/10"
                )}
              >
                <BarChart3 className="w-5 h-5" />
              </button>

              {/* Visibility Toggle */}
              <button
                onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
                className={cn(
                  "p-2 rounded-lg transition-colors flex items-center gap-1.5",
                  visibility === 'private'
                    ? "text-yellow-500 bg-yellow-500/10"
                    : "text-white/50 hover:text-white/70"
                )}
              >
                {visibility === 'public' ? (
                  <Globe className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Post Button */}
            <Button
              onClick={handleSubmit}
              disabled={isPosting || isUploading || (!text.trim() && images.length === 0 && !selectedPlaylist && !(showPollCreator && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2))}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5"
            >
              {isPosting || isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Playlist Picker Sheet */}
      <Sheet open={showPlaylistPicker} onOpenChange={setShowPlaylistPicker}>
        <SheetContent side="bottom" className="h-[60vh] bg-[#0a0a0a] border-white/[0.08] rounded-t-3xl p-0">
          <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/[0.06] px-6 py-4">
            <SheetTitle className="text-white">Attach a Playlist</SheetTitle>
          </div>
          <div className="overflow-y-auto h-[calc(60vh-60px)] p-6 space-y-2">
            {availablePlaylists.length === 0 ? (
              <div className="text-center py-12">
                <ListMusic className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No playlists available</p>
              </div>
            ) : (
              availablePlaylists.map((playlist) => (
                <button
                  key={playlist._id}
                  onClick={() => {
                    setSelectedPlaylist(playlist)
                    setShowPlaylistPicker(false)
                  }}
                  className={cn(
                    "w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left",
                    selectedPlaylist?._id === playlist._id
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center">
                    <ListMusic className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{playlist.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {playlist.isPublic ? (
                        <Globe className="w-3 h-3 text-white/30" />
                      ) : (
                        <Lock className="w-3 h-3 text-white/30" />
                      )}
                      <span className="text-xs text-white/40">{playlist.itemCount || 0} items</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
