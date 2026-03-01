"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiCalendarLine,
  RiMapPinLine,
  RiTimeLine,
  RiMoneyDollarCircleLine,
  RiGroupLine,
  RiCheckboxCircleLine,
  RiFileLine,
} from 'react-icons/ri'
import EngagementActions from '@/components/engagement-actions'
import ContentShareComposer from '@/components/content-share-composer'
import ContentDetailSkeleton from '@/components/skeletons/content-detail-skeleton'
import ErrorState from '@/components/error-state'
import AuthGuard from '@/components/auth-guard'
import { cleanUrl } from '@/lib/url-utils'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { trackContentView } from '@/lib/tracking'
import ApiClient from '@/lib/api-client'

type EventPageProps = { params: Promise<{ id: string }> }

function EventPageContent({ params }: EventPageProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)
  const promotionClickSent = useRef(false)

  useEffect(() => {
    const loadParams = async () => { const r = await params; setId(r.id) }
    loadParams()
  }, [params])

  const getEvent = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(false)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events/${id}`, { cache: 'no-store' })
      if (!response.ok) { setError(true); return }
      const result = await response.json()
      if (!result.success) { setError(true); return }
      setEvent(result.data.event)
      if (isAuthenticated) trackContentView('event', id)
    } catch { setError(true) } finally { setLoading(false) }
  }, [id, isAuthenticated])

  useEffect(() => { if (id) getEvent() }, [id, getEvent])

  useEffect(() => {
    if (!isAuthenticated || !id || !event || promotionClickSent.current) return
    promotionClickSent.current = true
    ApiClient.recordPromotionClick(id, 'event', 'view').catch(() => {})
  }, [isAuthenticated, id, event])

  if (loading) return <ContentDetailSkeleton />
  if (error || !event) {
    return (
      <div className="min-h-screen bg-page pb-20">
        <ErrorState isNetworkError onRetry={getEvent} />
      </div>
    )
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  const getLocationString = () => {
    if (!event.location) return 'Location TBD'
    if (typeof event.location === 'string') return event.location
    if (event.location.isRemote) return 'Remote'
    const parts = [event.location.city, event.location.country].filter(Boolean)
    return parts.join(', ') || 'Location TBD'
  }

  const isRegistrationOpen = () => {
    if (!event.dates?.registrationDeadline) return true
    return new Date(event.dates.registrationDeadline) > new Date()
  }

  const metaParts = []
  if (event.dates?.startDate) metaParts.push(formatDate(event.dates.startDate))
  if (event.location) metaParts.push(getLocationString())
  metaParts.push(event.isPaid ? 'Paid' : 'Free')
  const metaLine = metaParts.join(' · ')

  return (
    <div className="min-h-screen bg-page pb-28">
      <header className="sticky top-0 z-30 bg-page/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] lg:max-w-4xl xl:max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <RiArrowLeftLine className="h-5 w-5" />
          </button>
          <span className="text-[15px] font-semibold text-foreground">Event</span>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-[600px] lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 lg:px-6 xl:px-8 border-x border-border min-h-screen xl:grid xl:grid-cols-[1fr_320px] xl:gap-12 2xl:gap-16">
        <div className="min-w-0">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
            <RiCalendarLine className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{event.organizer || 'Event Organizer'}</p>
            <p className="text-[13px] text-muted-foreground">Event</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <h1 className="text-xl font-bold text-foreground leading-snug break-words">{event.title}</h1>
          <p className="text-[13px] text-muted-foreground mt-2">{metaLine}</p>
          {event.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {event.tags.map((tag: string, i: number) => (
                <span key={i} className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 flex items-center gap-1 border-y border-border">
          {id && (
            <EngagementActions
              type="events"
              id={id}
              className="flex-shrink-0"
              likeCount={event.metrics?.likeCount ?? 0}
              onPostClick={() => setShowShareComposer(true)}
            />
          )}
        </div>

        <div className="px-4 py-5 space-y-6 text-[15px]">
          {event.description && <p className="text-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>}

          {event.dates && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Schedule</p>
              <ul className="text-muted-foreground text-sm space-y-1">
                {event.dates.startDate && <li className="flex items-center gap-2"><RiCalendarLine className="w-4 h-4 text-emerald-500" /> Start: {formatDate(event.dates.startDate)}</li>}
                {event.dates.endDate && <li className="flex items-center gap-2"><RiCalendarLine className="w-4 h-4 text-emerald-500" /> End: {formatDate(event.dates.endDate)}</li>}
                {event.dates.registrationDeadline && (
                  <li className="flex items-center gap-2">
                    <RiTimeLine className="w-4 h-4 text-emerald-500" />
                    Registration: {formatDate(event.dates.registrationDeadline)}
                    {!isRegistrationOpen() && <Badge className="ml-2 bg-red-500/20 text-red-400 border-0 text-[10px]">Closed</Badge>}
                  </li>
                )}
                {event.dates.timezone && <li className="flex items-center gap-2"><RiTimeLine className="w-4 h-4 text-emerald-500" /> {event.dates.timezone}</li>}
              </ul>
            </div>
          )}

          {event.location && typeof event.location === 'object' && !event.location.isRemote && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location</p>
              <p className="text-muted-foreground text-sm">{event.location.city && `${event.location.city}, `}{event.location.country}{event.location.address && ` · ${event.location.address}`}</p>
            </div>
          )}

          {event.capacity && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Capacity</p>
              <p className="text-muted-foreground text-sm">
                {event.capacity.maxAttendees != null && `Max ${event.capacity.maxAttendees}`}
                {event.capacity.currentAttendees != null && ` · ${event.capacity.currentAttendees} attending`}
                {event.capacity.isFull && <Badge className="ml-2 bg-red-500/20 text-red-400 border-0 text-[10px]">Full</Badge>}
              </p>
            </div>
          )}

          {event.requirements && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requirements</p>
              <div className="text-muted-foreground text-sm space-y-1">
                {event.requirements.ageRange && <p><strong className="text-foreground">Age:</strong> {event.requirements.ageRange}</p>}
                {event.requirements.skillLevel && <p><strong className="text-foreground">Skill:</strong> {event.requirements.skillLevel}</p>}
                {event.requirements.prerequisites?.length > 0 && <p><strong className="text-foreground">Prerequisites:</strong> {event.requirements.prerequisites.join(', ')}</p>}
                {event.requirements.equipment?.length > 0 && <p><strong className="text-foreground">Equipment:</strong> {event.requirements.equipment.join(', ')}</p>}
              </div>
            </div>
          )}

          {event.agenda && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agenda</p>
              <div className="text-muted-foreground text-sm">
                {typeof event.agenda === 'string' ? <p className="whitespace-pre-wrap">{event.agenda}</p> : Array.isArray(event.agenda) ? (
                  <ul className="space-y-2 list-none">
                    {event.agenda.map((item: any, i: number) => (
                      <li key={i} className="flex gap-2">
                        <RiTimeLine className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div>{item.time && <span className="font-medium text-foreground/90">{item.time} — </span>}{item.title || item}{item.description && <p className="text-muted-foreground text-xs mt-0.5">{item.description}</p>}</div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          )}

          {(event.isPaid || event.price) && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pricing</p>
              <p className="text-muted-foreground text-sm">{event.isPaid ? 'Paid' : 'Free'}{event.price && ` · ${event.currency || 'NGN'} ${event.price}`}</p>
            </div>
          )}
        </div>
        </div>

        {event.url && cleanUrl(event.url) && isRegistrationOpen() && (
          <>
            <div className="xl:hidden sticky bottom-0 left-0 right-0 p-4 bg-page/95 backdrop-blur-md border-t border-border">
              <Button asChild size="lg" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-12 font-semibold text-[15px]">
                <a href={cleanUrl(event.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2" onClick={() => ApiClient.recordPromotionClick(id, 'event', 'apply').catch(() => {})}>
                  Register
                  <RiExternalLinkLine className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <aside className="hidden xl:block pt-4">
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <Button asChild size="lg" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 font-semibold">
                  <a href={cleanUrl(event.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2" onClick={() => ApiClient.recordPromotionClick(id, 'event', 'apply').catch(() => {})}>
                    Register
                    <RiExternalLinkLine className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </aside>
          </>
        )}
      </main>

      {showShareComposer && event && (
        <ContentShareComposer
          content={{ _id: event._id, title: event.title, description: event.description, type: 'event', organization: event.organizer, location: event.location, dates: event.dates, isPaid: event.isPaid, price: event.price }}
          onPostCreated={() => { setShowShareComposer(false); toast.success('Post created!') }}
          onClose={() => setShowShareComposer(false)}
        />
      )}
    </div>
  )
}

export default function EventPage({ params }: EventPageProps) {
  return <AuthGuard><EventPageContent params={params} /></AuthGuard>
}
