"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RiExternalLinkLine,
  RiCalendarLine,
  RiTimeLine,
  RiGroupLine,
  RiCheckboxCircleLine,
  RiAddLine,
} from 'react-icons/ri'
import { toast } from 'sonner'
import EngagementActions from '@/components/engagement-actions'
import ContentShareComposer from '@/components/content-share-composer'
import ContentDetailSkeleton from '@/components/skeletons/content-detail-skeleton'
import ErrorState from '@/components/error-state'
import AddToPlaylistModal from '@/components/add-to-playlist-modal'
import { DetailHero } from '@/components/content-detail/detail-hero'
import { ContentDetailShell } from '@/components/content-detail/detail-shell'
import {
  DetailProse,
  DetailSection,
  Fact,
  FactList,
  SimilarList,
  TagRow,
  WhyCard,
} from '@/components/content-detail/sections'
import {
  composeTiles,
  deadlineTile,
  formatDate,
  formatShortDate,
  locationLine,
  applyHost,
  type StatTile,
} from '@/lib/content-detail/format'
import { useContentRanking, useSimilarContent } from '@/hooks/use-content-detail'
import { cleanUrl } from '@/lib/url-utils'
import { useAuth } from '@/lib/auth-context'
import { trackContentView } from '@/lib/tracking'
import ApiClient from '@/lib/api-client'
import { useOptionalTracker } from '@/contexts/tracker-context'

type EventPageProps = { params: Promise<{ id: string }> }

const ACCENT_ICON = 'text-emerald-500'

/** The registration deadline, or the start date when there is no separate one. */
function closingDate(event: any): string | undefined {
  return event?.dates?.registrationDeadline || event?.dates?.startDate || undefined
}

/**
 * The three numbers worth reading before anything else.
 *
 * Built only from what the listing actually carries, so a sparse scraped record
 * renders fewer tiles rather than confident-looking guesses.
 */
function buildStatTiles(event: any): StatTile[] {
  const optional: StatTile[] = []

  if (event.dates?.startDate) {
    optional.push({ label: 'Starts', value: formatShortDate(event.dates.startDate) })
  }

  const place = locationLine(event.location)
  if (place) optional.push({ label: 'Where', value: place })

  if (event.isPaid && event.price) {
    optional.push({ label: 'Price', value: `${event.currency || 'NGN'} ${event.price}` })
  } else if (event.isPaid === false || (!event.isPaid && !event.price)) {
    optional.push({ label: 'Price', value: 'Free' })
  }

  const spots = event.capacity?.maxAttendees
  if (typeof spots === 'number' && spots > 0) {
    optional.push({ label: 'Spots', value: String(spots) })
  }

  return composeTiles(optional, deadlineTile(closingDate(event)))
}

function EventPageContent({ params }: EventPageProps) {
  const { isAuthenticated } = useAuth()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const promotionClickSent = useRef(false)
  const tracker = useOptionalTracker()

  /**
   * Shared by the rail and phone-bar register buttons.
   *
   * Registering is an exit like any other, so it arms the tracker too — the
   * question on the way back just becomes "did you register?" rather than
   * "did you get it in?".
   */
  const handleRegisterClick = useCallback(() => {
    ApiClient.recordPromotionClick(id, 'event', 'apply').catch(() => {})
    void tracker?.startTracking('event', id, 'register_button')
  }, [id, tracker])

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
      // Report the view. The GET above no longer increments anything — it fires for
      // server renders, prefetches and crawlers alike — so this beacon is what counts,
      // deduplicated server-side to one view per viewer per day. Signed-out visitors
      // count too; only the recommender needs an account.
      void ApiClient.recordFeedContentView('event', id, 'detail_page')
      if (isAuthenticated) trackContentView('event', id)
    } catch { setError(true) } finally { setLoading(false) }
  }, [id, isAuthenticated])

  useEffect(() => { if (id) getEvent() }, [id, getEvent])

  useEffect(() => {
    if (!isAuthenticated || !id || !event || promotionClickSent.current) return
    promotionClickSent.current = true
    ApiClient.recordPromotionClick(id, 'event', 'view').catch(() => {})
  }, [isAuthenticated, id, event])

  const { reasons, match, personalised } = useContentRanking(event)
  const similar = useSimilarContent('events', event, { getDeadline: (row) => closingDate(row) })

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: event?.title ?? 'Event', url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied')
      }
    } catch {
      // dismissed or clipboard denied — nothing to report
    }
  }, [event])

  if (loading) return <ContentDetailSkeleton />
  if (error || !event) {
    return (
      <div className="min-h-screen bg-page pb-20">
        <ErrorState isNetworkError onRetry={getEvent} />
      </div>
    )
  }

  const registrationUrl =
    event.url || event.registrationLink || event.externalUrl || event.externalLink

  const isRegistrationOpen = () => {
    if (!event.dates?.registrationDeadline) return true
    return new Date(event.dates.registrationDeadline) > new Date()
  }

  const registrationOpen = isRegistrationOpen()
  const host = applyHost(registrationUrl)
  const place = locationLine(event.location)

  const eyebrow = [
    String(event.category || 'Event'),
    event.dates?.startDate ? `Starts ${formatShortDate(event.dates.startDate)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const subtitle = [event.organizer, place].filter(Boolean).join(' · ')
  const tiles = buildStatTiles(event)

  const registerButton = !registrationUrl ? (
    <p className="py-4 text-center text-sm text-muted-foreground">
      No registration link on this listing yet.
    </p>
  ) : !registrationOpen ? (
    <p className="py-4 text-center text-sm text-muted-foreground">
      Registration closed {formatDate(event.dates.registrationDeadline)}.
    </p>
  ) : !isAuthenticated ? (
    <Button asChild size="lg" className="h-14 w-full rounded-full text-[15px] font-semibold">
      <Link href={`/login?callbackUrl=${encodeURIComponent(`/events/${id}`)}`}>
        Sign in to register
        <RiExternalLinkLine className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  ) : (
    <Button asChild size="lg" className="h-14 w-full rounded-full text-[15px] font-semibold">
      <a
        href={cleanUrl(registrationUrl)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleRegisterClick}
      >
        <span className="truncate">{host ? `Register on ${host}` : 'Register'}</span>
        <RiExternalLinkLine className="h-4 w-4 flex-shrink-0" aria-hidden />
      </a>
    </Button>
  )

  const addToPlaylistButton = isAuthenticated ? (
    <button
      type="button"
      onClick={() => setShowPlaylistModal(true)}
      className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      aria-label="Add to a playlist"
    >
      <RiAddLine className="h-5 w-5" aria-hidden />
    </button>
  ) : null

  const similarRows = similar.map((row) => {
    const rowAny = row as any
    const starts = rowAny.dates?.startDate
    return {
      _id: row._id,
      title: String(rowAny.title ?? 'Untitled'),
      meta: starts ? `starts ${formatShortDate(starts)}` : null,
    }
  })

  return (
    <ContentDetailShell
      hero={
        <DetailHero
          eyebrow={eyebrow}
          title={event.title}
          subtitle={subtitle}
          tiles={tiles}
          accent="emerald"
          onShare={handleShare}
        />
      }
      action={registerButton}
      secondaryAction={addToPlaylistButton}
      actionNote={
        event.dates?.registrationDeadline && registrationOpen
          ? `Registration closes ${formatDate(event.dates.registrationDeadline)}`
          : null
      }
      rail={
        similarRows.length > 0 ? (
          <div className="rounded-[1.5rem] border border-border/70 bg-card/60 p-5">
            <SimilarList items={similarRows} basePath="/events" label="Similar, also open" />
          </div>
        ) : null
      }
      overlays={
        <>
          <AddToPlaylistModal
            isOpen={showPlaylistModal}
            onClose={() => setShowPlaylistModal(false)}
            item={{
              _id: event._id,
              title: event.title,
              type: 'event',
              organization: event.organizer,
              description: event.description,
            }}
            onItemAddedToPlaylist={() => {
              void ApiClient.recordFeedPlaylistAdd('event', event._id)
            }}
          />

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
                price: event.price,
              }}
              onPostCreated={() => { setShowShareComposer(false); toast.success('Post created!') }}
              onClose={() => setShowShareComposer(false)}
            />
          )}
        </>
      }
    >
      {personalised && (
        <WhyCard
          reasons={reasons}
          match={match}
          caveat={
            !event.dates?.startDate
              ? 'No start date published — check the source before you plan around it.'
              : null
          }
        />
      )}

      {event.tags?.length > 0 && <TagRow tags={event.tags} />}

      {event.description && (
        <DetailSection label="About">
          <DetailProse>{event.description}</DetailProse>
        </DetailSection>
      )}

      {event.dates && (
        <DetailSection label="Schedule">
          <FactList>
            {event.dates.startDate && (
              <Fact icon={RiCalendarLine} label="Start" iconClassName={ACCENT_ICON}>
                {formatDate(event.dates.startDate)}
              </Fact>
            )}
            {event.dates.endDate && (
              <Fact icon={RiCalendarLine} label="End" iconClassName={ACCENT_ICON}>
                {formatDate(event.dates.endDate)}
              </Fact>
            )}
            {event.dates.registrationDeadline && (
              <Fact icon={RiTimeLine} label="Registration" iconClassName={ACCENT_ICON}>
                {formatDate(event.dates.registrationDeadline)}
                {!registrationOpen && (
                  <Badge className="ml-2 border-0 bg-red-500/20 text-[10px] text-red-400">Closed</Badge>
                )}
              </Fact>
            )}
            {event.dates.timezone && (
              <Fact icon={RiTimeLine} label="Timezone" iconClassName={ACCENT_ICON}>
                {event.dates.timezone}
              </Fact>
            )}
          </FactList>
        </DetailSection>
      )}

      {event.agenda && (
        <DetailSection label="Agenda">
          {typeof event.agenda === 'string' ? (
            <DetailProse>{event.agenda}</DetailProse>
          ) : Array.isArray(event.agenda) ? (
            <ul className="space-y-2 text-[15px]">
              {event.agenda.map((item: any, i: number) => (
                <li key={i} className="flex gap-2.5">
                  <RiTimeLine className={`mt-0.5 h-4 w-4 flex-shrink-0 ${ACCENT_ICON}`} aria-hidden />
                  <div className="min-w-0">
                    {item.time && (
                      <span className="font-medium text-foreground">{item.time} — </span>
                    )}
                    <span className="text-muted-foreground">{item.title || item}</span>
                    {item.description && (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </DetailSection>
      )}

      {event.requirements && (
        <DetailSection label="Requirements">
          <FactList>
            {event.requirements.ageRange && (
              <Fact icon={RiGroupLine} label="Age" iconClassName={ACCENT_ICON}>
                {event.requirements.ageRange}
              </Fact>
            )}
            {event.requirements.skillLevel && (
              <Fact icon={RiCheckboxCircleLine} label="Skill" iconClassName={ACCENT_ICON}>
                {event.requirements.skillLevel}
              </Fact>
            )}
            {event.requirements.prerequisites?.length > 0 && (
              <Fact icon={RiCheckboxCircleLine} label="Prerequisites" iconClassName={ACCENT_ICON}>
                {event.requirements.prerequisites.join(', ')}
              </Fact>
            )}
            {event.requirements.equipment?.length > 0 && (
              <Fact icon={RiCheckboxCircleLine} label="Equipment" iconClassName={ACCENT_ICON}>
                {event.requirements.equipment.join(', ')}
              </Fact>
            )}
          </FactList>
        </DetailSection>
      )}

      {event.capacity && (
        <DetailSection label="Capacity">
          <p className="text-[15px] text-muted-foreground">
            {event.capacity.maxAttendees != null && `Max ${event.capacity.maxAttendees}`}
            {event.capacity.currentAttendees != null && ` · ${event.capacity.currentAttendees} attending`}
            {event.capacity.isFull && (
              <Badge className="ml-2 border-0 bg-red-500/20 text-[10px] text-red-400">Full</Badge>
            )}
          </p>
        </DetailSection>
      )}

      {(event.isPaid || event.price) && (
        <DetailSection label="Pricing">
          <p className="text-[15px] text-muted-foreground">
            {event.isPaid ? 'Paid' : 'Free'}
            {event.price && ` · ${event.currency || 'NGN'} ${event.price}`}
          </p>
        </DetailSection>
      )}

      {event.location && typeof event.location === 'object' && !event.location.isRemote && (
        <DetailSection label="Location">
          <p className="text-[15px] text-muted-foreground">
            {place || '—'}
            {event.location.address && <span className="mt-1 block">{event.location.address}</span>}
          </p>
        </DetailSection>
      )}

      {/* Phones read the related list inline; desktop gets it in the rail. */}
      <SimilarList
        items={similarRows}
        basePath="/events"
        label="Similar, also open"
        className="lg:hidden"
      />

      {id && (
        <div className="border-t border-border/60 pt-4">
          <EngagementActions
            type="events"
            id={id}
            likeCount={event.metrics?.likeCount ?? 0}
            onPostClick={() => setShowShareComposer(true)}
          />
        </div>
      )}
    </ContentDetailShell>
  )
}

export default function EventPage({ params }: EventPageProps) {
  return <EventPageContent params={params} />
}
