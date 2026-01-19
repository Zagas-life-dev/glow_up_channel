"use client"

import { useState, useEffect, Suspense, useCallback, useMemo } from "react"
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { 
  Search, 
  ArrowRight, 
  Filter, 
  X, 
  MapPin, 
  Calendar, 
  Briefcase, 
  BookOpen, 
  Target,
  Loader2,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import AuthGuard from "@/components/auth-guard"
import { cn } from "@/lib/utils"
import FeedCard from "@/components/feed-card"
import { useCursorPagination } from "@/hooks/use-cursor-pagination"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

function SearchContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<'all' | 'opportunities' | 'events' | 'jobs' | 'resources'>('all')
  const [filters, setFilters] = useState({
    location: '',
    type: '',
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
    const parts = ['search', searchQuery, activeTab, filters.location, filters.type, filters.industry]
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
      const searchParams = new URLSearchParams({
        search: searchQuery,
        limit: '20',
        ...(filters.location && { country: filters.location }),
        ...(filters.type && { 
          ...(filters.type === 'opportunity' && { category: filters.type }),
          ...(filters.type === 'event' && { eventType: filters.type }),
          ...(filters.type === 'job' && { jobType: filters.type }),
          ...(filters.type === 'resource' && { category: filters.type })
        }),
        ...(filters.industry && { industry: filters.industry })
      })

      if (lastId) {
        searchParams.append('lastId', lastId)
      }

      // Determine which endpoint to call based on active tab
      let endpoint = ''
      let dataKey = ''
      if (activeTab === 'all') {
        // For 'all', we need to fetch from all types and combine
        // For simplicity, we'll fetch from opportunities as the primary type
        // In a real implementation, you might want to fetch from all types
        endpoint = 'opportunities'
        dataKey = 'opportunities'
      } else {
        endpoint = activeTab
        dataKey = activeTab
      }

      const response = await fetch(`${backendUrl}/api/${endpoint}?${searchParams}`)
      const data = await response.json()

      if (data.success) {
        const items = (data.data?.[dataKey] || []).map((item: any) => ({ 
          ...item, 
          type: dataKey.slice(0, -1) // Remove 's' from end
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
    setFilters({ location: '', type: '', industry: '' })
    resetSearch()
  }

  const getCurrentResults = () => {
    return allResults
  }

  const totalResults = allResults.length
  const activeFiltersCount = Object.values(filters).filter(v => v).length

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 lg:pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="py-4">
            <h1 className="text-xl font-bold text-white mb-4">Search</h1>
            
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                placeholder="Search opportunities, events, jobs, and resources..."
                className="pl-12 pr-4 h-12 text-base bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/40 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    resetSearch()
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/[0.05]"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              )}
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-xs text-white/50">Filters:</span>
                {filters.type && (
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    {filters.type}
                    <button
                      onClick={() => clearFilter('type')}
                      className="ml-1.5 hover:text-orange-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.location && (
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {filters.location}
                    <button
                      onClick={() => clearFilter('location')}
                      className="ml-1.5 hover:text-blue-300"
                    >
                      <X className="w-3 h-3" />
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
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  onClick={clearAllFilters}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-white/50 hover:text-white"
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
                  "h-9 border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05] rounded-lg",
                  showFilters && "bg-white/[0.05] text-white border-white/20"
                )}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="pb-4 border-t border-white/[0.06] pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/70 mb-2 block">Content Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="opportunity">Opportunities</option>
                    <option value="event">Events</option>
                    <option value="job">Jobs</option>
                    <option value="resource">Resources</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/70 mb-2 block">Location</label>
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none"
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
                  <label className="text-xs font-medium text-white/70 mb-2 block">Industry</label>
                  <select
                    value={filters.industry}
                    onChange={(e) => handleFilterChange('industry', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 outline-none"
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
              <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.08]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/[0.08] rounded w-32" />
                      <div className="h-3 bg-white/[0.08] rounded w-20" />
                    </div>
                  </div>
                  <div className="h-4 bg-white/[0.08] rounded w-full" />
                  <div className="h-4 bg-white/[0.08] rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery && totalResults === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-orange-500/50" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No results found</h3>
            <p className="text-sm text-white/50 mb-6 max-w-md mx-auto">
              No results match your search for <span className="font-medium text-white">"{searchQuery}"</span>. Try a different search term or adjust your filters.
            </p>
            <Button
              onClick={() => {
                setSearchQuery('')
                resetSearch()
                setFilters({ location: '', type: '', industry: '' })
              }}
              variant="outline"
              className="border-white/10 text-white/70 hover:text-white rounded-full"
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
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            )}

            {/* End of feed message */}
            {!hasMore && allResults.length > 0 && (
              <div className="text-center py-8 text-white/40 text-sm">
                You've reached the end of the search results
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-orange-500/50" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Start your search</h3>
            <p className="text-sm text-white/50 max-w-md mx-auto">
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
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="text-lg text-white/60">Loading...</p>
          </div>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </AuthGuard>
  )
}
