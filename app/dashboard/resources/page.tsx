"use client"

import { useState, useEffect } from 'react'
import { usePage } from "@/contexts/page-context"
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Search, 
  Filter, 
  Play, 
  Headphones, 
  FileText, 
  Download,
  Eye,
  Clock,
  Tag,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

// Utility function to determine if a resource is premium/paid
const isResourcePaid = (resource: any): boolean => {
    return !!(resource.is_premium || resource.isPremium || resource.price || resource.paymentAmount)
}

export default function DashboardResourcesPage() {
  const { setHideNavbar, setHideFooter } = usePage()
  const [resources, setResources] = useState<any[]>([])
  const [filteredResources, setFilteredResources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<string>("newest")
  // Hide navbar and footer for dashboard pages
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // Fetch resources from MySQL backend
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.glowupchannel.com' : 'http://localhost:5000'}/api/resources`)
        const result = await response.json()
        
        if (result.success) {
          setResources(result.data || [])
          setFilteredResources(result.data || [])
        } else {
          console.error('Error fetching resources:', result.error)
          setResources([])
          setFilteredResources([])
        }
      } catch (error) {
        console.error('Error fetching resources:', error)
        setResources([])
        setFilteredResources([])
      }
      setLoading(false)
    }
    fetchResources()
  }, [])

  // Filter and search resources
  useEffect(() => {
    let filtered = resources

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter(resource => resource.resource_type === selectedType)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(resource => 
        resource.title.toLowerCase().includes(query) ||
        resource.description.toLowerCase().includes(query) ||
        (resource.tags && resource.tags.some((tag: string) => tag.toLowerCase().includes(query)))
      )
    }

    // Sort resources
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case "title":
          return a.title.localeCompare(b.title)
        case "type":
          return (a.resource_type || "").localeCompare(b.resource_type || "")
        default:
          return 0
      }
    })

    setFilteredResources(filtered)
  }, [resources, selectedType, searchQuery, sortBy])

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="h-4 w-4" />
      case 'audio':
        return <Headphones className="h-4 w-4" />
      case 'document':
        return <FileText className="h-4 w-4" />
      default:
        return <BookOpen className="h-4 w-4" />
    }
  }

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-800'
      case 'audio':
        return 'bg-purple-100 text-purple-800'
      case 'document':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-orange-100 text-orange-800'
    }
  }

  const resourceTypes = [
    { value: "all", label: "All Types", count: resources.length },
    { value: "video", label: "Videos", count: resources.filter(r => r.resource_type === 'video').length },
    { value: "audio", label: "Audio", count: resources.filter(r => r.resource_type === 'audio').length },
    { value: "document", label: "Documents", count: resources.filter(r => r.resource_type === 'document').length },
    { value: "course", label: "Courses", count: resources.filter(r => r.resource_type === 'course').length }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                My Resources
              </h1>
              <p className="text-gray-600 mt-2">
                Access and manage your learning resources
              </p>
            </div>
            <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl px-6 py-3">
              <Link href="/resources">
                Browse All Resources
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl"
                />
              </div>
            </div>

            {/* Filters Toggle */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="border-gray-200 hover:border-orange-500 hover:bg-orange-50 rounded-xl"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Alphabetical</option>
                <option value="type">By Type</option>
              </select>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-3">
                {resourceTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedType === type.value
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.label}
                    <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs">
                      {type.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            {searchQuery || selectedType !== "all" ? (
              <>
                Showing {filteredResources.length} result{filteredResources.length !== 1 ? 's' : ''}
                {searchQuery && ` for "${searchQuery}"`}
                {selectedType !== "all" && ` in ${resourceTypes.find(t => t.value === selectedType)?.label}`}
              </>
            ) : (
              `Showing all ${filteredResources.length} resources`
            )}
          </p>
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl mb-4">
              <BookOpen className="h-8 w-8 text-white animate-pulse" />
            </div>
            <p className="text-lg text-gray-600">Loading your resources...</p>
          </div>
        ) : filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge 
                      variant={isResourcePaid(resource) ? "default" : "secondary"}
                      className={`${
                        isResourcePaid(resource)
                          ? 'bg-orange-500 hover:bg-orange-600' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {isResourcePaid(resource) ? 'Premium' : 'Free'}
                    </Badge>
                    <div className={`p-2 rounded-lg ${getResourceTypeColor(resource.resource_type)}`}>
                      {getResourceTypeIcon(resource.resource_type)}
                    </div>
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                    {resource.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {resource.author && (
                    <p className="text-sm font-medium text-orange-600 mb-3">
                      By {resource.author}
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                    {resource.description}
                  </p>

                  {/* Resource Type Badge */}
                  {resource.resource_type && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getResourceTypeColor(resource.resource_type)}`}>
                        {resource.resource_type.charAt(0).toUpperCase() + resource.resource_type.slice(1)}
                      </span>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(resource.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {resource.views || 0} views
                    </div>
                  </div>

                  {/* Tags */}
                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {resource.tags.slice(0, 3).map((tag: string, index: number) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {resource.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{resource.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button asChild className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl">
                      <Link href={`/resources/${resource.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </Button>
                    {resource.download_url && (
                      <Button variant="outline" className="border-gray-200 hover:border-purple-500 hover:bg-orange-50 rounded-xl">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-2xl mb-6">
              <BookOpen className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No resources found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedType !== "all" 
                ? "Try adjusting your search or filters."
                : "You haven't saved any resources yet."
              }
            </p>
            {(searchQuery || selectedType !== "all") && (
              <Button 
                onClick={() => {
                  setSearchQuery("")
                  setSelectedType("all")
                }}
                variant="outline" 
                className="px-6 py-3 rounded-xl"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 