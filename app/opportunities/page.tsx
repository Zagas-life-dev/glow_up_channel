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
import ApiClient from "@/lib/api-client"
import { fetchListBySearch } from "@/lib/fetch-list-search"
import AuthGuard from "@/components/auth-guard"

function OpportunitiesContent() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [filteredOpportunities, setFilteredOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
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



  const fetchInitialOpportunities = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      let promotedOpportunities: any[] = []
      let recommendedOpportunities: any[] = []

      try {
        const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/opportunities?limit=100`)
        if (!promotedRes.ok) throw new Error('Request failed')
        const promotedData = await promotedRes.json()
        if (promotedData.success) {
          promotedOpportunities = promotedData.data?.opportunities || []
        }
      } catch {
        setError(true)
        setLoading(false)
        return
      }

      if (isAuthenticated && user) {
        const token = localStorage.getItem('accessToken')
        const headers = { 'Authorization': `Bearer ${token}` }
        try {
          const recommendedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/opportunities?limit=100`, { headers })
          if (!recommendedRes.ok) throw new Error('Request failed')
          const recommendedData = await recommendedRes.json()
          if (recommendedData.success) {
            recommendedOpportunities = recommendedData.data?.opportunities || []
          }
        } catch {
          // Continue with promoted only
        }
      }

      const mergedOpportunities = [...promotedOpportunities]
      const promotedIds = new Set(promotedOpportunities.map((item: { _id: string }) => item._id))
      const uniqueRecommendedOpportunities = recommendedOpportunities.filter((item: { _id: string }) => !promotedIds.has(item._id))
      mergedOpportunities.push(...uniqueRecommendedOpportunities)

      setOpportunities(mergedOpportunities)
      setFilteredOpportunities(mergedOpportunities)
      setTotalCount(mergedOpportunities.length)
    } catch {
      setOpportunities([])
      setFilteredOpportunities([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    fetchInitialOpportunities()
  }, [fetchInitialOpportunities])

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setFilteredOpportunities(opportunities)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const results = await fetchListBySearch("opportunities", q)
      if (!cancelled) setFilteredOpportunities(results as typeof opportunities)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery, opportunities])


  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const suggestionTags = ["Scholarship", "Fellowship", "Internship", "Grant", "Competition", "Mentorship"]

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-page/95 backdrop-blur-lg border-b border-border -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="max-w-7xl mx-auto py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <FlaticonIcon name="plane" className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Opportunities</h1>
              <p className="text-sm text-muted-foreground">Discover scholarships, fellowships, and more</p>
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

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Results Summary */}
        {!loading && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? (
                <>
                  Showing {filteredOpportunities.length} result{filteredOpportunities.length !== 1 ? 's' : ''} for 
                  <span className="font-semibold text-foreground ml-1">"{searchQuery}"</span>
                </>
              ) : (
                <>Showing {filteredOpportunities.length} opportunit{filteredOpportunities.length !== 1 ? 'ies' : 'y'}</>
              )}
            </p>
          </div>
        )}


          {loading ? (
            <FeedListSkeleton count={8} />
          ) : error ? (
            <ErrorState isNetworkError onRetry={fetchInitialOpportunities} />
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
                          group bg-card border border-border rounded-2xl overflow-hidden hover:bg-muted hover:border-border transition-all duration-300 flex flex-col h-full touch-manipulation cursor-pointer
                    ${opportunity.isPromoted ? 'border-yellow-500/30 bg-yellow-500/5' : ''}
                  `}
                  onMouseEnter={() => trackView(opportunity._id)}
                >
                  <CardContent className="p-4 flex flex-col flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-primary/20 text-orange-400 text-xs font-medium rounded-full capitalize border border-orange-500/30">
                          {opportunity.category || 'Opportunity'}
                        </span>
                      </div>
                      {opportunity.financial?.isPaid !== undefined && (
                        <span className={`text-xs font-medium ${
                          opportunity.financial.isPaid 
                            ? 'text-orange-400' 
                            : 'text-muted-foreground'
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
                    
                    <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">
                      {opportunity.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 flex-grow line-clamp-3 leading-relaxed">
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
                            className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full border border-border"
                          >
                            {tag}
                          </span>
                        ))}
                        {opportunity.tags.length > 3 && (
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full border border-border">
                            +{opportunity.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Date Display - Show deadline if available, otherwise show start date */}
                    <div className="flex justify-end mb-3">
                      <span className="text-xs text-muted-foreground">
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
                      <div className="flex items-center justify-between p-2 bg-muted rounded-lg border border-border">
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <FlaticonIcon name="eye" className="h-3 w-3" />
                            <span>{opportunity.metrics.viewCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FlaticonIcon name="heart" className="h-3 w-3 text-red-400" />
                            <span>{opportunity.metrics.likeCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FlaticonIcon name="bookmark" className="h-3 w-3 text-primary" />
                            <span>{opportunity.metrics.saveCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FlaticonIcon name="users" className="h-3 w-3 text-green-400" />
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
                        group bg-card border border-border rounded-2xl overflow-hidden hover:bg-muted hover:border-border transition-all duration-300 flex flex-col h-full touch-manipulation cursor-pointer
                        ${opportunity.isPromoted ? 'border-yellow-500/30 bg-yellow-500/5' : ''}
                      `}
                      onMouseEnter={() => trackView(opportunity._id)}
                              onClick={() => window.open(opportunity._id, '_blank', 'noopener,noreferrer')}
                    >
                      <CardContent className="p-4 flex flex-col flex-grow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-primary/20 text-orange-400 text-xs font-medium rounded-full capitalize border border-orange-500/30">
                              {opportunity.category || 'Opportunity'}
                            </span>
                          </div>
                          {opportunity.financial?.isPaid !== undefined && (
                            <span className={`text-xs font-medium ${
                              opportunity.financial.isPaid 
                                ? 'text-orange-400' 
                                : 'text-muted-foreground'
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
                        
                        <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">
                          {opportunity.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 flex-grow line-clamp-3 leading-relaxed">
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
                                className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full border border-border"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                    {opportunity.metrics && (
                          <div className="flex items-center justify-between p-2 bg-muted rounded-lg border border-border mb-3">
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <FlaticonIcon name="eye" className="h-3 w-3" />
                                <span>{opportunity.metrics.viewCount || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <FlaticonIcon name="heart" className="h-3 w-3 text-red-400" />
                                <span>{opportunity.metrics.likeCount || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <FlaticonIcon name="bookmark" className="h-3 w-3 text-primary" />
                                <span>{opportunity.metrics.saveCount || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <FlaticonIcon name="users" className="h-3 w-3 text-green-400" />
                                <span>{opportunity.metrics.applicationCount || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {(opportunity.deadline || opportunity.dates?.applicationDeadline) && (
                          <p className="text-xs text-muted-foreground mb-2">
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
              <FlaticonIcon name="plane" className="w-8 h-8 text-muted-foreground" />
            </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No opportunities found
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery 
                  ? `No opportunities match "${searchQuery}". Try adjusting your search.`
                  : "No opportunities are available at the moment."
                }
              </p>
              {searchQuery && (
                <Button 
                  onClick={() => handleSearch("")}
                  variant="outline" 
                  className="text-sm px-4 py-2 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
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
    <Suspense fallback={<PageSkeleton />}>
      <OpportunitiesContent />
    </Suspense>
  )
}
