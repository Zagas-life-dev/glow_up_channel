"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// PDF viewer relies on browser-only APIs (pdf.js); load it client-side only.
const ResourceViewer = dynamic(() => import('@/components/resource/ResourceViewer'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
      Loading viewer…
    </div>
  ),
})
import {
  RiExternalLinkLine,
  RiBookLine,
  RiDownloadLine,
  RiEyeLine,
  RiTimeLine,
  RiFileLine,
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
  applyHost,
  composeTiles,
  formatDate,
  type StatTile,
} from '@/lib/content-detail/format'
import { useContentRanking, useSimilarContent } from '@/hooks/use-content-detail'
import { cleanUrl } from '@/lib/url-utils'
import { useAuth } from '@/lib/auth-context'
import { trackContentView } from '@/lib/tracking'
import ApiClient from '@/lib/api-client'
import { useOptionalTracker } from '@/contexts/tracker-context'

type ResourcePageProps = { params: Promise<{ id: string }> }

const ACCENT_ICON = 'text-violet-500'

/**
 * The three numbers worth reading before anything else.
 *
 * Resources carry no deadline, so unlike the other three detail pages this one
 * never shows the orange countdown tile — there is nothing to count down to.
 */
function buildStatTiles(resource: any): StatTile[] {
  const optional: StatTile[] = []

  if (resource.category) {
    optional.push({ label: 'Type', value: String(resource.category) })
  }

  if (resource.duration) {
    optional.push({ label: 'Length', value: String(resource.duration) })
  } else if (typeof resource.pageCount === 'number' && resource.pageCount > 0) {
    optional.push({ label: 'Pages', value: String(resource.pageCount) })
  }

  if (typeof resource.metrics?.viewCount === 'number') {
    optional.push({ label: 'Views', value: String(resource.metrics.viewCount) })
  }

  if (resource.isPremium) {
    optional.push({ label: 'Access', value: 'Premium' })
  }

  return composeTiles(optional, null)
}

function ResourcePageContent({ params }: ResourcePageProps) {
  const { isAuthenticated } = useAuth()
  const [resource, setResource] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const promotionClickSent = useRef(false)
  const tracker = useOptionalTracker()

  /**
   * Only the off-platform resources arm the tracker.
   *
   * A file resource is read in the in-app viewer — the user never leaves, so
   * there is no return to catch and no honest question to ask. The backend
   * enforces this too and answers tracked:false for those, but not sending the
   * call at all saves the round trip.
   */
  const handleResourceOpen = useCallback(() => {
    void tracker?.startTracking('resource', id, 'resource_link')
    // The conversion event for a resource, and the counterpart of the `apply`
    // the other three detail pages record on their CTA. Opening the resource is
    // what a promoter is buying here, and without this a promoted resource
    // reported views and nothing else — so its campaign looked like it was
    // converting at zero however well it was actually doing. The backend
    // no-ops when the content is not promoted.
    if (isAuthenticated && id) {
      ApiClient.recordPromotionClick(id, 'resource', 'apply').catch(() => {})
    }
  }, [id, tracker, isAuthenticated])

  useEffect(() => {
    const loadParams = async () => { const r = await params; setId(r.id) }
    loadParams()
  }, [params])

  const getResource = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(false)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources/${id}`, { cache: 'no-store' })
      if (!response.ok) { setError(true); return }
      const result = await response.json()
      if (!result.success) { setError(true); return }
      setResource(result.data.resource)
      // Report the view. The GET above no longer increments anything — it fires for
      // server renders, prefetches and crawlers alike — so this beacon is what counts,
      // deduplicated server-side to one view per viewer per day. Signed-out visitors
      // count too; only the recommender needs an account.
      void ApiClient.recordFeedContentView('resource', id, 'detail_page')
      if (isAuthenticated) trackContentView('resource', id)
    } catch { setError(true) } finally { setLoading(false) }
  }, [id, isAuthenticated])

  useEffect(() => { if (id) getResource() }, [id, getResource])

  useEffect(() => {
    if (!isAuthenticated || !id || !resource || promotionClickSent.current) return
    promotionClickSent.current = true
    ApiClient.recordPromotionClick(id, 'resource', 'view').catch(() => {})
  }, [isAuthenticated, id, resource])

  const { reasons, match, personalised } = useContentRanking(resource)
  const similar = useSimilarContent('resources', resource)

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: resource?.title ?? 'Resource', url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied')
      }
    } catch {
      // dismissed or clipboard denied — nothing to report
    }
  }, [resource])

  if (loading) return <ContentDetailSkeleton />
  if (error || !resource) {
    return (
      <div className="min-h-screen bg-page pb-20">
        <ErrorState isNetworkError onRetry={getResource} />
      </div>
    )
  }

  // Uploaded (file) resources are viewed in-platform; link resources go out.
  const isFileResource = resource.resourceType === 'file' || resource.hasFile === true

  /**
   * Where "Access resource" points.
   *
   * Premium resources route through the payment link; a plain link resource
   * goes straight to the file. The previous version of this page used
   * `paymentLink` in both cases, which rendered a dead button on any link
   * resource that was not premium — the `fileUrl` fallback is what fixes that.
   */
  const accessUrl = resource.paymentLink || (!isFileResource ? resource.fileUrl : null)
  const host = applyHost(accessUrl)

  const eyebrow = [String(resource.category || 'Resource'), resource.isPremium ? 'Premium' : null]
    .filter(Boolean)
    .join(' · ')

  const subtitle = [resource.author, `Published ${formatDate(resource.createdAt)}`]
    .filter(Boolean)
    .join(' · ')

  const tiles = buildStatTiles(resource)

  const accessButton = !accessUrl ? null : !isAuthenticated ? (
    <Button asChild size="lg" className="h-14 w-full rounded-full text-[15px] font-semibold">
      <Link href={`/login?callbackUrl=${encodeURIComponent(`/resources/${id}`)}`}>
        Sign in to view
        <RiExternalLinkLine className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  ) : (
    <Button asChild size="lg" className="h-14 w-full rounded-full text-[15px] font-semibold">
      <a
        href={cleanUrl(accessUrl)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleResourceOpen}
      >
        <span className="truncate">{host ? `Open on ${host}` : 'Access resource'}</span>
        <RiExternalLinkLine className="h-4 w-4 flex-shrink-0" aria-hidden />
      </a>
    </Button>
  )

  /**
   * A file resource has no outbound action at all — it is read right here in
   * the viewer below, so the rail offers the sign-in prompt or nothing.
   */
  const action =
    accessButton ??
    (isFileResource && !isAuthenticated ? (
      <Button asChild size="lg" className="h-14 w-full rounded-full text-[15px] font-semibold">
        <Link href={`/login?callbackUrl=${encodeURIComponent(`/resources/${id}`)}`}>
          Sign in to read
        </Link>
      </Button>
    ) : null)

  const downloadButton =
    isAuthenticated && !isFileResource && resource.fileUrl ? (
      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-12 w-full rounded-full border-border text-[15px] text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <a href={resource.fileUrl} download className="flex items-center justify-center gap-2">
          <RiDownloadLine className="h-4 w-4" aria-hidden /> Download
        </a>
      </Button>
    ) : null

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
    return {
      _id: row._id,
      title: String(rowAny.title ?? 'Untitled'),
      meta: rowAny.category ? String(rowAny.category) : null,
    }
  })

  return (
    <ContentDetailShell
      hero={
        <DetailHero
          eyebrow={eyebrow}
          title={resource.title}
          subtitle={subtitle}
          tiles={tiles}
          accent="violet"
          onShare={handleShare}
        />
      }
      action={action}
      secondaryAction={addToPlaylistButton}
      rail={
        <>
          {downloadButton && (
            <div className="rounded-[1.5rem] border border-border/70 bg-card/60 p-5">
              {downloadButton}
            </div>
          )}
          {similarRows.length > 0 && (
            <div className="rounded-[1.5rem] border border-border/70 bg-card/60 p-5">
              <SimilarList items={similarRows} basePath="/resources" label="More like this" />
            </div>
          )}
        </>
      }
      overlays={
        <>
          <AddToPlaylistModal
            isOpen={showPlaylistModal}
            onClose={() => setShowPlaylistModal(false)}
            item={{
              _id: resource._id,
              title: resource.title,
              type: 'resource',
              author: resource.author,
              description: resource.description,
            }}
            onItemAddedToPlaylist={() => {
              void ApiClient.recordFeedPlaylistAdd('resource', resource._id)
            }}
          />

          {showShareComposer && resource && (
            <ContentShareComposer
              content={{
                _id: resource._id,
                title: resource.title,
                description: resource.description,
                type: 'resource',
                author: resource.author,
                category: resource.category,
                duration: resource.duration,
              }}
              onPostCreated={() => { setShowShareComposer(false); toast.success('Post created!') }}
              onClose={() => setShowShareComposer(false)}
            />
          )}
        </>
      }
    >
      {/* The reader comes first: on a file resource it is the whole point of the page. */}
      {isFileResource && (
        isAuthenticated ? (
          <ResourceViewer
            resourceId={id}
            fileType={resource.fileType ?? null}
            initialPageCount={resource.pageCount ?? null}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card py-12 text-center">
            <p className="mb-4 text-sm text-muted-foreground">Sign in to read this resource.</p>
            <Button asChild className="rounded-full">
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/resources/${id}`)}`}>
                Sign in to read
              </Link>
            </Button>
          </div>
        )
      )}

      {personalised && <WhyCard reasons={reasons} match={match} />}

      {resource.tags?.length > 0 && <TagRow tags={resource.tags} />}

      {resource.description && (
        <DetailSection label="About">
          <DetailProse>{resource.description}</DetailProse>
        </DetailSection>
      )}

      {(resource.category || resource.duration || resource.fileType) && (
        <DetailSection label="Details">
          <FactList>
            {resource.category && (
              <Fact icon={RiBookLine} label="Type" iconClassName={ACCENT_ICON}>
                <span className="capitalize">{resource.category}</span>
              </Fact>
            )}
            {resource.duration && (
              <Fact icon={RiTimeLine} label="Duration" iconClassName={ACCENT_ICON}>
                {resource.duration}
              </Fact>
            )}
            {resource.fileType && (
              <Fact icon={RiFileLine} label="Format" iconClassName={ACCENT_ICON}>
                <span className="uppercase">{resource.fileType}</span>
              </Fact>
            )}
          </FactList>
        </DetailSection>
      )}

      {resource.metrics &&
        (resource.metrics.viewCount != null ||
          resource.metrics.likeCount != null ||
          resource.metrics.saveCount != null) && (
          <DetailSection label="Stats">
            <FactList>
              {resource.metrics.viewCount != null && (
                <Fact icon={RiEyeLine} label="Views" iconClassName={ACCENT_ICON}>
                  {resource.metrics.viewCount}
                </Fact>
              )}
              {resource.metrics.saveCount != null && (
                <Fact icon={RiBookLine} label="Saves" iconClassName={ACCENT_ICON}>
                  {resource.metrics.saveCount}
                </Fact>
              )}
            </FactList>
          </DetailSection>
        )}

      {/* Phones get the download inline; desktop keeps it in the rail. */}
      {downloadButton && <div className="lg:hidden">{downloadButton}</div>}

      {/* Phones read the related list inline; desktop gets it in the rail. */}
      <SimilarList
        items={similarRows}
        basePath="/resources"
        label="More like this"
        className="lg:hidden"
      />

      {id && (
        <div className="border-t border-border/60 pt-4">
          <EngagementActions
            type="resources"
            id={id}
            likeCount={resource.metrics?.likeCount ?? 0}
            onPostClick={() => setShowShareComposer(true)}
          />
        </div>
      )}
    </ContentDetailShell>
  )
}

export default function ResourcePage({ params }: ResourcePageProps) {
  return <ResourcePageContent params={params} />
}
