"use client"

import { useState, useEffect } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign,
  Users,
  CheckCircle2,
  FileText,
  Loader2,
  Share2
} from 'lucide-react'
import EngagementActions from '@/components/engagement-actions'
import ContentShareComposer from '@/components/content-share-composer'
import ContentDetailSkeleton from '@/components/skeletons/content-detail-skeleton'
import AuthGuard from '@/components/auth-guard'
import { cleanUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import ApiClient from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

type EventPageProps = {
  params: Promise<{
    id: string
  }>
}

function EventPageContent({ params }: EventPageProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      setId(resolvedParams.id)
    }
    loadParams()
  }, [params])

  useEffect(() => {
    if (!id) return

    const getEvent = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events/${id}`, {
          cache: 'no-store'
        })
        
        if (!response.ok) {
          notFound()
        }
        
        const result = await response.json()
        
        if (!result.success) {
          notFound()
        }
        
        setEvent(result.data.event)
      } catch (error) {
        console.error('Error fetching event:', error)
        notFound()
      } finally {
        setLoading(false)
      }
    }

    getEvent()
  }, [id])

  // Show skeleton immediately while loading
  if (loading) {
    return <ContentDetailSkeleton />
  }

  if (!event) {
    notFound()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getLocationString = () => {
    if (!event.location) return 'Location TBD'
    if (typeof event.location === 'string') return event.location
    if (event.location.isRemote) return 'Remote Event'
    const parts = [event.location.city, event.location.country].filter(Boolean)
    return parts.join(', ') || 'Location TBD'
  }

  const isRegistrationOpen = () => {
    if (!event.dates?.registrationDeadline) return true
    return new Date(event.dates.registrationDeadline) > new Date()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/[0.05] rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white/60" />
            </button>
            <h1 className="text-lg font-semibold text-white">Event</h1>
            <div className="w-9" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Main Card */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-white truncate">{event.organizer || 'Event Organizer'}</h2>
                <p className="text-xs text-white/50">Event</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title */}
            <h3 className="text-2xl font-bold text-white leading-tight">
              {event.title}
            </h3>

            {/* Meta Info Row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
              {event.dates?.startDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(event.dates.startDate)}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{getLocationString()}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                <span>{event.isPaid ? 'Paid' : 'Free'}</span>
              </div>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag: string, index: number) => (
                  <Badge 
                    key={index} 
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs px-2 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </h4>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {/* Event Dates */}
            {event.dates && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Event Schedule
                </h4>
                <div className="space-y-2 text-sm text-white/70 pl-6">
                  {event.dates.startDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-white/40" />
                      <div>
                        <span className="font-medium text-white/90">Start: </span>
                        <span>{formatDate(event.dates.startDate)}</span>
                      </div>
                    </div>
                  )}
                  {event.dates.endDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-white/40" />
                      <div>
                        <span className="font-medium text-white/90">End: </span>
                        <span>{formatDate(event.dates.endDate)}</span>
                        {event.dates.startDate && (
                          <span className="text-white/50 ml-2">
                            ({(() => {
                              const start = new Date(event.dates.startDate)
                              const end = new Date(event.dates.endDate)
                              const diffTime = Math.abs(end.getTime() - start.getTime())
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                              return `${diffDays} day${diffDays > 1 ? 's' : ''}`
                            })()})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {event.dates.registrationDeadline && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/40" />
                      <div>
                        <span className="font-medium text-white/90">Registration Deadline: </span>
                        <span>{formatDate(event.dates.registrationDeadline)}</span>
                        {!isRegistrationOpen() && (
                          <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                            Closed
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {event.dates.timezone && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/40" />
                      <div>
                        <span className="font-medium text-white/90">Timezone: </span>
                        <span>{event.dates.timezone}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location Details */}
            {event.location && typeof event.location === 'object' && !event.location.isRemote && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location Details
                </h4>
                <div className="space-y-1.5 text-sm text-white/70 pl-6">
                  {event.location.city && (
                    <div>City: {event.location.city}</div>
                  )}
                  {event.location.country && (
                    <div>Country: {event.location.country}</div>
                  )}
                  {event.location.address && (
                    <div className="mt-2 pt-2 border-t border-white/[0.06]">
                      <span className="font-medium text-white/90">Address: </span>
                      <span>{event.location.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Capacity */}
            {event.capacity && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Capacity
                </h4>
                <div className="space-y-1.5 text-sm text-white/70 pl-6">
                  {event.capacity.maxAttendees && (
                    <div>
                      <span className="font-medium text-white/90">Max Attendees: </span>
                      <span>{event.capacity.maxAttendees}</span>
                    </div>
                  )}
                  {event.capacity.currentAttendees !== undefined && (
                    <div>
                      <span className="font-medium text-white/90">Current Attendees: </span>
                      <span>{event.capacity.currentAttendees}</span>
                    </div>
                  )}
                  {event.capacity.isFull && (
                    <div className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium inline-block">
                      Event Full
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Requirements */}
            {event.requirements && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Requirements
                </h4>
                <div className="space-y-2 text-sm text-white/70 pl-6">
                  {event.requirements.ageRange && (
                    <div>
                      <span className="font-medium text-white/90">Age Range: </span>
                      <span>{event.requirements.ageRange}</span>
                    </div>
                  )}
                  {event.requirements.skillLevel && (
                    <div>
                      <span className="font-medium text-white/90">Skill Level: </span>
                      <span>{event.requirements.skillLevel}</span>
                    </div>
                  )}
                  {event.requirements.prerequisites && event.requirements.prerequisites.length > 0 && (
                    <div>
                      <span className="font-medium text-white/90 block mb-1">Prerequisites: </span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {event.requirements.prerequisites.map((prereq: string, index: number) => (
                          <li key={index}>{prereq}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {event.requirements.equipment && event.requirements.equipment.length > 0 && (
                    <div>
                      <span className="font-medium text-white/90 block mb-1">Equipment Needed: </span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {event.requirements.equipment.map((equip: string, index: number) => (
                          <li key={index}>{equip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Agenda */}
            {event.agenda && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Agenda
                </h4>
                <div className="text-sm text-white/70 pl-6">
                  {typeof event.agenda === 'string' ? (
                    <p className="leading-relaxed whitespace-pre-wrap">{event.agenda}</p>
                  ) : Array.isArray(event.agenda) ? (
                    <ul className="space-y-2 list-none">
                      {event.agenda.map((item: any, index: number) => (
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

            {/* Pricing */}
            {(event.isPaid || event.price) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Pricing
                </h4>
                <div className="space-y-1.5 text-sm text-white/70 pl-6">
                  <div>
                    <span className="font-medium text-white/90">Event Type: </span>
                    <span>{event.isPaid ? 'Paid' : 'Free'}</span>
                  </div>
                  {event.price && (
                    <div>
                      <span className="font-medium text-white/90">Price: </span>
                      <span>{event.currency || 'NGN'} {event.price}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                {id && (
                  <EngagementActions 
                    type="events" 
                    id={id} 
                    externalUrl={event.url}
                    className="flex-shrink-0"
                  />
                )}
                {isAuthenticated && (
                  <Button
                    onClick={() => setShowShareComposer(true)}
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-white/70 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Post About This
                  </Button>
                )}
              </div>
              {event.url && isRegistrationOpen() && (
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                >
                  <a href={cleanUrl(event.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                    Register
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Share Composer */}
      {showShareComposer && event && (
        <ContentShareComposer
          content={{
            _id: event._id,
            title: event.title,
            description: event.description,
            type: 'event',
            organization: event.organizer,
            location: event.location,
            dates: event.dates,
            isPaid: event.isPaid,
            price: event.price
          }}
          onPostCreated={() => {
            setShowShareComposer(false)
            toast.success('Post created!')
          }}
          onClose={() => setShowShareComposer(false)}
        />
      )}
    </div>
  )
}

export default function EventPage({ params }: EventPageProps) {
  return (
    <AuthGuard>
      <EventPageContent params={params} />
    </AuthGuard>
  )
}
