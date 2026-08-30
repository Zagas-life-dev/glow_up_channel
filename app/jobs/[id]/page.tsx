"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  RiExternalLinkLine,
  RiMapPinLine,
  RiMoneyDollarCircleLine,
  RiTimeLine,
  RiBriefcaseLine,
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
  TagRow,
  WhyCard,
} from '@/components/content-detail/sections'
import {
  applyHost,
  composeTiles,
  deadlineTile,
  formatDate,
  formatShortDate,
  locationLine,
  type StatTile,
} from '@/lib/content-detail/format'
import { useContentRanking, useSimilarContent } from '@/hooks/use-content-detail'
import { cleanUrl } from '@/lib/url-utils'
import { useAuth } from '@/lib/auth-context'
import { trackContentView } from '@/lib/tracking'
import ApiClient from '@/lib/api-client'
import { useOptionalTracker } from '@/contexts/tracker-context'

type JobPageProps = { params: Promise<{ id: string }> }

/** Pay as one line, e.g. "NGN 450,000/month". Null when the listing omits it. */
function payLine(pay: any): string | null {
  if (!pay?.amount) return null
  const currency = pay.currency || 'NGN'
  return `${currency} ${pay.amount}${pay.period ? `/${pay.period}` : ''}`
}

/**
 * The three numbers worth reading before anything else.
 *
 * Built only from what the listing actually carries, so a sparse scraped record
 * renders fewer tiles rather than confident-looking guesses.
 */
function buildStatTiles(job: any): StatTile[] {
  const optional: StatTile[] = []

  const pay = payLine(job.pay)
  if (pay) optional.push({ label: 'Pay', value: pay })

  if (job.jobType) optional.push({ label: 'Type', value: String(job.jobType) })

  const place = locationLine(job.location)
  if (place) optional.push({ label: 'Where', value: place })

  if (job.experienceLevel) {
    optional.push({ label: 'Level', value: String(job.experienceLevel) })
  }

  return composeTiles(optional, deadlineTile(job.dates?.applicationDeadline))
}

function JobPageContent({ params }: JobPageProps) {
  const { isAuthenticated } = useAuth()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const promotionClickSent = useRef(false)
  const tracker = useOptionalTracker()

  /**
   * The rail and phone-bar Apply buttons are the same exit through two entry
   * points, so they share one handler — including arming the honesty tracker,
   * which has to happen before the browser leaves for the listing.
   */
  const handleApplyClick = useCallback(() => {
    ApiClient.recordPromotionClick(id, 'job', 'apply').catch(() => {})
    ApiClient.recordApply('job', id).catch(() => {})
    void tracker?.startTracking('job', id, 'apply_button')
  }, [id, tracker])

  useEffect(() => {
    const loadParams = async () => { const r = await params; setId(r.id) }
    loadParams()
  }, [params])

  const getJob = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(false)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/jobs/${id}`, { cache: 'no-store' })
      if (!response.ok) { setError(true); return }
      const result = await response.json()
      if (!result.success) { setError(true); return }
      setJob(result.data.job)
      if (isAuthenticated) trackContentView('job', id)
    } catch { setError(true) } finally { setLoading(false) }
  }, [id, isAuthenticated])

  useEffect(() => { if (id) getJob() }, [id, getJob])

  useEffect(() => {
    if (!isAuthenticated || !id || !job || promotionClickSent.current) return
    promotionClickSent.current = true
    ApiClient.recordPromotionClick(id, 'job', 'view').catch(() => {})
  }, [isAuthenticated, id, job])

  const { reasons, match, personalised } = useContentRanking(job)
  const similar = useSimilarContent('jobs', job, {
    getDeadline: (row) => row?.dates?.applicationDeadline,
  })

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: job?.title ?? 'Job', url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied')
      }
    } catch {
      // dismissed or clipboard denied — nothing to report
    }
  }, [job])

  if (loading) return <ContentDetailSkeleton />
  if (error || !job) {
    return (
      <div className="min-h-screen bg-page pb-20">
        <ErrorState isNetworkError onRetry={getJob} />
      </div>
    )
  }

  const host = applyHost(job.url)
  const place = locationLine(job.location)
  const deadline = job.dates?.applicationDeadline

  const eyebrow = [
    String(job.jobType || 'Job'),
    deadline ? `Apply by ${formatShortDate(deadline)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const subtitle = [job.company, place].filter(Boolean).join(' · ')
  const tiles = buildStatTiles(job)

  const applyButton = !job.url ? (
    <p className="py-4 text-center text-sm text-muted-foreground">
      No application link on this listing yet.
    </p>
  ) : !isAuthenticated ? (
    <Button asChild size="lg" className="h-14 w-full rounded-full text-[15px] font-semibold">
      <Link href={`/login?callbackUrl=${encodeURIComponent(`/jobs/${id}`)}`}>
        Sign in to apply
        <RiExternalLinkLine className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  ) : (
    <Button asChild size="lg" className="h-14 w-full rounded-full text-[15px] font-semibold">
      <a
        href={cleanUrl(job.url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleApplyClick}
      >
        <span className="truncate">{host ? `Apply on ${host}` : 'Apply now'}</span>
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
    const closes = rowAny.dates?.applicationDeadline
    const meta = [payLine(rowAny.pay), closes ? `closes ${formatShortDate(closes)}` : null]
      .filter(Boolean)
      .join(' · ')
    return { _id: row._id, title: String(rowAny.title ?? 'Untitled'), meta: meta || null }
  })

  return (
    <ContentDetailShell
      hero={
        <DetailHero
          eyebrow={eyebrow}
          title={job.title}
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
            <SimilarList items={similarRows} basePath="/jobs" label="Similar, also open" />
          </div>
        ) : null
      }
      overlays={
        <>
          <AddToPlaylistModal
            isOpen={showPlaylistModal}
            onClose={() => setShowPlaylistModal(false)}
            item={{
              _id: job._id,
              title: job.title,
              type: 'job',
              company: job.company,
              description: job.description,
            }}
            onItemAddedToPlaylist={() => {
              void ApiClient.recordFeedPlaylistAdd('job', job._id)
            }}
          />

          {showShareComposer && job && (
            <ContentShareComposer
              content={{
                _id: job._id,
                title: job.title,
                description: job.description,
                type: 'job',
                company: job.company,
                location: job.location,
                dates: job.dates,
                pay: job.pay,
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
            !deadline
              ? 'No closing date published — check the source before you plan around it.'
              : null
          }
        />
      )}

      {job.tags?.length > 0 && <TagRow tags={job.tags} />}

      {job.description && (
        <DetailSection label="About the role">
          <DetailProse>{job.description}</DetailProse>
        </DetailSection>
      )}

      {job.requirements?.length > 0 && (
        <DetailSection label="Requirements">
          <BulletList items={job.requirements} />
        </DetailSection>
      )}

      {job.benefits?.length > 0 && (
        <DetailSection label="What you get">
          <BulletList items={job.benefits} />
        </DetailSection>
      )}

      {(job.pay?.amount || job.jobType || job.experienceLevel) && (
        <DetailSection label="The offer">
          <FactList>
            {job.pay?.amount && (
              <Fact icon={RiMoneyDollarCircleLine} label="Pay">
                {payLine(job.pay)}
              </Fact>
            )}
            {job.jobType && (
              <Fact icon={RiBriefcaseLine} label="Type">
                <span className="capitalize">{job.jobType}</span>
              </Fact>
            )}
            {job.experienceLevel && (
              <Fact icon={RiBriefcaseLine} label="Level">
                <span className="capitalize">{job.experienceLevel}</span>
              </Fact>
            )}
          </FactList>
        </DetailSection>
      )}

      {deadline && (
        <DetailSection label="Important dates">
          <FactList>
            <Fact icon={RiTimeLine} label="Deadline">{formatDate(deadline)}</Fact>
            {job.dates?.startDate && (
              <Fact icon={RiTimeLine} label="Start">{formatDate(job.dates.startDate)}</Fact>
            )}
          </FactList>
        </DetailSection>
      )}

      {job.location && typeof job.location === 'object' && !job.location.isRemote && (
        <DetailSection label="Location">
          <p className="text-[15px] text-muted-foreground">
            {place || '—'}
            {job.location.address && <span className="mt-1 block">{job.location.address}</span>}
          </p>
        </DetailSection>
      )}

      {job.location?.isRemote && (
        <DetailSection label="Location">
          <FactList>
            <Fact icon={RiMapPinLine} label="Remote">Open to anyone</Fact>
          </FactList>
        </DetailSection>
      )}

      {/* Phones read the related list inline; desktop gets it in the rail. */}
      <SimilarList
        items={similarRows}
        basePath="/jobs"
        label="Similar, also open"
        className="lg:hidden"
      />

      {id && (
        <div className="border-t border-border/60 pt-4">
          <EngagementActions
            type="jobs"
            id={id}
            likeCount={job.metrics?.likeCount ?? 0}
            onPostClick={() => setShowShareComposer(true)}
          />
        </div>
      )}
    </ContentDetailShell>
  )
}

export default function JobPage({ params }: JobPageProps) {
  return <JobPageContent params={params} />
}
