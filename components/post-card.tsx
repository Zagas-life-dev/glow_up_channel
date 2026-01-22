"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Share2,
  MoreHorizontal,
  Edit,
  Trash2,
  Globe,
  Lock,
  ListMusic,
  Target,
  Briefcase,
  Calendar,
  BookOpen,
  ExternalLink,
  Hash,
  MapPin,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CheckCircle2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

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

const contentTypeIcons: Record<string, any> = {
  opportunity: Target,
  job: Briefcase,
  event: Calendar,
  resource: BookOpen
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

  // Reset image index when post changes
  useEffect(() => {
    setCurrentImageIndex(0)
  }, [post._id])

  const isOwner = user?.id === post.author._id || user?.email === post.author.email

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken')
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
  }

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like posts')
      return
    }

    setIsLiking(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${post._id}/like`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        const updated = {
          ...localPost,
          hasLiked: data.data.liked,
          likeCount: data.data.likeCount
        }
        setLocalPost(updated)
        onUpdate?.(updated)
      }
    } catch (error) {
      toast.error('Failed to like post')
    } finally {
      setIsLiking(false)
    }
  }

  const handleBookmark = async () => {
    if (!user) {
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
      }
    } catch (error) {
      toast.error('Failed to bookmark post')
    } finally {
      setIsBookmarking(false)
    }
  }

  const handleVote = async (optionIndex: number) => {
    if (!user) {
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
      }
    } catch (error) {
      toast.error('Failed to repost')
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
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied!')
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
        return (
          <span key={i} className="text-blue-400 hover:underline cursor-pointer">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <article className="w-full max-w-full rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:bg-white/[0.03] transition-colors">
      {/* Repost Header */}
      {localPost.isRepost && localPost.repostedBy && (
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-xs text-white/40">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>
            {localPost.repostedBy.firstName || localPost.repostedBy.email.split('@')[0]} reposted
          </span>
        </div>
      )}

      <div className="p-4 w-full max-w-full overflow-hidden">
        {/* Author Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${localPost.author._id}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-semibold text-white">
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
              <Link href={`/profile/${localPost.author._id}`} className="font-medium text-white hover:underline">
                {localPost.author.firstName || localPost.author.email.split('@')[0]}
              </Link>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span>{formatDistanceToNow(new Date(localPost.createdAt), { addSuffix: true })}</span>
                {localPost.isEdited && <span>• edited</span>}
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
                <button className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white/60">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#141414] border-white/[0.08] rounded-xl">
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator className="bg-white/[0.06]" />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href={`/posts/${post._id}/edit`}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-400 focus:text-red-400 cursor-pointer">
                      <Trash2 className="w-4 h-4 mr-2" />
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
            <p className="text-base text-white/90 leading-relaxed whitespace-pre-wrap break-words mb-3">
              {renderText(localPost.content.text)}
            </p>
          )}

          {/* Images Carousel */}
          {localPost.content.images && localPost.content.images.length > 0 && (
            <div className="mb-3 relative -mx-4 md:mx-0">
              <div 
                className="relative w-[calc(100%+2rem)] md:w-full aspect-square bg-black rounded-none md:rounded-xl overflow-hidden select-none"
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
                        <ChevronLeft className="w-5 h-5 text-white" />
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
                        <ChevronRight className="w-5 h-5 text-white" />
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
                            ? "w-6 bg-white"
                            : "w-1.5 bg-white/40 hover:bg-white/60"
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Image Counter */}
                {localPost.content.images.length > 1 && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 text-xs text-white z-10">
                    {currentImageIndex + 1} / {localPost.content.images.length}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Playlist Preview */}
          {localPost.content.playlist && (
            <Link href={`/playlists/${localPost.content.playlist._id}`}>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 hover:bg-white/[0.05] transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center">
                    <ListMusic className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{localPost.content.playlist.name}</h4>
                    <p className="text-xs text-white/40">{localPost.content.playlist.itemCount} items</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/30" />
                </div>
                
                {localPost.content.playlist.items && localPost.content.playlist.items.length > 0 && (
                  <div className="space-y-1.5">
                    {localPost.content.playlist.items.slice(0, 3).map((item, index) => {
                      const Icon = contentTypeIcons[item.contentType] || Target
                      return (
                        <div key={item._id || index} className="flex items-center gap-2 text-xs text-white/50">
                          <Icon className="w-3 h-3" />
                          <span className="truncate">{item.title}</span>
                        </div>
                      )
                    })}
                    {localPost.content.playlist.itemCount > 3 && (
                      <p className="text-xs text-white/30">+{localPost.content.playlist.itemCount - 3} more</p>
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
                "rounded-xl border p-4 hover:opacity-90 transition-opacity cursor-pointer",
                localPost.content.contentReference.type === 'opportunity' && "bg-orange-500/10 border-orange-500/20",
                localPost.content.contentReference.type === 'job' && "bg-blue-500/10 border-blue-500/20",
                localPost.content.contentReference.type === 'event' && "bg-emerald-500/10 border-emerald-500/20",
                localPost.content.contentReference.type === 'resource' && "bg-violet-500/10 border-violet-500/20"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    localPost.content.contentReference.type === 'opportunity' && "bg-orange-500/20",
                    localPost.content.contentReference.type === 'job' && "bg-blue-500/20",
                    localPost.content.contentReference.type === 'event' && "bg-emerald-500/20",
                    localPost.content.contentReference.type === 'resource' && "bg-violet-500/20"
                  )}>
                    {(() => {
                      const Icon = contentTypeIcons[localPost.content.contentReference.type] || Target
                      return (
                        <Icon className={cn(
                          "w-5 h-5",
                          localPost.content.contentReference.type === 'opportunity' && "text-orange-500",
                          localPost.content.contentReference.type === 'job' && "text-blue-500",
                          localPost.content.contentReference.type === 'event' && "text-emerald-500",
                          localPost.content.contentReference.type === 'resource' && "text-violet-500"
                        )} />
                      )
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs font-medium",
                        localPost.content.contentReference.type === 'opportunity' && "text-orange-500",
                        localPost.content.contentReference.type === 'job' && "text-blue-500",
                        localPost.content.contentReference.type === 'event' && "text-emerald-500",
                        localPost.content.contentReference.type === 'resource' && "text-violet-500"
                      )}>
                        {localPost.content.contentReference.type === 'opportunity' ? 'Opportunity' :
                         localPost.content.contentReference.type === 'job' ? 'Job' :
                         localPost.content.contentReference.type === 'event' ? 'Event' : 'Resource'}
                      </span>
                      {localPost.content.contentReference.organization && (
                        <>
                          <span className="text-white/20">•</span>
                          <span className="text-xs text-white/50 truncate">
                            {localPost.content.contentReference.organization}
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-1 line-clamp-2 break-words">
                      {localPost.content.contentReference.title}
                    </h4>
                    {localPost.content.contentReference.description && (
                      <p className="text-xs text-white/60 line-clamp-2 mb-2 break-words">
                        {localPost.content.contentReference.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                      {localPost.content.contentReference.location && (
                        <div className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
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
                              <Clock className="w-3 h-3" />
                              <span>Due {new Date(localPost.content.contentReference.dates.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                          {localPost.content.contentReference.dates.startDate && !localPost.content.contentReference.dates.applicationDeadline && (
                            <div className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(localPost.content.contentReference.dates.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </>
                      )}
                      {localPost.content.contentReference.financial?.isPaid && (
                        <div className="inline-flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>{localPost.content.contentReference.financial.amount || 'Paid'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/30 flex-shrink-0" />
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
              <div className="mb-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <h4 className="text-sm font-semibold text-white break-words">{poll.question}</h4>
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
                            ? "border-orange-500/50 bg-orange-500/10"
                            : hasVoted || isPollEnded
                            ? "border-white/[0.06] bg-white/[0.02] cursor-default"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] cursor-pointer"
                        )}
                      >
                        <div className="relative z-10 p-3 flex items-center justify-between gap-2">
                          <span className={cn(
                            "text-sm break-words flex-1 min-w-0",
                            isSelected ? "text-orange-500 font-medium" : "text-white"
                          )}>
                            {option.text}
                          </span>
                          <div className="flex items-center gap-2">
                            {(hasVoted || isPollEnded) && (
                              <span className="text-xs text-white/50">
                                {percentage.toFixed(1)}%
                              </span>
                            )}
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                        </div>
                        {(hasVoted || isPollEnded) && (
                          <div
                            className="absolute inset-0 bg-orange-500/20"
                            style={{ width: `${percentage}%` }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
                
                <div className="mt-3 flex items-center justify-between text-xs text-white/40">
                  <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                  {!isPollEnded && (
                    <span>
                      Ends {new Date(poll.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {isPollEnded && (
                    <span className="text-white/30">Poll ended</span>
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-xs hover:bg-orange-500/20 transition-colors"
                >
                  <Hash className="w-3 h-3" />
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <div className="flex items-center gap-1">
              {/* Like */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors",
                  localPost.hasLiked
                    ? "text-red-500 bg-red-500/10"
                    : "text-white/50 hover:text-red-500 hover:bg-red-500/10"
                )}
              >
                <Heart className={cn("w-4 h-4", localPost.hasLiked && "fill-current")} />
                <span className="text-sm">{localPost.likeCount || ''}</span>
              </button>

              {/* Reply */}
              <Link href={`/posts/${post._id}`}>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/50 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{localPost.replyCount || ''}</span>
                </button>
              </Link>

              {/* Repost */}
              <button
                onClick={handleRepost}
                disabled={isReposting || localPost.hasReposted}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors",
                  localPost.hasReposted
                    ? "text-emerald-500 bg-emerald-500/10"
                    : "text-white/50 hover:text-emerald-500 hover:bg-emerald-500/10"
                )}
              >
                <Repeat2 className="w-4 h-4" />
                <span className="text-sm">{localPost.repostCount || ''}</span>
              </button>
            </div>

            {/* Bookmark */}
            <button
              onClick={handleBookmark}
              disabled={isBookmarking}
              className={cn(
                "p-2 rounded-lg transition-colors",
                localPost.hasBookmarked
                  ? "text-yellow-500 bg-yellow-500/10"
                  : "text-white/50 hover:text-yellow-500 hover:bg-yellow-500/10"
              )}
            >
              <Bookmark className={cn("w-4 h-4", localPost.hasBookmarked && "fill-current")} />
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
