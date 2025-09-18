"use client"

import { useState, useEffect, useRef } from 'react'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Building, MapPin, DollarSign, Clock, Tag } from 'lucide-react'
import EngagementActions from '@/components/engagement-actions'
import AuthGuard from '@/components/auth-guard'
import ApiClient from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

type JobPageProps = {
  params: Promise<{
    id: string
  }>
}

function JobPageContent({ params }: JobPageProps) {
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [id, setId] = useState<string>('')
  const { isAuthenticated } = useAuth()
  const viewedItems = useRef(new Set<string>())

  // Track view for recommendation learning
  const trackView = async (jobId: string) => {
    if (!isAuthenticated || viewedItems.current.has(jobId)) return
    
    viewedItems.current.add(jobId)
    
    try {
      await ApiClient.trackEngagement('job', jobId, 'view')
    } catch (error) {
      console.error('Error tracking view:', error)
      // Don't show error to user as this is background tracking
    }
  }

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
      } catch (error) {
        console.error('Error fetching job:', error)
        notFound()
      } finally {
        setLoading(false)
      }
    }

    getJob()
  }, [id])

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
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

  if (!job) {
    notFound()
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12 lg:py-16">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-orange-600 transition-colors mb-6 sm:mb-8 group touch-manipulation">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
            Back to Jobs
          </Link>

          <div 
            className="bg-white rounded-2xl sm:rounded-3xl shadow-soft p-4 sm:p-6 md:p-8 lg:p-12"
            onMouseEnter={() => trackView(id)}
          >
            {/* Header */}
            <div className="mb-6 sm:mb-8 md:mb-10">
              <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-800 text-xs sm:text-sm font-medium rounded-full mb-3 sm:mb-4 inline-block capitalize">
                {job.jobType || 'Job'}
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                {job.title}
              </h1>
              {job.company && (
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-500 leading-relaxed">
                  {job.company}
                </p>
              )}
            </div>

            {/* Tags */}
            {job.tags && job.tags.length > 0 && (
              <div className="mb-6 sm:mb-8 md:mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-medium text-gray-600">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag: string, index: number) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Meta Info */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 border-y border-gray-100 py-4 sm:py-6 md:py-8 mb-6 sm:mb-8 md:mb-10">
              {job.company && (
                <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Company</p>
                    <p className="text-sm sm:text-base text-gray-800 font-semibold truncate">
                      {job.company}
                    </p>
                  </div>
                </div>
              )}
              {job.location && (
                <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Location</p>
                    <p className="text-sm sm:text-base text-gray-800 font-semibold truncate">
                      {job.location.country && job.location.province 
                        ? `${job.location.city || ''} ${job.location.province}, ${job.location.country}`.trim()
                        : job.location.country || 'Remote'
                      }
                    </p>
                  </div>
                </div>
              )}
              {job.pay?.amount && (
                <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Salary</p>
                    <p className="text-sm sm:text-base text-gray-800 font-semibold truncate">
                      {job.pay.amount} {job.pay.currency} {job.pay.period && `per ${job.pay.period}`}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Posted</p>
                  <p className="text-sm sm:text-base text-gray-800 font-semibold truncate">
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="prose prose-sm sm:prose-base md:prose-lg lg:prose-xl max-w-none text-gray-700 leading-relaxed">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4 md:mb-6">
                Job Description
              </h2>
              <div className="text-sm sm:text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                {job.description}
              </div>
              
              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-8 sm:mt-10 md:mt-12">
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                      Requirements
                    </h3>
                    <div className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      <ul className="space-y-2">
                        {job.requirements.map((requirement: string, index: number) => (
                          <li key={index}>• {requirement}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {job.benefits && job.benefits.length > 0 && (
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                      Benefits
                    </h3>
                    <div className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      <ul className="space-y-2">
                        {job.benefits.map((benefit: string, index: number) => (
                          <li key={index}>• {benefit}</li>
                        ))}
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
                    Like, save, or apply for this job
                </p>
              </div>
                {id && (
                  <EngagementActions 
                    type="jobs" 
                    id={id} 
                    externalUrl={job.url}
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

export default function JobPage({ params }: JobPageProps) {
  return (
    <AuthGuard>
      <JobPageContent params={params} />
    </AuthGuard>
  )
} 