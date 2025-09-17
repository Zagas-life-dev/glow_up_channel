"use client"

import { useState, useEffect, Suspense, useRef, useCallback } from "react"
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Calendar, ArrowRight, Heart, Bookmark, Eye, Users, Loader2 } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SearchBar from "@/components/search-bar"
import { useAuth } from "@/lib/auth-context"

function EventsContent() {
    const [allEvents, setAllEvents] = useState<any[]>([])
    const [displayedEvents, setDisplayedEvents] = useState<any[]>([])
    const [filteredEvents, setFilteredEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [totalCount, setTotalCount] = useState(0)
    const searchParams = useSearchParams()
    const { user, isAuthenticated } = useAuth()
    const observerRef = useRef<HTMLDivElement>(null)
    const ITEMS_PER_PAGE = 20

    useEffect(() => {
        const tag = searchParams.get('tag')
        if (tag) {
            setSearchQuery(tag)
        }
    }, [searchParams])

    // Reset pagination when search changes
    useEffect(() => {
        if (searchQuery) {
            setCurrentPage(1)
            setDisplayedEvents([])
            setHasMore(true)
        }
    }, [searchQuery])

    // Load more events
    const loadMoreEvents = useCallback(async () => {
        if (loadingMore || !hasMore) return

        setLoadingMore(true)
        try {
            const page = currentPage + 1
            const offset = (page - 1) * ITEMS_PER_PAGE

            let newEvents: any[] = []
            
            if (isAuthenticated && user) {
                const token = localStorage.getItem('accessToken')
                const headers = { 'Authorization': `Bearer ${token}` }
                
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events?limit=${ITEMS_PER_PAGE}&offset=${offset}`, { headers })
                const data = await response.json()
                
                if (data.success) {
                    newEvents = data.data?.events || []
                }
            } else {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events?limit=${ITEMS_PER_PAGE}&offset=${offset}`)
                const data = await response.json()
                
                if (data.success) {
                    newEvents = data.data?.events || []
                }
            }

            if (newEvents.length === 0) {
                setHasMore(false)
            } else {
                // Filter out duplicates by checking existing IDs
                setAllEvents(prev => {
                    const existingIds = new Set(prev.map(item => item._id))
                    const uniqueNewEvents = newEvents.filter(item => !existingIds.has(item._id))
                    
                    if (uniqueNewEvents.length === 0) {
                        setHasMore(false)
                        return prev
                    }
                    
                    return [...prev, ...uniqueNewEvents]
                })
                setCurrentPage(page)
            }
        } catch (error) {
            console.error('Error loading more events:', error)
        } finally {
            setLoadingMore(false)
        }
    }, [currentPage, hasMore, loadingMore, isAuthenticated, user])

    // Initial load
    useEffect(() => {
        const fetchInitialEvents = async () => {
            setLoading(true)
            try {
                let promotedEvents: any[] = []
                let recommendedEvents: any[] = []
                let regularEvents: any[] = []
                
                // Always fetch promoted content (public API)
                try {
                    const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/events?limit=10`)
                    const promotedData = await promotedRes.json()
                    if (promotedData.success) {
                        promotedEvents = promotedData.data?.events || []
                    }
                } catch (error) {
                    console.error('Error fetching promoted events:', error)
                }
                
                if (isAuthenticated && user) {
                    // Fetch both recommendation and regular API data
                    const token = localStorage.getItem('accessToken')
                    const headers = { 'Authorization': `Bearer ${token}` }
                    
                    const [recommendedRes, regularRes] = await Promise.all([
                        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/events?limit=20`, { headers }),
                        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events?limit=${ITEMS_PER_PAGE}&offset=0`)
                    ])
                    
                    const [recommendedData, regularData] = await Promise.all([
                        recommendedRes.json(),
                        regularRes.json()
                    ])
                    
                    if (recommendedData.success) {
                        recommendedEvents = recommendedData.data?.events || []
                    }
                    
                    if (regularData.success) {
                        regularEvents = regularData.data?.events || []
                        setTotalCount(regularData.data?.totalCount || regularEvents.length)
                    }
                } else {
                    // Use only regular API for non-authenticated users
                    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events?limit=${ITEMS_PER_PAGE}&offset=0`)
                    const result = await response.json()
                    
                    if (result.success) {
                        regularEvents = result.data?.events || []
                        setTotalCount(result.data?.totalCount || regularEvents.length)
                    }
                }
                
                // Merge and deduplicate: promoted first, then recommended, then regular data
                const mergedEvents = [...promotedEvents]
                const promotedIds = new Set(promotedEvents.map(item => item._id))
                
                // Add recommended events that are not already in promoted
                const uniqueRecommendedEvents = recommendedEvents.filter(item => !promotedIds.has(item._id))
                mergedEvents.push(...uniqueRecommendedEvents)
                
                const recommendedIds = new Set([...promotedEvents, ...recommendedEvents].map(item => item._id))
                
                // Add regular events that are not already in promoted or recommended
                const uniqueRegularEvents = regularEvents.filter(item => !recommendedIds.has(item._id))
                mergedEvents.push(...uniqueRegularEvents)
                
                setAllEvents(mergedEvents)
                setDisplayedEvents(mergedEvents)
                setFilteredEvents(mergedEvents)
                
                console.log(`Loaded ${promotedEvents.length} promoted + ${recommendedEvents.length} recommended + ${uniqueRegularEvents.length} regular = ${mergedEvents.length} total events`)
                
            } catch (error) {
                console.error('Error fetching events:', error)
                setAllEvents([])
                setDisplayedEvents([])
                setFilteredEvents([])
            }
            setLoading(false)
        }
        fetchInitialEvents()
    }, [isAuthenticated, user])

    // Filter events based on search
    useEffect(() => {
        const lowercasedQuery = searchQuery.toLowerCase()
        const filtered = allEvents.filter((event) => {
            return (
                (event.title?.toLowerCase() || '').includes(lowercasedQuery) ||
                (event.description?.toLowerCase() || '').includes(lowercasedQuery) ||
                (event.location?.country || event.location?.province || event.location?.city || '').toLowerCase().includes(lowercasedQuery) ||
                (event.tags && event.tags.some((tag: string) => (tag?.toLowerCase() || '').includes(lowercasedQuery))) ||
                ((!event.isPaid ? "free" : "paid").toLowerCase().includes(lowercasedQuery))
            )
        })
        setFilteredEvents(filtered)
        setDisplayedEvents(filtered)
    }, [searchQuery, allEvents])

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMoreEvents()
                }
            },
            { threshold: 0.1 }
        )

        if (observerRef.current) {
            observer.observe(observerRef.current)
        }

        return () => {
            if (observerRef.current) {
                observer.unobserve(observerRef.current)
            }
        }
    }, [loadMoreEvents, hasMore, loadingMore])

    const handleSearch = (query: string) => {
        setSearchQuery(query)
    }

    const suggestionTags = ["Workshop", "Networking", "Conference", "Online", "Free", "Paid"]

  return (
        <div className="bg-gray-50 min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-black text-white py-16 sm:py-20 md:py-24 lg:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-900 opacity-80"></div>
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="container px-4 sm:px-6 md:px-8 lg:px-12 relative z-10 text-center">
                    <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-6">
                        Upcoming Events
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed">
                        Join our community at workshops, networking mixers, and conferences. Connect, learn, and grow with us.
                    </p>
                    
                    {/* Search Section */}
                    <div className="max-w-xl mx-auto mb-4 sm:mb-6 md:mb-8">
                        <SearchBar
                            value={searchQuery}
                            onValueChange={handleSearch}
                            placeholder="Search events by name, location, or tags..."
                        />
                    </div>
                    
                    {/* Suggestion Tags */}
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4">
                        <span className="text-sm sm:text-base text-white/80 font-medium mb-1 sm:mb-0">
                            Popular:
                        </span>
                        {suggestionTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleSearch(tag)}
                                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 text-white text-xs sm:text-sm rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm touch-manipulation"
                            >
                                {tag}
                            </button>
                        ))}
          </div>
        </div>
      </section>

            {/* Content Section */}
            <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12">
                {/* Results Summary */}
                {!loading && (
                    <div className="mb-6 sm:mb-8">
                        <p className="text-sm sm:text-base text-gray-600">
                            {searchQuery ? (
                                <>
                                    Showing {displayedEvents.length} of {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''} for 
                                    <span className="font-semibold text-gray-900"> "{searchQuery}"</span>
                                </>
                            ) : (
                                <>Showing {displayedEvents.length} of {totalCount > 0 ? totalCount : 'many'} event{displayedEvents.length !== 1 ? 's' : ''}</>
                            )}
                        </p>
              </div>
                )}


                {loading ? (
                    <div className="text-center py-12 sm:py-16 md:py-20">
                        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full mb-4">
                            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 animate-pulse" />
            </div>
                        <p className="text-base sm:text-lg text-gray-600">Loading events...</p>
                    </div>
                ) : (
                    displayedEvents.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                                {displayedEvents.map((event) => (
                                <Card 
                                    key={event._id} 
                                    className={`
                                        group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full touch-manipulation
                                        ${event.isPromoted ? 'border-2 border-yellow-400' : ''}
                                    `}
                                >
                                    <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm font-medium rounded-full capitalize">
                                                    Event
                                                </span>
                                            </div>
                                            {event.isPaid !== undefined && (
                                                <span className={`text-xs font-medium ${
                                                    event.isPaid 
                                                        ? 'text-orange-500' 
                                                        : 'text-gray-400'
                                                }`}>
                                                    {event.isPaid ? 'paid' : 'free'}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2 sm:mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
                                            {event.title}
                                        </h3>
                                        {event.location && (
                                            <p className="text-xs sm:text-sm font-medium text-orange-600 mb-2 sm:mb-3">
                                                📍 {event.location?.country && event.location?.province 
                                                    ? `${event.location.city || ''} ${event.location.province}, ${event.location.country}`.trim()
                                                    : event.location?.country || 'TBD'
                                                }
                                            </p>
                                        )}
                                        <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-4 flex-grow line-clamp-3 leading-relaxed">
                                            {event.description && event.description.length > 150
                                                ? `${event.description.substring(0, 150)}...`
                                                : event.description || 'No description available'
                                            }
                                        </p>
                                        {event.tags && event.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
                                                {event.tags.slice(0, 3).map((tag: string, index: number) => (
                                                    <span
                                                        key={index}
                                                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                                {event.tags.length > 3 && (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                                                        +{event.tags.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Date Display - Show deadline if available, otherwise show start date */}
                                        <div className="flex justify-end mb-3 sm:mb-4">
                                            <span className="text-xs text-gray-500">
                                                {event.dates?.endDate 
                                                  ? `Deadline: ${new Date(event.dates.endDate).toLocaleDateString()}`
                                                  : event.dates?.startDate 
                                                    ? new Date(event.dates.startDate).toLocaleDateString()
                                                    : 'TBD'
                                                }
                                            </span>
                                        </div>
                                        
                                        {/* Engagement Metrics */}
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
                                          <Button asChild className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs sm:text-sm py-2 sm:py-3 touch-manipulation">
                                             <Link href={`/events/${event._id}`}>
                                                Read More
                                                 <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                                             </Link>
                                          </Button>
                                    </CardContent>
                                </Card>
                                ))}
                            </div>
                            
                            {/* Load More Button */}
                            {/* Infinite Scroll Loading Indicator */}
                            <div className="mt-8">
                                {/* Loading More Indicator */}
                                {loadingMore && (
                                    <div className="text-center py-8">
                                        <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mb-4">
                                            <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                                        </div>
                                        <p className="text-sm text-gray-600">Loading more events...</p>
                                    </div>
                                )}
                                
                                {/* End of Content Message */}
                                {!hasMore && !loadingMore && displayedEvents.length > ITEMS_PER_PAGE && (
                                    <div className="text-center py-8">
                                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
                                            <Calendar className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-600">You've reached the end! No more events to load.</p>
                                    </div>
                                )}
                                
                                {/* Intersection Observer Target */}
                                <div ref={observerRef} className="h-4" />
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 sm:py-16 md:py-20">
                            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4 sm:mb-6">
                                <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                                No events found
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 mb-6">
                                {searchQuery 
                                    ? `No events match "${searchQuery}". Try adjusting your search.`
                                    : "No events are available at the moment."
                                }
                            </p>
                            {searchQuery && (
                                <Button 
                                    onClick={() => handleSearch("")}
                                    variant="outline" 
                                    className="text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 touch-manipulation"
                                >
                                    Clear Search
                                </Button>
                            )}
                        </div>
                    )
                )}
            </div>
                    </div>
    )
}

export default function EventsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                        <Calendar className="w-8 h-8 text-orange-600 animate-pulse" />
                    </div>
                    <p className="text-lg text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <EventsContent />
        </Suspense>
  )
}
