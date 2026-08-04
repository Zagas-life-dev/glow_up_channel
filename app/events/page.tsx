"use client"

import { useState, useEffect, Suspense, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FlaticonIcon } from "@/components/ui/flaticon-icon"
import FeedListSkeleton from '@/components/skeletons/feed-card-skeleton'
import PageSkeleton from '@/components/skeletons/page-skeleton'
import ErrorState from '@/components/error-state'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SearchBar from "@/components/search-bar"
import { useAuth } from "@/lib/auth-context"
import AuthGuard from "@/components/auth-guard"
import { getLinkType, openExternalUrl } from "@/lib/url-utils"
import { fetchListBySearch } from "@/lib/fetch-list-search"

function EventsContent() {
  const [events, setEvents] = useState<any[]>([])
  const [filteredEvents, setFilteredEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
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

  const fetchAllEvents = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      let promotedEvents: any[] = []
      let recommendedEvents: any[] = []
      try {
        const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/events`)
        if (!promotedRes.ok) throw new Error('Request failed')
        const promotedData = await promotedRes.json()
        if (promotedData.success) promotedEvents = promotedData.data?.events || []
      } catch {
        setError(true)
        setLoading(false)
        return
      }
      if (isAuthenticated && user) {
        const token = localStorage.getItem('accessToken')
        const headers = { 'Authorization': `Bearer ${token}` }
        try {
          const recommendedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/events?limit=100`, { headers })
          if (!recommendedRes.ok) throw new Error('Request failed')
          const recommendedData = await recommendedRes.json()
          if (recommendedData.success) recommendedEvents = recommendedData.data?.events || []
        } catch {}
      }
      const mergedEvents = [...promotedEvents]
      const promotedIds = new Set(promotedEvents.map((item: { _id: string }) => item._id))
      mergedEvents.push(...recommendedEvents.filter((item: { _id: string }) => !promotedIds.has(item._id)))
      setEvents(mergedEvents)
      setFilteredEvents(mergedEvents)
      setTotalCount(mergedEvents.length)
    } catch {
      setEvents([])
      setFilteredEvents([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    fetchAllEvents()
  }, [fetchAllEvents])

    useEffect(() => {
        const q = searchQuery.trim()
        if (!q) {
            setFilteredEvents(events)
            return
        }
        let cancelled = false
        const timer = setTimeout(async () => {
            const results = await fetchListBySearch("events", q)
            if (!cancelled) setFilteredEvents(results as typeof events)
        }, 300)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [searchQuery, events])

    const handleSearch = (query: string) => {
        setSearchQuery(query)
    }

    const suggestionTags = ["Conference", "Workshop", "Meetup", "Webinar", "Hackathon", "Networking"]

  return (
        <div className="min-h-screen pb-24 md:pb-8">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-page/95 backdrop-blur-lg border-b border-border -mx-4 px-4 md:-mx-6 md:px-6">
                <div className="max-w-7xl mx-auto py-6">
                    <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <FlaticonIcon name="calendar" className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Events</h1>
                            <p className="text-sm text-muted-foreground">Discover conferences, workshops, and networking events</p>
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
                        <span className="text-xs text-muted-foreground font-medium">
                            Popular:
                        </span>
                        {suggestionTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleSearch(tag)}
                                className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full hover:bg-muted hover:text-foreground transition-colors border border-border"
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
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? (
                                <>
                                    Showing {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''} for 
                                    <span className="font-semibold text-foreground ml-1">"{searchQuery}"</span>
                                </>
                            ) : (
                                <>Showing {filteredEvents.length} events</>
                            )}
                        </p>
              </div>
                )}

                {loading ? (
                    <FeedListSkeleton count={8} />
                ) : error ? (
                    <ErrorState isNetworkError onRetry={fetchAllEvents} />
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
                                                    group bg-card border border-border rounded-2xl overflow-hidden hover:bg-muted hover:border-border transition-all duration-300 flex flex-col h-full touch-manipulation cursor-pointer
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
                                                        : 'text-muted-foreground'
                                                }`}>
                                            {!event.isPaid ? 'free' : 'paid'}
                                                </span>
                                        </div>
                                        
                                    <h3 className="text-base font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                                            {event.title}
                                        </h3>
                                    
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3 flex-grow">
                                        {event.description}
                                    </p>
                                    
                                    <div className="space-y-2 mb-4">
                                        {event.location && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <FlaticonIcon name="map-marker" className="w-4 h-4 flex-shrink-0 text-emerald-400" />
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
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">                            
                                                <FlaticonIcon name="calendar" className="w-4 h-4" />
                                                <span>{new Date(event.dates?.startDate || event.date).toLocaleDateString()}</span>
                                        </div>
                                        </div>
                                        
                                        {/* Engagement Metrics */}
                                        {event.metrics && (
                                            <div className="flex items-center justify-between p-2 bg-muted rounded-lg border border-border">
                                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                                    <div className="flex items-center space-x-1">
                                                        <FlaticonIcon name="eye" className="h-3 w-3" />
                                                        <span>{event.metrics.viewCount || 0}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <FlaticonIcon name="heart" className="h-3 w-3 text-red-400" />
                                                        <span>{event.metrics.likeCount || 0}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <FlaticonIcon name="bookmark" className="h-3 w-3 text-primary" />
                                                        <span>{event.metrics.saveCount || 0}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <FlaticonIcon name="users" className="h-3 w-3 text-green-400" />
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
                                                group bg-card rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full touch-manipulation cursor-pointer
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
                                                
                                            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-green-600 transition-colors duration-200">
                                                    {event.title}
                                                </h3>
                                            
                                            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-3 flex-grow">
                                                    {event.description}
                                                </p>
                                            
                                            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                                                
                                                
                                               
                                                {event.location && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <FlaticonIcon name="map-marker" className="w-4 h-4 flex-shrink-0" />
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
                                                        <FlaticonIcon name="calendar" className="w-4 h-4 flex-shrink-0" />
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
                                                            <FlaticonIcon name="eye" className="h-3 w-3" />
                                                            <span>{event.metrics.viewCount || 0}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <FlaticonIcon name="heart" className="h-3 w-3 text-red-500" />
                                                            <span>{event.metrics.likeCount || 0}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <FlaticonIcon name="bookmark" className="h-3 w-3 text-primary" />
                                                            <span>{event.metrics.saveCount || 0}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <FlaticonIcon name="users" className="h-3 w-3 text-green-500" />
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
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                                <FlaticonIcon name="calendar" className="w-8 h-8 text-muted-foreground" />
                            </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {searchQuery ? 'No events found' : 'No events available'}
                            </h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                                {searchQuery 
                                ? `No events match your search for "${searchQuery}". Try a different search term.`
                                : 'There are no events available at the moment. Check back later for new events.'
                                }
                            </p>
                            {searchQuery && (
                                <Button 
                                onClick={() => setSearchQuery('')}
                                    variant="outline" 
                                className="px-6 py-2.5 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
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
    <Suspense fallback={<PageSkeleton />}>
      <EventsContent />
    </Suspense>
  )
}
