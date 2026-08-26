"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  RiExternalLinkLine,
  RiCalendarLine,
  RiMapPinLine,
  RiTimeLine,
  RiBookLine,
  RiBriefcaseLine,
  RiCheckboxCircleLine,
  RiGroupLine,
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
  BulletList,
  DetailProse,
  DetailSection,
  Fact,
  FactList,
  SimilarList,
  TrustBar,
  WhyCard,
} from '@/components/content-detail/sections'
import {
  applyHost,
  composeTiles,
  deadlineTile,
  formatDate,
  formatShortDate,
  locationLine,
  money,
  type StatTile,
} from '@/lib/content-detail/format'
import { useContentRanking, useSimilarContent } from '@/hooks/use-content-detail'
import { cleanUrl } from '@/lib/url-utils'
import { useAuth } from '@/lib/auth-context'
import { trackContentView } from '@/lib/tracking'
import ApiClient from '@/lib/api-client'
import { useOptionalTracker } from '@/contexts/tracker-context'

type OpportunityPageProps = { params: Promise<{ id: string }> }

/**
 * The three numbers worth reading before anything else. Built from whatever the
 * listing actually carries — a tile is never shown with a guessed value, so a
 * sparse scraped record simply renders fewer of them.
 */
function buildStatTiles(opportunity: any): StatTile[] {
  const optional: StatTile[] = []

  const amount = money(opportunity.financial)
  if (amount) {
    optional.push({ label: 'Award', value: amount })
  } else if (opportunity.financial?.isPaid) {
    optional.push({ label: 'Award', value: 'Funded' })
  }

  // Scrapers land "how many are given" under a few different names.
  const awards =
    opportunity.numberOfAwards ?? opportunity.awards ?? opportunity.slots ?? opportunity.positions
  if (typeof awards === 'number' && awards > 0) {
    optional.push({ label: 'Awards', value: String(awards) })
  }

  if (opportunity.dates?.duration) {
    optional.push({ label: 'Duration', value: String(opportunity.dates.duration) })
  }

  return composeTiles(optional, deadlineTile(opportunity.dates?.applicationDeadline))
}

function OpportunityPageContent({ params }: OpportunityPageProps) {
  const { isAuthenticated } = useAuth()
  const tracker = useOptionalTracker()
  const [opportunity, setOpportunity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const promotionClickSent = useRef(false)

  useEffect(() => {
    const loadParams = async () => { const r = await params; setId(r.id) }
    loadParams()
  }, [params])

  const getOpportunity = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(false)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${id}`, { cache: 'no-store' })
      if (!response.ok) { setError(true); return }
      const result = await response.json()
      if (!result.success) { setError(true); return }
      setOpportunity(result.data.opportunity)
      if (isAuthenticated) trackContentView('opportunity', id)
    } catch { setError(true) } finally { setLoading(false) }
  }, [id, isAuthenticated])

  useEffect(() => { if (id) getOpportunity() }, [id, getOpportunity])

  // Record promoted click once per page load when signed in (backend applies daily cap)
  useEffect(() => {
    if (!isAuthenticated || !id || !opportunity || promotionClickSent.current) return
    promotionClickSent.current = true
    ApiClient.recordPromotionClick(id, 'opportunity', 'view').catch(() => {})
  }, [isAuthenticated, id, opportunity])

  const { reasons, glow, personalised } = useContentRanking(opportunity)
  const similar = useSimilarContent('opportunities', opportunity, {
    getDeadline: (row) => row?.dates?.applicationDeadline,
  })

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: opportunity?.title ?? 'Opportunity', url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied')
      }
    } catch {
      // dismissed or clipboard denied — nothing to report
    }
  }, [opportunity])

  if (loading) return <ContentDetailSkeleton />
  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-page pb-20">
        <ErrorState isNetworkError onRetry={getOpportunity} />
      </div>
    )
  }

  const applyUrl =
    opportunity.url ||
    opportunity.applicationLink ||
    opportunity.application_link ||
    opportunity.externalUrl ||
    opportunity.externalLink
  const host = applyHost(applyUrl)

  const place = locationLine(opportunity.location)
  const subtitle = [opportunity.organization || opportunity.provider, place]
    .filter(Boolean)
    .join(' · ')

  const deadline = opportunity.dates?.applicationDeadline
  const eyebrow = [
    String(opportunity.category || 'Opportunity'),
    deadline ? `Deadline ${formatDate(deadline)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const tiles = buildStatTiles(opportunity)
  const eligibility = opportunity.eligibility || opportunity.requirements?.other || null

  // Trust signals render only when the backend actually sends them — an unchecked
  // link must never be shown as a checked one.
  const linkCheckedAt = opportunity.linkCheckedAt || opportunity.lastCheckedAt
  const isVerified = opportunity.isVerified ?? opportunity.verified
  const scamReports = opportunity.scamReportCount ?? opportunity.reportCount
  const trustParts = [
    linkCheckedAt ? `Link checked ${formatShortDate(linkCheckedAt)}` : null,
    isVerified === true ? 'verified' : null,
    typeof scamReports === 'number' ? `${scamReports} scam reports` : null,
  ].filter(Boolean) as string[]

  const applyButton = applyUrl ? (
    !isAuthenticated ? (
      <Button asChild size="lg" className="h-14 w-full rounded-full text-[15px] font-semibold">
        <Link href={`/login?callbackUrl=${encodeURIComponent(`/opportunities/${id}`)}`}>
          Sign in to apply
          <RiExternalLinkLine className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
    ) : (
      <Button asChild size="lg" className="h-14 w-full rounded-full text-[15px] font-semibold">
        <a
          href={cleanUrl(applyUrl)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            ApiClient.recordPromotionClick(id, 'opportunity', 'apply').catch(() => {})
            ApiClient.recordApply('opportunity', id).catch(() => {})
            // Arms the honesty tracker: this is the last moment the platform can
            // see anything, so the exit is recorded before the browser leaves.
            void tracker?.startTracking('opportunity', id, 'apply_button')
          }}
        >
          <span className="truncate">{host ? `Apply on ${host}` : 'Apply now'}</span>
          <RiExternalLinkLine className="h-4 w-4 flex-shrink-0" aria-hidden />
        </a>
      </Button>
    )
  ) : (
    <p className="py-4 text-center text-sm text-muted-foreground">
      No application link on this listing yet.
    </p>
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
    const closes = rowAny.dates?.applicationDeadline
    const meta = [money(rowAny.financial), closes ? `closes ${formatShortDate(closes)}` : null]
      .filter(Boolean)
      .join(' · ')
    return { _id: row._id, title: String(rowAny.title ?? 'Untitled'), meta: meta || null }
  })

  return (
    <ContentDetailShell
      hero={
        <DetailHero
          eyebrow={eyebrow}
          title={opportunity.title}
          subtitle={subtitle}
          tiles={tiles}
          accent="orange"
          onShare={handleShare}
        />
      }
      action={applyButton}
      secondaryAction={addToPlaylistButton}
      actionNote={deadline ? `Closes ${formatDate(deadline)}` : null}
      rail={
        similarRows.length > 0 ? (
          <div className="rounded-[1.5rem] border border-border/70 bg-card/60 p-5">
            <SimilarList items={similarRows} basePath="/opportunities" label="Similar, also open" />
          </div>
        ) : null
      }
      overlays={
        <>
          <AddToPlaylistModal
            isOpen={showPlaylistModal}
            onClose={() => setShowPlaylistModal(false)}
            item={{
              _id: opportunity._id,
              title: opportunity.title,
              type: 'opportunity',
              organization: opportunity.organization || opportunity.provider,
              description: opportunity.description,
            }}
            onItemAddedToPlaylist={() => {
              void ApiClient.recordFeedPlaylistAdd('opportunity', opportunity._id)
            }}
          />

          {showShareComposer && opportunity && (
            <ContentShareComposer
              content={{
                _id: opportunity._id,
                title: opportunity.title,
                description: opportunity.description,
                type: 'opportunity',
                organization: opportunity.organization || opportunity.provider,
                location: opportunity.location,
                dates: opportunity.dates,
                financial: opportunity.financial
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
          glow={glow}
          caveat={
            !deadline
              ? 'No closing date published — check the source before you plan around it.'
              : null
          }
        />
      )}

      {opportunity.description && (
        <DetailSection label="About">
          <DetailProse>{opportunity.description}</DetailProse>
        </DetailSection>
      )}

      {eligibility && (
        <DetailSection label="Eligibility — verbatim from the source">
          <DetailProse>{eligibility}</DetailProse>
        </DetailSection>
      )}

      <TrustBar parts={trustParts} />

      {opportunity.requirements && (
        <DetailSection label="Requirements">
          <FactList>
            {opportunity.requirements.educationLevel && (
              <Fact icon={RiBookLine} label="Education">{opportunity.requirements.educationLevel}</Fact>
            )}
            {opportunity.requirements.careerStage && (
              <Fact icon={RiBriefcaseLine} label="Career">{opportunity.requirements.careerStage}</Fact>
            )}
            {opportunity.requirements.experience && (
              <Fact icon={RiBriefcaseLine} label="Experience">{opportunity.requirements.experience}</Fact>
            )}
            {opportunity.requirements.skills?.length > 0 && (
              <Fact icon={RiCheckboxCircleLine} label="Skills">{opportunity.requirements.skills.join(', ')}</Fact>
            )}
            {opportunity.requirements.ageRange && (
              <Fact icon={RiGroupLine} label="Age">{opportunity.requirements.ageRange}</Fact>
            )}
            {opportunity.requirements.citizenship && (
              <Fact icon={RiMapPinLine} label="Citizenship">{opportunity.requirements.citizenship}</Fact>
            )}
          </FactList>
        </DetailSection>
      )}

      {opportunity.financial?.benefits?.length > 0 && (
        <DetailSection label="What you get">
          <BulletList items={opportunity.financial.benefits} />
        </DetailSection>
      )}

      {opportunity.dates && (
        <DetailSection label="Important dates">
          <FactList>
            {opportunity.dates.applicationDeadline && (
              <Fact icon={RiTimeLine} label="Deadline">{formatDate(opportunity.dates.applicationDeadline)}</Fact>
            )}
            {opportunity.dates.startDate && (
              <Fact icon={RiCalendarLine} label="Start">{formatDate(opportunity.dates.startDate)}</Fact>
            )}
            {opportunity.dates.endDate && (
              <Fact icon={RiCalendarLine} label="End">{formatDate(opportunity.dates.endDate)}</Fact>
            )}
            {opportunity.dates.duration && (
              <Fact icon={RiTimeLine} label="Duration">{opportunity.dates.duration}</Fact>
            )}
          </FactList>
        </DetailSection>
      )}

      {opportunity.location && (place || opportunity.location.address) && (
        <DetailSection label="Location">
          <p className="text-[15px] text-muted-foreground">
            {place || '—'}
            {opportunity.location.address && (
              <span className="mt-1 block">{opportunity.location.address}</span>
            )}
          </p>
        </DetailSection>
      )}

      {/* Phones read the related list inline; desktop gets it in the rail. */}
      <SimilarList
        items={similarRows}
        basePath="/opportunities"
        label="Similar, also open"
        className="lg:hidden"
      />

      {id && (
        <div className="border-t border-border/60 pt-4">
          <EngagementActions
            type="opportunities"
            id={id}
            likeCount={opportunity.metrics?.likeCount ?? 0}
            onPostClick={() => setShowShareComposer(true)}
          />
        </div>
      )}
    </ContentDetailShell>
  )
}

export default function OpportunityPage({ params }: OpportunityPageProps) {
  return <OpportunityPageContent params={params} />
}
