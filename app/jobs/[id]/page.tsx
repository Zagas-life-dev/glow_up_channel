"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiMapPinLine,
  RiMoneyDollarCircleLine,
  RiTimeLine,
  RiBriefcaseLine,
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

type JobPageProps = { params: Promise<{ id: string }> }

function JobPageContent({ params }: JobPageProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)
  const promotionClickSent = useRef(false)

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

  if (loading) return <ContentDetailSkeleton />
  if (error || !job) {
    return (
      <div className="min-h-screen bg-page pb-20">
        <ErrorState isNetworkError onRetry={getJob} />
      </div>
    )
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const getLocationString = () => {
    if (!job.location) return 'Location TBD'
    if (typeof job.location === 'string') return job.location
    if (job.location.isRemote) return 'Remote'
    const parts = [job.location.city, job.location.country].filter(Boolean)
    return parts.join(', ') || 'Location TBD'
  }

  const metaParts = []
  if (job.location) metaParts.push(getLocationString())
  if (job.pay?.amount) metaParts.push(`${job.pay.amount} ${job.pay.currency}${job.pay.period ? `/${job.pay.period}` : ''}`)
  if (job.dates?.applicationDeadline) metaParts.push(`Apply by ${formatDate(job.dates.applicationDeadline)}`)
  const metaLine = metaParts.join(' · ')

  return (
    <div className="min-h-screen bg-page pb-28">
      <header className="sticky top-0 z-30 bg-page/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] lg:max-w-4xl xl:max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <RiArrowLeftLine className="h-5 w-5" />
          </button>
          <span className="text-[15px] font-semibold text-foreground">Job</span>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-[600px] lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 lg:px-6 xl:px-8 border-x border-border min-h-screen xl:grid xl:grid-cols-[1fr_320px] xl:gap-12 2xl:gap-16">
        <div className="min-w-0">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <RiBriefcaseLine className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground truncate">{job.company || 'Company'}</span>
              {job.jobType && <Badge className="bg-primary/20 text-primary border-0 text-[10px] px-1.5 py-0 capitalize">{job.jobType}</Badge>}
            </div>
            <p className="text-[13px] text-muted-foreground">Job opening</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <h1 className="text-xl font-bold text-foreground leading-snug break-words">{job.title}</h1>
          <p className="text-[13px] text-muted-foreground mt-2">{metaLine}</p>
          {job.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.tags.map((tag: string, i: number) => (
                <span key={i} className="text-[12px] text-primary font-medium">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 flex items-center gap-1 border-y border-border">
          {id && (
            <EngagementActions
              type="jobs"
              id={id}
              className="flex-shrink-0"
              likeCount={job.metrics?.likeCount ?? 0}
              onPostClick={() => setShowShareComposer(true)}
            />
          )}
        </div>

        <div className="px-4 py-5 space-y-6 text-[15px]">
          {job.description && <p className="text-foreground leading-relaxed whitespace-pre-wrap">{job.description}</p>}

          {job.requirements?.length > 0 && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requirements</p>
              <ul className="text-muted-foreground text-sm pl-6 list-disc space-y-1">
                {job.requirements.map((req: string, i: number) => <li key={i}>{req}</li>)}
              </ul>
            </div>
          )}

          {job.benefits?.length > 0 && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Benefits</p>
              <ul className="text-muted-foreground text-sm pl-6 list-disc space-y-1">
                {job.benefits.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          )}

          {job.location && typeof job.location === 'object' && !job.location.isRemote && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location</p>
              <p className="text-muted-foreground text-sm">{job.location.city && `${job.location.city}, `}{job.location.country}{job.location.address && ` · ${job.location.address}`}</p>
            </div>
          )}

          {job.dates?.applicationDeadline && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deadline</p>
              <p className="text-muted-foreground text-sm flex items-center gap-2"><RiTimeLine className="w-4 h-4 text-primary" /> {formatDate(job.dates.applicationDeadline)}</p>
            </div>
          )}

          {job.pay?.amount && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Compensation</p>
              <p className="text-muted-foreground text-sm flex items-center gap-2"><RiMoneyDollarCircleLine className="w-4 h-4 text-primary" /> {job.pay.currency || 'NGN'} {job.pay.amount}{job.pay.period && <span> per {job.pay.period}</span>}</p>
            </div>
          )}
        </div>
        </div>

        {job.url && (
          <>
            <div className="xl:hidden sticky bottom-0 left-0 right-0 p-4 bg-page/95 backdrop-blur-md border-t border-border">
              {!isAuthenticated ? (
                <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-12 font-semibold text-[15px]">
                  <Link href={`/login?callbackUrl=${encodeURIComponent(`/jobs/${id}`)}`} className="flex items-center justify-center gap-2">
                    Sign in to apply
                    <RiExternalLinkLine className="w-4 h-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-12 font-semibold text-[15px]">
                  <a href={cleanUrl(job.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2" onClick={() => { ApiClient.recordPromotionClick(id, 'job', 'apply').catch(() => {}); ApiClient.recordApply('job', id).catch(() => {}); }}>
                    Apply
                    <RiExternalLinkLine className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
            <aside className="hidden xl:block pt-4">
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
                {!isAuthenticated ? (
                  <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 font-semibold">
                    <Link href={`/login?callbackUrl=${encodeURIComponent(`/jobs/${id}`)}`} className="flex items-center justify-center gap-2">
                      Sign in to apply
                      <RiExternalLinkLine className="w-4 h-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 font-semibold">
                    <a href={cleanUrl(job.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2" onClick={() => { ApiClient.recordPromotionClick(id, 'job', 'apply').catch(() => {}); ApiClient.recordApply('job', id).catch(() => {}); }}>
                      Apply
                      <RiExternalLinkLine className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </aside>
          </>
        )}
      </main>

      {showShareComposer && job && (
        <ContentShareComposer
          content={{ _id: job._id, title: job.title, description: job.description, type: 'job', company: job.company, location: job.location, dates: job.dates, pay: job.pay }}
          onPostCreated={() => { setShowShareComposer(false); toast.success('Post created!') }}
          onClose={() => setShowShareComposer(false)}
        />
      )}
    </div>
  )
}

export default function JobPage({ params }: JobPageProps) {
  return <JobPageContent params={params} />
}
