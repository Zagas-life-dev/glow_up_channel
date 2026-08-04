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
  RiArrowUpLine,
  RiArrowDownLine,
  RiMapPinLine,
  RiTimeLine,
  RiMoneyDollarCircleLine,
  RiFileLine,
  RiCheckboxCircleLine,
  RiGroupLine,
  RiExternalLinkLine,
  RiVipCrownLine,
  RiStarLine,
  RiDownloadLine,
  RiHeartLine,
  RiHeartFill,
  RiBookmarkLine,
  RiBookmarkFill,
  RiListOrdered,
  RiShareLine,
  RiShareFill,
  RiChat1Line,
  RiVideoLine,
  RiHeadphoneLine,
  RiEyeLine,
} from 'react-icons/ri'
import { useAuth } from '@/lib/auth-context'
import { dispatchGuestEngaged } from '@/components/sign-up-better-experience-popup'
import ApiClient from '@/lib/api-client'
import AddToPlaylistModal from './add-to-playlist-modal'
import ContentShareComposer from './content-share-composer'
import { cleanUrl } from '@/lib/url-utils'
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
  isExpanded?: boolean
  onExpand?: () => void
  /** When provided (e.g. in sponsored slot), called when user clicks Show more so promotion budget can be charged. */
  onPromotionShowMore?: () => void
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
    buttonColor: 'bg-violet-500 hover:bg-violet-600'
  }
}

/*
 * "Show more" panel primitives.
 *
 * Every content kind (opportunity / job / event / resource) renders its extra
 * data through these four, so the expanded panel keeps one rhythm instead of
 * each block inventing its own indentation, icon and label style.
 */

/** Titled, boxed group. One per topic (Requirements, Dates, Compensation…). */
function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-muted/25 px-3.5 py-3">
      <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {title}
      </h4>
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

/** Label-above-value grid: one column on phones, two from `sm` up. */
function DetailGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">{children}</dl>
}

/** Single field inside a DetailGrid. `wide` spans both columns for prose. */
function DetailItem({
  label,
  wide = false,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground/90 break-words">{children}</dd>
    </div>
  )
}

/** Bulleted list for free-form arrays (requirements, benefits, prerequisites). */
function DetailList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((entry, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />
          <span className="min-w-0 break-words">{entry}</span>
        </li>
      ))}
    </ul>
  )
}

/** Short keyword arrays (skills, equipment) read better as chips than a list. */
function DetailChips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((entry, index) => (
        <span
          key={index}
          className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground"
        >
          {entry}
        </span>
      ))}
    </div>
  )
}

export default function FeedCard({ item, onEngage, isExpanded, onExpand, onPromotionShowMore }: FeedCardProps) {
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
  const [fullDetails, setFullDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [engagementStatusLoaded, setEngagementStatusLoaded] = useState(false)

  // Use controlled expanded state if provided, otherwise use local state
  const [localExpanded, setLocalExpanded] = useState(false)
  const expanded = isExpanded !== undefined ? isExpanded : localExpanded

  const contentKind: FeedContentKind = resolveFeedContentKind(item.type)
  const engagementApiType = toEngagementApiPlural(contentKind)
  const config = typeConfig[contentKind] || typeConfig.opportunity
  const TypeIcon = config.icon

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

  // Load full details when expanded
  useEffect(() => {
    if (expanded && !fullDetails && !loadingDetails) {
      loadFullDetails()
    }
  }, [expanded])

  const loadFullDetails = async () => {
    setLoadingDetails(true)
    try {
      let response
      switch (contentKind) {
        case 'opportunity':
          response = await ApiClient.getOpportunityById(item._id)
          break
        case 'job':
          response = await ApiClient.getJobById(item._id)
          break
        case 'event':
          response = await ApiClient.getEventById(item._id)
          break
        case 'resource':
          response = await ApiClient.getResourceById(item._id)
          break
      }

      if (response?.success) {
        const data = contentKind === 'opportunity' ? response.data.opportunity
          : contentKind === 'job' ? response.data.job
            : contentKind === 'event' ? response.data.event
              : response.data.resource
        setFullDetails(data)
        const m = data?.metrics
        if (m && typeof m === 'object') {
          const vc = m.viewCount
          if (typeof vc === 'number' && !Number.isNaN(vc)) {
            setViewCount((prev) => Math.max(prev, vc))
          }
          const sc = m.shareCount
          if (typeof sc === 'number' && !Number.isNaN(sc)) {
            setShareCount((prev) => Math.max(prev, sc))
          }
          const sv = m.saveCount
          if (typeof sv === 'number' && !Number.isNaN(sv)) {
            setSaveCount((prev) => Math.max(prev, sv))
          }
          const pl = m.playlistAddCount ?? m.playlistCount
          if (typeof pl === 'number' && !Number.isNaN(pl)) {
            setPlaylistAddCount((prev) => Math.max(prev, pl))
          }
        }
      }
    } catch (error) {
      console.error('Error loading full details:', error)
    } finally {
      setLoadingDetails(false)
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

  const handleExpand = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) dispatchGuestEngaged()
    const newExpanded = isExpanded !== undefined ? !isExpanded : !localExpanded
    if (newExpanded) {
      onPromotionShowMore?.()
      ApiClient.recordPromotionClick(item._id, contentKind, 'show_more').catch(() => {})
      // Valid view: first "Show more" expand per item per browser session (authenticated)
      if (isAuthenticated && typeof sessionStorage !== 'undefined') {
        const key = feedViewSessionKey()
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1')
          setViewCount((v) => v + 1)
          void recordAuthenticatedFeedView('feed_show_more')
        }
      }
    }
    if (onExpand) {
      onExpand()
    } else {
      // Fallback for backward compatibility - local state management
      setLocalExpanded(newExpanded)
      if (newExpanded && !fullDetails && !loadingDetails) {
        loadFullDetails()
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

  const details = fullDetails || item
  // Show "Show more" if description is long OR if there are additional details to show
  const detailsAny = details as any
  const hasMoreDetails = (item.description && item.description.length > 150) ||
    (contentKind === 'opportunity' && (detailsAny.requirements || detailsAny.financial || detailsAny.dates)) ||
    (contentKind === 'event' && (detailsAny.dates || detailsAny.location || detailsAny.capacity || detailsAny.requirements)) ||
    (contentKind === 'job' && (detailsAny.requirements || detailsAny.benefits || detailsAny.pay || detailsAny.dates)) ||
    (contentKind === 'resource' && (detailsAny.category || detailsAny.duration))

  // A section is only worth boxing up when it actually holds values — scraped
  // items often carry an empty `requirements`/`dates` object, and an empty
  // bordered card is what made the expanded view read as noise.
  const oppRequirements = contentKind === 'opportunity' ? detailsAny.requirements : null
  const hasOppRequirements = Boolean(oppRequirements && (
    oppRequirements.educationLevel || oppRequirements.careerStage || oppRequirements.experience ||
    oppRequirements.ageRange || oppRequirements.citizenship || oppRequirements.other ||
    oppRequirements.skills?.length
  ))
  const oppDates = contentKind === 'opportunity' ? detailsAny.dates : null
  const hasOppDates = Boolean(oppDates && (oppDates.startDate || oppDates.endDate || oppDates.duration))
  const eventDates = contentKind === 'event' ? detailsAny.dates : null
  const hasEventSchedule = Boolean(eventDates && (
    (eventDates.startDate && eventDates.endDate) || eventDates.registrationDeadline || eventDates.timezone
  ))
  const eventRequirements = contentKind === 'event' ? detailsAny.requirements : null
  const hasEventRequirements = Boolean(eventRequirements && (
    eventRequirements.ageRange || eventRequirements.skillLevel ||
    eventRequirements.prerequisites?.length || eventRequirements.equipment?.length
  ))
  const jobLocation = contentKind === 'job' && detailsAny.location && typeof detailsAny.location === 'object' && !detailsAny.location.isRemote
    ? detailsAny.location
    : null
  const hasJobLocation = Boolean(jobLocation && (jobLocation.city || jobLocation.country || jobLocation.address))
  const hasResourceDetails = contentKind === 'resource' && Boolean(
    detailsAny.category || detailsAny.duration || detailsAny.metrics?.viewCount !== undefined
  )

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
            <p className={cn(
              "text-sm text-muted-foreground leading-relaxed",
              !expanded && "line-clamp-2"
            )}>
              {item.description}
            </p>
          </div>
        )}

        {/* Show More Button - appears if there are additional details */}
        {hasMoreDetails && (
          <div className="mb-4">
            <button
              onClick={handleExpand}
              className="text-xs font-medium flex items-center gap-1 text-orange-500 hover:text-orange-400"
            >
              {expanded ? (
                <>
                  <RiArrowUpLine className="w-3 h-3" aria-hidden />
                  Show less
                </>
              ) : (
                <>
                  <RiArrowDownLine className="w-3 h-3" aria-hidden />
                  Show more
                </>
              )}
            </button>
          </div>
        )}

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

        {/* Action buttons (Apply, Register, Access resource, etc.) show only after "Show more" — see expanded section below */}

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-2.5">
            {loadingDetails ? (
              // Skeleton mirrors the boxed sections below so the panel doesn't jump
              <div className="space-y-2.5 animate-pulse">
                <div className="h-24 rounded-xl border border-border/40 bg-muted/40" />
                <div className="h-16 rounded-xl border border-border/40 bg-muted/40" />
                <div className="h-9 rounded-full bg-muted/40" />
              </div>
            ) : details ? (
              <>
                {/* Opportunity — Requirements */}
                {hasOppRequirements && (
                  <DetailSection icon={RiFocus3Line} title="Requirements">
                    <DetailGrid>
                      {oppRequirements.educationLevel && (
                        <DetailItem label="Education level">{oppRequirements.educationLevel}</DetailItem>
                      )}
                      {oppRequirements.careerStage && (
                        <DetailItem label="Career stage">{oppRequirements.careerStage}</DetailItem>
                      )}
                      {oppRequirements.experience && (
                        <DetailItem label="Experience">{oppRequirements.experience}</DetailItem>
                      )}
                      {oppRequirements.ageRange && (
                        <DetailItem label="Age range">{oppRequirements.ageRange}</DetailItem>
                      )}
                      {oppRequirements.citizenship && (
                        <DetailItem label="Citizenship">{oppRequirements.citizenship}</DetailItem>
                      )}
                      {oppRequirements.skills?.length > 0 && (
                        <DetailItem label="Skills" wide>
                          <DetailChips items={oppRequirements.skills} />
                        </DetailItem>
                      )}
                      {oppRequirements.other && (
                        <DetailItem label="Other" wide>
                          <span className="block leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {oppRequirements.other}
                          </span>
                        </DetailItem>
                      )}
                    </DetailGrid>
                  </DetailSection>
                )}

                {/* Benefits — financial perks only; the paid/amount pill already sits in the preview */}
                {details.financial?.benefits?.length > 0 && (
                  <DetailSection icon={RiCheckboxCircleLine} title="Benefits">
                    <DetailList items={details.financial.benefits} />
                  </DetailSection>
                )}

                {/* Opportunity — dates beyond the deadline shown in the preview */}
                {hasOppDates && (
                  <DetailSection icon={RiCalendarLine} title="Key dates">
                    <DetailGrid>
                      {oppDates.startDate && (
                        <DetailItem label="Starts">{formatDate(oppDates.startDate)}</DetailItem>
                      )}
                      {oppDates.endDate && (
                        <DetailItem label="Ends">{formatDate(oppDates.endDate)}</DetailItem>
                      )}
                      {oppDates.duration && (
                        <DetailItem label="Duration">{oppDates.duration}</DetailItem>
                      )}
                    </DetailGrid>
                  </DetailSection>
                )}

                {/* Opportunity — location detail not covered by the city/country pill */}
                {contentKind === 'opportunity' && details.location?.address && (
                  <DetailSection icon={RiMapPinLine} title="Location">
                    <DetailGrid>
                      <DetailItem label="Address" wide>{details.location.address}</DetailItem>
                    </DetailGrid>
                  </DetailSection>
                )}

                {/* Job */}
                {contentKind === 'job' && (
                  <>
                    {details.requirements?.length > 0 && (
                      <DetailSection icon={RiCheckboxCircleLine} title="Requirements">
                        <DetailList items={details.requirements} />
                      </DetailSection>
                    )}
                    {details.benefits?.length > 0 && (
                      <DetailSection icon={RiStarLine} title="Benefits">
                        <DetailList items={details.benefits} />
                      </DetailSection>
                    )}
                    {details.pay?.amount && (
                      <DetailSection icon={RiMoneyDollarCircleLine} title="Compensation">
                        <DetailGrid>
                          <DetailItem label="Pay">
                            {details.pay.currency || 'NGN'} {details.pay.amount}
                            {details.pay.period && (
                              <span className="text-muted-foreground"> / {details.pay.period}</span>
                            )}
                          </DetailItem>
                        </DetailGrid>
                      </DetailSection>
                    )}
                    {hasJobLocation && (
                      <DetailSection icon={RiMapPinLine} title="Location">
                        <DetailGrid>
                          {jobLocation.city && <DetailItem label="City">{jobLocation.city}</DetailItem>}
                          {jobLocation.country && <DetailItem label="Country">{jobLocation.country}</DetailItem>}
                          {jobLocation.address && (
                            <DetailItem label="Address" wide>{jobLocation.address}</DetailItem>
                          )}
                        </DetailGrid>
                      </DetailSection>
                    )}
                    {details.dates?.applicationDeadline && (
                      <DetailSection icon={RiCalendarLine} title="Key dates">
                        <DetailGrid>
                          <DetailItem label="Application deadline">
                            {formatDate(details.dates.applicationDeadline)}
                          </DetailItem>
                        </DetailGrid>
                      </DetailSection>
                    )}
                  </>
                )}

                {/* Event */}
                {contentKind === 'event' && (
                  <>
                    {/* Schedule — dates beyond the start date shown in the preview */}
                    {hasEventSchedule && (
                      <DetailSection icon={RiCalendarLine} title="Schedule">
                        <DetailGrid>
                          {eventDates.startDate && eventDates.endDate && (
                            <DetailItem label="Ends">
                              {formatDate(eventDates.endDate)}
                              <span className="text-muted-foreground">
                                {' · '}
                                {(() => {
                                  const start = new Date(eventDates.startDate)
                                  const end = new Date(eventDates.endDate)
                                  const diffTime = Math.abs(end.getTime() - start.getTime())
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                                  return `${diffDays} day${diffDays > 1 ? 's' : ''}`
                                })()}
                              </span>
                            </DetailItem>
                          )}
                          {eventDates.registrationDeadline && (
                            <DetailItem label="Registration deadline">
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                {formatDate(eventDates.registrationDeadline)}
                                {new Date(eventDates.registrationDeadline) < new Date() && (
                                  <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-400">
                                    Closed
                                  </span>
                                )}
                              </span>
                            </DetailItem>
                          )}
                          {eventDates.timezone && (
                            <DetailItem label="Timezone">{eventDates.timezone}</DetailItem>
                          )}
                        </DetailGrid>
                      </DetailSection>
                    )}

                    {/* Location — address only; city/country already sits in the preview pill */}
                    {details.location?.address && (
                      <DetailSection icon={RiMapPinLine} title="Location">
                        <DetailGrid>
                          <DetailItem label="Address" wide>{details.location.address}</DetailItem>
                        </DetailGrid>
                      </DetailSection>
                    )}

                    {/* Event Capacity */}
                    {/* {details.capacity && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <RiGroupLine className="w-4 h-4" aria-hidden />
                          Capacity
                        </h4>
                        <div className="space-y-1.5 text-sm text-muted-foreground pl-6">
                          {details.capacity.maxAttendees && (
                            <div>
                              <span className="font-medium text-foreground/90">Max Attendees: </span>
                              <span>{details.capacity.maxAttendees}</span>
                            </div>
                          )}
                          {details.capacity.currentAttendees !== undefined && (
                            <div>
                              <span className="font-medium text-foreground/90">Current Attendees: </span>
                              <span>{details.capacity.currentAttendees}</span>
                            </div>
                          )}
                          {details.capacity.isFull && (
                            <div className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium inline-block">
                              Event Full
                            </div>
                          )}
                        </div>
                      </div>
                    )} */}

                    {/* Requirements — scalar fields in the grid, lists underneath */}
                    {hasEventRequirements && (
                      <DetailSection icon={RiCheckboxCircleLine} title="Requirements">
                        <DetailGrid>
                          {eventRequirements.ageRange && (
                            <DetailItem label="Age range">{eventRequirements.ageRange}</DetailItem>
                          )}
                          {eventRequirements.skillLevel && (
                            <DetailItem label="Skill level">{eventRequirements.skillLevel}</DetailItem>
                          )}
                          {eventRequirements.prerequisites?.length > 0 && (
                            <DetailItem label="Prerequisites" wide>
                              <DetailList items={eventRequirements.prerequisites} />
                            </DetailItem>
                          )}
                          {eventRequirements.equipment?.length > 0 && (
                            <DetailItem label="Equipment needed" wide>
                              <DetailChips items={eventRequirements.equipment} />
                            </DetailItem>
                          )}
                        </DetailGrid>
                      </DetailSection>
                    )}

                    {/* Agenda — free text from some sources, a timed list from others */}
                    {details.agenda && (
                      <DetailSection icon={RiFileLine} title="Agenda">
                        {typeof details.agenda === 'string' ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {details.agenda}
                          </p>
                        ) : Array.isArray(details.agenda) ? (
                          <ol className="space-y-2.5">
                            {details.agenda.map((entry: any, index: number) => (
                              <li key={index} className="flex gap-3 text-sm">
                                <span className="w-16 shrink-0 pt-px text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                                  {entry.time || `${index + 1}.`}
                                </span>
                                <span className="min-w-0 border-l border-border/60 pl-3">
                                  <span className="block text-foreground/90 break-words">
                                    {entry.title || (typeof entry === 'string' ? entry : '')}
                                  </span>
                                  {entry.description && (
                                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground break-words">
                                      {entry.description}
                                    </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ol>
                        ) : null}
                      </DetailSection>
                    )}
                  </>
                )}

                {/* Resource — one section; these were three boxes holding a single value each */}
                {hasResourceDetails && (
                  <DetailSection
                    icon={
                      detailsAny.category === 'video' ? RiVideoLine
                        : detailsAny.category === 'audio' ? RiHeadphoneLine
                        : RiFileLine
                    }
                    title="Resource details"
                  >
                    <DetailGrid>
                      {details.category && (
                        <DetailItem label="Type">
                          <span className="capitalize">{details.category}</span>
                        </DetailItem>
                      )}
                      {details.duration && <DetailItem label="Duration">{details.duration}</DetailItem>}
                      {details.metrics?.viewCount !== undefined && (
                        <DetailItem label="Views">{details.metrics.viewCount.toLocaleString()}</DetailItem>
                      )}
                    </DetailGrid>
                  </DetailSection>
                )}

                {/* Action Button */}
                <div className="pt-1">
                  {contentKind === 'opportunity' && (() => {
                    const applyUrl = detailsAny.url ?? detailsAny.applicationLink ?? (detailsAny as { application_link?: string }).application_link ?? detailsAny.externalUrl ?? detailsAny.externalLink ?? item.url ?? item.applicationLink ?? item.externalUrl ?? item.externalLink
                    if (applyUrl) {
                      return (
                        <Button
                          asChild
                          size="sm"
                          className={cn("w-full rounded-full text-white shadow-md font-semibold", config.buttonColor)}
                        >
                          <a href={cleanUrl(applyUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                            Apply Now
                            <RiExternalLinkLine className="w-4 h-4" aria-hidden />
                          </a>
                        </Button>
                      )
                    }
                    return (
                      <Button
                        asChild
                        size="sm"
                        className={cn("w-full rounded-full text-white shadow-md font-semibold", config.buttonColor)}
                      >
                        <Link href={`/opportunities/${item._id}`} className="flex items-center justify-center gap-2">
                          View & apply
                          <RiExternalLinkLine className="w-4 h-4" aria-hidden />
                        </Link>
                      </Button>
                    )
                  })()}
                  {contentKind === 'event' && (details.url || details.externalUrl || details.externalLink || item.url || item.externalUrl || item.externalLink) && (() => {
                    const eventUrl = details.url || details.externalUrl || details.externalLink || item.url || item.externalUrl || item.externalLink;
                    return (
                      <Button
                        asChild
                        size="sm"
                        className={cn("w-full rounded-full text-white shadow-md font-semibold", config.buttonColor)}
                      >
                        <a href={cleanUrl(eventUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                          Register
                          <RiExternalLinkLine className="w-4 h-4" aria-hidden />
                        </a>
                      </Button>
                    );
                  })()}
                  {contentKind === 'job' && (details.url || details.externalUrl || details.externalLink || item.url || item.externalUrl || item.externalLink || details.applicationLink || item.applicationLink) && (() => {
                    const jobUrl = details.url || details.externalUrl || details.externalLink || item.url || item.externalUrl || item.externalLink || details.applicationLink || item.applicationLink;
                    return (
                      <Button
                        asChild
                        size="sm"
                        className={cn("w-full rounded-full text-white shadow-md font-semibold", config.buttonColor)}
                      >
                        <a href={cleanUrl(jobUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                          Apply
                          <RiExternalLinkLine className="w-4 h-4" aria-hidden />
                        </a>
                      </Button>
                    );
                  })()}
                  {contentKind === 'resource' && (
                    <div className="flex flex-col gap-2">
                      {detailsAny.paymentLink ? (
                        <Button
                          asChild
                          size="sm"
                          className={cn("w-full rounded-full text-white shadow-md font-semibold", config.buttonColor)}
                        >
                          <a href={cleanUrl(detailsAny.paymentLink)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                            Sign up <RiExternalLinkLine className="w-4 h-4" aria-hidden />
                          </a>
                        </Button>
                      ) : detailsAny.fileUrl ? (
                        <>
                          <Button
                            asChild
                            size="sm"
                            className={cn("w-full rounded-full text-white shadow-md font-semibold", config.buttonColor)}
                          >
                            <a href={cleanUrl(detailsAny.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                              Access Resource
                              <RiExternalLinkLine className="w-4 h-4" aria-hidden />
                            </a>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="w-full border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full"
                          >
                            <a href={detailsAny.fileUrl} download className="flex items-center justify-center gap-2">
                              <RiDownloadLine className="w-4 h-4" aria-hidden />
                              Download
                            </a>
                          </Button>
                        </>
                      ) : (detailsAny.resourceType === 'file' || detailsAny.hasFile) ? (
                        // Uploaded (file) resources are viewed in-platform — open the resource page.
                        <Button
                          asChild
                          size="sm"
                          className={cn("w-full rounded-full text-white shadow-md font-semibold", config.buttonColor)}
                        >
                          <Link href={`/resources/${item._id}`} className="flex items-center justify-center gap-2">
                            View Resource
                            <RiExternalLinkLine className="w-4 h-4" aria-hidden />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            ) : null}
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
