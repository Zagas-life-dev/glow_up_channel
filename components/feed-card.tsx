"use client"

import { useState, useEffect, useMemo } from 'react'
import type { IconType } from 'react-icons'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  RiFocus3Line,
  RiBriefcaseLine,
  RiCalendarLine,
  RiBookLine,
  RiArrowRightLine,
  RiMapPinLine,
  RiHeartLine,
  RiHeartFill,
  RiBookmarkLine,
  RiBookmarkFill,
  RiListOrdered,
  RiShareLine,
  RiShareFill,
} from 'react-icons/ri'
import { useAuth } from '@/lib/auth-context'
import { dispatchGuestEngaged } from '@/components/sign-up-better-experience-popup'
import ApiClient from '@/lib/api-client'
import AddToPlaylistModal from './add-to-playlist-modal'
import ContentShareComposer from './content-share-composer'
import { trackLike, trackSave, trackShare, trackContentView } from '@/lib/tracking'
import { useReadOnly } from '@/hooks/use-online-status'
import {
  resolveFeedContentKind,
  toEngagementApiPlural,
  type FeedContentKind,
} from '@/lib/feed-content-type'
import { toast } from 'sonner'
import { useListingPrice } from '@/lib/currency/use-listing-price'
import { KindChip, DeadlinePill, SponsoredLabel, UP_KIND } from '@/components/up/kind'
import { isExtremePromotion } from '@/lib/promotion-boost'

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
    /** Canonical money object. Legacy containers below are still read for
        documents written before it existed. */
    pricing?: {
      isPaid?: boolean
      amount?: number | null
      currency?: string | null
      period?: string | null
    }
    financial?: {
      isPaid?: boolean
      amount?: number | string
      currency?: string
      benefits?: string[]
    }
    pay?: {
      isPaid?: boolean
      amount?: number | string
      currency?: string
      period?: string
    }
    isPaid?: boolean
    isPremium?: boolean
    price?: number | string
    currency?: string
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
    /**
     * Live paid placement. Set by the backend on every surface that can carry
     * one — the list endpoints, the anonymous feed cache, the recommendation
     * feed and the promoted rails — and it is what puts the disclosure above
     * the card.
     */
    isPromoted?: boolean
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
        'inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors',
        active ? activeClass : cn('text-muted-foreground', hoverClass),
        'hover:bg-up-fill'
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
  // Offline is read-only: like, save and add-to-playlist all write to the API
  // with nothing queued for replay. Share survives because it is the OS share
  // sheet or the clipboard.
  const readOnly = useReadOnly()
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

  /**
   * Report a view.
   *
   * A view means the reader opened this item — expanded it here, or landed on its
   * detail page. Scrolling a card past on the feed is an impression, not a view, and
   * counting those would both inflate the number and cost a request per card on every
   * feed load.
   *
   * Signed-out visitors count too — they are most of the traffic on a public listing,
   * and excluding them made the number read far below real reach. The server keys them
   * by an HttpOnly cookie and deduplicates to one view per viewer per day, so the count
   * only moves when the server says it did rather than on every optimistic guess.
   */
  const recordFeedView = async (source: string) => {
    if (!item._id) return
    const counted = await ApiClient.recordFeedContentView(contentKind, item._id, source)
    if (counted) setViewCount((v) => v + 1)
    if (isAuthenticated) trackContentView(contentKind, item._id)
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

        // A like is not a view. It used to increment viewCount too, which
        // double-counted every liked item on top of the impression beacon above.

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

    // Shares count for signed-out visitors too, and only once per viewer per day —
    // so the displayed number follows what the server actually recorded.
    const onShareCompleted = async () => {
      const counted = await ApiClient.recordFeedShare(contentKind, item._id, 'feed')
      if (counted) setShareCount((c) => c + 1)
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

    // The button is visible to guests so its public count reads like the others;
    // pressing it asks them to sign up rather than doing nothing.
    if (!isAuthenticated) {
      dispatchGuestEngaged()
      return
    }
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
    // The view was already reported when this card rendered, and the server
    // deduplicates per viewer per day, so opening the detail page is not a second view.
    // Reporting it again only makes the request; it cannot double the count.
    void recordFeedView('feed_show_more')
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

  // As posted, with an approximate local equivalent beside it.
  const price = useListingPrice(item)

  const deadlineLabel =
    urgency === 'urgent' && timeRemaining !== null
      ? `${formatCountdown(timeRemaining, contentKind)} left`
      : deadlineInfo
        ? `${deadlineInfo.daysLeft} ${deadlineInfo.daysLeft === 1 ? 'day' : 'days'} left`
        : null

  /** Facts read as one quiet line instead of a row of bordered chips. */
  const metaParts: React.ReactNode[] = []
  if (getLocationString()) {
    metaParts.push(
      <span key="loc" className="inline-flex items-center gap-[5px]">
        <RiMapPinLine className="h-3.5 w-3.5" aria-hidden />
        {getLocationString()}
      </span>
    )
  }
  if (!urgency && getDateString()) metaParts.push(<span key="date">{getDateString()}</span>)
  // Reads all four money shapes, so a job's salary finally reaches the card —
  // it was previously looked up only under `financial` and `price`, neither of
  // which a job has, and printed with no currency beside it.
  if (price.primary) {
    metaParts.push(
      <span key="paid" className="font-bold text-foreground">
        {price.primary}
        {price.approx ? (
          <span className="ml-1 font-medium text-muted-foreground">{price.approx}</span>
        ) : null}
      </span>
    )
  }
  if (typeof item.score === 'number') {
    metaParts.push(
      <span key="score" className="font-bold text-up-orange-ink">
        <b className="mr-px font-display text-[13px] font-bold">{Math.round(item.score)}</b>% match
      </span>
    )
  }
  if (viewCount > 0) metaParts.push(<span key="views">{viewCount.toLocaleString()} views</span>)

  const kindMeta = UP_KIND[contentKind] || UP_KIND.opportunity
  /**
   * The extreme campaign keeps its own look (approved 2026-09-24): a navy card
   * with the orange/lime tile stack and one orange CTA. Every other promoted
   * tier stays an ordinary card with "Sponsored" above it.
   */
  const isLead = isExtremePromotion(item)

  const actionRow = (
    <div
      className={cn(
        'relative z-10 mt-3 flex items-center gap-0.5 border-t pt-2',
        isLead ? 'border-up-border-on-navy [&_button]:text-up-on-navy-muted [&_button:hover]:bg-up-navy-subtle [&_button:hover]:text-up-on-navy' : 'border-up-hairline'
      )}
    >
      {!readOnly && (
        <>
          <FeedAction
            onClick={handleLike}
            active={isLiked}
            activeClass="text-up-orange-ink [&>svg]:text-up-orange"
            hoverClass="hover:text-up-orange-ink"
            icon={isLiked ? RiHeartFill : RiHeartLine}
            count={likeCount}
            label="Like"
          />
          <FeedAction
            onClick={handleSave}
            active={isSaved}
            activeClass="text-foreground"
            hoverClass="hover:text-foreground"
            icon={isSaved ? RiBookmarkFill : RiBookmarkLine}
            count={saveCount}
            label="Save"
          />
          {/* Shown to guests too: the count is public like every other one here, and
              pressing it prompts sign-up rather than silently doing nothing. */}
          <FeedAction
            onClick={handleAddToPlaylist}
            hoverClass="hover:text-foreground"
            icon={RiListOrdered}
            count={playlistAddCount}
            label="Add to playlist"
          />
        </>
      )}
      <FeedAction
        onClick={handleShare}
        active={justShared}
        activeClass="text-foreground"
        hoverClass="hover:text-foreground"
        icon={justShared ? RiShareFill : RiShareLine}
        count={shareCount}
        label="Share"
      />

      {!isLead ? (
        <span
          aria-hidden
          className="ml-auto grid h-9 w-9 place-items-center rounded-full text-foreground transition-colors group-hover:bg-up-fill"
        >
          <RiArrowRightLine className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      ) : null}
    </div>
  )

  return (
    <>
      {/* Paid-placement disclosure.

          It lives on the card rather than on the sponsored slot that used to
          own it, because promoted listings no longer appear only in that slot:
          they sit inline in the hub lists and in the For You and anonymous
          feeds, where the ordering deliberately pulls them toward the top. A
          placement biased upward has to say that it was paid for, and putting
          the label here means every surface discloses it the same way without
          each one having to remember to. */}
      {isLead ? (
        <SponsoredLabel>Sponsored · Featured</SponsoredLabel>
      ) : item.isPromoted ? (
        <SponsoredLabel />
      ) : null}
      {isLead ? (
        <article className="group relative w-full overflow-hidden rounded-up-xl bg-up-lead px-5 pb-3 pt-[22px] text-up-on-navy shadow-[0_18px_40px_rgba(11,18,51,0.22)] dark:shadow-[0_0_0_1px_rgba(255,106,0,0.4),0_20px_50px_rgba(0,0,0,0.55)]">
          {/* Card-stack motif: rotated orange and lime tiles off the top-right corner. */}
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-[50px] h-[130px] w-[170px] -rotate-[8deg] rounded-up-xl bg-up-orange" />
          <span aria-hidden className="pointer-events-none absolute -top-[26px] right-[30px] z-[1] h-[70px] w-[90px] rotate-[6deg] rounded-up-lg bg-up-lime" />

          <div className="relative z-[2]">
            <div className="flex min-w-0 items-center gap-2.5 text-[13px]">
              <span className="inline-grid h-[34px] w-[34px] shrink-0 place-items-center rounded-up-sm bg-up-navy-subtle text-up-orange shadow-[inset_0_0_0_1px_var(--up-border-on-navy)]">
                <kindMeta.icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="font-bold">{kindMeta.label}</span>
              {getProviderName() ? (
                <>
                  <span className="text-up-on-navy-faint" aria-hidden>·</span>
                  <span className="truncate text-up-orange">{getProviderName()}</span>
                </>
              ) : null}
            </div>

            <h3 className="mt-[18px] max-w-[78%] font-display text-lg font-bold leading-tight sm:text-[21px]">
              <Link href={detailHref} onClick={handleReadMore} className="line-clamp-3 before:absolute before:inset-0">
                {item.title}
              </Link>
            </h3>

            {item.description ? (
              <p className="mt-2 line-clamp-2 max-w-[90%] text-sm leading-relaxed text-up-orange">{item.description}</p>
            ) : null}

            {metaParts.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-up-orange [&_.font-bold]:text-up-on-navy [&_.text-muted-foreground]:text-up-on-navy-muted">
                {metaParts}
              </div>
            ) : null}

            <div className="relative z-10 mt-[18px] flex flex-wrap items-center gap-3">
              <Link
                href={detailHref}
                onClick={handleReadMore}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-up-orange px-5 text-[15px] font-bold text-up-navy transition-[filter] hover:brightness-105"
              >
                See the {kindMeta.label.toLowerCase()}
                <RiArrowRightLine className="h-4 w-4" aria-hidden />
              </Link>
              {urgency && deadlineLabel ? (
                <DeadlinePill
                  tone={urgency}
                  className={urgency !== 'urgent' ? 'bg-[rgba(255,106,0,0.18)] text-up-orange' : undefined}
                >
                  {deadlineLabel}
                </DeadlinePill>
              ) : null}
            </div>

            {actionRow}
          </div>
        </article>
      ) : (
      <article
        className={cn(
          'group relative w-full overflow-hidden rounded-up-xl border border-border bg-card transition-colors duration-200',
          'hover:border-up-border-hover'
        )}
      >
        <div className="px-4 pb-2.5 pt-4 sm:px-5 sm:pt-[18px]">
          {/* Type chip, provider, and how long is left */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5 text-[13px]">
              <KindChip kind={contentKind} />
              <span className="font-bold text-foreground">{kindMeta.label}</span>
              {getProviderName() ? (
                <>
                  <span className="text-up-sep" aria-hidden>·</span>
                  <span className="truncate text-muted-foreground">{getProviderName()}</span>
                </>
              ) : null}
            </div>

            {urgency && deadlineLabel ? <DeadlinePill tone={urgency}>{deadlineLabel}</DeadlinePill> : null}
          </div>

          {/* The title is the link — the old card spent a whole row on a "Read more" button
              that went to the same place. */}
          <h3 className="mt-3.5 text-base font-bold leading-snug text-foreground sm:text-[17px]">
            <Link
              href={detailHref}
              onClick={handleReadMore}
              className="line-clamp-2 transition-colors before:absolute before:inset-0 group-hover:text-up-orange-ink"
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
            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-muted-foreground">
              {metaParts}
            </div>
          ) : null}

          {actionRow}
        </div>
      </article>
      )}

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
