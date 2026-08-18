"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  RiFocus3Line,
  RiBriefcaseLine,
  RiCalendarLine,
  RiBookLine,
  RiArrowRightLine,
  RiMapPinLine,
  RiTimeLine,
  RiMoneyDollarCircleLine,
  RiHeartLine,
  RiHeartFill,
  RiBookmarkLine,
  RiBookmarkFill,
  RiListOrdered,
  RiShareLine,
  RiShareFill,
  RiChat1Line,
  RiEyeLine,
} from 'react-icons/ri'
import { useAuth } from '@/lib/auth-context'
import { dispatchGuestEngaged } from '@/components/sign-up-better-experience-popup'
import ApiClient from '@/lib/api-client'
import AddToPlaylistModal from './add-to-playlist-modal'
import ContentShareComposer from './content-share-composer'
import { trackLike, trackSave, trackShare, trackContentView } from '@/lib/tracking'
import {
  resolveFeedContentKind,
  toEngagementApiPlural,
  type FeedContentKind,
} from '@/lib/feed-content-type'
import { toast } from 'sonner'

interface FeedCardProps {
  item: {
    _id: string
    title: string
    description?: string
    type: 'opportunity' | 'job' | 'event' | 'resource'
    company?: string
    organization?: string
    author?: string
    location?: {
      country?: string
      province?: string
      city?: string
      isRemote?: boolean
      address?: string
    }
    tags?: string[]
    financial?: {
      isPaid?: boolean
      amount?: string
      currency?: string
      benefits?: string[]
    }
    isPaid?: boolean
    price?: string
    dates?: {
      applicationDeadline?: string
      startDate?: string
      endDate?: string
      registrationDeadline?: string
    }
    metrics?: {
      viewCount?: number
      likeCount?: number
      saveCount?: number
      /** Share button completions (native share or copy link). */
      shareCount?: number
      /** Adds to a playlist only — not bookmark/save. */
      playlistAddCount?: number
      playlistCount?: number
    }
    score?: number
    url?: string
    applicationLink?: string
    externalUrl?: string
    externalLink?: string
    paymentLink?: string
    fileUrl?: string
    category?: string
    duration?: string
  }
  onEngage?: () => void
  /** When provided (e.g. in sponsored slot), called when user opens the post so promotion budget can be charged. */
  onPromotionReadMore?: () => void
}

// One colour per content kind. `--primary` is hsl(24 100% 50%) — an orange —
// so `job` must NOT use primary-based classes or it renders identically to
// `opportunity` and the feed reads as monochrome.
const typeConfig = {
  opportunity: {
    icon: RiFocus3Line,
    color: 'orange',
    gradient: 'from-orange-500/20 to-orange-600/10',
    accent: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    label: 'Opportunity',
    path: 'opportunities',
    buttonColor: 'bg-orange-500 hover:bg-orange-600'
  },
  job: {
    icon: RiBriefcaseLine,
    color: 'sky',
    gradient: 'from-sky-500/20 to-sky-600/10',
    accent: 'text-sky-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    label: 'Job',
    path: 'jobs',
    buttonColor: 'bg-sky-500 hover:bg-sky-600'
  },
  event: {
    icon: RiCalendarLine,
    color: 'emerald',
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    accent: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Event',
    path: 'events',
    buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
  },
  resource: {
    icon: RiBookLine,
    color: 'violet',
    gradient: 'from-violet-500/20 to-violet-600/10',
    accent: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    label: 'Resource',
    path: 'resources',
    buttonColor: 'bg-violet-500 hover:bg-violet-600'
  }
}

export default function FeedCard({ item, onEngage, onPromotionReadMore }: FeedCardProps) {
  const { isAuthenticated } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(item.metrics?.likeCount || 0)
  const [viewCount, setViewCount] = useState(item.metrics?.viewCount ?? 0)
  const [shareCount, setShareCount] = useState(item.metrics?.shareCount ?? 0)
  const [saveCount, setSaveCount] = useState(item.metrics?.saveCount ?? 0)
  const [playlistAddCount, setPlaylistAddCount] = useState(
    item.metrics?.playlistAddCount ?? item.metrics?.playlistCount ?? 0
  )
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [showShareComposer, setShowShareComposer] = useState(false)
  const [justShared, setJustShared] = useState(false)
  const [engagementStatusLoaded, setEngagementStatusLoaded] = useState(false)

  const contentKind: FeedContentKind = resolveFeedContentKind(item.type)
  const engagementApiType = toEngagementApiPlural(contentKind)
  const config = typeConfig[contentKind] || typeConfig.opportunity
  const TypeIcon = config.icon
  /** The post's own page — everything about this item lives there. */
  const detailHref = `/${config.path}/${item._id}`

  // Load engagement status (like/save) when component mounts
  useEffect(() => {
    // Reset status loaded flag when item changes
    setEngagementStatusLoaded(false)

    if (isAuthenticated && item._id) {
      loadEngagementStatus()
    } else {
      // Reset to false if not authenticated
      setIsLiked(false)
      setIsSaved(false)
      setEngagementStatusLoaded(true)
    }
  }, [isAuthenticated, item._id])

  useEffect(() => {
    setViewCount(item.metrics?.viewCount ?? 0)
    setShareCount(item.metrics?.shareCount ?? 0)
    setSaveCount(item.metrics?.saveCount ?? 0)
    setPlaylistAddCount(item.metrics?.playlistAddCount ?? item.metrics?.playlistCount ?? 0)
  }, [item._id, item.metrics?.viewCount, item.metrics?.shareCount, item.metrics?.saveCount, item.metrics?.playlistAddCount, item.metrics?.playlistCount])

  const feedViewSessionKey = () => `glow_feed_view_expand_${contentKind}_${item._id}`

  const recordAuthenticatedFeedView = async (source: 'feed_show_more' | 'feed_like') => {
    if (!isAuthenticated || !item._id) return
    try {
      await ApiClient.recordFeedContentView(contentKind, item._id, source)
      if (source === 'feed_show_more') {
        trackContentView(contentKind, item._id)
      }
    } catch {
      // Optimistic count already applied; backend may be unavailable
    }
  }

  const loadEngagementStatus = async () => {
    // Don't make API call if item ID is invalid or already loaded
    if (!item._id || !isAuthenticated || engagementStatusLoaded) {
      return
    }

    try {
      const status = await ApiClient.getEngagementStatus(engagementApiType, item._id)
      setIsLiked(status.isLiked || false)
      setIsSaved(status.isSaved || false)
      setEngagementStatusLoaded(true)
    } catch (error: any) {
      // Mark as loaded even on error to prevent retry loops
      setEngagementStatusLoaded(true)

      // Handle 404 gracefully - item might not exist or might have been deleted
      // This is not a critical error, just means we can't determine engagement status
      const errorMessage = error?.message?.toLowerCase() || '';
      if (errorMessage.includes('not found') ||
        errorMessage.includes('404') ||
        errorMessage.includes('resource not found')) {
        // Item doesn't exist - reset to default state
        setIsLiked(false)
        setIsSaved(false)
        return
      }

      // For authentication errors, also reset to default (user might have logged out)
      if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        setIsLiked(false)
        setIsSaved(false)
        return
      }

      // For other errors, silently fail and keep default state
      // Don't log to console to avoid noise
    }
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      dispatchGuestEngaged()
      return
    }

    // Store previous state in case we need to revert
    const previousLikedState = isLiked
    const previousLikeCount = likeCount

    try {
      if (isLiked) {
        await ApiClient.unlikeItem(engagementApiType, item._id)
        setIsLiked(false)
        setLikeCount(prev => Math.max(0, prev - 1))
      } else {
        // Optimistically update UI
        setIsLiked(true)
        setLikeCount(prev => prev + 1)

        await ApiClient.likeItem(engagementApiType, item._id)

        // Like also counts as a view for feed metrics
        setViewCount((v) => v + 1)
        void recordAuthenticatedFeedView('feed_like')

        // Track active user activity (fire-and-forget, won't throw errors)
        trackLike(contentKind, item._id)
        // If content is promoted, deduct from promotion budget (backend no-ops if not promoted)
        ApiClient.recordPromotionClick(item._id, contentKind, 'like').catch(() => {})
      }
      onEngage?.()
    } catch (error: any) {
      // Revert optimistic update on error
      setIsLiked(previousLikedState)
      setLikeCount(previousLikeCount)

      const errorMessage = error?.message || 'Failed to update like status'

      // Handle specific validation errors from backend
      if (errorMessage.includes('only like active') ||
        errorMessage.includes('only save active') ||
        errorMessage.includes('only engage with active') ||
        errorMessage.includes('inactive, unapproved, or expired') ||
        errorMessage.includes('Cannot like inactive') ||
        errorMessage.includes('applications are closed') ||
        errorMessage.includes('deadline has passed') ||
        errorMessage.includes('event has ended')) {

        toast.error(
          `This ${contentKind} is no longer active. Applications may be closed or the deadline has passed.`,
          { duration: 4000 }
        )
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        toast.error('Please sign in to like content', { duration: 3000 })
      } else {
        // Generic error message
        toast.error('Failed to update like status. Please try again.', { duration: 3000 })
      }

      console.error('Error toggling like:', error)
    }
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      dispatchGuestEngaged()
      return
    }

    // Store previous state in case we need to revert
    const previousSavedState = isSaved
    const previousSaveCount = saveCount

    try {
      if (isSaved) {
        await ApiClient.unsaveItem(engagementApiType, item._id)
        setIsSaved(false)
        setSaveCount((c) => Math.max(0, c - 1))
      } else {
        // Optimistically update UI
        setIsSaved(true)

        await ApiClient.saveItem(engagementApiType, item._id)
        setSaveCount((c) => c + 1)

        // Track active user activity (fire-and-forget, won't throw errors)
        trackSave(contentKind, item._id)
      }
      onEngage?.()
    } catch (error: any) {
      // Revert optimistic update on error
      setIsSaved(previousSavedState)
      setSaveCount(previousSaveCount)

      const errorMessage = error?.message || 'Failed to update save status'

      // Handle specific validation errors from backend
      if (errorMessage.includes('only like active') ||
        errorMessage.includes('only save active') ||
        errorMessage.includes('only engage with active') ||
        errorMessage.includes('inactive, unapproved, or expired') ||
        errorMessage.includes('Cannot like inactive') ||
        errorMessage.includes('applications are closed') ||
        errorMessage.includes('deadline has passed') ||
        errorMessage.includes('event has ended')) {

        toast.error(
          `This ${contentKind} is no longer active. Applications may be closed or the deadline has passed.`,
          { duration: 4000 }
        )
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        toast.error('Please sign in to save content', { duration: 3000 })
      } else {
        // Generic error message
        toast.error('Failed to update save status. Please try again.', { duration: 3000 })
      }

      console.error('Error toggling save:', error)
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const url = `${window.location.origin}/${engagementApiType}/${item._id}`

    const onShareCompleted = () => {
      setShareCount((c) => c + 1)
      if (isAuthenticated) {
        void ApiClient.recordFeedShare(contentKind, item._id)
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          url
        })
        // Track active user activity if share was successful (fire-and-forget)
        trackShare(contentKind, item._id)
        ApiClient.recordPromotionClick(item._id, contentKind, 'share').catch(() => {})
        onShareCompleted()
        setJustShared(true)
        setTimeout(() => setJustShared(false), 1500)
      } catch (err) {
        // User cancelled share - don't track
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url)
        trackShare(contentKind, item._id)
        ApiClient.recordPromotionClick(item._id, contentKind, 'share').catch(() => {})
        onShareCompleted()
        setJustShared(true)
        setTimeout(() => setJustShared(false), 1500)
      } catch {
        // clipboard denied — no count
      }
    }
  }

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) return
    setShowPlaylistModal(true)
  }

  /**
   * Opening the post carries the same intent the old in-place expand did, so it
   * bills and counts the same way. The `show_more` / `feed_show_more` names stay
   * as they are: they are the backend's contract, not a description of this UI.
   *
   * Deliberately no `preventDefault` — the link must be allowed to navigate — and
   * no guest popup, since reading the page is not a blocked action for guests.
   */
  const handleReadMore = () => {
    onPromotionReadMore?.()
    ApiClient.recordPromotionClick(item._id, contentKind, 'show_more').catch(() => {})
    // Valid view: first open per item per browser session (authenticated)
    if (isAuthenticated && typeof sessionStorage !== 'undefined') {
      const key = feedViewSessionKey()
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        setViewCount((v) => v + 1)
        void recordAuthenticatedFeedView('feed_show_more')
      }
    }
  }

  const getLocationString = () => {
    if (item.location?.isRemote) return 'Remote'
    const parts = [item.location?.city, item.location?.country].filter(Boolean)
    return parts.join(', ') || null
  }

  const getDateString = () => {
    if (item.dates?.applicationDeadline) {
      const date = new Date(item.dates.applicationDeadline)
      return `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }
    if (item.dates?.startDate) {
      const date = new Date(item.dates.startDate)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getProviderName = () => {
    return item.company || item.organization || item.author || null
  }

  // Calculate days until deadline for hot card feature (events, opportunities, jobs)
  const deadlineInfo = useMemo(() => {
    // Get the appropriate deadline field based on content type
    let deadline: string | undefined

    if (contentKind === 'event') {
      deadline = item.dates?.registrationDeadline
    } else if (contentKind === 'opportunity' || contentKind === 'job') {
      deadline = item.dates?.applicationDeadline
    } else {
      return null // Resources don't have deadlines
    }

    if (!deadline) return null

    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - now.getTime()

    if (diffTime <= 0) return null // Deadline has passed

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = diffTime / (1000 * 60 * 60)

    return {
      daysLeft: diffDays,
      hoursLeft: diffHours,
      deadlineDate,
      isHot: diffDays >= 2 && diffDays <= 3, // Hot if 2-3 days
      isUrgent: diffHours <= 24, // Urgent if 24 hours or less
      timeRemaining: diffTime // Milliseconds remaining
    }
  }, [contentKind, item.dates?.registrationDeadline, item.dates?.applicationDeadline])

  // Countdown timer state for urgent events (1 day or less)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    deadlineInfo?.isUrgent ? deadlineInfo.timeRemaining : null
  )

  // Update countdown timer every second for urgent events
  useEffect(() => {
    if (!deadlineInfo?.isUrgent) return

    const interval = setInterval(() => {
      const now = new Date()
      const deadlineDate = new Date(deadlineInfo.deadlineDate)
      const diffTime = deadlineDate.getTime() - now.getTime()

      if (diffTime <= 0) {
        setTimeRemaining(0)
        clearInterval(interval)
      } else {
        setTimeRemaining(diffTime)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [deadlineInfo])

  // Format countdown timer
  const formatCountdown = (ms: number, contentType: string) => {
    if (ms <= 0) {
      return contentType === 'event' ? 'Registration Closed' : 'Application Closed'
    }

    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)


    if (hours > 0) {
      return `${hours}h ${minutes}m `
    } else if (minutes > 0) {
      return `${minutes}m `
    }

  }

  return (
    <>
      <article className={cn(
        "w-full max-w-full relative p-4 rounded-2xl border transition-all duration-300",
        "bg-card/80 backdrop-blur-sm border-border/70 hover:bg-card hover:border-border/90 hover:shadow-sm",
        // Hot card effects for events/opportunities/jobs approaching deadline
        deadlineInfo?.isHot && "shadow-[0_0_20px_rgba(234,179,8,0.4)] border-yellow-500/40",
        deadlineInfo?.isUrgent && "shadow-[0_0_30px_rgba(239,68,68,0.5)] border-red-500/50 bg-red-500/5"
      )}>
        {/* Hot Card Badge - 2-3 days left */}
        {deadlineInfo?.isHot && !deadlineInfo.isUrgent && (
          <div className="absolute -top-2 -right-2 z-10 flex flex-col items-end gap-1.5">
            <div className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
              "bg-gradient-to-r from-yellow-500 to-yellow-600 text-smoke-500",
              "shadow-lg shadow-yellow-100/50 animate-pulse"
            )}>
              {deadlineInfo.daysLeft} {deadlineInfo.daysLeft === 1 ? 'day' : 'days'} left to {contentKind === 'event' ? 'sign up' : contentKind === 'opportunity' ? 'apply' : 'apply'}
            </div>
            {/* Match Score Badge - Below hot card tag */}
            {typeof item.score === 'number' && (
              <div className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
                "bg-gradient-to-r from-orange-500 to-orange-600 text-foreground",
                "shadow-lg shadow-primary/30"
              )}>
                {Math.round(item.score)}% Match
              </div>
            )}
          </div>
        )}

        {/* Urgent Countdown Timer - 1 day or less */}
        {deadlineInfo?.isUrgent && timeRemaining !== null && (
          <div className="absolute -top-2 -right-2 z-10 flex flex-col items-end gap-1.5">
            <div className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap",
              "bg-gradient-to-r from-red-600 to-red-700 text-foreground",
              "shadow-lg shadow-red-600/60 animate-pulse border border-red-400/50"
            )}>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-card animate-pulse" />
                <span>{formatCountdown(timeRemaining, contentKind)} left to {contentKind === 'event' ? 'sign up' : contentKind === 'opportunity' ? 'apply' : 'submit'}</span>
              </div>
            </div>
            {/* Match Score Badge - Below urgent timer */}
            {typeof item.score === 'number' && (
              <div className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
                "bg-gradient-to-r from-orange-500 to-orange-600 text-foreground",
                "shadow-lg shadow-primary/30"
              )}>
                {Math.round(item.score)}% Match
              </div>
            )}
          </div>
        )}

        {/* Match Score Badge - Only show if not a hot card or urgent */}
        {typeof item.score === 'number' && !deadlineInfo?.isHot && !deadlineInfo?.isUrgent && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
              "bg-gradient-to-r from-orange-500 to-orange-600 text-foreground",
              "shadow-lg shadow-primary/30"
            )}>
              {Math.round(item.score)}% Match
            </div>
          </div>
        )}

        {/* Header Row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Type Icon */}
          {(() => {
            const Icon = config.icon
            return (
              <div className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border",
                config.bg,
                config.border
              )}>
                <Icon className={cn("w-5 h-5", config.accent)} aria-hidden />
              </div>
            )
          })()}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Type & Provider */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("text-xs font-medium", config.accent)}>
                {config.label}
              </span>
              {getProviderName() && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {getProviderName()}
                  </span>
                </>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-foreground leading-snug">
              {item.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {item.description}
            </p>
          </div>
        )}

        {/* Opens the post's own page, where the full detail lives */}
        <div className="mb-4">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-full border-border/70 px-4 text-xs font-semibold text-foreground hover:border-border hover:bg-muted/60"
          >
            <Link href={detailHref} onClick={handleReadMore}>
              Read more
              <RiArrowRightLine className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </Button>
        </div>

        {/* Meta Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* <div
            // className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/60 text-muted-foreground text-[11px]"
            title="Views from Show more and likes on the feed"
          >
            {/* <RiEyeLine className="w-3 h-3 shrink-0" aria-hidden />
            <span>{viewCount.toLocaleString()} views</span> 
          </div> */}
          {getLocationString() && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-muted-foreground text-[11px]">
              <RiMapPinLine className="w-3 h-3" aria-hidden />
              <span>{getLocationString()}</span>
            </div>
          )}
          {getDateString() && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-muted-foreground text-[11px]">
              <RiTimeLine className="w-3 h-3" aria-hidden />
              <span>{getDateString()}</span>
            </div>
          )}
          {(item.financial?.isPaid || item.isPaid) && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <RiMoneyDollarCircleLine className="w-3 h-3" aria-hidden />
              <span>{item.financial?.amount || item.price || 'Paid'}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.tags.slice(0, 4).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-muted/60 border border-border/60 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 4 && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-muted/60 border border-border/60 text-muted-foreground">
                +{item.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-1">
            {/* Like */}
            {/* View Counter */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground">
              <RiEyeLine className="w-4 h-4" aria-hidden />
              {viewCount}
            </span>
            <button
              onClick={handleLike}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                isLiked
                  ? "text-red-500 bg-red-500/10"
                  : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
              )}
            >
              {isLiked ? (
                <RiHeartFill className="w-4 h-4 text-current" aria-hidden />
              ) : (
                <RiHeartLine className="w-4 h-4" aria-hidden />
              )}
              {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                isSaved
                  ? "text-orange-500 bg-primary/10"
                  : "text-muted-foreground hover:text-orange-500 hover:bg-primary/10"
              )}
              title="Saves"
            >
              {isSaved ? (
                <RiBookmarkFill className="w-4 h-4 text-current" aria-hidden />
              ) : (
                <RiBookmarkLine className="w-4 h-4" aria-hidden />
              )}
              <span className="text-xs tabular-nums">{saveCount}</span>
            </button>

            {/* Add to Playlist */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleAddToPlaylist}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-200"
                title="Playlist adds (not saves)"
              >
                <RiListOrdered className="w-5 h-5" aria-hidden />
                <span className="text-xs tabular-nums">{playlistAddCount}</span>
              </button>
            )}

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                justShared ? "text-foreground bg-muted/60" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
              title="Share taps (completed share or copy)"
            >
              {justShared ? (
                <RiShareFill className="w-4 h-4" aria-hidden />
              ) : (
                <RiShareLine className="w-4 h-4" aria-hidden />
              )}
              <span className="text-xs tabular-nums">{shareCount}</span>
            </button>

            {/* Post About This */}
            {/* {isAuthenticated && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowShareComposer(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-orange-400 hover:bg-primary/10 transition-all duration-200"
              >
                <RiChat1Line className="w-4 h-4" aria-hidden />
                <span className="hidden sm:inline">Post</span>
              </button>
            )} */}
          </div>
        </div>
      </article>

      {/* Content Share Composer */}
      {showShareComposer && (
        <ContentShareComposer
          content={item}
          onPostCreated={(post) => {
            setShowShareComposer(false)
            onEngage?.()
          }}
          onClose={() => setShowShareComposer(false)}
        />
      )}

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        item={{
          _id: item._id,
          title: item.title,
          type: contentKind,
          company: item.company,
          organization: item.organization,
          author: item.author,
          description: item.description
        }}
        onItemAddedToPlaylist={() => {
          setPlaylistAddCount((c) => c + 1)
          void ApiClient.recordFeedPlaylistAdd(contentKind, item._id)
        }}
      />
    </>
  )
}
