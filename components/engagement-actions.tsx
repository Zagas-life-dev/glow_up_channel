"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import ApiClient from '@/lib/api-client'
import { toast } from 'sonner'
import { trackLike, trackSave, trackShare } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import {
  RiHeartLine,
  RiHeartFill,
  RiBookmarkLine,
  RiBookmarkFill,
  RiShareLine,
  RiShareFill,
  RiChat1Line,
} from 'react-icons/ri'

interface EngagementActionsProps {
  type: 'opportunities' | 'events' | 'jobs' | 'resources'
  id: string
  externalUrl?: string
  className?: string
  /** Optional like count to display (e.g. from item.metrics.likeCount) */
  likeCount?: number
  /** If provided, shows a "Post" button that calls this (e.g. open share composer) */
  onPostClick?: () => void
}

interface EngagementStatus {
  isSaved: boolean
  isLiked: boolean
}

export default function EngagementActions({
  type,
  id,
  className = '',
  likeCount: initialLikeCount = 0,
  onPostClick,
}: EngagementActionsProps) {
  const { isAuthenticated } = useAuth()
  const [engagementStatus, setEngagementStatus] = useState<EngagementStatus>({
    isSaved: false,
    isLiked: false,
  })
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [justShared, setJustShared] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isStatusLoading, setIsStatusLoading] = useState(true)

  useEffect(() => {
    setLikeCount(initialLikeCount)
  }, [initialLikeCount])

  useEffect(() => {
    if (isAuthenticated) {
      loadEngagementStatus()
    } else {
      setIsStatusLoading(false)
    }
  }, [isAuthenticated, id])

  const loadEngagementStatus = async () => {
    try {
      setIsStatusLoading(true)
      const status = await ApiClient.getEngagementStatus(type, id)
      setEngagementStatus(status)
    } catch {
      // ignore
    } finally {
      setIsStatusLoading(false)
    }
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Please sign in to like items')
      return
    }

    const promotionContentType =
      type === 'opportunities'
        ? 'opportunity'
        : type === 'events'
          ? 'event'
          : type === 'jobs'
            ? 'job'
            : 'resource'

    try {
      setIsLoading(true)
      if (engagementStatus.isLiked) {
        await ApiClient.unlikeItem(type, id)
        setEngagementStatus((prev) => ({ ...prev, isLiked: false }))
        setLikeCount((c) => Math.max(0, c - 1))
        toast.success('Removed from liked items')
      } else {
        await ApiClient.likeItem(type, id)
        setEngagementStatus((prev) => ({ ...prev, isLiked: true }))
        setLikeCount((c) => c + 1)
        toast.success('Added to liked items')
        trackLike(type === 'opportunities' ? 'opportunity' : type === 'events' ? 'event' : type === 'jobs' ? 'job' : 'resource', id)
        ApiClient.recordPromotionClick(id, promotionContentType, 'like').catch(() => {})
      }
    } catch (error: any) {
      const msg = error?.message || ''
      if (msg.includes('Authentication')) {
        toast.error('Please sign in to like items')
      } else if (
        msg.includes('inactive, unapproved, or expired') ||
        msg.includes('Cannot like inactive') ||
        msg.includes('only like active') ||
        msg.includes('applications are closed') ||
        msg.includes('deadline has passed') ||
        msg.includes('event has ended')
      ) {
        const friendly =
          type === 'jobs'
            ? 'This job is no longer active, is unapproved, or has expired.'
            : 'This item is no longer active.'
        toast.error(friendly)
      } else {
        toast.error(msg || 'Failed to update like')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Please sign in to save items')
      return
    }

    const promotionContentType =
      type === 'opportunities'
        ? 'opportunity'
        : type === 'events'
          ? 'event'
          : type === 'jobs'
            ? 'job'
            : 'resource'

    try {
      setIsLoading(true)
      if (engagementStatus.isSaved) {
        await ApiClient.unsaveItem(type, id)
        setEngagementStatus((prev) => ({ ...prev, isSaved: false }))
        toast.success('Removed from saved items')
      } else {
        await ApiClient.saveItem(type, id)
        setEngagementStatus((prev) => ({ ...prev, isSaved: true }))
        toast.success('Added to saved items')
        trackSave(type === 'opportunities' ? 'opportunity' : type === 'events' ? 'event' : type === 'jobs' ? 'job' : 'resource', id)
      }
    } catch (error: any) {
      if (error?.message?.includes('Authentication')) {
        toast.error('Please sign in to save items')
      } else {
        toast.error(error?.message || 'Failed to update save')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const normalizedType = type === 'opportunities' ? 'opportunity' : type === 'events' ? 'event' : type === 'jobs' ? 'job' : 'resource'
    const promotionContentType = normalizedType
    const path = type === 'opportunities' ? 'opportunities' : type === 'events' ? 'events' : type === 'jobs' ? 'jobs' : 'resources'
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/${path}/${id}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url, title: 'Share' })
        trackShare(normalizedType, id)
        ApiClient.recordPromotionClick(id, promotionContentType, 'share').catch(() => {})
        setJustShared(true)
        setTimeout(() => setJustShared(false), 1500)
      } catch {
        // user cancelled
      }
    } else {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(url)
          toast.success('Link copied')
        }
        trackShare(normalizedType, id)
        ApiClient.recordPromotionClick(id, promotionContentType, 'share').catch(() => {})
        setJustShared(true)
        setTimeout(() => setJustShared(false), 1500)
      } catch {
        toast.error('Could not copy link')
      }
    }
  }

  if (isStatusLoading) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Like – same as feed card */}
      <button
        type="button"
        onClick={handleLike}
        disabled={!isAuthenticated || isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
          engagementStatus.isLiked
            ? 'text-red-500 bg-red-500/10'
            : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
        )}
      >
        {engagementStatus.isLiked ? (
          <RiHeartFill className="w-4 h-4 text-current" aria-hidden />
        ) : (
          <RiHeartLine className="w-4 h-4" aria-hidden />
        )}
        {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
      </button>

      {/* Save – same as feed card */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!isAuthenticated || isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
          engagementStatus.isSaved
            ? 'text-orange-500 bg-primary/10'
            : 'text-muted-foreground hover:text-orange-500 hover:bg-primary/10'
        )}
      >
        {engagementStatus.isSaved ? (
          <RiBookmarkFill className="w-4 h-4 text-current" aria-hidden />
        ) : (
          <RiBookmarkLine className="w-4 h-4" aria-hidden />
        )}
      </button>

      {/* Share – same as feed card */}
      <button
        type="button"
        onClick={handleShare}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
          justShared ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        {justShared ? (
          <RiShareFill className="w-4 h-4" aria-hidden />
        ) : (
          <RiShareLine className="w-4 h-4" aria-hidden />
        )}
      </button>

      {/* Post – same as feed card, only when onPostClick provided */}
      {onPostClick && isAuthenticated && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onPostClick()
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-orange-500 hover:bg-primary/10 transition-all"
        >
          <RiChat1Line className="w-4 h-4" aria-hidden />
          <span className="hidden sm:inline">Post</span>
        </button>
      )}
    </div>
  )
}
