"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiBookLine,
  RiCalendarLine,
  RiDownloadLine,
  RiEyeLine,
  RiTimeLine,
  RiFileLine,
  RiVideoLine,
  RiHeadphoneLine,
  RiVipCrownLine,
  RiLockLine,
  RiStarLine,
} from 'react-icons/ri'
import EngagementActions from '@/components/engagement-actions'
import ContentShareComposer from '@/components/content-share-composer'
import ContentDetailSkeleton from '@/components/skeletons/content-detail-skeleton'
import ErrorState from '@/components/error-state'
import AuthGuard from '@/components/auth-guard'
import { cleanUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { canViewPremiumResource } from '@/lib/roles'
import { toast } from 'sonner'
import { trackContentView } from '@/lib/tracking'
import ApiClient from '@/lib/api-client'

type ResourcePageProps = { params: Promise<{ id: string }> }

function getResourceTypeIcon(type: string) {
  switch (type) {
    case 'video': return <RiVideoLine className="w-4 h-4" />
    case 'audio': return <RiHeadphoneLine className="w-4 h-4" />
    case 'document': return <RiFileLine className="w-4 h-4" />
    default: return <RiBookLine className="w-4 h-4" />
  }
}

// Paywall shown in place of premium resource content for users without access.
// Mirrors the Premium Playlist gate (gold accent, crown + lock, upgrade CTA).
function PremiumResourcePaywall({ title, description, resourceId, isAuthenticated }: { title: string; description?: string; resourceId: string; isAuthenticated: boolean }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.07] to-transparent p-6 text-center sm:p-10">
      <div className="mx-auto mb-5 relative w-20 h-20">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/30 via-amber-600/15 to-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-xl shadow-amber-500/10">
          <RiVipCrownLine className="w-10 h-10 text-amber-400" />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-md ring-2 ring-page">
          <RiLockLine className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <div className="flex justify-center mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <RiStarLine className="h-3 w-3" /> Premium Resource
        </span>
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      {description && <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground line-clamp-3">{description}</p>}
      <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
        This resource is available to premium members. Upgrade to unlock the full content.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {isAuthenticated ? (
          <Button asChild size="lg" className="h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 shadow-lg shadow-amber-500/20">
            <Link href="/premium" className="flex items-center justify-center gap-2">
              <RiVipCrownLine className="h-4 w-4" /> Become a premium member
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" className="h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 shadow-lg shadow-amber-500/20">
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/resources/${resourceId}`)}`} className="flex items-center justify-center gap-2">
              Sign in to continue
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

function ResourcePageContent({ params }: ResourcePageProps) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [resource, setResource] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)
  const promotionClickSent = useRef(false)

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
      if (isAuthenticated) trackContentView('resource', id)
    } catch { setError(true) } finally { setLoading(false) }
  }, [id, isAuthenticated])

  useEffect(() => { if (id) getResource() }, [id, getResource])

  useEffect(() => {
    if (!isAuthenticated || !id || !resource || promotionClickSent.current) return
    promotionClickSent.current = true
    ApiClient.recordPromotionClick(id, 'resource', 'view').catch(() => {})
  }, [isAuthenticated, id, resource])

  if (loading) return <ContentDetailSkeleton />
  if (error || !resource) {
    return (
      <div className="min-h-screen bg-page pb-20">
        <ErrorState isNetworkError onRetry={getResource} />
      </div>
    )
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // Uploaded (file) resources are viewed in-platform; legacy link resources keep external links.
  const isFileResource = resource.resourceType === 'file' || resource.hasFile === true

  // Premium gating (frontend mirror of the backend source of truth).
  const canAccessPremium = canViewPremiumResource(user?.isPremium, user?.role)
  const isPremiumLocked = resource.isPremium === true && !canAccessPremium

  const metaParts = [`Published ${formatDate(resource.createdAt)}`]
  if (resource.metrics?.viewCount != null) metaParts.push(`${resource.metrics.viewCount} views`)
  if (resource.duration) metaParts.push(resource.duration)
  const metaLine = metaParts.join(' · ')

  return (
    <div className="min-h-screen bg-page pb-28">
      <header className="sticky top-0 z-30 bg-page/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] lg:max-w-4xl xl:max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <RiArrowLeftLine className="h-5 w-5" />
          </button>
          <span className="text-[15px] font-semibold text-foreground">Resource</span>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-[600px] lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 lg:px-6 xl:px-8 border-x border-border min-h-screen xl:grid xl:grid-cols-[1fr_320px] xl:gap-12 2xl:gap-16">
        <div className="min-w-0">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white",
            resource.isPremium
              ? "bg-gradient-to-br from-amber-400 to-amber-600"
              : "bg-gradient-to-br from-violet-500 to-purple-600"
          )}>
            {getResourceTypeIcon(resource.category || 'resource')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground truncate">{resource.author || 'Author'}</span>
              {resource.isPremium && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-600 dark:text-yellow-400">
                  <RiVipCrownLine className="w-3.5 h-3.5" /> Premium
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground capitalize">{resource.category || 'Resource'}</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <h1 className="text-xl font-bold text-foreground leading-snug break-words">{resource.title}</h1>
          <p className="text-[13px] text-muted-foreground mt-2">{metaLine}</p>
          {resource.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {resource.tags.map((tag: string, i: number) => (
                <span key={i} className="text-[12px] text-violet-600 dark:text-violet-400 font-medium">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 flex items-center gap-1 border-y border-border">
          {id && (
            <EngagementActions
              type="resources"
              id={id}
              className="flex-shrink-0"
              likeCount={resource.metrics?.likeCount ?? 0}
              onPostClick={() => setShowShareComposer(true)}
            />
          )}
        </div>

        <div className="px-4 py-5 space-y-6 text-[15px]">
          {/* Premium gate: never render the viewer or load content for locked users. */}
          {isPremiumLocked ? (
            <PremiumResourcePaywall
              title={resource.title}
              description={resource.description}
              resourceId={id}
              isAuthenticated={isAuthenticated}
            />
          ) : isFileResource ? (
            isAuthenticated ? (
              <ResourceViewer resourceId={id} fileType={resource.fileType ?? null} initialPageCount={resource.pageCount ?? null} />
            ) : (
              <div className="rounded-2xl border border-border bg-card py-12 text-center">
                <p className="text-sm text-muted-foreground mb-4">Sign in to view this resource.</p>
                <Button asChild className="bg-violet-500 hover:bg-violet-600 text-white rounded-full">
                  <Link href={`/login?callbackUrl=${encodeURIComponent(`/resources/${id}`)}`}>Sign in to view</Link>
                </Button>
              </div>
            )
          ) : null}

          {resource.description && <p className="text-foreground leading-relaxed whitespace-pre-wrap">{resource.description}</p>}

          {resource.category && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Type</p>
              <p className="text-muted-foreground text-sm capitalize">{resource.category} resource</p>
            </div>
          )}

          {resource.duration && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Duration</p>
              <p className="text-muted-foreground text-sm flex items-center gap-2"><RiTimeLine className="w-4 h-4 text-violet-500" /> {resource.duration}</p>
            </div>
          )}

          {resource.metrics && (resource.metrics.viewCount != null || resource.metrics.likeCount != null || resource.metrics.saveCount != null) && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stats</p>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                {resource.metrics.viewCount != null && <span><RiEyeLine className="w-4 h-4 text-violet-500 inline mr-1" />{resource.metrics.viewCount} views</span>}
                {resource.metrics.likeCount != null && <span> · {resource.metrics.likeCount} likes</span>}
                {resource.metrics.saveCount != null && <span> · {resource.metrics.saveCount} saves</span>}
              </p>
            </div>
          )}
        </div>
        </div>

        <div className="xl:hidden sticky bottom-0 left-0 right-0 p-4 bg-page/95 backdrop-blur-md border-t border-border space-y-2">
          {!isAuthenticated ? (
            <Button asChild size="lg" className="w-full bg-violet-500 hover:bg-violet-600 text-white rounded-full h-12 font-semibold text-[15px]">
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/resources/${id}`)}`} className="flex items-center justify-center gap-2">
                Sign in to view
                <RiExternalLinkLine className="w-4 h-4" />
              </Link>
            </Button>
          ) : resource.isPremium && resource.paymentLink ? (
            <Button asChild size="lg" className="w-full bg-yellow-500 hover:bg-yellow-600 text-foreground rounded-full h-12 font-semibold text-[15px]">
              <a href={cleanUrl(resource.paymentLink)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                <RiVipCrownLine className="w-4 h-4" /> Purchase premium
              </a>
            </Button>
          ) : resource.paymentLink ? (
            <Button asChild size="lg" className="w-full bg-violet-500 hover:bg-violet-600 text-white rounded-full h-12 font-semibold text-[15px]">
              <a href={cleanUrl(resource.paymentLink)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                Access resource
                <RiExternalLinkLine className="w-4 h-4" />
              </a>
            </Button>
          ) : null}
          {isAuthenticated && !isFileResource && resource.fileUrl && !resource.isPremium && (
            <Button asChild variant="outline" size="lg" className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-12 text-[15px]">
              <a href={resource.paymentLink} download className="flex items-center justify-center gap-2">
                <RiDownloadLine className="w-4 h-4" /> Download
              </a>
            </Button>
          )}
        </div>
        <aside className="hidden xl:block pt-4">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            {!isAuthenticated ? (
              <Button asChild size="lg" className="w-full bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-12 font-semibold text-[15px] shadow-sm">
                <Link href={`/login?callbackUrl=${encodeURIComponent(`/resources/${id}`)}`} className="flex items-center justify-center gap-2">
                  Sign in to view
                  <RiExternalLinkLine className="w-4 h-4" />
                </Link>
              </Button>
            ) : resource.isPremium && resource.paymentLink ? (
              <Button asChild size="lg" className="w-full bg-yellow-500 hover:bg-yellow-600 text-foreground rounded-xl h-12 font-semibold">
                <a href={cleanUrl(resource.paymentLink)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  <RiVipCrownLine className="w-4 h-4" /> Purchase premium
                </a>
              </Button>
            ) : !isFileResource && resource.fileUrl ? (
              <Button asChild size="lg" className="w-full bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-12 font-semibold">
                <a href={cleanUrl(resource.paymentLink)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  Access resource
                  <RiExternalLinkLine className="w-4 h-4" />
                </a>
              </Button>
            ) : null}
            {isAuthenticated && !isFileResource && resource.fileUrl && !resource.isPremium && (
              <Button asChild variant="outline" size="lg" className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-12">
                <a href={resource.paymentLink} download className="flex items-center justify-center gap-2">
                  <RiDownloadLine className="w-4 h-4" /> Download
                </a>
              </Button>
            )}
          </div>
        </aside>
      </main>

      {showShareComposer && resource && (
        <ContentShareComposer
          content={{ _id: resource._id, title: resource.title, description: resource.description, type: 'resource', author: resource.author, category: resource.category, duration: resource.duration, isPremium: resource.isPremium }}
          onPostCreated={() => { setShowShareComposer(false); toast.success('Post created!') }}
          onClose={() => setShowShareComposer(false)}
        />
      )}
    </div>
  )
}

export default function ResourcePage({ params }: ResourcePageProps) {
  return <ResourcePageContent params={params} />
}
