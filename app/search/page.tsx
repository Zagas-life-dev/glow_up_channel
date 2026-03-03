"use client"

import { useState, useEffect, Suspense, useCallback, useMemo } from "react"
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FlaticonIcon } from "@/components/ui/flaticon-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import AuthGuard from "@/components/auth-guard"
import { cn } from "@/lib/utils"
import FeedCard from "@/components/feed-card"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { X } from "lucide-react"

function SearchContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<'all' | 'opportunities' | 'events' | 'jobs' | 'resources'>('all')
  const [filters, setFilters] = useState({
    location: '',
    contentType: '', // high-level type: opportunity | event | job | resource
    industry: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuth()

  const industryOptions = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Marketing',
    'Design', 'Sales', 'Engineering', 'Consulting', 'Non-profit'
  ]

  // Storage key based on search query and filters
  const storageKey = useMemo(() => {
    const parts = ['search', searchQuery, activeTab, filters.location, filters.contentType, filters.industry]
    return parts.filter(Boolean).join('_')
  }, [searchQuery, activeTab, filters])

  // Fetch function for search
  const fetchSearchResults = useCallback(async (lastId: string | null) => {
    if (!searchQuery.trim()) {
      return { items: [], lastId: null, hasMore: false }
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!backendUrl) {
      return { items: [], lastId: null, hasMore: false }
    }

    try {
      const queryParams = new URLSearchParams({
        search: searchQuery,
        limit: '20'
      })

      // Map generic filters into backend-specific query params later per endpoint

      if (lastId) {
        queryParams.append('lastId', lastId)
      }

      // Determine the specific content type to search (if any)
      const typeToSearch = filters.contentType || (activeTab === 'all' ? '' : activeTab)

      if (!typeToSearch) {
        // Search ALL endpoints concurrently if no specific type is requested
        // Note: For a combined search, we fetch the first page from all collections.
        // True cursor pagination across disparate collections without an aggregation backend is complex,
        // so we'll return a rich combined first page (up to 80 items) and disable infinite scroll for "All".
        if (lastId) {
           // We already fetched the combined "All" page, don't fetch more to avoid duplicates
           return { items: [], lastId: null, hasMore: false }
        }

        // Build per-endpoint query strings so filters map correctly
        const oppParams = new URLSearchParams(queryParams.toString())
        const eventParams = new URLSearchParams(queryParams.toString())
        const jobParams = new URLSearchParams(queryParams.toString())
        const resourceParams = new URLSearchParams(queryParams.toString())

        if (filters.location) {
          // Opportunities/events use country; jobs use location text; resources currently have no location filter
          oppParams.append('country', filters.location)
          eventParams.append('country', filters.location)
          jobParams.append('location', filters.location)
        }

        if (filters.industry) {
          // Map industry into a generic search term where supported
          oppParams.append('search', `${searchQuery} ${filters.industry}`)
          jobParams.append('search', `${searchQuery} ${filters.industry}`)
        }

        const [opportunitiesRes, eventsRes, jobsRes, resourcesRes] = await Promise.all([
          fetch(`${backendUrl}/api/opportunities?${oppParams.toString()}`),
          fetch(`${backendUrl}/api/events?${eventParams.toString()}`),
          fetch(`${backendUrl}/api/jobs?${jobParams.toString()}`),
          fetch(`${backendUrl}/api/resources?${resourceParams.toString()}`)
        ])

        const [opportunitiesData, eventsData, jobsData, resourcesData] = await Promise.all([
          opportunitiesRes.json(),
          eventsRes.json(),
          jobsRes.json(),
          resourcesRes.json()
        ])

        const combinedItems = [
          ...(opportunitiesData.success ? (opportunitiesData.data?.opportunities || []).map((i: any) => ({ ...i, type: 'opportunity' })) : []),
          ...(eventsData.success ? (eventsData.data?.events || []).map((i: any) => ({ ...i, type: 'event' })) : []),
          ...(jobsData.success ? (jobsData.data?.jobs || []).map((i: any) => ({ ...i, type: 'job' })) : []),
          ...(resourcesData.success ? (resourcesData.data?.resources || []).map((i: any) => ({ ...i, type: 'resource' })) : [])
        ]

        // Sort combined results by score (if available) or date
        combinedItems.sort((a, b) => {
          if (a.score && b.score) return b.score - a.score
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

        return { items: combinedItems, lastId: null, hasMore: false }
      }

      // We are searching a SPECIFIC type
      let endpoint = ''
      let dataKey = ''

      if (typeToSearch === 'opportunity' || typeToSearch === 'opportunities') {
        endpoint = 'opportunities'
        dataKey = 'opportunities'
        if (filters.location) queryParams.append('country', filters.location)
        if (filters.industry) queryParams.append('search', `${searchQuery} ${filters.industry}`)
      } else if (typeToSearch === 'event' || typeToSearch === 'events') {
        endpoint = 'events'
        dataKey = 'events'
        if (filters.location) queryParams.append('country', filters.location)
      } else if (typeToSearch === 'job' || typeToSearch === 'jobs') {
        endpoint = 'jobs'
        dataKey = 'jobs'
        if (filters.location) queryParams.append('location', filters.location)
        if (filters.industry) queryParams.append('search', `${searchQuery} ${filters.industry}`)
      } else if (typeToSearch === 'resource' || typeToSearch === 'resources') {
        endpoint = 'resources'
        dataKey = 'resources'
        // resources currently don't support location/industry filters in backend
      }

      const response = await fetch(`${backendUrl}/api/${endpoint}?${queryParams.toString()}`)
      const data = await response.json()

      if (data.success) {
        const items = (data.data?.[dataKey] || []).map((item: any) => ({ 
          ...item, 
          type: dataKey === 'opportunities' ? 'opportunity' : dataKey.slice(0, -1)
        }))
        
        return {
          items,
          lastId: data.data?.pagination?.lastId || (items.length > 0 ? items[items.length - 1]._id : null),
          hasMore: data.data?.pagination?.hasMore || false
        }
      }
      return { items: [], lastId: null, hasMore: false }
    } catch (error) {
      console.error('Search error:', error)
      return { items: [], lastId: null, hasMore: false }
    }
  }, [searchQuery, activeTab, filters])

  // Use cursor pagination hook
  const {
    items: allResults,
    isLoading,
    hasMore,
    loadMore,
    reset: resetSearch
  } = useCursorPagination<any>({
    fetchFunction: fetchSearchResults,
    storageKey,
    resetOnMount: false,
    limit: 20
  })

  // Use infinite scroll hook
  const { sentinelRef, threshold } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    itemsBeforeLoad: 5, // Start loading when 5 items from the end
    estimatedItemHeight: 350 // Estimated height of each search result card
  })

  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      setSearchQuery(query)
      resetSearch()
    }
  }, [searchParams])

  // Debounce search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      resetSearch()
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, resetSearch])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    resetSearch()
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    resetSearch()
  }

  const clearFilter = (key: string) => {
    const newFilters = { ...filters, [key]: '' }
    setFilters(newFilters)
    resetSearch()
  }

  const clearAllFilters = () => {
    setFilters({ location: '', contentType: '', industry: '' })
    resetSearch()
  }

  const getCurrentResults = () => {
    return allResults
  }

  const totalResults = allResults.length
  const activeFiltersCount = Object.values(filters).filter(v => v).length

  return (
    <div className="min-h-screen bg-page pb-24 lg:pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-page/80 backdrop-blur-2xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="py-4">
            <h1 className="text-xl font-bold text-foreground mb-4">Search</h1>
            
            {/* Search Input */}
            <div className="relative mb-4">
              <FlaticonIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                placeholder="Search opportunities, events, jobs, and resources..."
                className="pl-12 pr-4 h-12 text-base bg-muted border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    resetSearch()
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-xs text-muted-foreground">Filters:</span>
                {filters.contentType && (
                  <Badge variant="secondary" className="bg-primary/20 text-orange-400 border-orange-500/30">
                    {filters.contentType}
                    <button
                      onClick={() => clearFilter('contentType')}
                      className="ml-1.5 hover:text-orange-300"
                    >
                      <FlaticonIcon name="cross" className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.location && (
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                    {filters.location}
                    <button
                      onClick={() => clearFilter('location')}
                      className="ml-1.5 hover:text-primary"
                    >
                      <FlaticonIcon name="cross" className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.industry && (
                  <Badge variant="secondary" className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                    {filters.industry}
                    <button
                      onClick={() => clearFilter('industry')}
                      className="ml-1.5 hover:text-violet-300"
                    >
                      <FlaticonIcon name="cross" className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  onClick={clearAllFilters}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Filter Toggle */}
            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg",
                  showFilters && "bg-muted text-foreground border-border"
                )}
              >
                <FlaticonIcon name="sliders" className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-foreground rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="pb-4 border-t border-border pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Content Type</label>
                  <select
                    value={filters.contentType}
                    onChange={(e) => handleFilterChange('contentType', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-muted border border-border text-foreground text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="opportunity">Opportunities</option>
                    <option value="event">Events</option>
                    <option value="job">Jobs</option>
                    <option value="resource">Resources</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Location</label>
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-muted border border-border text-foreground text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none"
                  >
                    <option value="">All Locations</option>
                    <option value="Remote">Remote</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                    <option value="Canada">Canada</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Industry</label>
                  <select
                    value={filters.industry}
                    onChange={(e) => handleFilterChange('industry', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-muted border border-border text-foreground text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none"
                  >
                    <option value="">All Industries</option>
                    {industryOptions.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {isLoading && allResults.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border p-5">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-32" />
                      <div className="h-3 bg-muted rounded w-20" />
                    </div>
                  </div>
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery && totalResults === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mx-auto mb-4">
              <FlaticonIcon name="search" className="w-10 h-10 text-orange-500/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              No results match your search for <span className="font-medium text-foreground">"{searchQuery}"</span>. Try a different search term or adjust your filters.
            </p>
            <Button
              onClick={() => {
                setSearchQuery('')
                resetSearch()
                setFilters({ location: '', contentType: '', industry: '' })
              }}
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground rounded-full"
            >
              Clear Search
            </Button>
          </div>
        ) : searchQuery && totalResults > 0 ? (
          <div className="space-y-4">
            {getCurrentResults().map((item) => (
              <FeedCard
                key={item._id}
                item={item}
              />
            ))}

            {/* Infinite scroll sentinel */}
            <div
              ref={sentinelRef}
              style={{
                height: '1px',
                width: '100%',
                marginTop: `${threshold}px`
              }}
            />

            {/* Loading indicator */}
            {isLoading && allResults.length > 0 && (
              <div className="flex items-center justify-center py-8">
                <FlaticonIcon name="spinner" className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            )}

            {/* End of feed message */}
            {!hasMore && allResults.length > 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                You've reached the end of the search results
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mx-auto mb-4">
              <FlaticonIcon name="sparkles" className="w-10 h-10 text-orange-500/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Start your search</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Enter a search term above to find opportunities, events, jobs, and resources.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FlaticonIcon name="spinner" className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Loading...</p>
          </div>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </AuthGuard>
  )
}
