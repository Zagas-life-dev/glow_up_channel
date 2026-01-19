"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Calendar, ArrowRight, Heart, Bookmark, Eye, Users, Dot, MapPin } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SearchBar from "@/components/search-bar"
import { useAuth } from "@/lib/auth-context"
import AuthGuard from "@/components/auth-guard"
import { getLinkType, openExternalUrl } from "@/lib/url-utils"

function EventsContent() {
    const [events, setEvents] = useState<any[]>([])
    const [filteredEvents, setFilteredEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
    const [totalCount, setTotalCount] = useState(0)
    const searchParams = useSearchParams()
    const { user, isAuthenticated } = useAuth()

    useEffect(() => {
        const tag = searchParams.get('tag')
        if (tag) {
            setSearchQuery(tag)
        }
    }, [searchParams])

    // Load all events
  useEffect(() => {
        const fetchAllEvents = async () => {
      setLoading(true)
      try {
                let promotedEvents: any[] = []
        let recommendedEvents: any[] = []
        
        // Always fetch promoted content (public API)
        try {
                    const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/events`)
          const promotedData = await promotedRes.json()
          if (promotedData.success) {
                        promotedEvents = promotedData.data?.events || []
          }
        } catch (error) {
          console.error('Error fetching promoted events:', error)
        }
        
        if (isAuthenticated && user) {
          // Fetch recommendation API data
          const token = localStorage.getItem('accessToken')
          const headers = { 'Authorization': `Bearer ${token}` }
          
          try {
            const recommendedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/events?limit=100`, { headers })
            const recommendedData = await recommendedRes.json()
          
          if (recommendedData.success) {
            recommendedEvents = recommendedData.data?.events || []
          }
          } catch (error) {
            console.error('Error fetching recommended events:', error)
          }
        }
        
        // Merge and deduplicate: promoted first, then recommended
        const mergedEvents = [...promotedEvents]
        const promotedIds = new Set(promotedEvents.map(item => item._id))
        
        // Add recommended events that are not already in promoted
        const uniqueRecommendedEvents = recommendedEvents.filter(item => !promotedIds.has(item._id))
        mergedEvents.push(...uniqueRecommendedEvents)
        
        setEvents(mergedEvents)
        setFilteredEvents(mergedEvents)
        setTotalCount(mergedEvents.length)
        
        console.log(`Loaded ${promotedEvents.length} promoted + ${recommendedEvents.length} recommended = ${mergedEvents.length} total events`)
        
      } catch (error) {
        console.error('Error fetching events:', error)
        setEvents([])
        setFilteredEvents([])
      }
      setLoading(false)
    }
        fetchAllEvents()
  }, [isAuthenticated, user])

    // Filter events based on search
    useEffect(() => {
        const lowercasedQuery = searchQuery.toLowerCase()
        const filtered = events.filter((event) => {
            return (
                (event.title?.toLowerCase() || '').includes(lowercasedQuery) ||
                (event.description?.toLowerCase() || '').includes(lowercasedQuery) ||
                (event.category?.toLowerCase() || '').includes(lowercasedQuery) ||
                (typeof event.location === 'string' ? event.location : event.location?.city || event.location?.address || '').toLowerCase().includes(lowercasedQuery) ||
                (event.tags && event.tags.some((tag: string) => (tag?.toLowerCase() || '').includes(lowercasedQuery))) ||
                ((!event.isPaid ? "free" : "paid").toLowerCase().includes(lowercasedQuery))
            )
        })
        setFilteredEvents(filtered)
    }, [searchQuery, events])

    const handleSearch = (query: string) => {
        setSearchQuery(query)
    }

    const suggestionTags = ["Conference", "Workshop", "Meetup", "Webinar", "Hackathon", "Networking"]

  return (
        <div className="min-h-screen pb-24 md:pb-8">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-white/[0.06] -mx-4 px-4 md:-mx-6 md:px-6">
                <div className="max-w-7xl mx-auto py-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Events</h1>
                            <p className="text-sm text-white/50">Discover conferences, workshops, and networking events</p>
                        </div>
                    </div>
                    
                    {/* Search Section */}
                    <div className="mb-4">
                        <SearchBar
                            value={searchQuery}
                            onValueChange={handleSearch}
                            placeholder="Search events by title, category, or location..."
                        />
                    </div>
                    
                    {/* Suggestion Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-white/60 font-medium">
                            Popular:
                        </span>
                        {suggestionTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleSearch(tag)}
                                className="px-3 py-1 bg-white/[0.05] text-white/70 text-xs rounded-full hover:bg-white/[0.08] hover:text-white transition-colors border border-white/[0.1]"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                {/* Results Summary */}
                {!loading && (
                    <div className="mb-6">
                        <p className="text-sm text-white/60">
                            {searchQuery ? (
                                <>
                                    Showing {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''} for 
                                    <span className="font-semibold text-white ml-1">"{searchQuery}"</span>
                                </>
                            ) : (
                                <>Showing {filteredEvents.length} events</>
                            )}
                        </p>
              </div>
                )}

                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.05] mb-4">
                            <Calendar className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
                        <p className="text-base text-white/60">Loading events...</p>
                    </div>
                ) : filteredEvents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredEvents.map((event) => {
                                // Check if _id is a valid MongoDB ObjectId (24 hex characters)
                                const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(event._id)
                                
                                if (isValidObjectId) {
                                    // Internal event - make entire card clickable
                                    return (
                                        <Link key={event._id} href={`/events/${event._id}`} className="block">
                                <Card 
                                    className={`
                                                    group bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 flex flex-col h-full touch-manipulation cursor-pointer
                                        ${event.isPromoted ? 'border-yellow-500/30 bg-yellow-500/5' : ''}
                                    `}
                                >
                                    <CardContent className="p-4 flex flex-col flex-grow">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full capitalize border border-emerald-500/30">
                                                {event.category || 'Event'}
                                                </span>
                                            </div>
                                                <span className={`text-xs font-medium ${
                                            !event.isPaid 
                                                ? 'text-emerald-400' 
                                                        : 'text-white/40'
                                                }`}>
                                            {!event.isPaid ? 'free' : 'paid'}
                                                </span>
                                        </div>
                                        
                                    <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                                            {event.title}
                                        </h3>
                                    
                                    <p className="text-sm text-white/60 mb-3 line-clamp-3 flex-grow">
                                        {event.description}
                                    </p>
                                    
                                    <div className="space-y-2 mb-4">
                                        {event.location && (
                                            <div className="flex items-center gap-2 text-xs text-white/50">
                                                <MapPin className="w-4 h-4 flex-shrink-0 text-emerald-400"/>
                                                <span className="truncate">
                                                    {typeof event.location === 'string' 
                                                        ? event.location 
                                                        : event.location.isRemote ? 'Remote' : 
                                                          [event.location.city,  event.location.country]
                                                            .filter(Boolean)
                                                            .join(', ') || 'Location TBD'
                                                    }
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-white/50">                            
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(event.dates?.startDate || event.date).toLocaleDateString()}</span>
                                        </div>
                                        </div>
                                        
                                        {/* Engagement Metrics */}
                                        {event.metrics && (
                                            <div className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                                                <div className="flex items-center space-x-4 text-xs text-white/50">
                                                    <div className="flex items-center space-x-1">
                                                        <Eye className="h-3 w-3" />
                                                        <span>{event.metrics.viewCount || 0}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Heart className="h-3 w-3 text-red-400" />
                                                        <span>{event.metrics.likeCount || 0}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Bookmark className="h-3 w-3 text-blue-400" />
                                                        <span>{event.metrics.saveCount || 0}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Users className="h-3 w-3 text-green-400" />
                                                        <span>{event.metrics.registrationCount || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    
                                        </CardContent>
                                            </Card>
                                                    </Link>
                                                )
                                } else {
                                    // External event - make entire card clickable to open in new tab
                                                return (
                                        <Card 
                                            key={event._id}
                                            className={`
                                                group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full touch-manipulation cursor-pointer
                                                ${event.isPromoted ? 'border-2 border-yellow-400' : ''}
                                            `}
                                                        onClick={() => openExternalUrl(event._id)}
                                        >
                                            <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                                                <div className="flex items-center justify-between mb-3 sm:mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm font-medium rounded-full capitalize">
                                                        {event.category || 'Event'}
                                                        </span>
                                                    </div>
                                                        <span className={`text-xs font-medium ${
                                                    !event.isPaid 
                                                        ? 'text-green-500' 
                                                                : 'text-gray-400'
                                                    }`}>
                                                    {!event.isPaid ? 'free' : 'paid'}
                                                        </span>
                                                </div>
                                                
                                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2 group-hover:text-green-600 transition-colors duration-200">
                                                    {event.title}
                                                </h3>
                                            
                                            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-3 flex-grow">
                                                    {event.description}
                                                </p>
                                            
                                            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                                                
                                                
                                               
                                                {event.location && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <span className="w-4 h-4 flex-shrink-0">📍</span>
                                                        <span className="truncate">
                                                            {typeof event.location === 'string' 
                                                                ? event.location 
                                                                : event.location.isRemote ? 'Remote' : 
                                                                  [event.location.city,  event.location.country]
                                                                    .filter(Boolean)
                                                                    .join(', ') || 'Location TBD'
                                                            }
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {event.date && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <Calendar className="w-4 h-4 flex-shrink-0" />
                                                        <span>{new Date(event.date).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                                
                                                {event.tags && event.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {event.tags.slice(0, 3).map((tag: string, index: number) => (
                                                            <span
                                                                key={index}
                                                                className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {event.metrics && (
                                                <div className="flex items-center justify-between mb-3 sm:mb-4 p-2 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                                                        <div className="flex items-center space-x-1">
                                                            <Eye className="h-3 w-3" />
                                                            <span>{event.metrics.viewCount || 0}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <Heart className="h-3 w-3 text-red-500" />
                                                            <span>{event.metrics.likeCount || 0}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <Bookmark className="h-3 w-3 text-blue-500" />
                                                            <span>{event.metrics.saveCount || 0}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <Users className="h-3 w-3 text-green-500" />
                                                            <span>{event.metrics.registrationCount || 0}</span>
                                                        </div>
                                                    </div>
                                    </div>
                                            )}
                                    </CardContent>
                                </Card>
                                    )
                                }
                            })}
            </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.05] mb-4">
                                <Calendar className="w-8 h-8 text-white/30" />
                            </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            {searchQuery ? 'No events found' : 'No events available'}
                            </h3>
                        <p className="text-sm text-white/50 mb-6 max-w-md mx-auto">
                                {searchQuery 
                                ? `No events match your search for "${searchQuery}". Try a different search term.`
                                : 'There are no events available at the moment. Check back later for new events.'
                                }
                            </p>
                            {searchQuery && (
                                <Button 
                                onClick={() => setSearchQuery('')}
                                    variant="outline" 
                                className="px-6 py-2.5 border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl"
                                >
                                    Clear Search
                                </Button>
                            )}
                        </div>
                )}
            </div>
                    </div>
    )
}

export default function EventsPage() {
    return (
        <AuthGuard>
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                            <Calendar className="w-8 h-8 text-green-600 animate-pulse" />
                    </div>
                    <p className="text-lg text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <EventsContent />
        </Suspense>
        </AuthGuard>
  )
}