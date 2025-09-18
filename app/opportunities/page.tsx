"use client"

import { useState, useEffect, Suspense, useRef, useCallback } from "react"
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plane, ArrowRight, Heart, Bookmark, Eye, Users, Loader2 } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SearchBar from "@/components/search-bar"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import AuthGuard from "@/components/auth-guard"

function OpportunitiesContent() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [filteredOpportunities, setFilteredOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [totalCount, setTotalCount] = useState(0)
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuth()
  const viewedItems = useRef(new Set<string>())

  // Track view for recommendation learning
  const trackView = async (opportunityId: string) => {
    if (!isAuthenticated || viewedItems.current.has(opportunityId)) return
    
    viewedItems.current.add(opportunityId)
    
    try {
      await ApiClient.trackEngagement('opportunity', opportunityId, 'view')
    } catch (error) {
      console.error('Error tracking view:', error)
      // Don't show error to user as this is background tracking
    }
  }

  useEffect(() => {
    const tag = searchParams.get('tag')
    if (tag) {
      setSearchQuery(tag)
    }
  }, [searchParams])



  // Initial load
  useEffect(() => {
    const fetchInitialOpportunities = async () => {
      setLoading(true)
      try {
        let promotedOpportunities: any[] = []
        let recommendedOpportunities: any[] = []
        let regularOpportunities: any[] = []
        
        // Always fetch promoted content (public API)
        try {
          const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/opportunities?limit=100`)
          const promotedData = await promotedRes.json()
          if (promotedData.success) {
            promotedOpportunities = promotedData.data?.opportunities || []
          }
        } catch (error) {
          console.error('Error fetching promoted opportunities:', error)
        }
        
        if (isAuthenticated && user) {
          // Fetch both recommendation and regular API data
          const token = localStorage.getItem('accessToken')
          const headers = { 'Authorization': `Bearer ${token}` }
          
          const [recommendedRes, regularRes] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/opportunities?limit=100`, { headers }),
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities?limit=1000&offset=0`)
          ])
          
          const [recommendedData, regularData] = await Promise.all([
            recommendedRes.json(),
            regularRes.json()
          ])
          
          if (recommendedData.success) {
            recommendedOpportunities = recommendedData.data?.opportunities || []
          }
          
          if (regularData.success) {
            regularOpportunities = regularData.data?.opportunities || []
            setTotalCount(regularData.data?.totalCount || regularOpportunities.length)
          }
        } else {
          // Use only regular API for non-authenticated users
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities?limit=1000&offset=0`)
          const result = await response.json()
          
          if (result.success) {
            regularOpportunities = result.data?.opportunities || []
            setTotalCount(result.data?.totalCount || regularOpportunities.length)
          }
        }
        
        // Merge and deduplicate: promoted first, then recommended, then regular data
        const mergedOpportunities = [...promotedOpportunities]
        const promotedIds = new Set(promotedOpportunities.map(item => item._id))
        
        // Add recommended opportunities that are not already in promoted
        const uniqueRecommendedOpportunities = recommendedOpportunities.filter(item => !promotedIds.has(item._id))
        mergedOpportunities.push(...uniqueRecommendedOpportunities)
        
        const recommendedIds = new Set([...promotedOpportunities, ...recommendedOpportunities].map(item => item._id))
        
        // Add regular opportunities that are not already in promoted or recommended
        const uniqueRegularOpportunities = regularOpportunities.filter(item => !recommendedIds.has(item._id))
        mergedOpportunities.push(...uniqueRegularOpportunities)
        
        setOpportunities(mergedOpportunities)
        setFilteredOpportunities(mergedOpportunities)
        
        console.log(`Loaded ${promotedOpportunities.length} promoted + ${recommendedOpportunities.length} recommended + ${uniqueRegularOpportunities.length} regular = ${mergedOpportunities.length} total opportunities`)
        
      } catch (error) {
        console.error('Error fetching opportunities:', error)
        setOpportunities([])
        setFilteredOpportunities([])
      }
      setLoading(false)
    }
    fetchInitialOpportunities()
  }, [isAuthenticated, user])

  // Filter opportunities based on search
  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase()
    const filtered = opportunities.filter((opportunity) => {
      return (
        (opportunity.title?.toLowerCase() || '').includes(lowercasedQuery) ||
        (opportunity.description?.toLowerCase() || '').includes(lowercasedQuery) ||
        (opportunity.category?.toLowerCase() || '').includes(lowercasedQuery) ||
        (opportunity.eligibility?.toLowerCase() || '').includes(lowercasedQuery) ||
        (opportunity.tags && opportunity.tags.some((tag: string) => (tag?.toLowerCase() || '').includes(lowercasedQuery))) ||
        ((!opportunity.isPaid ? "free" : "paid").toLowerCase().includes(lowercasedQuery))
      )
    })
    setFilteredOpportunities(filtered)
  }, [searchQuery, opportunities])


  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const suggestionTags = ["Scholarship", "Fellowship", "Internship", "Grant", "Competition", "Mentorship"]

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-black text-white py-16 sm:py-20 md:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-orange-800 opacity-80"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="container px-4 sm:px-6 md:px-8 lg:px-12 relative z-10 text-center">
          <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center">
              <Plane className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-6">
            Discover Opportunities
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed">
            Find scholarships, fellowships, internships, grants, and competitions to advance your career and education.
          </p>
          
          {/* Search Section */}
          <div className="max-w-xl mx-auto mb-4 sm:mb-6 md:mb-8">
            <SearchBar
              value={searchQuery}
              onValueChange={handleSearch}
              placeholder="Search opportunities by title, category, or tags..."
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
                  Showing {filteredOpportunities.length} result{filteredOpportunities.length !== 1 ? 's' : ''} for 
                  <span className="font-semibold text-gray-900"> "{searchQuery}"</span>
                </>
              ) : (
                <>Showing {filteredOpportunities.length} opportunit{filteredOpportunities.length !== 1 ? 'ies' : 'y'}</>
              )}
            </p>
          </div>
        )}


          {loading ? (
            <div className="text-center py-12 sm:py-16 md:py-20">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full mb-4">
                <Plane className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 animate-pulse" />
              </div>
              <p className="text-base sm:text-lg text-gray-600">Loading opportunities...</p>
            </div>
          ) : filteredOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
              {filteredOpportunities.map((opportunity) => (
                <Card 
                  key={opportunity._id} 
                  className={`
                    group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full touch-manipulation
                    ${opportunity.isPromoted ? 'border-2 border-yellow-400' : ''}
                  `}
                  onMouseEnter={() => trackView(opportunity._id)}
                >
                  <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-800 text-xs sm:text-sm font-medium rounded-full capitalize">
                          {opportunity.category || 'Opportunity'}
                        </span>
                      </div>
                      {opportunity.financial?.isPaid !== undefined && (
                        <span className={`text-xs font-medium ${
                          opportunity.financial.isPaid 
                            ? 'text-orange-500' 
                            : 'text-gray-400'
                        }`}>
                          {opportunity.financial.isPaid ? 'paid' : 'free'}
                        </span>
                      )}
                      {opportunity.featured && (
                        <span className="px-2 sm:px-3 py-1 bg-amber-500 text-white text-xs sm:text-sm font-medium rounded-full">
                          Featured
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2 group-hover:text-orange-600 transition-colors line-clamp-2">
                      {opportunity.title}
                    </h3>
                    <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-4 flex-grow line-clamp-3 leading-relaxed">
                      {opportunity.description.length > 150
                        ? `${opportunity.description.substring(0, 150)}...`
                        : opportunity.description
                      }
                    </p>
                    {opportunity.tags && opportunity.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
                        {opportunity.tags.slice(0, 3).map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {opportunity.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                            +{opportunity.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Date Display - Show deadline if available, otherwise show start date */}
                    <div className="flex justify-end mb-3 sm:mb-4">
                      <span className="text-xs text-gray-500">
                        {opportunity.applicationDetails?.deadline 
                          ? `Deadline: ${new Date(opportunity.applicationDetails.deadline).toLocaleDateString()}`
                          : opportunity.dates?.startDate 
                            ? new Date(opportunity.dates.startDate).toLocaleDateString()
                            : 'TBD'
                        }
                      </span>
                    </div>
                    
                    {/* Engagement Metrics */}
                    {opportunity.metrics && (
                      <div className="flex items-center justify-between mb-3 sm:mb-4 p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{opportunity.metrics.viewCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="h-3 w-3 text-red-500" />
                            <span>{opportunity.metrics.likeCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Bookmark className="h-3 w-3 text-blue-500" />
                            <span>{opportunity.metrics.saveCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3 text-green-500" />
                            <span>{opportunity.metrics.applicationCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {opportunity.deadline && (
                      <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
                        Deadline: {new Date(opportunity.deadline).toLocaleDateString()}
                      </p>
                    )}
                      <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs sm:text-sm py-2 sm:py-3 touch-manipulation">
                        <Link href={`/opportunities/${opportunity._id}`}>
                          Read More
                          <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                        </Link>
                      </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            ) : (
            <div className="text-center py-12 sm:py-16 md:py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4 sm:mb-6">
                <Plane className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                No opportunities found
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                {searchQuery 
                  ? `No opportunities match "${searchQuery}". Try adjusting your search.`
                  : "No opportunities are available at the moment."
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
          )}
          
        </div>
    </div>
  )
}

export default function OpportunitiesPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <Plane className="w-8 h-8 text-orange-600 animate-pulse" />
            </div>
            <p className="text-lg text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <OpportunitiesContent />
      </Suspense>
    </AuthGuard>
  )
}
