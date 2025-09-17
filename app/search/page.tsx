'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, MapPin, Briefcase, Calendar, BookOpen, X } from 'lucide-react'
import ApiClient from '@/lib/api-client'
import Link from 'next/link'

interface SearchFilters {
  type?: string
  location?: string
  industry?: string[]
  skills?: string[]
}

interface SearchResults {
  opportunities: any[]
  events: any[]
  jobs: any[]
  resources: any[]
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [results, setResults] = useState<SearchResults>({
    opportunities: [],
    events: [],
    jobs: [],
    resources: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const industryOptions = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'Marketing',
    'Design', 'Sales', 'Engineering', 'Consulting', 'Non-profit'
  ]

  const skillOptions = [
    'Web Development', 'Data Science', 'Digital Marketing', 'Project Management',
    'Graphic Design', 'Content Writing', 'Public Speaking', 'Sales'
  ]

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults({ opportunities: [], events: [], jobs: [], resources: [] })
      return
    }

    setIsLoading(true)
    try {
      // Create a comprehensive search by calling each content type with filters
      const searchParams = {
        search: searchQuery,
        limit: 20,
        ...(filters.location && { country: filters.location }),
        ...(filters.type && { 
          ...(filters.type === 'opportunity' && { category: filters.type }),
          ...(filters.type === 'event' && { eventType: filters.type }),
          ...(filters.type === 'job' && { jobType: filters.type }),
          ...(filters.type === 'resource' && { category: filters.type })
        })
      }

      const [opportunitiesRes, eventsRes, jobsRes, resourcesRes] = await Promise.all([
        ApiClient.getOpportunities(searchParams),
        ApiClient.getEvents(searchParams),
        ApiClient.getJobs(searchParams),
        ApiClient.getResources(searchParams)
      ])

      // Filter results by industry and skills if specified
      let filteredOpportunities = opportunitiesRes.opportunities || []
      let filteredEvents = eventsRes.events || []
      let filteredJobs = jobsRes.jobs || []
      let filteredResources = resourcesRes.resources || []

      // Apply industry filter
      if (filters.industry && filters.industry.length > 0) {
        const industryFilter = (item: any) => {
          const itemIndustries = item.industrySectors || item.tags || []
          return filters.industry!.some(industry => 
            itemIndustries.some((itemIndustry: string) => 
              itemIndustry.toLowerCase().includes(industry.toLowerCase())
            )
          )
        }
        filteredOpportunities = filteredOpportunities.filter(industryFilter)
        filteredEvents = filteredEvents.filter(industryFilter)
        filteredJobs = filteredJobs.filter(industryFilter)
        filteredResources = filteredResources.filter(industryFilter)
      }

      // Apply skills filter
      if (filters.skills && filters.skills.length > 0) {
        const skillsFilter = (item: any) => {
          const itemSkills = item.skills || item.tags || []
          return filters.skills!.some(skill => 
            itemSkills.some((itemSkill: string) => 
              itemSkill.toLowerCase().includes(skill.toLowerCase())
            )
          )
        }
        filteredOpportunities = filteredOpportunities.filter(skillsFilter)
        filteredEvents = filteredEvents.filter(skillsFilter)
        filteredJobs = filteredJobs.filter(skillsFilter)
        filteredResources = filteredResources.filter(skillsFilter)
      }

      setResults({
        opportunities: filteredOpportunities,
        events: filteredEvents,
        jobs: filteredJobs,
        resources: filteredResources
      })
    } catch (error) {
      console.error('Search error:', error)
      setResults({ opportunities: [], events: [], jobs: [], resources: [] })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, filters])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        performSearch()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, filters, performSearch])

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const removeFilter = (key: keyof SearchFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }

  const toggleArrayFilter = (key: 'industry' | 'skills', value: string) => {
    setFilters(prev => {
      const current = prev[key] || []
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value]
      return { ...prev, [key]: updated.length ? updated : undefined }
    })
  }

  const totalResults = results.opportunities.length + results.events.length + results.jobs.length + results.resources.length

  const renderResultCard = (item: any, type: string) => {
    // Handle different data structures from backend
    const getLocation = () => {
      if (type === 'opportunity' || type === 'event' || type === 'job') {
        const location = item.location;
        if (location?.city && location?.province && location?.country) {
          return `${location.city}, ${location.province}, ${location.country}`;
        } else if (location?.country) {
          return location.country;
        }
      }
      return null;
    };

    const getDescription = () => {
      return item.description || item.summary || '';
    };

    const getTags = () => {
      return item.tags || item.categories || [];
    };

    return (
      <Card key={`${type}-${item._id}`} className="hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
        <CardContent className="p-4 sm:p-6">
          <div className="flex justify-between items-start mb-3">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 font-medium text-xs sm:text-sm">
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
            {getLocation() && (
              <span className="text-xs sm:text-sm text-gray-500 flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">{getLocation()}</span>
                <span className="sm:hidden">{getLocation().split(',')[0]}</span>
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm sm:text-base">{item.title}</h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 line-clamp-3">
            {getDescription().slice(0, 120)}...
          </p>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex flex-wrap gap-1">
              {getTags().slice(0, 2).map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm w-full sm:w-auto">
              <Link href={`/${type === 'opportunity' ? 'opportunities' : type + 's'}/${item._id}`}>
                View Details
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-7xl">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
          Search Everything
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
          Find opportunities, events, jobs, and resources tailored to your interests
        </p>
      </div>

      <div className="space-y-6">
        {/* Search Input */}
        <div className="relative max-w-2xl mx-auto px-2">
          <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search opportunities, events, jobs, and resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 sm:pl-14 pr-20 sm:pr-24 py-3 sm:py-4 text-base sm:text-lg rounded-2xl border-gray-300 focus:border-orange-500 focus:ring-orange-500 shadow-sm"
          />
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="ghost"
            size="sm"
            className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 hover:bg-orange-50 text-xs sm:text-sm ${
              showFilters ? 'text-orange-600' : 'text-gray-500'
            }`}
          >
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>

        {/* Active Filters */}
        {Object.keys(filters).length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center px-2">
            {filters.type && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs sm:text-sm">
                Type: {filters.type}
                <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => removeFilter('type')} />
              </Badge>
            )}
            {filters.location && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs sm:text-sm">
                Location: {filters.location}
                <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => removeFilter('location')} />
              </Badge>
            )}
            {filters.industry?.map((ind: string) => (
              <Badge key={ind} variant="secondary" className="bg-orange-100 text-orange-800 text-xs sm:text-sm">
                {ind}
                <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter('industry', ind)} />
              </Badge>
            ))}
            {filters.skills?.map((skill: string) => (
              <Badge key={skill} variant="secondary" className="bg-orange-100 text-orange-800 text-xs sm:text-sm">
                {skill}
                <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter('skills', skill)} />
              </Badge>
            ))}
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <Card className="max-w-4xl mx-auto mx-2">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Content Type</label>
                  <Select value={filters.type || ""} onValueChange={(value) => updateFilter('type', value || undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="opportunity">Opportunities</SelectItem>
                      <SelectItem value="job">Jobs</SelectItem>
                      <SelectItem value="event">Events</SelectItem>
                      <SelectItem value="resource">Resources</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Location</label>
                  <Input
                    placeholder="e.g., Lagos, Nigeria"
                    value={filters.location || ""}
                    onChange={(e) => updateFilter('location', e.target.value || undefined)}
                    className="rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Industry</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {industryOptions.map(industry => (
                      <button
                        key={industry}
                        onClick={() => toggleArrayFilter('industry', industry)}
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full transition-colors ${
                          filters.industry?.includes(industry)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-orange-50 hover:text-orange-700'
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Skills</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {skillOptions.map(skill => (
                      <button
                        key={skill}
                        onClick={() => toggleArrayFilter('skills', skill)}
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full transition-colors ${
                          filters.skills?.includes(skill)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-orange-50 hover:text-orange-700'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between max-w-4xl mx-auto px-2">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Search Results {totalResults > 0 && `(${totalResults})`}
              </h3>
              {isLoading && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs sm:text-sm">Searching...</span>
                </div>
              )}
            </div>

            {totalResults === 0 && !isLoading && (
              <div className="text-center py-8 sm:py-12 px-4">
                <Search className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-base sm:text-lg text-gray-500 mb-2">No results found for "{searchQuery}"</p>
                <p className="text-sm text-gray-400">Try adjusting your filters or search terms</p>
              </div>
            )}

            {totalResults > 0 && (
              <Tabs defaultValue="all" className="w-full max-w-6xl mx-auto px-2">
                <TabsList className="grid grid-cols-5 w-full mb-4 sm:mb-6 overflow-x-auto">
                  <TabsTrigger value="all" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs sm:text-sm">
                    All ({totalResults})
                  </TabsTrigger>
                  <TabsTrigger value="opportunities" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs sm:text-sm">
                    <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Opportunities</span>
                    <span className="sm:hidden">Opps</span>
                    ({results.opportunities.length})
                  </TabsTrigger>
                  <TabsTrigger value="jobs" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs sm:text-sm">
                    <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Jobs ({results.jobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="events" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs sm:text-sm">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Events</span>
                    <span className="sm:hidden">Evts</span>
                    ({results.events.length})
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs sm:text-sm">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Resources</span>
                    <span className="sm:hidden">Res</span>
                    ({results.resources.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[
                      ...results.opportunities.map(item => ({ ...item, type: 'opportunity' })),
                      ...results.jobs.map(item => ({ ...item, type: 'job' })),
                      ...results.events.map(item => ({ ...item, type: 'event' })),
                      ...results.resources.map(item => ({ ...item, type: 'resource' }))
                    ].slice(0, 12).map(item => renderResultCard(item, item.type))}
                  </div>
                </TabsContent>

                <TabsContent value="opportunities" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {results.opportunities.map(item => renderResultCard(item, 'opportunity'))}
                  </div>
                </TabsContent>

                <TabsContent value="jobs" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {results.jobs.map(item => renderResultCard(item, 'job'))}
                  </div>
                </TabsContent>

                <TabsContent value="events" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {results.events.map(item => renderResultCard(item, 'event'))}
                  </div>
                </TabsContent>

                <TabsContent value="resources" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {results.resources.map(item => renderResultCard(item, 'resource'))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </div>
  )

} 