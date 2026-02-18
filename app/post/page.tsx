"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { usePlaylist } from '@/contexts/playlist-context'
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'
import {
  Image as ImageIcon,
  ListMusic,
  Globe,
  Lock,
  X,
  Send,
  ChevronLeft,
  ChevronRight,
  Target,
  Briefcase,
  Calendar,
  BookOpen,
  Plus,
  Search,
  BarChart3,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { trackPostCreated } from '@/lib/tracking'
import AuthGuard from '@/components/auth-guard'
import ApiClient from '@/lib/api-client'
import { usePage } from '@/contexts/page-context'
import HashtagAutocomplete from '@/components/ui/hashtag-autocomplete'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

interface ContentItem {
  _id: string
  title: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  organization?: string
  company?: string
  author?: string
}

function PostPageContent() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { playlists, sharedPlaylists, publicPlaylists, canEditPlaylist } = usePlaylist()
  const { setHideNavbar, setHideFooter } = usePage()

  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])
  
  const [text, setText] = useState('')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [uploadedImages, setUploadedImages] = useState<{ url: string; publicId: string }[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null)
  const [selectedContent, setSelectedContent] = useState<ContentItem[]>([])
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [isUploading, setIsUploading] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showContentPicker, setShowContentPicker] = useState(false)
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false)
  const [contentSearchQuery, setContentSearchQuery] = useState('')
  const [contentSearchResults, setContentSearchResults] = useState<ContentItem[]>([])
  const [isSearchingContent, setIsSearchingContent] = useState(false)
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('')
  
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
    if (images.length + files.length > 10) {
      toast.error('Maximum 10 images allowed')
      return
    }

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))

    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      if (currentImageIndex >= newImages.length && newImages.length > 0) {
        setCurrentImageIndex(newImages.length - 1)
      } else if (newImages.length === 0) {
        setCurrentImageIndex(0)
      }
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

  const searchContent = async (query: string) => {
    if (!query.trim()) {
      setContentSearchResults([])
      return
    }

    setIsSearchingContent(true)
    try {
      // Search across all content types
      const searchResults = await ApiClient.searchContent(query)

      const results: ContentItem[] = [
        ...(searchResults.opportunities || []).map((item: any) => ({ 
          _id: item._id,
          title: item.title,
          type: 'opportunity' as const,
          organization: item.organization || item.provider,
          company: item.company
        })),
        ...(searchResults.jobs || []).map((item: any) => ({ 
          _id: item._id,
          title: item.title,
          type: 'job' as const,
          company: item.company,
          organization: item.organization
        })),
        ...(searchResults.events || []).map((item: any) => ({ 
          _id: item._id,
          title: item.title,
          type: 'event' as const,
          organization: item.organizer,
          author: item.author
        })),
        ...(searchResults.resources || []).map((item: any) => ({ 
          _id: item._id,
          title: item.title,
          type: 'resource' as const,
          author: item.author,
          organization: item.organization
        }))
      ]

      setContentSearchResults(results)
    } catch (error) {
      console.error('Error searching content:', error)
      toast.error('Failed to search content')
    } finally {
      setIsSearchingContent(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (contentSearchQuery) {
        searchContent(contentSearchQuery)
      } else {
        setContentSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [contentSearchQuery])

  const handleSubmit = async () => {
    const hasPoll = showPollCreator && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2
    
    if (!text.trim() && images.length === 0 && !selectedPlaylist && selectedContent.length === 0 && !hasPoll) {
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

      // If multiple content items selected, we'll create multiple posts or combine them
      // For now, let's support one content reference per post (can be extended)
      if (selectedContent.length > 0) {
        const firstContent = selectedContent[0]
        postData.contentReference = {
          type: firstContent.type,
          contentId: firstContent._id,
          title: firstContent.title,
          organization: firstContent.organization || firstContent.company || firstContent.author
        }
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
        
        router.push('/community')
      } else {
        throw new Error(data.message || 'Failed to create post')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post')
    } finally {
      setIsPosting(false)
    }
  }

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ''])
    }
  }

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index))
    }
  }

  const updatePollOption = (index: number, value: string) => {
    const updated = [...pollOptions]
    updated[index] = value
    setPollOptions(updated)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // Get user's own public playlists + shared playlists (where user is editor or owner)
  const getMyPublicPlaylists = () => {
    if (!user) return []
    
    // User's own public playlists
    const ownPlaylists = playlists.filter(p => 
      p.isPublic && 
      (p.createdBy._id === user._id || p.createdBy.email === user.email)
    )
    
    // Shared playlists where user is editor (and is public)
    const editableShared = sharedPlaylists.filter(p => 
      p.isPublic && 
      canEditPlaylist(p)
    )
    
    // Combine and remove duplicates
    const allMyPlaylists = [...ownPlaylists, ...editableShared]
    const uniquePlaylists = allMyPlaylists.filter((playlist, index, self) =>
      index === self.findIndex(p => p._id === playlist._id)
    )
    
    return uniquePlaylists
  }

  // Get all other public playlists (excluding user's own)
  const getOtherPublicPlaylists = () => {
    if (!user) return []
    
    // All public playlists that are NOT created by the user
    return publicPlaylists.filter(p => 
      p.isPublic && 
      p.createdBy._id !== user._id && 
      p.createdBy.email !== user.email
    )
  }

  // Get filtered playlists separated by category
  const getFilteredPlaylists = () => {
    const query = playlistSearchQuery.toLowerCase().trim()
    const myPlaylists = getMyPublicPlaylists()
    const otherPlaylists = getOtherPublicPlaylists()
    
    if (query) {
      // If searching, filter both categories
      const filteredMy = myPlaylists.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.hashtags?.some(tag => tag.toLowerCase().includes(query))
      )
      const filteredOther = otherPlaylists.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.hashtags?.some(tag => tag.toLowerCase().includes(query))
      )
      return { myPlaylists: filteredMy, otherPlaylists: filteredOther }
    }
    
    return { myPlaylists, otherPlaylists }
  }

  const contentTypeIcons = {
    opportunity: Target,
    job: Briefcase,
    event: Calendar,
    resource: BookOpen
  }

  const contentTypeColors = {
    opportunity: 'text-orange-500 bg-primary/10 border-orange-500/20',
    job: 'text-primary bg-primary/10 border-primary/20',
    event: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    resource: 'text-violet-500 bg-violet-500/10 border-violet-500/20'
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-page pb-24 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-page/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Create Post</h1>
          <Button
            onClick={handleSubmit}
            disabled={isPosting || isUploading || (!text.trim() && images.length === 0 && !selectedPlaylist && selectedContent.length === 0 && !(showPollCreator && pollQuestion.trim() && pollOptions.filter((o: string) => o.trim()).length >= 2))}
            className="bg-primary hover:bg-primary/90 text-foreground rounded-full px-4 h-8"
          >
            Share
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-semibold text-foreground">
            {(user as any).profileImage ? (
              <Image
                src={(user as any).profileImage}
                alt={user.firstName || user.email || 'Profile'}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              (user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {user.firstName || user.email?.split('@')[0] || 'User'}
            </p>
            <button
              onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
              className="text-xs text-muted-foreground hover:text-muted-foreground flex items-center gap-1"
            >
              {visibility === 'public' ? (
                <>
                  <Globe className="w-3 h-3" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  Only me
                </>
              )}
            </button>
          </div>
        </div>

        {/* Text Input (on top) */}
        <div className="mb-6 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Write a caption..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-[15px] leading-relaxed min-h-[120px]"
            rows={5}
          />
          <HashtagAutocomplete
            text={text}
            onTextChange={setText}
            textareaRef={textareaRef}
          />
        </div>

        {/* Image Carousel */}
        {images.length > 0 && (
          <div className="mb-6 relative">
            <div className="relative aspect-square bg-black rounded-xl overflow-hidden">
              {/* Current Image */}
              <Image
                src={images[currentImageIndex].preview}
                alt=""
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />

              {/* Remove Button */}
              <button
                onClick={() => removeImage(currentImageIndex)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  {currentImageIndex > 0 && (
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
                    >
                      <ChevronLeft className="w-5 h-5 text-foreground" />
                    </button>
                  )}
                  {currentImageIndex < images.length - 1 && (
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
                    >
                      <ChevronRight className="w-5 h-5 text-foreground" />
                    </button>
                  )}
                </>
              )}

              {/* Dots Indicator */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        index === currentImageIndex
                          ? "w-6 bg-card"
                          : "w-1.5 bg-muted hover:bg-card/60"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attachments Section */}
        <div className="space-y-4 mb-6">
          {/* Selected Playlist */}
          {selectedPlaylist && (
            <div className="p-4 rounded-xl bg-muted border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center">
                    <ListMusic className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedPlaylist.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedPlaylist.itemCount || 0} items</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="p-1 rounded-lg hover:bg-muted"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* Selected Content Items */}
          {selectedContent.map((content, index) => {
            const Icon = contentTypeIcons[content.type]
            return (
              <div key={index} className={cn("p-4 rounded-xl border", contentTypeColors[content.type])}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", contentTypeColors[content.type])}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{content.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{content.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedContent(prev => prev.filter((_, i) => i !== index))}
                    className="p-1 rounded-lg hover:bg-muted"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Add Photo */}
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
            disabled={images.length >= 10}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
              images.length >= 10
                ? "text-muted-foreground cursor-not-allowed bg-card"
                : "text-muted-foreground hover:text-foreground bg-muted hover:bg-muted"
            )}
          >
            <ImageIcon className="w-4 h-4" />
            <span className="text-sm">Photo</span>
            {images.length > 0 && (
              <span className="text-xs text-muted-foreground">({images.length}/10)</span>
            )}
          </button>

          {/* Add Playlist */}
          <button
            onClick={() => setShowPlaylistPicker(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
              selectedPlaylist
                ? "text-orange-500 bg-primary/10"
                : "text-muted-foreground hover:text-foreground bg-muted hover:bg-muted"
            )}
          >
            <ListMusic className="w-4 h-4" />
            <span className="text-sm">Playlist</span>
          </button>

          {/* Add Content */}
          <button
            onClick={() => setShowContentPicker(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
              selectedContent.length > 0
                ? "text-orange-500 bg-primary/10"
                : "text-muted-foreground hover:text-foreground bg-muted hover:bg-muted"
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Content</span>
            {selectedContent.length > 0 && (
              <span className="text-xs text-muted-foreground">({selectedContent.length})</span>
            )}
          </button>

          {/* Add Poll */}
          <button
            onClick={() => setShowPollCreator(!showPollCreator)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
              showPollCreator
                ? "text-orange-500 bg-primary/10"
                : "text-muted-foreground hover:text-foreground bg-muted hover:bg-muted"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Poll</span>
          </button>
        </div>

        {/* Poll Creator */}
        {showPollCreator && (
          <div className="mt-6 p-4 rounded-xl bg-muted border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Create Poll</h3>
              <button
                onClick={() => {
                  setShowPollCreator(false)
                  setPollQuestion('')
                  setPollOptions(['', ''])
                  setPollDuration(1)
                }}
                className="p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Poll Question */}
              <div>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full px-4 py-2 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-orange-500/50"
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
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-orange-500/50"
                      maxLength={100}
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => removePollOption(index)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
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
                  onClick={addPollOption}
                  className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted hover:bg-muted rounded-xl transition-colors"
                >
                  + Add Option
                </button>
              )}

              {/* Poll Duration */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Poll Duration</label>
                <select
                  value={pollDuration}
                  onChange={(e) => setPollDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-xl text-foreground outline-none focus:border-orange-500/50"
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

      {/* Playlist Picker Modal */}
      {showPlaylistPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end lg:items-center justify-center">
          <div className="w-full max-w-md max-h-[80vh] bg-page border-t lg:border border-border rounded-t-3xl lg:rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Select Playlist</h2>
              <button
                onClick={() => {
                  setShowPlaylistPicker(false)
                  setPlaylistSearchQuery('')
                }}
                className="p-2 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={playlistSearchQuery}
                  onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                  placeholder="Search playlists..."
                  className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-orange-500/50"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {(() => {
                const { myPlaylists, otherPlaylists } = getFilteredPlaylists()
                const hasAnyPlaylists = myPlaylists.length > 0 || otherPlaylists.length > 0
                
                if (!hasAnyPlaylists) {
                  return (
                    <div className="text-center py-12">
                      <ListMusic className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {playlistSearchQuery.trim() 
                          ? 'No playlists found' 
                          : 'No public playlists available'}
                      </p>
                    </div>
                  )
                }
                
                return (
                  <>
                    {/* My Playlists Section */}
                    {myPlaylists.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">My Playlists</h3>
                        <div className="space-y-2">
                          {myPlaylists.map((playlist) => (
                            <button
                              key={playlist._id}
                              onClick={() => {
                                setSelectedPlaylist(playlist)
                                setShowPlaylistPicker(false)
                                setPlaylistSearchQuery('')
                              }}
                              className={cn(
                                "w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left",
                                selectedPlaylist?._id === playlist._id
                                  ? "bg-primary/10 border-orange-500/30"
                                  : "bg-card border-border hover:bg-muted"
                              )}
                            >
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
                                <ListMusic className="w-5 h-5 text-orange-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{playlist.name}</p>
                                <p className="text-xs text-muted-foreground">{playlist.itemCount || 0} items</p>
                              </div>
                              {selectedPlaylist?._id === playlist._id && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                  <X className="w-3 h-3 text-foreground" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Discover/Other Playlists Section */}
                    {otherPlaylists.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                          {playlistSearchQuery.trim() ? 'Search Results' : 'Discover Playlists'}
                        </h3>
                        <div className="space-y-2">
                          {otherPlaylists.map((playlist) => (
                            <button
                              key={playlist._id}
                              onClick={() => {
                                setSelectedPlaylist(playlist)
                                setShowPlaylistPicker(false)
                                setPlaylistSearchQuery('')
                              }}
                              className={cn(
                                "w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left",
                                selectedPlaylist?._id === playlist._id
                                  ? "bg-primary/10 border-orange-500/30"
                                  : "bg-card border-border hover:bg-muted"
                              )}
                            >
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
                                <ListMusic className="w-5 h-5 text-orange-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{playlist.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">{playlist.itemCount || 0} items</p>
                                  {playlist.createdBy?.firstName && (
                                    <>
                                      <span className="text-muted-foreground">•</span>
                                      <p className="text-xs text-muted-foreground truncate">
                                        by {playlist.createdBy.firstName}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                              {selectedPlaylist?._id === playlist._id && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                  <X className="w-3 h-3 text-foreground" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
            {/* Disclaimer */}
            <div className="p-4 border-t border-border bg-card">
              <p className="text-xs text-muted-foreground text-center">
                <Lock className="w-3 h-3 inline mr-1" />
                Private playlists won't show up here
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Picker Modal */}
      {showContentPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end lg:items-center justify-center">
          <div className="w-full max-w-md max-h-[80vh] bg-page border-t lg:border border-border rounded-t-3xl lg:rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Add Content</h2>
                <button
                  onClick={() => {
                    setShowContentPicker(false)
                    setContentSearchQuery('')
                    setContentSearchResults([])
                  }}
                  className="p-2 rounded-lg hover:bg-muted"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={contentSearchQuery}
                  onChange={(e) => setContentSearchQuery(e.target.value)}
                  placeholder="Search opportunities, jobs, events, resources..."
                  className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-orange-500/50"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isSearchingContent ? (
                <div className="space-y-2 py-4 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-muted border border-border" />
                  ))}
                </div>
              ) : contentSearchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Search for content to add</p>
                </div>
              ) : (
                contentSearchResults.map((item) => {
                  const Icon = contentTypeIcons[item.type]
                  const isSelected = selectedContent.some(c => c._id === item._id)
                  return (
                    <button
                      key={item._id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedContent(prev => prev.filter(c => c._id !== item._id))
                        } else {
                          setSelectedContent(prev => [...prev, item])
                        }
                      }}
                      className={cn(
                        "w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left",
                        isSelected
                          ? "bg-primary/10 border-orange-500/30"
                          : "bg-card border-border hover:bg-muted"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", contentTypeColors[item.type])}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <X className="w-3 h-3 text-foreground" />
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PostPage() {
  return (
    <AuthGuard>
      <PostPageContent />
    </AuthGuard>
  )
}

