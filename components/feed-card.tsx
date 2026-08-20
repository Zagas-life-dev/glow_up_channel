"use client"

import { useState, useEffect, useMemo, Fragment } from 'react'
import type { IconType } from 'react-icons'
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

/**
 * One engagement control. Counts sit beside the icon and the background only appears on hover
 * or when active, so a feed of twenty cards is not a wall of filled pills.
 */
function FeedAction({
  icon: Icon,
  count,
  label,
  onClick,
  active = false,
  activeClass = 'text-foreground',
  hoverClass = 'hover:text-foreground',
}: {
  icon: IconType
  count: number
  label: string
  onClick: (event: React.MouseEvent) => void
  active?: boolean
  activeClass?: string
  hoverClass?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors',
        active ? activeClass : cn('text-muted-foreground', hoverClass),
        'hover:bg-muted'
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {count > 0 ? <span className="tabular-nums">{count.toLocaleString()}</span> : null}
    </button>
  )
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

  /**
   * Deadline urgency, escalating. The old card fired a glowing, pulsing badge that floated
   * outside its own bounds for 2-3 days out, and showed nothing at all for 4-7 days — so the
   * one thing this product is actually about (a closing date) was either shouting or silent.
   */
  const urgency: 'urgent' | 'soon' | 'upcoming' | null = !deadlineInfo
    ? null
    : deadlineInfo.isUrgent
      ? 'urgent'
      : deadlineInfo.daysLeft <= 3
        ? 'soon'
        : deadlineInfo.daysLeft <= 7
          ? 'upcoming'
          : null

  const deadlineLabel =
    urgency === 'urgent' && timeRemaining !== null
      ? `${formatCountdown(timeRemaining, contentKind)} left`
      : deadlineInfo
        ? `${deadlineInfo.daysLeft} ${deadlineInfo.daysLeft === 1 ? 'day' : 'days'} left`
        : null

  /** Facts read as one quiet line instead of a row of bordered chips. */
  const metaParts: React.ReactNode[] = []
  if (getLocationString()) metaParts.push(<span key="loc">{getLocationString()}</span>)
  if (!urgency && getDateString()) metaParts.push(<span key="date">{getDateString()}</span>)
  if (item.financial?.isPaid || item.isPaid) {
    metaParts.push(
      <span key="paid" className="font-medium text-emerald-600 dark:text-emerald-400">
        {item.financial?.amount || item.price || 'Paid'}
      </span>
    )
  }
  if (typeof item.score === 'number') {
    metaParts.push(
      <span key="score" className="font-medium text-primary">{Math.round(item.score)}% match</span>
    )
  }
  if (viewCount > 0) metaParts.push(<span key="views">{viewCount.toLocaleString()} views</span>)

  return (
    <>
      <article
        className={cn(
          'group relative w-full overflow-hidden rounded-2xl border bg-card transition-colors duration-200',
          'border-border hover:bg-muted/30',
          urgency === 'urgent' && 'border-red-500/40'
        )}
      >
        {/* Urgency reads as a thin rail rather than a coloured glow around the whole card. */}
        {urgency === 'urgent' || urgency === 'soon' ? (
          <span
            aria-hidden
            className={cn(
              'absolute inset-y-0 left-0 w-[3px]',
              urgency === 'urgent' ? 'bg-red-500' : 'bg-amber-500'
            )}
          />
        ) : null}

        <div className="p-4">
          {/* Type, provider, and how long is left */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5 text-xs">
              <TypeIcon className={cn('h-3.5 w-3.5 shrink-0', config.accent)} aria-hidden />
              <span className={cn('font-medium', config.accent)}>{config.label}</span>
              {getProviderName() ? (
                <>
                  <span className="text-muted-foreground/40" aria-hidden>·</span>
                  <span className="truncate text-muted-foreground">{getProviderName()}</span>
                </>
              ) : null}
            </div>

            {urgency && deadlineLabel ? (
              <span
                className={cn(
                  'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                  urgency === 'urgent' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                  urgency === 'soon' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                  urgency === 'upcoming' && 'bg-muted text-muted-foreground'
                )}
              >
                {deadlineLabel}
              </span>
            ) : null}
          </div>

          {/* The title is the link — the old card spent a whole row on a "Read more" button
              that went to the same place. */}
          <h3 className="mt-2 text-[15px] font-semibold leading-snug text-foreground sm:text-base">
            <Link
              href={detailHref}
              onClick={handleReadMore}
              className="line-clamp-2 transition-colors before:absolute before:inset-0 group-hover:text-primary"
            >
              {item.title}
            </Link>
          </h3>

          {item.description ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          ) : null}

          {metaParts.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
              {metaParts.map((part, index) => (
                <Fragment key={index}>
                  {index > 0 ? <span className="text-muted-foreground/40" aria-hidden>·</span> : null}
                  {part}
                </Fragment>
              ))}
            </div>
          ) : null}

          {/* Actions sit above the title's stretched link */}
          <div className="relative z-10 mt-3 flex items-center gap-0.5 border-t border-border/60 pt-2.5">
            <FeedAction
              onClick={handleLike}
              active={isLiked}
              activeClass="text-red-500"
              hoverClass="hover:text-red-500"
              icon={isLiked ? RiHeartFill : RiHeartLine}
              count={likeCount}
              label="Like"
            />
            <FeedAction
              onClick={handleSave}
              active={isSaved}
              activeClass="text-primary"
              hoverClass="hover:text-primary"
              icon={isSaved ? RiBookmarkFill : RiBookmarkLine}
              count={saveCount}
              label="Save"
            />
            {isAuthenticated ? (
              <FeedAction
                onClick={handleAddToPlaylist}
                hoverClass="hover:text-violet-500"
                icon={RiListOrdered}
                count={playlistAddCount}
                label="Add to playlist"
              />
            ) : null}
            <FeedAction
              onClick={handleShare}
              active={justShared}
              activeClass="text-foreground"
              hoverClass="hover:text-foreground"
              icon={justShared ? RiShareFill : RiShareLine}
              count={shareCount}
              label="Share"
            />

            <RiArrowRightLine
              className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden
            />
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
