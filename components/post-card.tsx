"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { dispatchGuestEngaged } from '@/components/sign-up-better-experience-popup'
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { trackLike, trackRepost, trackSave, trackShare, trackVote, trackCommunityEngagement } from '@/lib/tracking'
import { Globe, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  RiRepeatLine,
  RiMore2Line,
  RiShareLine,
  RiEditLine,
  RiDeleteBinLine,
  RiPlayFill,
  RiExternalLinkLine,
  RiFocus3Line,
  RiBriefcaseLine,
  RiCalendarLine,
  RiBook2Line,
  RiMapPinLine,
  RiTimeLine,
  RiMoneyDollarCircleLine,
  RiBarChart2Line,
  RiCheckLine,
  RiHashtag,
  RiHeartLine,
  RiHeartFill,
  RiChat1Line,
  RiBookmarkLine,
  RiBookmarkFill,
} from "react-icons/ri"

interface Post {
  _id: string
  author: {
    _id: string
    email: string
    firstName?: string
    profileImage?: string
  }
  content: {
    text: string
    images: { url: string; publicId?: string }[]
    playlist?: {
      _id: string
      name: string
      description: string
      itemCount: number
      items: { _id: string; title: string; contentType: string }[]
    }
    contentReference?: {
      type: 'opportunity' | 'job' | 'event' | 'resource'
      contentId: string
      title: string
      description?: string
      organization?: string
      location?: {
        country?: string
        province?: string
        city?: string
        isRemote?: boolean
      }
      dates?: {
        applicationDeadline?: string
        startDate?: string
        endDate?: string
        registrationDeadline?: string
      }
      financial?: {
        isPaid?: boolean
        amount?: string
        currency?: string
      }
    }
    poll?: {
      question: string
      options: { text: string; votes: number }[]
      endDate: string
      totalVotes: number
      votes?: { userId: string; optionIndex: number }[]
    }
  }
  hashtags: string[]
  mentions: { userId: string; username: string }[]
  visibility: 'public' | 'private'
  likeCount: number
  replyCount: number
  repostCount: number
  bookmarkCount: number
  isRepost: boolean
  originalPost?: string
  repostedBy?: { _id: string; email: string; firstName?: string }
  createdAt: string
  updatedAt: string
  isEdited: boolean
  hasLiked?: boolean
  hasBookmarked?: boolean
  hasReposted?: boolean
}

interface PostCardProps {
  post: Post
  onUpdate?: (post: Post) => void
  onDelete?: (postId: string) => void
  showActions?: boolean
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

const contentTypeIconNames: Record<string, string> = {
  opportunity: "opportunity",
  job: "job",
  event: "event",
  resource: "resource"
}

export default function PostCard({ post, onUpdate, onDelete, showActions = true }: PostCardProps) {
  const { user } = useAuth()
  const [isLiking, setIsLiking] = useState(false)
  const [isBookmarking, setIsBookmarking] = useState(false)
  const [isReposting, setIsReposting] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [localPost, setLocalPost] = useState(post)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const cardRef = useRef<HTMLDivElement>(null)
  const [hasTrackedView, setHasTrackedView] = useState(false)

  // Track post view when it becomes visible
  useEffect(() => {
    if (!user || hasTrackedView || !cardRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          setHasTrackedView(true)
          
          // Call analytics
          trackCommunityEngagement('view', post._id)
          
          // Call backend endpoint to log view for algorithm
          const token = localStorage.getItem('accessToken')
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (token) headers['Authorization'] = `Bearer ${token}`
          
          fetch(`${API_BASE_URL}/api/posts/${post._id}/view`, {
            method: 'POST',
            headers
          }).catch(() => {})
          
          observer.disconnect()
        }
      },
      { threshold: 0.5 } // Post must be 50% visible
    )

    observer.observe(cardRef.current)

    return () => {
      observer.disconnect()
    }
  }, [user, hasTrackedView, post._id])

  // Reset image index when post changes
  useEffect(() => {
    setCurrentImageIndex(0)
  }, [post._id])

  const isOwner = user?._id === post.author._id || user?.email === post.author.email

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  const handleLike = async () => {
    if (!user) {
      dispatchGuestEngaged()
      toast.error('Please log in to like posts')
      return
    }

    setIsLiking(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${post._id}/like`, {
        method: 'POST',
        headers: getAuthHeaders()
      })

      // Check if response is ok before parsing
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to like post'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch {
          // If we can't parse error, use default message
          errorMessage = response.status === 401
            ? 'Please log in to like posts'
            : response.status === 404
              ? 'Post not found'
              : 'Failed to like post'
        }
        toast.error(errorMessage)
        return
      }

      // Parse response
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        toast.error('Invalid response from server')
        return
      }

      if (data.success) {
        const updated = {
          ...localPost,
          hasLiked: data.data?.liked ?? true, // Default to true if not provided
          likeCount: data.data?.likeCount ?? localPost.likeCount
        }
        setLocalPost(updated)
        onUpdate?.(updated)

        // Track active user activity (fire-and-forget, won't throw errors)
        // Only track if it was a like (not an unlike)
        if (data.data?.liked) {
          trackLike('post', post._id)
        }
      } else {
        toast.error(data.message || 'Failed to like post')
      }
    } catch (error: any) {
      // Handle network errors (backend down, CORS, etc.)
      const errorMessage = error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')
        ? 'Cannot connect to server. Please check your connection.'
        : 'Failed to like post. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLiking(false)
    }
  }

  const handleBookmark = async () => {
    if (!user) {
      dispatchGuestEngaged()
      toast.error('Please log in to bookmark posts')
      return
    }

    setIsBookmarking(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${post._id}/bookmark`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        const updated = {
          ...localPost,
          hasBookmarked: data.data.bookmarked
        }
        setLocalPost(updated)
        onUpdate?.(updated)
        toast.success(data.data.bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks')

        // Track active user activity (fire-and-forget, won't throw errors)
        if (data.data.bookmarked) {
          trackSave('post', post._id)
        }
      }
    } catch (error) {
      toast.error('Failed to bookmark post')
    } finally {
      setIsBookmarking(false)
    }
  }

  const handleVote = async (optionIndex: number) => {
    if (!user) {
      dispatchGuestEngaged()
      toast.error('Please login to vote')
      return
    }

    setIsVoting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${localPost._id}/vote`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ optionIndex })
      })

      const data = await response.json()
      if (data.success) {
        // Update local post with new poll data
        setLocalPost(data.data.post)
        if (onUpdate) {
          onUpdate(data.data.post)
        }
        toast.success('Vote recorded!')

        // Track active user activity (fire-and-forget, won't throw errors)
        trackVote(post._id)
        trackCommunityEngagement('vote', post._id)
      } else {
        throw new Error(data.message || 'Failed to vote')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to vote')
    } finally {
      setIsVoting(false)
    }
  }

  const handleRepost = async () => {
    if (!user) {
      dispatchGuestEngaged()
      toast.error('Please log in to repost')
      return
    }

    if (localPost.hasReposted) {
      toast.error('You have already reposted this')
      return
    }

    setIsReposting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${post._id}/repost`, {
        method: 'POST',
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        let errorMessage = 'Failed to repost'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch {
          errorMessage = response.status === 401
            ? 'Please log in to repost'
            : 'Failed to repost'
        }
        toast.error(errorMessage)
        return
      }

      const data = await response.json()
      if (data.success) {
        const updated = {
          ...localPost,
          hasReposted: true,
          repostCount: localPost.repostCount + 1
        }
        setLocalPost(updated)
        onUpdate?.(updated)
        toast.success('Reposted!')

        // Track active user activity (fire-and-forget, won't throw errors)
        trackRepost(post._id)
      } else {
        toast.error(data.message || 'Failed to repost')
      }
    } catch (error: any) {
      const errorMessage = error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')
        ? 'Cannot connect to server. Please check your connection.'
        : 'Failed to repost. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsReposting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${post._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Post deleted')
        onDelete?.(post._id)
      }
    } catch (error) {
      toast.error('Failed to delete post')
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${post._id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author.firstName || post.author.email}`,
          text: post.content.text?.substring(0, 100),
          url
        })
        // Track active user activity if share was successful (fire-and-forget)
        trackShare('post', post._id)
        trackCommunityEngagement('share', post._id)
      } catch (err) {
        // User cancelled share - don't track
      }
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied!')
      // Track active user activity (fire-and-forget)
      trackShare('post', post._id)
      trackCommunityEngagement('share', post._id)
    }
  }

  // Render text with hashtags and mentions highlighted
  const renderText = (text: string) => {
    if (!text) return null

    const parts = text.split(/(\s+)/)
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <Link
            key={i}
            href={`/community?hashtag=${part.substring(1)}`}
            className="text-orange-500 hover:underline"
          >
            {part}
          </Link>
        )
      }
      if (part.startsWith('@')) {
        const slug = part.substring(1)
        const lowerSlug = slug.toLowerCase()

        // 1) Try to resolve as a user mention using the mentions array from backend
        const mention = localPost.mentions?.find((m) =>
          (m.username || '').toLowerCase() === lowerSlug
        )
        if (mention) {
          return (
            <Link
              key={i}
              href={`/profile/${mention.userId}`}
              className="text-primary hover:underline"
            >
              {part}
            </Link>
          )
        }

        // 2) Otherwise, if it looks like a channel slug (lowercase with ._-), link to channel
        if (/^[a-z0-9._-]+$/.test(slug)) {
          return (
            <Link
              key={i}
              href={`/channels/${slug}`}
              className="text-primary hover:underline"
            >
              {part}
            </Link>
          )
        }

        // 3) Fallback: just styled text
        return (
          <span key={i} className="text-primary">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <article ref={cardRef} className="w-full max-w-full rounded-2xl bg-card/80 backdrop-blur-sm border border-border/70 overflow-hidden hover:border-border hover:shadow-sm transition-all duration-200">
      {/* Repost Header */}
      {localPost.isRepost && localPost.repostedBy && (
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-xs text-muted-foreground border-b border-border/40">
          <RiRepeatLine className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
          <span>
            <span className="text-emerald-500 font-medium">{localPost.repostedBy.firstName || localPost.repostedBy.email.split('@')[0]}</span> reposted
          </span>
        </div>
      )}

      <div className="p-4 w-full max-w-full overflow-hidden">
        {/* Author Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${localPost.author._id}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-border/60 bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                {localPost.author.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={localPost.author.profileImage}
                    alt={localPost.author.firstName || localPost.author.email || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (localPost.author.firstName?.charAt(0) || localPost.author.email?.charAt(0) || '?').toUpperCase()
                )}
              </div>
            </Link>
            <div>
              <Link href={`/profile/${localPost.author._id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                {localPost.author.firstName || localPost.author.email.split('@')[0]}
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span>{formatDistanceToNow(new Date(localPost.createdAt), { addSuffix: true })}</span>
                {localPost.isEdited && <span>· edited</span>}
                <span>·</span>
                {localPost.visibility === 'private' ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Globe className="w-3 h-3" />
                )}
              </div>
            </div>
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors">
                  <RiMore2Line className="w-4 h-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer rounded-xl mx-1">
                  <RiShareLine className="w-4 h-4 mr-2" aria-hidden />
                  Share
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator className="bg-border/60" />
                    <DropdownMenuItem asChild className="cursor-pointer rounded-xl mx-1">
                      <Link href={`/posts/${post._id}/edit`}>
                        <RiEditLine className="w-4 h-4 mr-2" aria-hidden />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-400 focus:text-red-400 cursor-pointer rounded-xl mx-1 mb-1">
                      <RiDeleteBinLine className="w-4 h-4 mr-2" aria-hidden />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        <div className="mb-3">
          {/* Text */}
          {localPost.content.text && (
            <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap break-words mb-3">
              {renderText(localPost.content.text)}
            </p>
          )}

          {/* Images Carousel */}
          {localPost.content.images && localPost.content.images.length > 0 && (
            <div className="mb-3 relative -mx-4 md:mx-0">
              <div
                className="relative w-[calc(100%+2rem)] md:w-full aspect-square bg-black rounded-none md:rounded-2xl overflow-hidden select-none"
                onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
                onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
                onTouchEnd={() => {
                  if (touchStart === null || touchEnd === null) {
                    setTouchStart(null)
                    setTouchEnd(null)
                    return
                  }
                  const distance = touchStart - touchEnd
                  const isLeftSwipe = distance > 50
                  const isRightSwipe = distance < -50

                  if (isLeftSwipe && currentImageIndex < localPost.content.images.length - 1) {
                    setCurrentImageIndex(prev => prev + 1)
                  }
                  if (isRightSwipe && currentImageIndex > 0) {
                    setCurrentImageIndex(prev => prev - 1)
                  }
                  setTouchStart(null)
                  setTouchEnd(null)
                }}
              >
                {/* Current Image */}
                <Image
                  src={localPost.content.images[currentImageIndex].url}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />

                {/* Navigation Arrows */}
                {localPost.content.images.length > 1 && (
                  <>
                    {currentImageIndex > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setCurrentImageIndex(prev => prev - 1)
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
                      >
                        <ChevronLeft className="w-5 h-5 text-foreground" />
                      </button>
                    )}
                    {currentImageIndex < localPost.content.images.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setCurrentImageIndex(prev => prev + 1)
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-10"
                      >
                        <ChevronRight className="w-5 h-5 text-foreground" aria-hidden />
                      </button>
                    )}
                  </>
                )}

                {/* Dots Indicator */}
                {localPost.content.images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                    {localPost.content.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setCurrentImageIndex(index)
                        }}
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

                {/* Image Counter */}
                {localPost.content.images.length > 1 && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 text-xs text-foreground z-10">
                    {currentImageIndex + 1} / {localPost.content.images.length}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Playlist Preview */}
          {localPost.content.playlist && (
            <Link href={`/playlists/${localPost.content.playlist._id}`}>
              <div className="rounded-2xl bg-muted/60 border border-border/60 p-4 hover:bg-muted hover:border-border transition-all duration-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center">
                    <RiPlayFill className="w-6 h-6 text-orange-500" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{localPost.content.playlist.name}</h4>
                    <p className="text-xs text-muted-foreground">{localPost.content.playlist.itemCount} items</p>
                  </div>
                  <RiExternalLinkLine className="w-4 h-4 text-muted-foreground" aria-hidden />
                </div>

                {localPost.content.playlist.items && localPost.content.playlist.items.length > 0 && (
                  <div className="space-y-1.5">
                    {localPost.content.playlist.items.slice(0, 3).map((item, index) => {
                      const iconName = contentTypeIconNames[item.contentType] || "opportunity"
                      return (
                        <div key={item._id || index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          {iconName === "opportunity" && <RiFocus3Line className="w-3 h-3" aria-hidden />}
                          {iconName === "job" && <RiBriefcaseLine className="w-3 h-3" aria-hidden />}
                          {iconName === "event" && <RiCalendarLine className="w-3 h-3" aria-hidden />}
                          {iconName === "resource" && <RiBook2Line className="w-3 h-3" aria-hidden />}
                          <span className="truncate">{item.title}</span>
                        </div>
                      )
                    })}
                    {localPost.content.playlist.itemCount > 3 && (
                      <p className="text-xs text-muted-foreground">+{localPost.content.playlist.itemCount - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Content Reference (Embedded Content Card) */}
          {localPost.content.contentReference && (
            <Link href={`/${localPost.content.contentReference.type === 'opportunity' ? 'opportunities' : localPost.content.contentReference.type === 'job' ? 'jobs' : localPost.content.contentReference.type === 'event' ? 'events' : 'resources'}/${localPost.content.contentReference.contentId}`}>
              <div className={cn(
                "rounded-2xl border p-4 hover:opacity-90 transition-opacity cursor-pointer",
                localPost.content.contentReference.type === 'opportunity' && "bg-primary/10 border-orange-500/20",
                localPost.content.contentReference.type === 'job' && "bg-primary/10 border-primary/20",
                localPost.content.contentReference.type === 'event' && "bg-emerald-500/10 border-emerald-500/20",
                localPost.content.contentReference.type === 'resource' && "bg-violet-500/10 border-violet-500/20"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    localPost.content.contentReference.type === 'opportunity' && "bg-primary/20",
                    localPost.content.contentReference.type === 'job' && "bg-primary/20",
                    localPost.content.contentReference.type === 'event' && "bg-emerald-500/20",
                    localPost.content.contentReference.type === 'resource' && "bg-violet-500/20"
                  )}>
                    {localPost.content.contentReference.type === 'opportunity' && (
                      <RiFocus3Line className="w-5 h-5 text-orange-500" aria-hidden />
                    )}
                    {localPost.content.contentReference.type === 'job' && (
                      <RiBriefcaseLine className="w-5 h-5 text-primary" aria-hidden />
                    )}
                    {localPost.content.contentReference.type === 'event' && (
                      <RiCalendarLine className="w-5 h-5 text-emerald-500" aria-hidden />
                    )}
                    {localPost.content.contentReference.type === 'resource' && (
                      <RiBook2Line className="w-5 h-5 text-violet-500" aria-hidden />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs font-medium",
                        localPost.content.contentReference.type === 'opportunity' && "text-orange-500",
                        localPost.content.contentReference.type === 'job' && "text-primary",
                        localPost.content.contentReference.type === 'event' && "text-emerald-500",
                        localPost.content.contentReference.type === 'resource' && "text-violet-500"
                      )}>
                        {localPost.content.contentReference.type === 'opportunity' ? 'Opportunity' :
                          localPost.content.contentReference.type === 'job' ? 'Job' :
                            localPost.content.contentReference.type === 'event' ? 'Event' : 'Resource'}
                      </span>
                      {localPost.content.contentReference.organization && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {localPost.content.contentReference.organization}
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-2 break-words">
                      {localPost.content.contentReference.title}
                    </h4>
                    {localPost.content.contentReference.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2 break-words">
                        {localPost.content.contentReference.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {localPost.content.contentReference.location && (
                        <div className="inline-flex items-center gap-1">
                          <RiMapPinLine className="w-3 h-3" aria-hidden />
                          <span>
                            {localPost.content.contentReference.location.isRemote
                              ? 'Remote'
                              : [localPost.content.contentReference.location.city, localPost.content.contentReference.location.country].filter(Boolean).join(', ') || 'Location TBD'}
                          </span>
                        </div>
                      )}
                      {localPost.content.contentReference.dates && (
                        <>
                          {localPost.content.contentReference.dates.applicationDeadline && (
                            <div className="inline-flex items-center gap-1">
                              <RiTimeLine className="w-3 h-3" aria-hidden />
                              <span>Due {new Date(localPost.content.contentReference.dates.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                          {localPost.content.contentReference.dates.startDate && !localPost.content.contentReference.dates.applicationDeadline && (
                            <div className="inline-flex items-center gap-1">
                              <RiTimeLine className="w-3 h-3" aria-hidden />
                              <span>{new Date(localPost.content.contentReference.dates.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </>
                      )}
                      {localPost.content.contentReference.financial?.isPaid && (
                        <div className="inline-flex items-center gap-1">
                          <RiMoneyDollarCircleLine className="w-3 h-3" aria-hidden />
                          <span>{localPost.content.contentReference.financial.amount || 'Paid'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <RiExternalLinkLine className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden />
                </div>
              </div>
            </Link>
          )}

          {/* Poll */}
          {localPost.content.poll && (() => {
            const poll = localPost.content.poll
            const isPollEnded = new Date(poll.endDate) < new Date()
            const userVote = user ? poll.votes?.find((v: any) => v.userId === user._id || v.userId === (user as any).id) : null
            const hasVoted = !!userVote
            const totalVotes = poll.totalVotes || poll.options.reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0)

            return (
              <div className="mb-3 rounded-2xl bg-muted/60 border border-border/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RiBarChart2Line className="w-4 h-4 text-orange-500 flex-shrink-0" aria-hidden />
                  <h4 className="text-sm font-semibold text-foreground break-words">{poll.question}</h4>
                </div>

                <div className="space-y-2">
                  {poll.options.map((option: any, index: number) => {
                    const optionVotes = option.votes || 0
                    const percentage = totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0
                    const isSelected = userVote?.optionIndex === index

                    return (
                      <button
                        key={index}
                        onClick={async () => {
                          if (isPollEnded || hasVoted || !user || isVoting) return
                          await handleVote(index)
                        }}
                        disabled={isPollEnded || hasVoted || !user || isVoting}
                        className={cn(
                          "w-full relative rounded-lg border transition-all text-left overflow-hidden",
                          isSelected
                            ? "border-orange-500/50 bg-primary/10"
                            : hasVoted || isPollEnded
                              ? "border-border bg-card cursor-default"
                              : "border-border bg-card hover:border-border hover:bg-muted cursor-pointer"
                        )}
                      >
                        <div className="relative z-10 p-3 flex items-center justify-between gap-2">
                          <span className={cn(
                            "text-sm break-words flex-1 min-w-0",
                            isSelected ? "text-orange-500 font-medium" : "text-foreground"
                          )}>
                            {option.text}
                          </span>
                          <div className="flex items-center gap-2">
                            {(hasVoted || isPollEnded) && (
                              <span className="text-xs text-muted-foreground">
                                {percentage.toFixed(1)}%
                              </span>
                            )}
                            {isSelected && (
                              <RiCheckLine className="w-4 h-4 text-orange-500" aria-hidden />
                            )}
                          </div>
                        </div>
                        {(hasVoted || isPollEnded) && (
                          <div
                            className="absolute inset-0 bg-primary/20"
                            style={{ width: `${percentage}%` }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                  {!isPollEnded && (
                    <span>
                      Ends {new Date(poll.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {isPollEnded && (
                    <span className="text-muted-foreground">Poll ended</span>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Hashtags */}
          {localPost.hashtags && localPost.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {localPost.hashtags.map((tag) => (
                <Link
                  key={tag}
                  href={`/community?hashtag=${tag}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-orange-400 text-xs hover:bg-primary/20 transition-colors"
                >
                  <RiHashtag className="w-3 h-3" aria-hidden />
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-0.5">
              {/* Like */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
                  localPost.hasLiked
                    ? "text-red-500 bg-red-500/10"
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                )}
              >
                {localPost.hasLiked ? (
                  <RiHeartFill className="w-4 h-4" aria-hidden />
                ) : (
                  <RiHeartLine className="w-4 h-4" aria-hidden />
                )}
                {!!localPost.likeCount && <span className="text-xs">{localPost.likeCount}</span>}
              </button>

              {/* Reply */}
              <Link href={`/posts/${post._id}`}>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 text-sm font-medium">
                  <RiChat1Line className="w-4 h-4" aria-hidden />
                  {!!localPost.replyCount && <span className="text-xs">{localPost.replyCount}</span>}
                </button>
              </Link>

              {/* Repost */}
              <button
                onClick={handleRepost}
                disabled={isReposting || localPost.hasReposted}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
                  localPost.hasReposted
                    ? "text-emerald-500 bg-emerald-500/10"
                    : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                )}
              >
                <RiRepeatLine className="w-4 h-4" aria-hidden />
                {!!localPost.repostCount && <span className="text-xs">{localPost.repostCount}</span>}
              </button>
            </div>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              disabled={isBookmarking}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
                localPost.hasBookmarked
                  ? "text-yellow-500 bg-yellow-500/10"
                  : "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
              )}
            >
              {localPost.hasBookmarked ? (
                <RiBookmarkFill className="w-4 h-4" aria-hidden />
              ) : (
                <RiBookmarkLine className="w-4 h-4" aria-hidden />
              )}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
