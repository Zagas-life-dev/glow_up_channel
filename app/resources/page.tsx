"use client"

import { useState, useEffect, Suspense, useRef } from "react"
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BookOpen, ArrowRight, Heart, Bookmark, Eye, Users } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SearchBar from "@/components/search-bar"
import { useAuth } from "@/lib/auth-context"
import AuthGuard from "@/components/auth-guard"

// Utility function to determine if a resource is premium/paid
const isResourcePaid = (resource: any): boolean => {
    return !!(resource.is_premium || resource.isPremium || resource.price || resource.paymentAmount)
}

function ResourcesContent() {
    const [resources, setResources] = useState<any[]>([])
    const [filteredResources, setFilteredResources] = useState<any[]>([])
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

    // Load all resources
  useEffect(() => {
        const fetchAllResources = async () => {
      setLoading(true)
      try {
                let promotedResources: any[] = []
        let recommendedResources: any[] = []
        let regularResources: any[] = []
                
                // Always fetch promoted content (public API)
                try {
                    const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/resources?limit=100`)
                    const promotedData = await promotedRes.json()
                    if (promotedData.success) {
                        promotedResources = promotedData.data?.resources || []
                    }
                } catch (error) {
                    console.error('Error fetching promoted resources:', error)
                }
        
        if (isAuthenticated && user) {
          // Fetch both recommendation and regular API data
          const token = localStorage.getItem('accessToken')
          const headers = { 'Authorization': `Bearer ${token}` }
          
          const [recommendedRes, regularRes] = await Promise.all([
                        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/resources?limit=100`, { headers }),
                        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources?limit=1000&offset=0`)
          ])
          
          const [recommendedData, regularData] = await Promise.all([
            recommendedRes.json(),
            regularRes.json()
          ])
          
          if (recommendedData.success) {
            recommendedResources = recommendedData.data?.resources || []
          }
          
          if (regularData.success) {
            regularResources = regularData.data?.resources || []
                        setTotalCount(regularData.data?.totalCount || regularResources.length)
          }
        } else {
          // Use only regular API for non-authenticated users
                    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources?limit=1000&offset=0`)
          const result = await response.json()
          
          if (result.success) {
            regularResources = result.data?.resources || []
                        setTotalCount(result.data?.totalCount || regularResources.length)
                    }
                }
                
                // Merge and deduplicate: promoted first, then recommended, then regular data
                const mergedResources = [...promotedResources]
                const promotedIds = new Set(promotedResources.map(item => item._id))
                
                // Add recommended resources that are not already in promoted
                const uniqueRecommendedResources = recommendedResources.filter(item => !promotedIds.has(item._id))
                mergedResources.push(...uniqueRecommendedResources)
                
                const recommendedIds = new Set([...promotedResources, ...recommendedResources].map(item => item._id))
                
                // Add regular resources that are not already in promoted or recommended
        const uniqueRegularResources = regularResources.filter(item => !recommendedIds.has(item._id))
        mergedResources.push(...uniqueRegularResources)
        
        setResources(mergedResources)
        setFilteredResources(mergedResources)
        
                console.log(`Loaded ${promotedResources.length} promoted + ${recommendedResources.length} recommended + ${uniqueRegularResources.length} regular = ${mergedResources.length} total resources`)
        
      } catch (error) {
        console.error('Error fetching resources:', error)
        setResources([])
        setFilteredResources([])
      }
      setLoading(false)
    }
        fetchAllResources()
  }, [isAuthenticated, user])

    // Filter resources based on search
    useEffect(() => {
        const lowercasedQuery = searchQuery.toLowerCase()
        const filtered = resources.filter((resource) => {
            return (
                (resource.title?.toLowerCase() || '').includes(lowercasedQuery) ||
                (resource.description?.toLowerCase() || '').includes(lowercasedQuery) ||
                (resource.category?.toLowerCase() || '').includes(lowercasedQuery) ||
                (resource.tags && resource.tags.some((tag: string) => (tag?.toLowerCase() || '').includes(lowercasedQuery))) ||
                ((resource.is_premium ? "premium" : "free").toLowerCase().includes(lowercasedQuery))
            )
  })
        setFilteredResources(filtered)
    }, [searchQuery, resources])

    const handleSearch = (query: string) => {
        setSearchQuery(query)
    }

    const suggestionTags = ["E-books", "Courses", "Templates", "Guides", "Tutorials", "Tools"]

  return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20 text-center">
                    <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
          </div>
        </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-6">
                        Learning Resources
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed">
                        Access e-books, courses, templates, guides, and tools to accelerate your learning and career growth.
                    </p>
                    
                    {/* Search Section */}
                    <div className="max-w-xl mx-auto mb-4 sm:mb-6 md:mb-8">
                        <SearchBar
                  value={searchQuery}
                            onValueChange={handleSearch}
                            placeholder="Search resources by title, category, or type..."
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
                                    Showing {filteredResources.length} result{filteredResources.length !== 1 ? 's' : ''} for 
                                    <span className="font-semibold text-gray-900"> "{searchQuery}"</span>
                                </>
                            ) : (
                                <>Showing {filteredResources.length} resources</>
                      )}
                        </p>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12 sm:py-16 md:py-20">
                        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full mb-4">
                            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 animate-pulse" />
                        </div>
                        <p className="text-base sm:text-lg text-gray-600">Loading resources...</p>
                    </div>
                ) : filteredResources.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                            {filteredResources.map((resource) => (
                            <Card 
                                key={resource._id} 
                                className={`
                                    group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full touch-manipulation
                                    ${resource.isPromoted ? 'border-2 border-yellow-400' : ''}
                                `}
                            >
                                    <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-800 text-xs sm:text-sm font-medium rounded-full capitalize">
                                                {resource.category || 'Resource'}
                                                </span>
                                            </div>
                                            <span className={`text-xs font-medium ${
                                                isResourcePaid(resource) 
                                                ? 'text-purple-500' 
                                                    : 'text-gray-400'
                                            }`}>
                                            {isResourcePaid(resource) ? 'premium' : 'free'}
                                            </span>
                                    </div>
                                    
                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors duration-200">
                                        {resource.title}
                                    </h3>
                                    
                                    <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-3 flex-grow">
                                        {resource.description}
                                    </p>
                                    
                                    <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <BookOpen className="w-4 h-4 flex-shrink-0" />
                                            <span className="capitalize">{resource.category || 'Resource'}</span>
                                        </div>
                                        
                                        {resource.tags && resource.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {resource.tags.slice(0, 3).map((tag: string, index: number) => (
                                                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
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
                                        </div>

                                        {/* Engagement Metrics */}
                                        {resource.metrics && (
                                            <div className="flex items-center justify-between mb-3 sm:mb-4 p-2 bg-gray-50 rounded-lg">
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
                                        {(() => {
                                            // Check if _id is a valid MongoDB ObjectId (24 hex characters)
                                            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(resource._id)
                                            
                                            if (isValidObjectId) {
                                                // Internal resource - use Link to detail page
                                                return (
                                            <Link href={`/resources/${resource._id}`}>
                                                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 sm:py-3 rounded-xl transition-colors duration-200 group">
                                                            Read More
                                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                                                        </Button>
                                                    </Link>
                                                )
                                            } else {
                                                // External resource - open in new tab
                                                return (
                                                    <Button 
                                                        onClick={() => window.open(resource._id, '_blank', 'noopener,noreferrer')}
                                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 sm:py-3 rounded-xl transition-colors duration-200 group"
                                                    >
                                                View Resource
                                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
                                                )
                                            }
                                        })()}
                                    </div>
                                    </CardContent>
                </Card>
              ))}
            </div>
                    ) : (
                        <div className="text-center py-12 sm:py-16 md:py-20">
                            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4 sm:mb-6">
                                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                            </div>
                        <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
                            {searchQuery ? 'No resources found' : 'No resources available'}
                            </h3>
                        <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto">
                                {searchQuery 
                                ? `No resources match your search for "${searchQuery}". Try a different search term.`
                                : 'There are no resources available at the moment. Check back later for new content.'
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

export default function ResourcesPage() {
    return (
        <AuthGuard>
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                            <BookOpen className="w-8 h-8 text-purple-600 animate-pulse" />
                    </div>
                    <p className="text-lg text-gray-600">Loading...</p>
                </div>
    </div>
        }>
            <ResourcesContent />
        </Suspense>
        </AuthGuard>
  )
}