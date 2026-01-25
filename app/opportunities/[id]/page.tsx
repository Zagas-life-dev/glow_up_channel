"use client"

import { useState, useEffect } from 'react'
import { notFound, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  Target, 
  Clock, 
  Heart,
  Bookmark,
  Share2,
  Building,
  DollarSign,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Loader2,
  Users,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'
import EngagementActions from '@/components/engagement-actions'
import ContentShareComposer from '@/components/content-share-composer'
import ContentDetailSkeleton from '@/components/skeletons/content-detail-skeleton'
import AuthGuard from '@/components/auth-guard'
import { cleanUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import ApiClient from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { trackContentView } from '@/lib/tracking'

type OpportunityPageProps = {
  params: Promise<{
    id: string
  }>
}

function OpportunityPageContent({ params }: OpportunityPageProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [opportunity, setOpportunity] = useState<any>(null)
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

    const getOpportunity = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/${id}`, {
          cache: 'no-store'
        })
        
        if (!response.ok) {
          notFound()
        }
        
        const result = await response.json()
        
        if (!result.success) {
          notFound()
        }
        
        setOpportunity(result.data.opportunity)
        
        // Track content view for active user activity (fire-and-forget, won't throw errors)
        if (isAuthenticated) {
          trackContentView('opportunity', id)
        }
      } catch (error) {
        console.error('Error fetching opportunity:', error)
        notFound()
      } finally {
        setLoading(false)
      }
    }

    getOpportunity()
  }, [id])

  // Show skeleton immediately while loading
  if (loading) {
    return <ContentDetailSkeleton />
  }

  if (!opportunity) {
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
    if (!opportunity.location) return 'Location TBD'
    if (opportunity.location.isRemote) return 'Remote'
    const parts = [opportunity.location.city, opportunity.location.country].filter(Boolean)
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
            <h1 className="text-lg font-semibold text-white">Opportunity</h1>
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-white truncate">{opportunity.organization || opportunity.provider || 'Organization'}</h2>
                  {opportunity.promotion?.packageType === 'spotlight' && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs px-2 py-0.5">
                      SPOTLIGHT
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-white/50">Opportunity</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title */}
            <h3 className="text-2xl font-bold text-white leading-tight">
              {opportunity.title}
            </h3>

            {/* Meta Info Row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
              {opportunity.dates?.applicationDeadline && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Due {formatDate(opportunity.dates.applicationDeadline)}</span>
                </div>
              )}
              {opportunity.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{getLocationString()}</span>
                </div>
              )}
              {opportunity.financial?.isPaid && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>{opportunity.financial.amount ? `${opportunity.financial.currency || 'NGN'} ${opportunity.financial.amount}` : 'Paid'}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {opportunity.tags && opportunity.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {opportunity.tags.map((tag: string, index: number) => (
                  <Badge 
                    key={index} 
                    variant="outline"
                    className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs px-2 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {opportunity.description && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </h4>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {opportunity.description}
                </p>
              </div>
            )}

            {/* Requirements */}
            {opportunity.requirements && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Requirements
                </h4>
                <div className="space-y-3 text-sm text-white/70 pl-6">
                  {opportunity.requirements.educationLevel && (
                    <div className="flex items-start gap-2">
                      <GraduationCap className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-white/90">Education Level: </span>
                        <span>{opportunity.requirements.educationLevel}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.requirements.careerStage && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-white/90">Career Stage: </span>
                        <span>{opportunity.requirements.careerStage}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.requirements.skills && opportunity.requirements.skills.length > 0 && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-white/90">Skills: </span>
                        <span>{opportunity.requirements.skills.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.requirements.experience && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-white/90">Experience: </span>
                        <span>{opportunity.requirements.experience}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.requirements.ageRange && (
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-white/90">Age Range: </span>
                        <span>{opportunity.requirements.ageRange}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.requirements.citizenship && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-white/90">Citizenship: </span>
                        <span>{opportunity.requirements.citizenship}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.requirements.other && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium text-white/90 block mb-1">Other: </span>
                          <p className="text-white/70 leading-relaxed whitespace-pre-wrap">
                            {opportunity.requirements.other}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Financial Details */}
            {opportunity.financial && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financial Information
                </h4>
                <div className="space-y-1.5 text-sm text-white/70 pl-6">
                  <div>
                    <span className="font-medium text-white/90">Paid Opportunity: </span>
                    <span>{opportunity.financial.isPaid ? 'Yes' : 'No'}</span>
                  </div>
                  {opportunity.financial.amount && (
                    <div>
                      <span className="font-medium text-white/90">Amount: </span>
                      <span>{opportunity.financial.currency || 'NGN'} {opportunity.financial.amount}</span>
                    </div>
                  )}
                  {opportunity.financial.benefits && opportunity.financial.benefits.length > 0 && (
                    <div className="mt-2">
                      <span className="font-medium text-white/90 block mb-1">Benefits: </span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {opportunity.financial.benefits.map((benefit: string, index: number) => (
                          <li key={index}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dates */}
            {opportunity.dates && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Important Dates
                </h4>
                <div className="space-y-1.5 text-sm text-white/70 pl-6">
                  {opportunity.dates.applicationDeadline && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/40" />
                      <div>
                        <span className="font-medium text-white/90">Application Deadline: </span>
                        <span>{formatDate(opportunity.dates.applicationDeadline)}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.dates.startDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-white/40" />
                      <div>
                        <span className="font-medium text-white/90">Start Date: </span>
                        <span>{formatDate(opportunity.dates.startDate)}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.dates.endDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-white/40" />
                      <div>
                        <span className="font-medium text-white/90">End Date: </span>
                        <span>{formatDate(opportunity.dates.endDate)}</span>
                      </div>
                    </div>
                  )}
                  {opportunity.dates.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/40" />
                      <div>
                        <span className="font-medium text-white/90">Duration: </span>
                        <span>{opportunity.dates.duration}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {opportunity.location && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </h4>
                <div className="space-y-1.5 text-sm text-white/70 pl-6">
                  {opportunity.location.isRemote ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-white/40" />
                      <span className="font-medium text-white/90">Remote Opportunity</span>
                    </div>
                  ) : (
                    <>
                      {opportunity.location.city && (
                        <div>
                          <span className="font-medium text-white/90">City: </span>
                          <span>{opportunity.location.city}</span>
                        </div>
                      )}
                      {opportunity.location.province && (
                        <div>
                          <span className="font-medium text-white/90">Province/State: </span>
                          <span>{opportunity.location.province}</span>
                        </div>
                      )}
                      {opportunity.location.country && (
                        <div>
                          <span className="font-medium text-white/90">Country: </span>
                          <span>{opportunity.location.country}</span>
                        </div>
                      )}
                      {opportunity.location.address && (
                        <div className="mt-2 pt-2 border-t border-white/[0.06]">
                          <span className="font-medium text-white/90">Address: </span>
                          <span>{opportunity.location.address}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                {id && (
                  <EngagementActions 
                    type="opportunities" 
                    id={id} 
                    externalUrl={opportunity.url}
                    className="flex-shrink-0"
                  />
                )}
                {isAuthenticated && (
                  <Button
                    onClick={() => setShowShareComposer(true)}
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-white/70 hover:text-orange-500 hover:bg-orange-500/10 rounded-xl"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Post About This
                  </Button>
                )}
              </div>
              {opportunity.url && (
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                >
                  <a href={cleanUrl(opportunity.url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                    Apply Now
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Share Composer */}
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

export default function OpportunityPage({ params }: OpportunityPageProps) {
  return (
    <AuthGuard>
      <OpportunityPageContent params={params} />
    </AuthGuard>
  )
}
