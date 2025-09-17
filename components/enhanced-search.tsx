'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, MapPin, Briefcase, Calendar, BookOpen, X } from 'lucide-react'
import { ApiClient } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
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

export default function EnhancedSearch() {
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
  const { data: session } = useAuth()

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
      const searchResults = await ApiClient.searchContent(searchQuery, filters)
      setResults(searchResults)
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

  const renderResultCard = (item: any, type: string) => (
    <Card key={`${type}-${item.id}`} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
          {item.location && (
            <span className="text-sm text-gray-500 flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {item.location}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-3">
          {item.description?.slice(0, 150)}...
        </p>
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-1">
            {item.tags?.slice(0, 3).map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <Button asChild size="sm" variant="ghost" className="text-orange-600 hover:text-orange-700">
            <Link href={`/${type === 'opportunity' ? 'opportunities' : type + 's'}/${item.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="search"
          placeholder="Search opportunities, events, jobs, and resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-20 py-3 text-lg rounded-full border-gray-300 focus:border-orange-500 focus:ring-orange-500"
        />
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-600"
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
        </Button>
      </div>

      {/* Active Filters */}
      {Object.keys(filters).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.type && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Type: {filters.type}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => removeFilter('type')} />
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Location: {filters.location}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => removeFilter('location')} />
            </Badge>
          )}
          {filters.industry?.map((ind: string) => (
            <Badge key={ind} variant="secondary" className="bg-orange-100 text-orange-800">
              {ind}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter('industry', ind)} />
            </Badge>
          ))}
          {filters.skills?.map((skill: string) => (
            <Badge key={skill} variant="secondary" className="bg-orange-100 text-orange-800">
              {skill}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter('skills', skill)} />
            </Badge>
          ))}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
              <Input
                placeholder="e.g., Lagos, Nigeria"
                value={filters.location || ""}
                onChange={(e) => updateFilter('location', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Industry</label>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {industryOptions.map(industry => (
                  <button
                    key={industry}
                    onClick={() => toggleArrayFilter('industry', industry)}
                    className={`px-2 py-1 text-xs rounded ${
                      filters.industry?.includes(industry)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Skills</label>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {skillOptions.map(skill => (
                  <button
                    key={skill}
                    onClick={() => toggleArrayFilter('skills', skill)}
                    className={`px-2 py-1 text-xs rounded ${
                      filters.skills?.includes(skill)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results {totalResults > 0 && `(${totalResults})`}
            </h3>
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Searching...</span>
              </div>
            )}
          </div>

          {totalResults === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No results found for "{searchQuery}"</p>
              <p className="text-sm text-gray-400 mt-2">Try adjusting your filters or search terms</p>
            </div>
          )}

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="all">All ({totalResults})</TabsTrigger>
              <TabsTrigger value="opportunities">
                <Briefcase className="h-4 w-4 mr-1" />
                Opportunities ({results.opportunities.length})
              </TabsTrigger>
              <TabsTrigger value="jobs">
                <Briefcase className="h-4 w-4 mr-1" />
                Jobs ({results.jobs.length})
              </TabsTrigger>
              <TabsTrigger value="events">
                <Calendar className="h-4 w-4 mr-1" />
                Events ({results.events.length})
              </TabsTrigger>
              <TabsTrigger value="resources">
                <BookOpen className="h-4 w-4 mr-1" />
                Resources ({results.resources.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...results.opportunities.map(item => ({ ...item, type: 'opportunity' })),
                  ...results.jobs.map(item => ({ ...item, type: 'job' })),
                  ...results.events.map(item => ({ ...item, type: 'event' })),
                  ...results.resources.map(item => ({ ...item, type: 'resource' }))
                ].slice(0, 12).map(item => renderResultCard(item, item.type))}
              </div>
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.opportunities.map(item => renderResultCard(item, 'opportunity'))}
              </div>
            </TabsContent>

            <TabsContent value="jobs" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.jobs.map(item => renderResultCard(item, 'job'))}
              </div>
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.events.map(item => renderResultCard(item, 'event'))}
              </div>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.resources.map(item => renderResultCard(item, 'resource'))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
} 