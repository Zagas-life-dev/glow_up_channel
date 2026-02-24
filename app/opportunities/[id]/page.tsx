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
  RiFocus3Line,
  RiTimeLine,
  RiMoneyDollarCircleLine,
  RiBookLine,
  RiBriefcaseLine,
  RiCheckboxCircleLine,
  RiGroupLine,
  RiFileLine,
} from 'react-icons/ri'
import { toast } from 'sonner'
import EngagementActions from '@/components/engagement-actions'
import ContentShareComposer from '@/components/content-share-composer'
import ContentDetailSkeleton from '@/components/skeletons/content-detail-skeleton'
import ErrorState from '@/components/error-state'
import AuthGuard from '@/components/auth-guard'
import { cleanUrl } from '@/lib/url-utils'
import { useAuth } from '@/lib/auth-context'
import { trackContentView } from '@/lib/tracking'
import ApiClient from '@/lib/api-client'

type OpportunityPageProps = { params: Promise<{ id: string }> }

function OpportunityPageContent({ params }: OpportunityPageProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [opportunity, setOpportunity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)
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
    ApiClient.recordPromotionClick(id, 'opportunity').catch(() => {})
  }, [isAuthenticated, id, opportunity])

  if (loading) return <ContentDetailSkeleton />
  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-page pb-20">
        <ErrorState isNetworkError onRetry={getOpportunity} />
      </div>
    )
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const getLocationString = () => {
    if (!opportunity.location) return 'Location TBD'
    if (opportunity.location.isRemote) return 'Remote'
    const parts = [opportunity.location.city, opportunity.location.country].filter(Boolean)
    return parts.join(', ') || 'Location TBD'
  }

  const metaParts = []
  if (opportunity.dates?.applicationDeadline) metaParts.push(`Due ${formatDate(opportunity.dates.applicationDeadline)}`)
  if (opportunity.location) metaParts.push(getLocationString())
  if (opportunity.financial?.isPaid) metaParts.push(opportunity.financial.amount ? `${opportunity.financial.currency || 'NGN'} ${opportunity.financial.amount}` : 'Paid')
  const metaLine = metaParts.join(' · ')

  return (
    <div className="min-h-screen bg-page pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-page/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 lg:px-6 xl:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RiArrowLeftLine className="h-5 w-5" />
          </button>
          <span className="text-[15px] font-semibold text-foreground">Opportunity</span>
          <div className="w-9" />
        </div>
      </header>

      {/* Content: narrow on mobile, wider + optional sidebar on xl */}
      <main className="max-w-[600px] lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 lg:px-6 xl:px-8 border-x border-border min-h-screen xl:grid xl:grid-cols-[1fr_320px] xl:gap-12 2xl:gap-16">
        <div className="min-w-0">
        {/* Author row – Instagram/Twitter */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <RiFocus3Line className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground truncate">
                {opportunity.organization || opportunity.provider || 'Organization'}
              </span>
              {opportunity.promotion?.packageType === 'spotlight' && (
                <Badge className="bg-primary/20 text-primary border-0 text-[10px] px-1.5 py-0">Spotlight</Badge>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground">Opportunity</p>
          </div>
        </div>

        {/* Title + meta – like tweet body */}
        <div className="px-4 pb-4">
          <h1 className="text-xl font-bold text-foreground leading-snug break-words">
            {opportunity.title}
          </h1>
          {metaLine && (
            <p className="text-[13px] text-muted-foreground mt-2">
              {metaLine}
            </p>
          )}
          {opportunity.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {opportunity.tags.map((tag: string, i: number) => (
                <span key={i} className="text-[12px] text-primary font-medium">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Engagement bar – Instagram/Twitter/Threads */}
        <div className="px-4 py-3 flex items-center gap-1 border-y border-border">
          {id && (
            <EngagementActions
              type="opportunities"
              id={id}
              className="flex-shrink-0"
              likeCount={opportunity.metrics?.likeCount ?? 0}
              onPostClick={() => setShowShareComposer(true)}
            />
          )}
        </div>

        {/* Body – plain sections, no heavy cards */}
        <div className="px-4 py-5 space-y-6 text-[15px]">
          {opportunity.description && (
            <div>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{opportunity.description}</p>
            </div>
          )}

          {opportunity.requirements && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requirements</p>
              <ul className="space-y-2 text-muted-foreground">
                {opportunity.requirements.educationLevel && (
                  <li className="flex gap-2"><RiBookLine className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-foreground">Education:</strong> {opportunity.requirements.educationLevel}</span></li>
                )}
                {opportunity.requirements.careerStage && (
                  <li className="flex gap-2"><RiBriefcaseLine className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-foreground">Career:</strong> {opportunity.requirements.careerStage}</span></li>
                )}
                {opportunity.requirements.skills?.length > 0 && (
                  <li className="flex gap-2"><RiCheckboxCircleLine className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-foreground">Skills:</strong> {opportunity.requirements.skills.join(', ')}</span></li>
                )}
                {opportunity.requirements.experience && (
                  <li className="flex gap-2"><RiBriefcaseLine className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-foreground">Experience:</strong> {opportunity.requirements.experience}</span></li>
                )}
                {opportunity.requirements.ageRange && (
                  <li className="flex gap-2"><RiGroupLine className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-foreground">Age:</strong> {opportunity.requirements.ageRange}</span></li>
                )}
                {opportunity.requirements.citizenship && (
                  <li className="flex gap-2"><RiMapPinLine className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span><strong className="text-foreground">Citizenship:</strong> {opportunity.requirements.citizenship}</span></li>
                )}
                {opportunity.requirements.other && (
                  <li className="pt-2 border-t border-border"><span className="font-medium text-foreground/90">Other</span><p className="text-muted-foreground mt-1 whitespace-pre-wrap">{opportunity.requirements.other}</p></li>
                )}
              </ul>
            </div>
          )}

          {opportunity.financial && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Financial</p>
              <p className="text-muted-foreground">Paid: {opportunity.financial.isPaid ? 'Yes' : 'No'}{opportunity.financial.amount && ` · ${opportunity.financial.currency || 'NGN'} ${opportunity.financial.amount}`}</p>
              {opportunity.financial.benefits?.length > 0 && (
                <ul className="list-disc list-inside mt-1.5 text-muted-foreground text-sm space-y-0.5">
                  {opportunity.financial.benefits.map((b: string, i: number) => <li key={i}>{b}</li>)}
                </ul>
              )}
            </div>
          )}

          {opportunity.dates && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Important dates</p>
              <ul className="text-muted-foreground text-sm space-y-1">
                {opportunity.dates.applicationDeadline && <li className="flex items-center gap-2"><RiTimeLine className="w-4 h-4 text-primary" /> Deadline: {formatDate(opportunity.dates.applicationDeadline)}</li>}
                {opportunity.dates.startDate && <li className="flex items-center gap-2"><RiCalendarLine className="w-4 h-4 text-primary" /> Start: {formatDate(opportunity.dates.startDate)}</li>}
                {opportunity.dates.endDate && <li className="flex items-center gap-2"><RiCalendarLine className="w-4 h-4 text-primary" /> End: {formatDate(opportunity.dates.endDate)}</li>}
                {opportunity.dates.duration && <li className="flex items-center gap-2"><RiTimeLine className="w-4 h-4 text-primary" /> Duration: {opportunity.dates.duration}</li>}
              </ul>
            </div>
          )}

          {opportunity.location && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location</p>
              <p className="text-muted-foreground">
                {opportunity.location.isRemote ? 'Remote' : [opportunity.location.city, opportunity.location.country].filter(Boolean).join(', ') || '—'}
                {opportunity.location.address && <span className="block mt-1">{opportunity.location.address}</span>}
              </p>
            </div>
          )}
        </div>
        </div>

        {/* CTA: sticky bottom on mobile/tablet, sticky sidebar on xl */}
        {opportunity.url && (
          <>
            <div className="xl:hidden sticky bottom-0 left-0 right-0 p-4 bg-page/95 backdrop-blur-md border-t border-border">
              <Button
                asChild
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-12 font-semibold text-[15px]"
              >
                <a href={cleanUrl(opportunity.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                  Apply now
                  <RiExternalLinkLine className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <aside className="hidden xl:block pt-4">
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 font-semibold"
                >
                  <a href={cleanUrl(opportunity.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                    Apply now
                    <RiExternalLinkLine className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </aside>
          </>
        )}
      </main>

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
  return <AuthGuard><OpportunityPageContent params={params} /></AuthGuard>
}
