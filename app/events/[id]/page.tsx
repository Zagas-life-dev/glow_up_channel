"use client"

import { useState, useEffect, useRef } from 'react'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Calendar, MapPin, Clock, Users, DollarSign, Tag } from 'lucide-react'
import EngagementActions from '@/components/engagement-actions'
import AuthGuard from '@/components/auth-guard'
import ApiClient from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

type EventPageProps = {
  params: Promise<{
    id: string
  }>
}

function EventPageContent({ params }: EventPageProps) {
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [id, setId] = useState<string>('')
  const { isAuthenticated } = useAuth()
  const viewedItems = useRef(new Set<string>())

  // Track view for recommendation learning
  const trackView = async (eventId: string) => {
    if (!isAuthenticated || viewedItems.current.has(eventId)) return
    
    viewedItems.current.add(eventId)
    
    try {
      await ApiClient.trackEngagement('event', eventId, 'view')
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

    const getEvent = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events/${id}`, {
          cache: 'no-store'
        })
        
        if (!response.ok) {
          notFound()
        }
        
        const result = await response.json()
        
        if (!result.success) {
          notFound()
        }
        
        setEvent(result.data.event)
      } catch (error) {
        console.error('Error fetching event:', error)
        notFound()
      } finally {
        setLoading(false)
      }
    }

    getEvent()
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

  if (!event) {
    notFound()
  }

  return (
    <div className="bg-gray-50 min-h-screen py-16 sm:py-18 md:py-20 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12 lg:py-16">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Link href="/events" className="inline-flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-orange-600 transition-colors mb-6 sm:mb-8 group touch-manipulation">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
            Back to Events
          </Link>

          <div 
            className="bg-white rounded-2xl sm:rounded-3xl shadow-soft p-4 sm:p-6 md:p-8 lg:p-12"
            onMouseEnter={() => trackView(id)}
          >
            {/* Header */}
            <div className="mb-6 sm:mb-8 md:mb-10">
              <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm font-medium rounded-full mb-3 sm:mb-4 inline-block">
                Event
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                {event.title}
              </h1>
              {event.organizer && (
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-500 leading-relaxed">
                  Organized by {event.organizer}
                </p>
              )}
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="mb-6 sm:mb-8 md:mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-medium text-gray-600">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: string, index: number) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="px-3 py-1 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Meta Info */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 border-y border-gray-100 py-4 sm:py-6 md:py-8 mb-6 sm:mb-8 md:mb-10">
              {event.dates?.startDate && (
                <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Date</p>
                    <p className="text-sm sm:text-base text-gray-800 font-semibold truncate">
                      {new Date(event.dates.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              
              {event.location && (
                <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Location</p>
                    <p className="text-sm sm:text-base text-gray-800 font-semibold truncate">
                      {event.location.country && event.location.province 
                        ? `${event.location.city || ''} ${event.location.province}, ${event.location.country}`.trim()
                        : event.location.country || 'Online'
                      }
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Cost</p>
                  <p className="text-sm sm:text-base text-gray-800 font-semibold truncate">
                    {!event.isPaid ? 'Free' : 'Paid'}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="mb-6 sm:mb-8 md:mb-10">
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">
                  About This Event
                </h2>
                <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed">
                  <p className="whitespace-pre-wrap">{event.description}</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="mb-6 sm:mb-8 md:mb-10">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {event.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 sm:px-4 sm:py-2 bg-green-100 text-green-800 text-xs sm:text-sm font-medium rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement Actions */}
            <div className="mt-8 sm:mt-10 md:mt-12 lg:mt-16 pt-6 sm:pt-8 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    Take Action
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Like, save, or register for this event
                  </p>
                </div>
                {id && (
                  <EngagementActions 
                    type="events" 
                    id={id} 
                    externalUrl={event.url}
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

export default function EventPage({ params }: EventPageProps) {
  return (
    <AuthGuard>
      <EventPageContent params={params} />
    </AuthGuard>
  )
}