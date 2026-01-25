"use client"

import { useState, useEffect } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ExternalLink, 
  Building, 
  MapPin, 
  DollarSign, 
  Clock, 
  Briefcase,
  CheckCircle2,
  FileText,
  Loader2,
  Share2
} from 'lucide-react'
import EngagementActions from '@/components/engagement-actions'
import ContentShareComposer from '@/components/content-share-composer'
import ContentDetailSkeleton from '@/components/skeletons/content-detail-skeleton'
import AuthGuard from '@/components/auth-guard'
import { cleanUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import ApiClient from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { trackContentView } from '@/lib/tracking'

type JobPageProps = {
  params: Promise<{
    id: string
  }>
}

function JobPageContent({ params }: JobPageProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      setId(resolvedParams.id)
    }
    loadParams()
  }, [params])

  useEffect(() => {
    if (!id) return

    const getJob = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/jobs/${id}`, {
          cache: 'no-store'
        })
        
        if (!response.ok) {
          notFound()
        }
        
        const result = await response.json()
        
        if (!result.success) {
          notFound()
        }
        
        setJob(result.data.job)
        
        // Track content view for active user activity (fire-and-forget, won't throw errors)
        if (isAuthenticated) {
          trackContentView('job', id)
        }
      } catch (error) {
        console.error('Error fetching job:', error)
        notFound()
      } finally {
        setLoading(false)
      }
    }

    getJob()
  }, [id])

  // Show skeleton immediately while loading
  if (loading) {
    return <ContentDetailSkeleton />
  }

  if (!job) {
    notFound()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getLocationString = () => {
    if (!job.location) return 'Location TBD'
    if (typeof job.location === 'string') return job.location
    if (job.location.isRemote) return 'Remote'
    const parts = [job.location.city, job.location.country].filter(Boolean)
    return parts.join(', ') || 'Location TBD'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/[0.05] rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white/60" />
            </button>
            <h1 className="text-lg font-semibold text-white">Job</h1>
            <div className="w-9" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Main Card */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-white truncate">{job.company || 'Company'}</h2>
                  {job.jobType && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5 capitalize">
                      {job.jobType}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-white/50">Job Opening</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title */}
            <h3 className="text-2xl font-bold text-white leading-tight">
              {job.title}
            </h3>

            {/* Meta Info Row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
              {job.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{getLocationString()}</span>
                </div>
              )}
              {job.pay?.amount && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>{job.pay.amount} {job.pay.currency} {job.pay.period && `per ${job.pay.period}`}</span>
                </div>
              )}
              {job.dates?.applicationDeadline && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Apply by {formatDate(job.dates.applicationDeadline)}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag: string, index: number) => (
                  <Badge 
                    key={index} 
                    variant="outline"
                    className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs px-2 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </h4>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Requirements
                </h4>
                <ul className="space-y-1.5 text-sm text-white/70 pl-6 list-disc">
                  {job.requirements.map((requirement: string, index: number) => (
                    <li key={index}>{requirement}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Benefits
                </h4>
                <ul className="space-y-1.5 text-sm text-white/70 pl-6 list-disc">
                  {job.benefits.map((benefit: string, index: number) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Location Details */}
            {job.location && typeof job.location === 'object' && !job.location.isRemote && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location Details
                </h4>
                <div className="space-y-1.5 text-sm text-white/70 pl-6">
                  {job.location.city && (
                    <div>City: {job.location.city}</div>
                  )}
                  {job.location.country && (
                    <div>Country: {job.location.country}</div>
                  )}
                  {job.location.address && (
                    <div className="mt-2 pt-2 border-t border-white/[0.06]">
                      <span className="font-medium text-white/90">Address: </span>
                      <span>{job.location.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dates */}
            {job.dates && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Important Dates
                </h4>
                <div className="space-y-1.5 text-sm text-white/70 pl-6">
                  {job.dates.applicationDeadline && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/40" />
                      <div>
                        <span className="font-medium text-white/90">Application Deadline: </span>
                        <span>{formatDate(job.dates.applicationDeadline)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pay */}
            {job.pay && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Compensation
                </h4>
                <div className="space-y-1.5 text-sm text-white/70 pl-6">
                  {job.pay.amount && (
                    <div>
                      <span className="font-medium text-white/90">Amount: </span>
                      <span>{job.pay.currency || 'NGN'} {job.pay.amount}</span>
                      {job.pay.period && (
                        <span className="text-white/50"> per {job.pay.period}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                {id && (
                  <EngagementActions 
                    type="jobs" 
                    id={id} 
                    externalUrl={job.url}
                    className="flex-shrink-0"
                  />
                )}
                {isAuthenticated && (
                  <Button
                    onClick={() => setShowShareComposer(true)}
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-white/70 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Post About This
                  </Button>
                )}
              </div>
              {job.url && (
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                >
                  <a href={cleanUrl(job.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                    Apply
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Share Composer */}
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
            pay: job.pay
          }}
          onPostCreated={() => {
            setShowShareComposer(false)
            toast.success('Post created!')
          }}
          onClose={() => setShowShareComposer(false)}
        />
      )}
    </div>
  )
}

export default function JobPage({ params }: JobPageProps) {
  return (
    <AuthGuard>
      <JobPageContent params={params} />
    </AuthGuard>
  )
}
