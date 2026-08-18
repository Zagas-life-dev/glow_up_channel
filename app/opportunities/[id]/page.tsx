"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiCalendarLine,
  RiMapPinLine,
  RiTimeLine,
  RiBookLine,
  RiBriefcaseLine,
  RiCheckboxCircleLine,
  RiCheckboxCircleFill,
  RiErrorWarningLine,
  RiGroupLine,
  RiAddLine,
} from 'react-icons/ri'
import { toast } from 'sonner'
import EngagementActions from '@/components/engagement-actions'
import ContentShareComposer from '@/components/content-share-composer'
import ContentDetailSkeleton from '@/components/skeletons/content-detail-skeleton'
import ErrorState from '@/components/error-state'
import AddToPlaylistModal from '@/components/add-to-playlist-modal'
import { cleanUrl } from '@/lib/url-utils'
import { useAuth } from '@/lib/auth-context'
import { trackContentView } from '@/lib/tracking'
import ApiClient from '@/lib/api-client'
import { usePersonalizedRanking } from '@/hooks/use-personalized-ranking'
import { fetchHomeListPage, type HomeListItem } from '@/lib/fetch-home-list-page'
import { cn } from '@/lib/utils'

type OpportunityPageProps = { params: Promise<{ id: string }> }

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

/** Whole days until `value`. `null` when there is no date, or it has passed. */
function daysUntil(value?: string): number | null {
  if (!value) return null
  const target = new Date(value).getTime()
  if (Number.isNaN(target)) return null
  const diff = target - Date.now()
  if (diff <= 0) return null
  return Math.ceil(diff / 86_400_000)
}

/** The host the Apply button actually sends them to, e.g. "vitalimpacts.org". */
function applyHost(url?: string): string | null {
  if (!url) return null
  try {
    return new URL(cleanUrl(url)).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function money(financial: any): string | null {
  if (!financial?.amount) return null
  return `${financial.currency ? `${financial.currency} ` : ''}${financial.amount}`
}

type StatTile = { label: string; value: string; urgent?: boolean }

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

  const left = daysUntil(opportunity.dates?.applicationDeadline)
  const deadlineTile: StatTile[] =
    left === null ? [] : [{ label: 'Left', value: `${left}d`, urgent: left <= 7 }]

  // The countdown is the most perishable number, so it keeps its slot.
  return [...optional.slice(0, deadlineTile.length ? 2 : 3), ...deadlineTile]
}

/** Quiet uppercase label above a block, as on the mock. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  )
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
      <span className="min-w-0">
        <strong className="font-medium text-foreground">{label}:</strong>{' '}
        <span className="text-muted-foreground">{children}</span>
      </span>
    </li>
  )
}

/** Rendered in the flow on phones, and in the sticky rail on desktop. */
function SimilarList({ items, className }: { items: HomeListItem[]; className?: string }) {
  if (items.length === 0) return null

  return (
    <section className={cn('space-y-2.5', className)}>
      <SectionLabel>Similar, also open</SectionLabel>
      <ul className="space-y-2.5">
        {items.map((row) => {
          const rowAny = row as any
          const closes = rowAny.dates?.applicationDeadline
          const meta = [money(rowAny.financial), closes ? `closes ${formatShortDate(closes)}` : null]
            .filter(Boolean)
            .join(' · ')

          return (
            <li key={row._id}>
              <Link
                href={`/opportunities/${row._id}`}
                className="block text-[15px] leading-snug text-foreground transition-colors hover:text-orange-500"
              >
                {String(rowAny.title ?? 'Untitled')}
                {meta && <span className="text-muted-foreground"> · {meta}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function OpportunityPageContent({ params }: OpportunityPageProps) {
  const router = useRouter()
  const { isAuthenticated, normalizedUser } = useAuth()
  const [opportunity, setOpportunity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [similar, setSimilar] = useState<HomeListItem[]>([])
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

  /**
   * The match score and its reasons are computed here rather than read off the
   * listing: this endpoint returns the opportunity on its own, with no notion of
   * who is reading it. `lib/ranking` is the same scorer the feed re-ranks with,
   * so the number shown here is the number that put this card in their feed.
   */
  const rankingProfile = useMemo(
    () =>
      normalizedUser
        ? {
            country: normalizedUser.country ?? undefined,
            province: normalizedUser.province ?? undefined,
            city: normalizedUser.city ?? undefined,
            interests: normalizedUser.interests,
            skills: normalizedUser.skills,
            industrySectors: normalizedUser.industrySectors,
            aspirations: normalizedUser.aspirations,
            careerStage: normalizedUser.careerStage ?? undefined,
          }
        : null,
    [normalizedUser],
  )
  const { rankForFeed, personalised } = usePersonalizedRanking(rankingProfile)

  const ranked = useMemo(() => {
    if (!opportunity) return null
    // `dropExpired` would return nothing for a closed listing, and this page still
    // has to explain itself after the deadline passes.
    return rankForFeed([opportunity as Record<string, unknown>], { dropExpired: false })[0] ?? null
  }, [rankForFeed, opportunity])

  // "Similar, also open" — same tags, deadline still ahead.
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!opportunity || !backendUrl) return

    let cancelled = false
    const tags = new Set(
      (Array.isArray(opportunity.tags) ? opportunity.tags : []).map((tag: string) =>
        String(tag).toLowerCase(),
      ),
    )
    if (tags.size === 0) return

    fetchHomeListPage({ type: 'opportunities', cursorLastId: null, backendUrl })
      .then(({ items }) => {
        if (cancelled) return
        const matches = items
          .filter((row) => row._id !== opportunity._id)
          .filter((row) => daysUntil((row as any).dates?.applicationDeadline) !== null)
          .map((row) => {
            const rowTags = Array.isArray((row as any).tags) ? (row as any).tags : []
            const overlap = rowTags.filter((tag: string) => tags.has(String(tag).toLowerCase())).length
            return { row, overlap }
          })
          .filter(({ overlap }) => overlap > 0)
          .sort((a, b) => b.overlap - a.overlap)
          .slice(0, 3)
          .map(({ row }) => row)
        setSimilar(matches)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [opportunity])

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
  }, [opportunity?.title])

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

  const locationLine = opportunity.location?.isRemote
    ? 'Remote'
    : [opportunity.location?.city, opportunity.location?.country].filter(Boolean).join(', ')
  const subtitle = [opportunity.organization || opportunity.provider, locationLine]
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
  const reasons: string[] = Array.isArray(ranked?.reasons) ? ranked.reasons : []
  const glow = typeof ranked?.score === 'number' ? Math.round(ranked.score) : null
  const showWhy = personalised && reasons.length > 0
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
  ].filter(Boolean)

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

  return (
    <div className="min-h-screen bg-page pb-24 lg:pb-12">
      <div className="mx-auto w-full lg:max-w-6xl lg:px-8 lg:pt-8">
        {/* Hero — deliberately dark in both themes, the way the mock reads as a poster */}
        <header className="bg-slate-950 text-white lg:rounded-[2rem]">
          {/* The app shell already applies the top safe-area inset, so this only
              needs its own breathing room. */}
          <div className="mx-auto max-w-[680px] px-5 pb-8 pt-3 lg:max-w-none lg:px-10 lg:pb-10 lg:pt-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="-ml-2 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Go back"
              >
                <RiArrowLeftLine className="h-5 w-5" aria-hidden />
              </button>
              <button
                onClick={handleShare}
                className="rounded-full px-3 py-1.5 text-[15px] text-sky-300 transition-colors hover:bg-white/5 hover:text-sky-200"
              >
                Share
              </button>
            </div>

            <div className="mt-6 lg:mt-8 lg:max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">
                {eyebrow}
              </p>
              <h1 className="mt-2.5 text-[28px] font-bold leading-[1.14] tracking-[-0.02em] lg:text-[40px] lg:leading-[1.08]">
                {opportunity.title}
              </h1>
              {subtitle && (
                <p className="mt-2.5 text-[15px] text-slate-400 lg:text-base">{subtitle}</p>
              )}
            </div>

            {tiles.length > 0 && (
              <div className="mt-6 grid grid-cols-3 gap-3 lg:mt-8 lg:max-w-xl">
                {tiles.map((tile) => (
                  <div
                    key={tile.label}
                    className={cn(
                      'rounded-2xl px-4 py-3.5',
                      tile.urgent ? 'bg-orange-500/[0.14]' : 'bg-white/[0.05]',
                    )}
                  >
                    <p
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-[0.14em]',
                        tile.urgent ? 'text-orange-400' : 'text-slate-400',
                      )}
                    >
                      {tile.label}
                    </p>
                    <p className="mt-1.5 truncate text-[22px] font-bold leading-none text-white">
                      {tile.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Body. On phones the light panel curls over the hero the way the mock
            does; from lg it becomes a two-column read with a sticky apply rail. */}
        <div className="relative -mt-5 rounded-t-[1.75rem] bg-page pt-6 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:rounded-none lg:bg-transparent lg:pt-0">
          <main className="mx-auto w-full max-w-[680px] space-y-7 px-5 lg:mx-0 lg:max-w-none lg:rounded-[1.5rem] lg:border lg:border-border/70 lg:bg-card/60 lg:p-8">
            {showWhy && (
              <section className="rounded-[1.25rem] border border-border/70 bg-card/80 p-4 lg:p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[17px] font-semibold text-foreground">
                    Why you&apos;re seeing this
                  </h2>
                  {glow !== null && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {glow} glow
                    </span>
                  )}
                </div>
                <ul className="mt-4 space-y-3">
                  {reasons.map((reason, i) => (
                    <li key={i} className="flex gap-3 text-[15px] leading-snug text-foreground">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                        <RiCheckboxCircleLine className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      </span>
                      <span className="min-w-0">{reason}</span>
                    </li>
                  ))}
                  {!deadline && (
                    <li className="flex gap-3 text-[15px] leading-snug text-foreground">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                        <RiErrorWarningLine className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
                      </span>
                      <span className="min-w-0 text-muted-foreground">
                        No closing date published — check the source before you plan around it.
                      </span>
                    </li>
                  )}
                </ul>
              </section>
            )}

            {opportunity.description && (
              <section className="space-y-2.5">
                <SectionLabel>About</SectionLabel>
                <p className="whitespace-pre-wrap text-[17px] leading-[1.6] text-foreground">
                  {opportunity.description}
                </p>
              </section>
            )}

            {eligibility && (
              <section className="space-y-2.5">
                <SectionLabel>Eligibility — verbatim from the source</SectionLabel>
                <p className="whitespace-pre-wrap text-[17px] leading-[1.6] text-foreground">
                  {eligibility}
                </p>
              </section>
            )}

            {trustParts.length > 0 && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/10 px-4 py-3 text-[15px] text-emerald-700 dark:text-emerald-400">
                <RiCheckboxCircleFill className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span className="min-w-0">{trustParts.join(' · ')}</span>
              </div>
            )}

            {opportunity.requirements && (
              <section className="space-y-2.5">
                <SectionLabel>Requirements</SectionLabel>
                <ul className="space-y-2 text-[15px]">
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
                </ul>
              </section>
            )}

            {opportunity.financial?.benefits?.length > 0 && (
              <section className="space-y-2.5">
                <SectionLabel>What you get</SectionLabel>
                <ul className="list-inside list-disc space-y-1 text-[15px] text-muted-foreground">
                  {opportunity.financial.benefits.map((benefit: string, i: number) => (
                    <li key={i}>{benefit}</li>
                  ))}
                </ul>
              </section>
            )}

            {opportunity.dates && (
              <section className="space-y-2.5">
                <SectionLabel>Important dates</SectionLabel>
                <ul className="space-y-2 text-[15px]">
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
                </ul>
              </section>
            )}

            {opportunity.location && (locationLine || opportunity.location.address) && (
              <section className="space-y-2.5">
                <SectionLabel>Location</SectionLabel>
                <p className="text-[15px] text-muted-foreground">
                  {locationLine || '—'}
                  {opportunity.location.address && (
                    <span className="mt-1 block">{opportunity.location.address}</span>
                  )}
                </p>
              </section>
            )}

            {/* Phones read the related list inline; desktop gets it in the rail. */}
            <SimilarList items={similar} className="lg:hidden" />

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
          </main>

          {/* Desktop rail: the apply action stays in view while the body scrolls */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-card/60 p-5">
                {applyButton}
                {addToPlaylistButton && (
                  <div className="flex items-center gap-3">
                    {addToPlaylistButton}
                    <p className="text-[13px] leading-snug text-muted-foreground">
                      Save it to a playlist to come back to it.
                    </p>
                  </div>
                )}
                {deadline && (
                  <p className="pt-1 text-center text-[13px] text-muted-foreground">
                    Closes {formatDate(deadline)}
                  </p>
                )}
              </div>

              {similar.length > 0 && (
                <div className="rounded-[1.5rem] border border-border/70 bg-card/60 p-5">
                  <SimilarList items={similar} />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Phone/tablet apply bar */}
      <div className="sticky bottom-0 z-30 mt-6 border-t border-border bg-page/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-[680px] items-center gap-3 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {addToPlaylistButton}
          <div className="min-w-0 flex-1">{applyButton}</div>
        </div>
      </div>

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
    </div>
  )
}

export default function OpportunityPage({ params }: OpportunityPageProps) {
  return <OpportunityPageContent params={params} />
}
