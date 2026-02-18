"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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

type ResourcePageProps = { params: Promise<{ id: string }> }

function getResourceTypeIcon(type: string) {
  switch (type) {
    case 'video': return <RiVideoLine className="w-4 h-4" />
    case 'audio': return <RiHeadphoneLine className="w-4 h-4" />
    case 'document': return <RiFileLine className="w-4 h-4" />
    default: return <RiBookLine className="w-4 h-4" />
  }
}

function ResourcePageContent({ params }: ResourcePageProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [resource, setResource] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)

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
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-white">
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
          {resource.isPremium && resource.paymentLink ? (
            <Button asChild size="lg" className="w-full bg-yellow-500 hover:bg-yellow-600 text-foreground rounded-full h-12 font-semibold text-[15px]">
              <a href={cleanUrl(resource.paymentLink)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                <RiVipCrownLine className="w-4 h-4" /> Purchase premium
              </a>
            </Button>
          ) : resource.fileUrl ? (
            <Button asChild size="lg" className="w-full bg-violet-500 hover:bg-violet-600 text-white rounded-full h-12 font-semibold text-[15px]">
              <a href={cleanUrl(resource.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                Access resource
                <RiExternalLinkLine className="w-4 h-4" />
              </a>
            </Button>
          ) : null}
          {resource.fileUrl && !resource.isPremium && (
            <Button asChild variant="outline" size="lg" className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-12 text-[15px]">
              <a href={resource.fileUrl} download className="flex items-center justify-center gap-2">
                <RiDownloadLine className="w-4 h-4" /> Download
              </a>
            </Button>
          )}
        </div>
        <aside className="hidden xl:block pt-4">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            {resource.isPremium && resource.paymentLink ? (
              <Button asChild size="lg" className="w-full bg-yellow-500 hover:bg-yellow-600 text-foreground rounded-xl h-12 font-semibold">
                <a href={cleanUrl(resource.paymentLink)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  <RiVipCrownLine className="w-4 h-4" /> Purchase premium
                </a>
              </Button>
            ) : resource.fileUrl ? (
              <Button asChild size="lg" className="w-full bg-violet-500 hover:bg-violet-600 text-white rounded-xl h-12 font-semibold">
                <a href={cleanUrl(resource.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  Access resource
                  <RiExternalLinkLine className="w-4 h-4" />
                </a>
              </Button>
            ) : null}
            {resource.fileUrl && !resource.isPremium && (
              <Button asChild variant="outline" size="lg" className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-12">
                <a href={resource.fileUrl} download className="flex items-center justify-center gap-2">
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
  return <AuthGuard><ResourcePageContent params={params} /></AuthGuard>
}
