"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, ArrowRight, Heart, Bookmark, Eye, Users, Calendar, Briefcase, BookOpen, Plane } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import AuthGuard from "@/components/auth-guard"

function SearchContent() {
  const [allResults, setAllResults] = useState({
    opportunities: [] as any[],
    events: [] as any[],
    jobs: [] as any[],
    resources: [] as any[]
  })
  const [filteredResults, setFilteredResults] = useState({
    opportunities: [] as any[],
    events: [] as any[],
    jobs: [] as any[],
    resources: [] as any[]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
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

  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      setSearchQuery(query)
      performSearch(query)
    }
  }, [searchParams])

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setAllResults({ opportunities: [], events: [], jobs: [], resources: [] })
      setFilteredResults({ opportunities: [], events: [], jobs: [], resources: [] })
      return
    }

    setIsLoading(true)
    try {
      // Create a comprehensive search by calling each content type with filters
      const searchParams = {
        search: query,
        limit: '1000',
        offset: '0',
        ...(filters.location && { country: filters.location }),
        ...(filters.type && { 
          ...(filters.type === 'opportunity' && { category: filters.type }),
          ...(filters.type === 'event' && { eventType: filters.type }),
          ...(filters.type === 'job' && { jobType: filters.type }),
          ...(filters.type === 'resource' && { category: filters.type })
        }),
        ...(filters.industry && { industry: filters.industry })
      }

      const [opportunitiesRes, eventsRes, jobsRes, resourcesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities?${new URLSearchParams(searchParams)}`),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events?${new URLSearchParams(searchParams)}`),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/jobs?${new URLSearchParams(searchParams)}`),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources?${new URLSearchParams(searchParams)}`)
      ])

      const [opportunitiesData, eventsData, jobsData, resourcesData] = await Promise.all([
        opportunitiesRes.json(),
        eventsRes.json(),
        jobsRes.json(),
        resourcesRes.json()
      ])

      const newResults = {
        opportunities: opportunitiesData.success ? opportunitiesData.data?.opportunities || [] : [],
        events: eventsData.success ? eventsData.data?.events || [] : [],
        jobs: jobsData.success ? jobsData.data?.jobs || [] : [],
        resources: resourcesData.success ? resourcesData.data?.resources || [] : []
      }

      setAllResults(newResults)
      setFilteredResults(newResults)

    } catch (error) {
      console.error('Search error:', error)
      setAllResults({ opportunities: [], events: [], jobs: [], resources: [] })
      setFilteredResults({ opportunities: [], events: [], jobs: [], resources: [] })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    performSearch(query)
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    performSearch(searchQuery)
  }

  const totalResults = filteredResults.opportunities.length + filteredResults.events.length + 
                      filteredResults.jobs.length + filteredResults.resources.length

    return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20 text-center">
          <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center">
              <Search className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-6">
          Search Everything
        </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed">
            Find opportunities, events, jobs, and resources all in one place.
          </p>
          
          {/* Search Section */}
          <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
            <div className="flex gap-2 sm:gap-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                placeholder="Search opportunities, events, jobs, and resources..."
                className="flex-1 h-12 sm:h-14 text-base sm:text-lg px-4 sm:px-6 rounded-xl text-black sm:rounded-2xl border-0 focus:ring-2 focus:ring-white/20"
          />
          <Button
                onClick={() => handleSearch(searchQuery)}
                className="h-12 sm:h-14 px-6 sm:px-8 bg-white text-gray-900 hover:bg-gray-100 font-medium rounded-xl sm:rounded-2xl"
              >
                Search
          </Button>
        </div>
          </div>

          {/* Filters */}
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="mb-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            
        {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
                <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Content Type" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="opportunity">Opportunities</SelectItem>
                    <SelectItem value="event">Events</SelectItem>
                      <SelectItem value="job">Jobs</SelectItem>
                      <SelectItem value="resource">Resources</SelectItem>
                    </SelectContent>
                  </Select>

                <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Locations</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                    <SelectItem value="UK">UK</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.industry} onValueChange={(value) => handleFilterChange('industry', value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Industries</SelectItem>
                    {industryOptions.map(industry => (
                      <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                  </div>
            )}
                  </div>
                </div>
              </div>

      {/* Results Section */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12">
        {/* Results Summary */}
        {!isLoading && searchQuery && (
          <div className="mb-6 sm:mb-8">
            <p className="text-sm sm:text-base text-gray-600">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''} for 
              <span className="font-semibold text-gray-900"> "{searchQuery}"</span>
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 sm:py-16 md:py-20">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-4">
              <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 animate-pulse" />
            </div>
            <p className="text-base sm:text-lg text-gray-600">Searching...</p>
          </div>
        ) : totalResults > 0 ? (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6 sm:mb-8">
              <TabsTrigger value="all">All ({totalResults})</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities ({filteredResults.opportunities.length})</TabsTrigger>
              <TabsTrigger value="events">Events ({filteredResults.events.length})</TabsTrigger>
              <TabsTrigger value="jobs">Jobs ({filteredResults.jobs.length})</TabsTrigger>
              <TabsTrigger value="resources">Resources ({filteredResults.resources.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-8">
              {/* All Results */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                {[...filteredResults.opportunities, ...filteredResults.events, ...filteredResults.jobs, ...filteredResults.resources].map((item, index) => (
                  <Card key={`${item._id}-${index}`} className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full">
                    <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 mb-3">
                        {item.category === 'opportunity' || item.title?.includes('scholarship') || item.title?.includes('fellowship') ? (
                          <Plane className="w-4 h-4 text-orange-500" />
                        ) : item.category === 'event' || item.date ? (
                          <Calendar className="w-4 h-4 text-green-500" />
                        ) : item.category === 'job' || item.company ? (
                          <Briefcase className="w-4 h-4 text-blue-500" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-purple-500" />
                        )}
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {item.category || (item.date ? 'Event' : item.company ? 'Job' : 'Resource')}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">
                        {item.description}
                      </p>
                      
                      <div className="mt-auto">
                        <Link href={`/${item.category || 'opportunities'}/${item._id}`}>
                          <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-xl transition-colors duration-200 group">
                            Read More
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="opportunities">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                {filteredResults.opportunities.map((opportunity) => (
                  <Card key={opportunity._id} className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full">
                    <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 mb-3">
                        <Plane className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-medium text-gray-500 uppercase">Opportunity</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{opportunity.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">{opportunity.description}</p>
                      
                      {/* Engagement Metrics */}
                      {opportunity.metrics && (
                        <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
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

                      <div className="mt-auto">
                        <Link href={`/opportunities/${opportunity._id}`}>
                          <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-xl transition-colors duration-200 group">
                            Read More
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                  </div>
                </TabsContent>

            <TabsContent value="events">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                {filteredResults.events.map((event) => (
                  <Card key={event._id} className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full">
                    <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-medium text-gray-500 uppercase">Event</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">{event.description}</p>
                      
                      {/* Engagement Metrics */}
                      {event.metrics && (
                        <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
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
                          <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-xl transition-colors duration-200 group">
                            Read More
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                  </div>
                </TabsContent>

            <TabsContent value="jobs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                {filteredResults.jobs.map((job) => (
                  <Card key={job._id} className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full">
                    <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-gray-500 uppercase">Job</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{job.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">{job.description}</p>
                      
                      {/* Engagement Metrics */}
                      {job.metrics && (
                        <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{job.metrics.viewCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="h-3 w-3 text-red-500" />
                              <span>{job.metrics.likeCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Bookmark className="h-3 w-3 text-blue-500" />
                              <span>{job.metrics.saveCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 text-green-500" />
                              <span>{job.metrics.applicationCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-auto">
                        <Link href={`/jobs/${job._id}`}>
                          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors duration-200 group">
                            Read More
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                  </div>
                </TabsContent>

            <TabsContent value="resources">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                {filteredResults.resources.map((resource) => (
                  <Card key={resource._id} className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full">
                    <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-medium text-gray-500 uppercase">Resource</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{resource.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">{resource.description}</p>
                      
                      {/* Engagement Metrics */}
                      {resource.metrics && (
                        <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{resource.metrics.viewCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="h-3 w-3 text-red-500" />
                              <span>{resource.metrics.likeCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Bookmark className="h-3 w-3 text-blue-500" />
                              <span>{resource.metrics.saveCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 text-green-500" />
                              <span>{resource.metrics.downloadCount || 0}</span>
                            </div>
                          </div>
                  </div>
                      )}
                      
                      <div className="mt-auto">
                        <Link href={`/resources/${resource._id}`}>
                          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-xl transition-colors duration-200 group">
                            Read More
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                  </div>
                </TabsContent>
              </Tabs>
        ) : searchQuery ? (
          <div className="text-center py-12 sm:py-16 md:py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4 sm:mb-6">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
              No results found
            </h3>
            <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto">
              No results match your search for "{searchQuery}". Try a different search term or adjust your filters.
            </p>
            <Button 
              onClick={() => setSearchQuery('')}
              variant="outline"
              className="px-6 py-2.5 sm:py-3 rounded-xl"
            >
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16 md:py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4 sm:mb-6">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
              Start your search
            </h3>
            <p className="text-base sm:text-lg text-gray-600 max-w-md mx-auto">
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
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Search className="w-8 h-8 text-gray-600 animate-pulse" />
            </div>
            <p className="text-lg text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </AuthGuard>
  )
} 
