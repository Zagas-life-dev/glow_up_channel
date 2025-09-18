"use client"

import { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Calendar, MapPin, Target, Clock, Tag } from 'lucide-react'
import EngagementActions from '@/components/engagement-actions'
import AuthGuard from '@/components/auth-guard'
import { cleanUrl } from '@/lib/url-utils'

type OpportunityPageProps = {
  params: Promise<{
    id: string
  }>
}

function OpportunityPageContent({ params }: OpportunityPageProps) {
  const [opportunity, setOpportunity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [id, setId] = useState<string>('')

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
      } catch (error) {
        console.error('Error fetching opportunity:', error)
        notFound()
      } finally {
        setLoading(false)
      }
    }

    getOpportunity()
  }, [id])

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-16 sm:py-18 md:py-20 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12 lg:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-soft p-4 sm:p-6 md:p-8 lg:p-12">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-12 bg-gray-200 rounded mb-6"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!opportunity) {
    notFound()
  }

  return (
    <div className="bg-gray-50 min-h-screen py-16 sm:py-18 md:py-20 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12 lg:py-16">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Link href="/opportunities" className="inline-flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-orange-600 transition-colors mb-6 sm:mb-8 group touch-manipulation">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
            Back to Opportunities
          </Link>

          <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-soft p-4 sm:p-6 md:p-8 lg:p-12 ${
            opportunity.promotion && opportunity.promotion.packageType === 'spotlight' 
              ? 'border-4 border-blue-500' 
              : ''
          }`}>
            {/* Header */}
            <div className="mb-6 sm:mb-8 md:mb-10">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-800 text-xs sm:text-sm font-medium rounded-full">
                  Opportunity
                </span>
                {opportunity.promotion && opportunity.promotion.packageType === 'spotlight' && (
                  <span className="px-2 sm:px-3 py-1 bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-full">
                    SPOTLIGHT
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                {opportunity.title}
              </h1>
              {opportunity.provider && (
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-500 leading-relaxed">
                  {opportunity.provider}
                </p>
              )}
            </div>

            {/* Tags */}
            {opportunity.tags && opportunity.tags.length > 0 && (
              <div className="mb-6 sm:mb-8 md:mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-medium text-gray-600">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {opportunity.tags.map((tag: string, index: number) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="px-3 py-1 text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Meta Info */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 border-y border-gray-100 py-4 sm:py-6 md:py-8 mb-6 sm:mb-8 md:mb-10">
              {opportunity.dates?.applicationDeadline && (
                <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Deadline</p>
                    <p className="text-sm sm:text-base text-gray-800 font-semibold truncate">
                      {new Date(opportunity.dates.applicationDeadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              {opportunity.location && (
                <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Location</p>
                    <p className="text-sm sm:text-base text-gray-800 font-semibold truncate">
                      {opportunity.location.country && opportunity.location.province 
                        ? `${opportunity.location.city || ''} ${opportunity.location.province}, ${opportunity.location.country}`.trim()
                        : opportunity.location.country || 'Remote'
                      }
                    </p>
                  </div>
                </div>
              )}
              {opportunity.requirements && (
                <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-0 xs:col-span-2 lg:col-span-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Requirements</p>
                    <p className="text-sm sm:text-base text-gray-800 font-semibold">
                      {opportunity.requirements.educationLevel || opportunity.requirements.careerStage || 'See details below'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="prose prose-sm sm:prose-base md:prose-lg lg:prose-xl max-w-none text-gray-700 leading-relaxed">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4 md:mb-6">
                Description
              </h2>
              <div className="text-sm sm:text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                {opportunity.description}
              </div>
              
              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-8 sm:mt-10 md:mt-12">
                {/* Requirements */}
                {opportunity.requirements && (
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                      Requirements
                    </h3>
                    <div className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      <ul className="space-y-2">
                        {opportunity.requirements.educationLevel && (
                          <li><strong>Education:</strong> {opportunity.requirements.educationLevel}</li>
                        )}
                        {opportunity.requirements.careerStage && (
                          <li><strong>Career Stage:</strong> {opportunity.requirements.careerStage}</li>
                        )}
                        {opportunity.requirements.skills && opportunity.requirements.skills.length > 0 && (
                          <li><strong>Skills:</strong> {opportunity.requirements.skills.join(', ')}</li>
                        )}
                        {opportunity.requirements.experience && (
                          <li><strong>Experience:</strong> {opportunity.requirements.experience}</li>
                        )}
                        {opportunity.requirements.other && (
                          <li><strong>Other:</strong> {opportunity.requirements.other}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Financial Information */}
                {opportunity.financial && (
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                      Financial Information
                    </h3>
                    <div className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      <ul className="space-y-2">
                        {opportunity.financial.isPaid !== undefined && (
                          <li><strong>Paid Position:</strong> {opportunity.financial.isPaid ? 'Yes' : 'No'}</li>
                        )}
                        {opportunity.financial.amount && (
                          <li><strong>Amount:</strong> {opportunity.financial.currency || 'NGN'} {opportunity.financial.amount}</li>
                        )}
                        {opportunity.financial.benefits && opportunity.financial.benefits.length > 0 && (
                          <li>
                            <strong>Benefits:</strong>
                            <ul className="ml-4 mt-1 space-y-1">
                              {opportunity.financial.benefits.map((benefit: string, index: number) => (
                                <li key={index}>• {benefit}</li>
                              ))}
                            </ul>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Application Information */}
                {opportunity.dates && (
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                      Application Details
                    </h3>
                    <div className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      <ul className="space-y-2">
                        {opportunity.dates.applicationDeadline && (
                          <li><strong>Application Deadline:</strong> {new Date(opportunity.dates.applicationDeadline).toLocaleDateString()}</li>
                        )}
                        {opportunity.dates.startDate && (
                          <li><strong>Start Date:</strong> {new Date(opportunity.dates.startDate).toLocaleDateString()}</li>
                        )}
                        {opportunity.dates.endDate && (
                          <li><strong>End Date:</strong> {new Date(opportunity.dates.endDate).toLocaleDateString()}</li>
                        )}
                        {opportunity.url && (
                          <li><strong>Application URL:</strong> <a href={cleanUrl(opportunity.url)} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline">Apply Here</a></li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                {(opportunity.type || opportunity.category) && (
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                      Additional Information
                    </h3>
                    <div className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      <ul className="space-y-2">
                        {opportunity.type && (
                          <li><strong>Type:</strong> {opportunity.type}</li>
                        )}
                        {opportunity.category && (
                          <li><strong>Category:</strong> {opportunity.category}</li>
                        )}
                        {opportunity.status && (
                          <li><strong>Status:</strong> <span className="capitalize">{opportunity.status}</span></li>
                        )}
                        {opportunity.isApproved !== undefined && (
                          <li><strong>Approved:</strong> {opportunity.isApproved ? 'Yes' : 'No'}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Engagement Actions */}
            <div className="mt-8 sm:mt-10 md:mt-12 lg:mt-16 pt-6 sm:pt-8 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    Take Action
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Like, save, or apply for this opportunity
                </p>
              </div>
                {id && (
                  <EngagementActions 
                    type="opportunities" 
                    id={id} 
                    externalUrl={opportunity.url}
                    className="flex-shrink-0"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
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