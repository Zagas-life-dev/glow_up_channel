"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  Bookmark, 
  Share2, 
  MapPin, 
  Calendar, 
  DollarSign,
  Target,
  Briefcase,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  ListPlus,
  ExternalLink,
  Loader2,
  GraduationCap,
  CheckCircle2,
  Building,
  Users,
  Crown,
  Video,
  Headphones,
  FileText,
  Download,
  Eye,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import ApiClient from '@/lib/api-client'
import AddToPlaylistModal from './add-to-playlist-modal'
import ContentShareComposer from './content-share-composer'
import { cleanUrl } from '@/lib/url-utils'

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
    }
    score?: number
    url?: string
    paymentLink?: string
    fileUrl?: string
    category?: string
    duration?: string
    isPremium?: boolean
  }
  onEngage?: () => void
  isExpanded?: boolean
  onExpand?: () => void
}

const typeConfig = {
  opportunity: { 
    icon: Target, 
    color: 'orange',
    gradient: 'from-orange-500/20 to-orange-600/10',
    accent: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    label: 'Opportunity',
    buttonColor: 'bg-orange-500 hover:bg-orange-600'
  },
  job: { 
    icon: Briefcase, 
    color: 'blue',
    gradient: 'from-blue-500/20 to-blue-600/10',
    accent: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Job',
    buttonColor: 'bg-blue-500 hover:bg-blue-600'
  },
  event: { 
    icon: Calendar, 
    color: 'emerald',
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    accent: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Event',
    buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
  },
  resource: { 
    icon: BookOpen, 
    color: 'violet',
    gradient: 'from-violet-500/20 to-violet-600/10',
    accent: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    label: 'Resource',
    buttonColor: 'bg-violet-500 hover:bg-violet-600'
  }
}

export default function FeedCard({ item, onEngage, isExpanded = false, onExpand }: FeedCardProps) {
  const { isAuthenticated } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(item.metrics?.likeCount || 0)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [showShareComposer, setShowShareComposer] = useState(false)
  const [fullDetails, setFullDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  
  // Use controlled expanded state if provided, otherwise use local state
  const [localExpanded, setLocalExpanded] = useState(false)
  const expanded = isExpanded !== undefined ? isExpanded : localExpanded

  const config = typeConfig[item.type] || typeConfig.opportunity
  const TypeIcon = config.icon

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
      const apiType = item.type === 'opportunity' ? 'opportunities' 
        : item.type === 'job' ? 'jobs'
        : item.type === 'event' ? 'events'
        : 'resources'
      
      switch (item.type) {
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
        const data = item.type === 'opportunity' ? response.data.opportunity
          : item.type === 'job' ? response.data.job
          : item.type === 'event' ? response.data.event
          : response.data.resource
        setFullDetails(data)
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
    
    if (!isAuthenticated) return

    try {
      const apiType = item.type === 'opportunity' ? 'opportunities' 
        : item.type === 'job' ? 'jobs'
        : item.type === 'event' ? 'events'
        : 'resources'
      
      if (isLiked) {
        await ApiClient.unlikeItem(apiType, item._id)
        setIsLiked(false)
        setLikeCount(prev => Math.max(0, prev - 1))
      } else {
        await ApiClient.likeItem(apiType, item._id)
        setIsLiked(true)
        setLikeCount(prev => prev + 1)
      }
      onEngage?.()
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isAuthenticated) return

    try {
      const apiType = item.type === 'opportunity' ? 'opportunities' 
        : item.type === 'job' ? 'jobs'
        : item.type === 'event' ? 'events'
        : 'resources'
      
      if (isSaved) {
        await ApiClient.unsaveItem(apiType, item._id)
        setIsSaved(false)
      } else {
        await ApiClient.saveItem(apiType, item._id)
        setIsSaved(true)
      }
      onEngage?.()
    } catch (error) {
      console.error('Error toggling save:', error)
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const url = `${window.location.origin}/${item.type === 'opportunity' ? 'opportunities' : item.type === 'job' ? 'jobs' : item.type === 'event' ? 'events' : 'resources'}/${item._id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          url
        })
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url)
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
    if (onExpand) {
      onExpand()
    } else {
      // Fallback for backward compatibility - local state management
      const newExpanded = !localExpanded
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

  const details = fullDetails || item
  // Show "Show more" if description is long OR if there are additional details to show
  const detailsAny = details as any
  const hasMoreDetails = (item.description && item.description.length > 150) || 
    (item.type === 'opportunity' && (detailsAny.requirements || detailsAny.financial || detailsAny.dates)) ||
    (item.type === 'event' && (detailsAny.dates || detailsAny.location || detailsAny.capacity || detailsAny.requirements)) ||
    (item.type === 'job' && (detailsAny.requirements || detailsAny.benefits || detailsAny.pay || detailsAny.dates)) ||
    (item.type === 'resource' && (detailsAny.category || detailsAny.duration))

  return (
    <>
      <article className={cn(
        "w-full max-w-full relative p-4 rounded-2xl border transition-all duration-300",
        "bg-white/[0.02] border-white/[0.06]",
        "hover:bg-white/[0.04] hover:border-white/[0.1]",
        "hover:shadow-lg hover:shadow-black/20"
      )}>
        {/* Match Score Badge */}
        {item.score && item.score > 0 && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
              "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
              "shadow-lg shadow-orange-500/30"
            )}>
              {Math.round(item.score)}% Match
            </div>
          </div>
        )}

        {/* Header Row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Type Icon */}
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
            config.bg
          )}>
            <TypeIcon className={cn("w-5 h-5", config.accent)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Type & Provider */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("text-xs font-medium", config.accent)}>
                {config.label}
              </span>
              {getProviderName() && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="text-xs text-white/50 truncate">
                    {getProviderName()}
                  </span>
                </>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-white leading-snug">
              {item.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <div className="mb-4">
            <p className={cn(
              "text-sm text-white/60 leading-relaxed",
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
              className="text-orange-500 hover:text-orange-400 text-xs font-medium flex items-center gap-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show more
                </>
              )}
            </button>
          </div>
        )}

        {/* Meta Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {getLocationString() && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/60 text-xs">
              <MapPin className="w-3 h-3" />
              <span>{getLocationString()}</span>
            </div>
          )}
          {getDateString() && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/60 text-xs">
              <Clock className="w-3 h-3" />
              <span>{getDateString()}</span>
            </div>
          )}
          {(item.financial?.isPaid || item.isPaid) && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">
              <DollarSign className="w-3 h-3" />
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
                className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white/[0.05] text-white/50"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 4 && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white/[0.05] text-white/40">
                +{item.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-6">
            {loadingDetails ? (
              // Skeleton Loading
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-white/[0.05] rounded w-3/4" />
                <div className="h-4 bg-white/[0.05] rounded w-full" />
                <div className="h-4 bg-white/[0.05] rounded w-5/6" />
                <div className="h-20 bg-white/[0.05] rounded" />
              </div>
            ) : details ? (
              <>
                {/* Full Description - Only show if it's longer than what's already shown */}
                {/* {details.description && details.description.length > 150 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Full Description
                    </h4>
                    <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap pl-6">
                      {details.description}
                    </div>
                  </div>
                )} */}

                {/* Opportunity Details */}
                {item.type === 'opportunity' && details.requirements && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Requirements
                    </h4>
                    <div className="space-y-3 text-sm text-white/70 pl-6">
                      {details.requirements.educationLevel && (
                        <div className="flex items-start gap-2">
                          <GraduationCap className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-white/90">Education Level: </span>
                            <span>{details.requirements.educationLevel}</span>
                          </div>
                        </div>
                      )}
                      {details.requirements.careerStage && (
                        <div className="flex items-start gap-2">
                          <Briefcase className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-white/90">Career Stage: </span>
                            <span>{details.requirements.careerStage}</span>
                          </div>
                        </div>
                      )}
                      {details.requirements.skills && details.requirements.skills.length > 0 && (
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-white/90">Skills: </span>
                            <span>{details.requirements.skills.join(', ')}</span>
                          </div>
                        </div>
                      )}
                      {details.requirements.experience && (
                        <div className="flex items-start gap-2">
                          <Briefcase className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-white/90">Experience: </span>
                            <span>{details.requirements.experience}</span>
                          </div>
                        </div>
                      )}
                      {details.requirements.ageRange && (
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-white/90">Age Range: </span>
                            <span>{details.requirements.ageRange}</span>
                          </div>
                        </div>
                      )}
                      {details.requirements.citizenship && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-white/90">Citizenship: </span>
                            <span>{details.requirements.citizenship}</span>
                          </div>
                        </div>
                      )}
                      {details.requirements.other && (
                        <div className="mt-4 pt-3 border-t border-white/[0.06]">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium text-white/90 block mb-1">Other: </span>
                              <p className="text-white/70 leading-relaxed whitespace-pre-wrap">
                                {details.requirements.other}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Financial Benefits - Only show benefits, not basic financial info already shown */}
                {details.financial && details.financial.benefits && details.financial.benefits.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Benefits
                    </h4>
                    <ul className="space-y-1.5 text-sm text-white/70 pl-6 list-disc">
                      {details.financial.benefits.map((benefit: string, index: number) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Opportunity Dates - Only show dates not already shown in preview */}
                {item.type === 'opportunity' && details.dates && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Additional Dates
                    </h4>
                    <div className="space-y-1.5 text-sm text-white/70 pl-6">
                      {details.dates.startDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-white/40" />
                          <div>
                            <span className="font-medium text-white/90">Start Date: </span>
                            <span>{formatDate(details.dates.startDate)}</span>
                          </div>
                        </div>
                      )}
                      {details.dates.endDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-white/40" />
                          <div>
                            <span className="font-medium text-white/90">End Date: </span>
                            <span>{formatDate(details.dates.endDate)}</span>
                          </div>
                        </div>
                      )}
                      {details.dates.duration && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-white/40" />
                          <div>
                            <span className="font-medium text-white/90">Duration: </span>
                            <span>{details.dates.duration}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Opportunity Location Details - Only show if not already shown in preview */}
                {item.type === 'opportunity' && details.location && details.location.address && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location Details
                    </h4>
                    <div className="space-y-1.5 text-sm text-white/70 pl-6">
                      {details.location.address && (
                        <div>
                          <span className="font-medium text-white/90">Address: </span>
                          <span>{details.location.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Job Requirements & Benefits */}
                {item.type === 'job' && (
                  <>
                    {details.requirements && details.requirements.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Requirements
                        </h4>
                        <ul className="space-y-1.5 text-sm text-white/70 pl-6 list-disc">
                          {details.requirements.map((req: string, index: number) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {details.benefits && details.benefits.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Benefits
                        </h4>
                        <ul className="space-y-1.5 text-sm text-white/70 pl-6 list-disc">
                          {details.benefits.map((benefit: string, index: number) => (
                            <li key={index}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Job Location Details */}
                    {details.location && typeof details.location === 'object' && !details.location.isRemote && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Location Details
                        </h4>
                        <div className="space-y-1.5 text-sm text-white/70 pl-6">
                          {details.location.city && (
                            <div>
                              <span className="font-medium text-white/90">City: </span>
                              <span>{details.location.city}</span>
                            </div>
                          )}
                          {details.location.country && (
                            <div>
                              <span className="font-medium text-white/90">Country: </span>
                              <span>{details.location.country}</span>
                            </div>
                          )}
                          {details.location.address && (
                            <div className="mt-2 pt-2 border-t border-white/[0.06]">
                              <span className="font-medium text-white/90">Address: </span>
                              <span>{details.location.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Job Dates */}
                    {details.dates && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Important Dates
                        </h4>
                        <div className="space-y-1.5 text-sm text-white/70 pl-6">
                          {details.dates.applicationDeadline && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-white/40" />
                              <div>
                                <span className="font-medium text-white/90">Application Deadline: </span>
                                <span>{formatDate(details.dates.applicationDeadline)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Job Pay */}
                    {details.pay && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Compensation
                        </h4>
                        <div className="space-y-1.5 text-sm text-white/70 pl-6">
                          {details.pay.amount && (
                            <div>
                              <span className="font-medium text-white/90">Amount: </span>
                              <span>{details.pay.currency || 'NGN'} {details.pay.amount}</span>
                              {details.pay.period && (
                                <span className="text-white/50"> per {details.pay.period}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Event Details */}
                {item.type === 'event' && (
                  <>
                    {/* Event Dates - Only show additional dates not in preview */}
                    {details.dates && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Event Schedule
                        </h4>
                        <div className="space-y-1.5 text-sm text-white/70 pl-6">
                          {details.dates.endDate && details.dates.startDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-white/40" />
                              <div>
                                <span className="font-medium text-white/90">End Date: </span>
                                <span>{formatDate(details.dates.endDate)}</span>
                                <span className="text-white/50 ml-2">
                                  ({(() => {
                                    const start = new Date(details.dates.startDate)
                                    const end = new Date(details.dates.endDate)
                                    const diffTime = Math.abs(end.getTime() - start.getTime())
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                                    return `${diffDays} day${diffDays > 1 ? 's' : ''}`
                                  })()})
                                </span>
                              </div>
                            </div>
                          )}
                          {details.dates.registrationDeadline && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-white/40" />
                              <div>
                                <span className="font-medium text-white/90">Registration Deadline: </span>
                                <span>{formatDate(details.dates.registrationDeadline)}</span>
                                {new Date(details.dates.registrationDeadline) < new Date() && (
                                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">Closed</span>
                                )}
                              </div>
                            </div>
                          )}
                          {details.dates.timezone && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-white/40" />
                              <div>
                                <span className="font-medium text-white/90">Timezone: </span>
                                <span>{details.dates.timezone}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Event Location - Only show address if not already shown */}
                    {details.location && details.location.address && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Location Details
                        </h4>
                        <div className="space-y-1.5 text-sm text-white/70 pl-6">
                          {details.location.address && (
                            <div>
                              <span className="font-medium text-white/90">Address: </span>
                              <span>{details.location.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Event Capacity */}
                    {/* {details.capacity && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Capacity
                        </h4>
                        <div className="space-y-1.5 text-sm text-white/70 pl-6">
                          {details.capacity.maxAttendees && (
                            <div>
                              <span className="font-medium text-white/90">Max Attendees: </span>
                              <span>{details.capacity.maxAttendees}</span>
                            </div>
                          )}
                          {details.capacity.currentAttendees !== undefined && (
                            <div>
                              <span className="font-medium text-white/90">Current Attendees: </span>
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

                    {/* Event Requirements */}
                    {details.requirements && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Requirements
                        </h4>
                        <div className="space-y-2 text-sm text-white/70 pl-6">
                          {details.requirements.ageRange && (
                            <div>
                              <span className="font-medium text-white/90">Age Range: </span>
                              <span>{details.requirements.ageRange}</span>
                            </div>
                          )}
                          {details.requirements.skillLevel && (
                            <div>
                              <span className="font-medium text-white/90">Skill Level: </span>
                              <span>{details.requirements.skillLevel}</span>
                            </div>
                          )}
                          {details.requirements.prerequisites && details.requirements.prerequisites.length > 0 && (
                            <div>
                              <span className="font-medium text-white/90 block mb-1">Prerequisites: </span>
                              <ul className="list-disc list-inside space-y-0.5">
                                {details.requirements.prerequisites.map((prereq: string, index: number) => (
                                  <li key={index}>{prereq}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {details.requirements.equipment && details.requirements.equipment.length > 0 && (
                            <div>
                              <span className="font-medium text-white/90 block mb-1">Equipment Needed: </span>
                              <ul className="list-disc list-inside space-y-0.5">
                                {details.requirements.equipment.map((equip: string, index: number) => (
                                  <li key={index}>{equip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Event Agenda */}
                    {details.agenda && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Agenda
                        </h4>
                        <div className="text-sm text-white/70 pl-6">
                          {typeof details.agenda === 'string' ? (
                            <p className="leading-relaxed whitespace-pre-wrap">{details.agenda}</p>
                          ) : Array.isArray(details.agenda) ? (
                            <ul className="space-y-2 list-none">
                              {details.agenda.map((item: any, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <Clock className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                                  <div>
                                    {item.time && (
                                      <span className="font-medium text-white/90">{item.time} - </span>
                                    )}
                                    <span>{item.title || item}</span>
                                    {item.description && (
                                      <p className="text-white/60 text-xs mt-0.5">{item.description}</p>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    )}

                  </>
                )}

                {/* Resource Details */}
                {item.type === 'resource' && (
                  <div className="space-y-4">
                    {details.category && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          {details.category === 'video' && <Video className="w-4 h-4" />}
                          {details.category === 'audio' && <Headphones className="w-4 h-4" />}
                          {details.category === 'document' && <FileText className="w-4 h-4" />}
                          Resource Type
                        </h4>
                        <div className="text-sm text-white/70 pl-6">
                          <span className="capitalize">{details.category} Resource</span>
                        </div>
                      </div>
                    )}
                    {details.duration && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Duration
                        </h4>
                        <div className="text-sm text-white/70 pl-6">
                          <span>{details.duration}</span>
                        </div>
                      </div>
                    )}
                    {details.metrics?.viewCount !== undefined && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Statistics
                        </h4>
                        <div className="text-sm text-white/70 pl-6">
                          <span>{details.metrics.viewCount} views</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  {item.type === 'opportunity' && details.url && (
                    <Button
                      asChild
                      size="sm"
                      className={cn("w-full rounded-xl text-white", config.buttonColor)}
                    >
                      <a href={cleanUrl(details.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                        Apply Now
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {item.type === 'event' && details.url && (
                    <Button
                      asChild
                      size="sm"
                      className={cn("w-full rounded-xl text-white", config.buttonColor)}
                    >
                      <a href={cleanUrl(details.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                        Register
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {item.type === 'job' && details.url && (
                    <Button
                      asChild
                      size="sm"
                      className={cn("w-full rounded-xl text-white", config.buttonColor)}
                    >
                      <a href={cleanUrl(details.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                        Apply
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {item.type === 'resource' && (
                    <div className="flex flex-col gap-2">
                      {details.isPremium && details.paymentLink ? (
                        <Button
                          asChild
                          size="sm"
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl"
                        >
                          <a href={cleanUrl(details.paymentLink)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                            <Crown className="w-4 h-4" />
                            Purchase Premium
                          </a>
                        </Button>
                      ) : details.fileUrl ? (
                        <Button
                          asChild
                          size="sm"
                          className={cn("w-full rounded-xl text-white", config.buttonColor)}
                        >
                          <a href={cleanUrl(details.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                            Access Resource
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      ) : null}
                      {details.fileUrl && !details.isPremium && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl"
                        >
                          <a href={details.fileUrl} download className="flex items-center justify-center gap-2">
                            <Download className="w-4 h-4" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-1">
            {/* Like */}
            <button
              onClick={handleLike}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                isLiked 
                  ? "text-red-500 bg-red-500/10" 
                  : "text-white/50 hover:text-red-500 hover:bg-red-500/10"
              )}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                isSaved 
                  ? "text-orange-500 bg-orange-500/10" 
                  : "text-white/50 hover:text-orange-500 hover:bg-orange-500/10"
              )}
            >
              <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
            </button>

            {/* Add to Playlist */}
            {isAuthenticated && (
              <button
                onClick={handleAddToPlaylist}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/50 hover:text-violet-500 hover:bg-violet-500/10 transition-all"
              >
                <ListPlus className="w-4 h-4" />
              </button>
            )}

            {/* Share */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Post About This */}
            {isAuthenticated && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowShareComposer(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/50 hover:text-orange-500 hover:bg-orange-500/10 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Post</span>
              </button>
            )}
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
          type: item.type,
          company: item.company,
          organization: item.organization,
          author: item.author,
          description: item.description
        }}
      />
    </>
  )
}
