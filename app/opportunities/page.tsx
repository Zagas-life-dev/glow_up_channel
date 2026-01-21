"use client"

import { useState, useEffect, Suspense, useRef, useCallback } from "react"
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
        
        // Always fetch promoted content (public API)
        try {
          const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/opportunities?limit=100`)
          const promotedData = await promotedRes.json()
          if (promotedData.success) {
            promotedOpportunities = promotedData.data?.opportunities || []
          }
        } catch (error) {
          console.error('Error fetching promoted opportunities:', error)
          // Continue with empty array - don't block the page
        }
        
        if (isAuthenticated && user) {
          // Fetch recommendation API data
          const token = localStorage.getItem('accessToken')
          const headers = { 'Authorization': `Bearer ${token}` }
          
          try {
            const recommendedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/opportunities?limit=100`, { headers })
            
            if (!recommendedRes.ok) {
              throw new Error(`HTTP ${recommendedRes.status}: ${recommendedRes.statusText}`)
            }
            
            const recommendedData = await recommendedRes.json()
          
            if (recommendedData.success) {
              recommendedOpportunities = recommendedData.data?.opportunities || []
            }
          } catch (error) {
            console.error('Error fetching recommended opportunities:', error)
            // Continue with empty array - don't block the page
            // User will still see promoted opportunities
          }
        }
        
        // Merge and deduplicate: promoted first, then recommended
        const mergedOpportunities = [...promotedOpportunities]
        const promotedIds = new Set(promotedOpportunities.map(item => item._id))
        
        // Add recommended opportunities that are not already in promoted
        const uniqueRecommendedOpportunities = recommendedOpportunities.filter(item => !promotedIds.has(item._id))
        mergedOpportunities.push(...uniqueRecommendedOpportunities)
        
        setOpportunities(mergedOpportunities)
        setFilteredOpportunities(mergedOpportunities)
        setTotalCount(mergedOpportunities.length)
        
        console.log(`Loaded ${promotedOpportunities.length} promoted + ${recommendedOpportunities.length} recommended = ${mergedOpportunities.length} total opportunities`)
        
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
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-white/[0.06] -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="max-w-7xl mx-auto py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Plane className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Opportunities</h1>
              <p className="text-sm text-white/50">Discover scholarships, fellowships, and more</p>
            </div>
          </div>
          
          {/* Search Section */}
          <div className="mb-4">
            <SearchBar
              value={searchQuery}
              onValueChange={handleSearch}
              placeholder="Search opportunities by title, category, or tags..."
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

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Results Summary */}
        {!loading && (
          <div className="mb-6">
            <p className="text-sm text-white/60">
              {searchQuery ? (
                <>
                  Showing {filteredOpportunities.length} result{filteredOpportunities.length !== 1 ? 's' : ''} for 
                  <span className="font-semibold text-white ml-1">"{searchQuery}"</span>
                </>
              ) : (
                <>Showing {filteredOpportunities.length} opportunit{filteredOpportunities.length !== 1 ? 'ies' : 'y'}</>
              )}
            </p>
          </div>
        )}


          {loading ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.05] mb-4">
                <Plane className="w-8 h-8 text-orange-500 animate-pulse" />
              </div>
              <p className="text-base text-white/60">Loading opportunities...</p>
            </div>
          ) : filteredOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOpportunities.map((opportunity) => {
                // Check if _id is a valid MongoDB ObjectId (24 hex characters)
                const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(opportunity._id)
                
                if (isValidObjectId) {
                  // Internal opportunity - make entire card clickable
                  return (
                    <Link key={opportunity._id} href={`/opportunities/${opportunity._id}`} className="block">
                <Card 
                  className={`
                          group bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 flex flex-col h-full touch-manipulation cursor-pointer
                    ${opportunity.isPromoted ? 'border-yellow-500/30 bg-yellow-500/5' : ''}
                  `}
                  onMouseEnter={() => trackView(opportunity._id)}
                >
                  <CardContent className="p-4 flex flex-col flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-full capitalize border border-orange-500/30">
                          {opportunity.category || 'Opportunity'}
                        </span>
                      </div>
                      {opportunity.financial?.isPaid !== undefined && (
                        <span className={`text-xs font-medium ${
                          opportunity.financial.isPaid 
                            ? 'text-orange-400' 
                            : 'text-white/40'
                        }`}>
                          {opportunity.financial.isPaid ? 'paid' : 'free'}
                        </span>
                      )}
                      {opportunity.featured && (
                        <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full border border-yellow-500/30">
                          Featured
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-base font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">
                      {opportunity.title}
                    </h3>
                    <p className="text-sm text-white/60 mb-3 flex-grow line-clamp-3 leading-relaxed">
                      {opportunity.description.length > 150
                        ? `${opportunity.description.substring(0, 150)}...`
                        : opportunity.description
                      }
                    </p>
                    {opportunity.tags && opportunity.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {opportunity.tags.slice(0, 3).map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-white/[0.05] text-white/60 text-xs rounded-full border border-white/[0.1]"
                          >
                            {tag}
                          </span>
                        ))}
                        {opportunity.tags.length > 3 && (
                          <span className="px-2 py-0.5 bg-white/[0.05] text-white/40 text-xs rounded-full border border-white/[0.1]">
                            +{opportunity.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Date Display - Show deadline if available, otherwise show start date */}
                    <div className="flex justify-end mb-3">
                      <span className="text-xs text-white/40">
                        {opportunity.dates?.applicationDeadline 
                          ? ` ${new Date(opportunity.dates.applicationDeadline).toLocaleDateString()}`
                          : opportunity.applicationDetails?.deadline 
                            ? ` ${new Date(opportunity.applicationDetails.deadline).toLocaleDateString()}`
                          : opportunity.dates?.startDate 
                            ? new Date(opportunity.dates.startDate).toLocaleDateString()
                            : 'TBD'
                        }
                      </span>
                    </div>
                    
                    {/* Engagement Metrics */}
                    {opportunity.metrics && (
                      <div className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                        <div className="flex items-center space-x-4 text-xs text-white/50">
                          <div className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{opportunity.metrics.viewCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="h-3 w-3 text-red-400" />
                            <span>{opportunity.metrics.likeCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Bookmark className="h-3 w-3 text-blue-400" />
                            <span>{opportunity.metrics.saveCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3 text-green-400" />
                            <span>{opportunity.metrics.applicationCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                        </CardContent>
                      </Card>
                              </Link>
                          )
                        } else {
                  // External opportunity - make entire card clickable to open in new tab
                          return (
                    <Card 
                      key={opportunity._id}
                      className={`
                        group bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 flex flex-col h-full touch-manipulation cursor-pointer
                        ${opportunity.isPromoted ? 'border-yellow-500/30 bg-yellow-500/5' : ''}
                      `}
                      onMouseEnter={() => trackView(opportunity._id)}
                              onClick={() => window.open(opportunity._id, '_blank', 'noopener,noreferrer')}
                    >
                      <CardContent className="p-4 flex flex-col flex-grow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-full capitalize border border-orange-500/30">
                              {opportunity.category || 'Opportunity'}
                            </span>
                          </div>
                          {opportunity.financial?.isPaid !== undefined && (
                            <span className={`text-xs font-medium ${
                              opportunity.financial.isPaid 
                                ? 'text-orange-400' 
                                : 'text-white/40'
                            }`}>
                              {opportunity.financial.isPaid ? 'paid' : 'free'}
                            </span>
                          )}
                          {opportunity.featured && (
                            <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full border border-yellow-500/30">
                              Featured
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-base font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">
                          {opportunity.title}
                        </h3>
                        <p className="text-sm text-white/60 mb-3 flex-grow line-clamp-3 leading-relaxed">
                          {opportunity.description.length > 150
                            ? `${opportunity.description.substring(0, 150)}...`
                            : opportunity.description
                          }
                        </p>
                        {opportunity.tags && opportunity.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {opportunity.tags.slice(0, 3).map((tag: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-white/[0.05] text-white/60 text-xs rounded-full border border-white/[0.1]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {opportunity.metrics && (
                          <div className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-3">
                            <div className="flex items-center space-x-4 text-xs text-white/50">
                              <div className="flex items-center space-x-1">
                                <Eye className="h-3 w-3" />
                                <span>{opportunity.metrics.viewCount || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Heart className="h-3 w-3 text-red-400" />
                                <span>{opportunity.metrics.likeCount || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Bookmark className="h-3 w-3 text-blue-400" />
                                <span>{opportunity.metrics.saveCount || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3 text-green-400" />
                                <span>{opportunity.metrics.applicationCount || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {(opportunity.deadline || opportunity.dates?.applicationDeadline) && (
                          <p className="text-xs text-white/40 mb-2">
                            Deadline: {new Date(opportunity.deadline || opportunity.dates?.applicationDeadline).toLocaleDateString()}
                          </p>
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
                <Plane className="w-8 h-8 text-white/30" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No opportunities found
              </h3>
              <p className="text-sm text-white/50 mb-6">
                {searchQuery 
                  ? `No opportunities match "${searchQuery}". Try adjusting your search.`
                  : "No opportunities are available at the moment."
                }
              </p>
              {searchQuery && (
                <Button 
                  onClick={() => handleSearch("")}
                  variant="outline" 
                  className="text-sm px-4 py-2 border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl"
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
