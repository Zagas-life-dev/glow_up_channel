"use client"

import { useState, useEffect, Suspense, useRef } from "react"
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Calendar, ArrowRight, Heart, Bookmark, Eye, Users, Dot } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SearchBar from "@/components/search-bar"
import { useAuth } from "@/lib/auth-context"
import AuthGuard from "@/components/auth-guard"

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
                let regularEvents: any[] = []
                
                // Always fetch promoted content (public API)
                try {
                    const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/events?limit=100`)
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
                        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/events?limit=100`, { headers }),
                        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events?limit=1000&offset=0`)
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
                    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events?limit=1000&offset=0`)
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
                
                setEvents(mergedEvents)
                setFilteredEvents(mergedEvents)
                
                console.log(`Loaded ${promotedEvents.length} promoted + ${recommendedEvents.length} recommended + ${uniqueRegularEvents.length} regular = ${mergedEvents.length} total events`)
                
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
                ((event.is_free ? "free" : "paid").toLowerCase().includes(lowercasedQuery))
            )
        })
        setFilteredEvents(filtered)
    }, [searchQuery, events])

    const handleSearch = (query: string) => {
        setSearchQuery(query)
    }

    const suggestionTags = ["Conference", "Workshop", "Meetup", "Webinar", "Hackathon", "Networking"]

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20 text-center">
                    <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-6">
                        Discover Events
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed">
                        Find conferences, workshops, meetups, webinars, and networking events to grow your skills and connections.
                    </p>
                    
                    {/* Search Section */}
                    <div className="max-w-xl mx-auto mb-4 sm:mb-6 md:mb-8">
                        <SearchBar
                            value={searchQuery}
                            onValueChange={handleSearch}
                            placeholder="Search events by title, category, or location..."
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
                                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-full transition-colors duration-200 backdrop-blur-sm"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12">
                {/* Results Summary */}
                {!loading && (
                    <div className="mb-6 sm:mb-8">
                        <p className="text-sm sm:text-base text-gray-600">
                            {searchQuery ? (
                                <>
                                    Showing {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''} for 
                                    <span className="font-semibold text-gray-900"> "{searchQuery}"</span>
                                </>
                            ) : (
                                <>Showing {filteredEvents.length} events</>
                            )}
                        </p>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12 sm:py-16 md:py-20">
                        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-4">
                            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 animate-pulse" />
                        </div>
                        <p className="text-base sm:text-lg text-gray-600">Loading events...</p>
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                        {filteredEvents.map((event) => (
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
                                                {event.category || 'Event'}
                                            </span>
                                        </div>
                                        <span className={`text-xs font-medium ${
                                            event.is_free 
                                                ? 'text-green-500' 
                                                : 'text-gray-400'
                                        }`}>
                                            {event.is_free ? 'free' : 'paid'}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2 group-hover:text-green-600 transition-colors duration-200">
                                        {event.title}
                                    </h3>
                                    
                                    <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-3 flex-grow">
                                        {event.description}
                                    </p>
                                    
                                    <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                                        
                                        
                                       
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <span className="capitalize">{event.location_type || 'Event'}</span>
                                            {event.location && (
                                                <>
                                                    <span className="mx-1 text-gray-300">|</span>
                                                    <span className="truncate">
                                                        {typeof event.location === 'string' 
                                                            ? event.location 
                                                            : event.location.city || event.location.address || 'Location TBD'
                                                        }
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">                            
                                                <span>{new Date(event.date).toLocaleDateString()}</span>
                                        </div>
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
                                    
                                    <div className="mt-auto">
                                        <Link href={`/events/${event._id}`}>
                                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 sm:py-3 rounded-xl transition-colors duration-200 group">
                                                Read More
                                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 sm:py-16 md:py-20">
                        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4 sm:mb-6">
                            <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
                            {searchQuery ? 'No events found' : 'No events available'}
                        </h3>
                        <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto">
                            {searchQuery 
                                ? `No events match your search for "${searchQuery}". Try a different search term.`
                                : 'There are no events available at the moment. Check back later for new events.'
                            }
                        </p>
                        {searchQuery && (
                            <Button 
                                onClick={() => setSearchQuery('')}
                                variant="outline"
                                className="px-6 py-2.5 sm:py-3 rounded-xl"
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