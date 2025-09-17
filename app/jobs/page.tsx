"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Briefcase, ArrowRight, Heart, Bookmark, Eye, Users, DollarSign, Building, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SearchBar from "@/components/search-bar"
import { useAuth } from "@/lib/auth-context"

function JobsContent() {
  const [jobs, setJobs] = useState<any[]>([])
  const [filteredJobs, setFilteredJobs] = useState<any[]>([])
  const [displayedJobs, setDisplayedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuth()
  const ITEMS_PER_PAGE = 30

  useEffect(() => {
    const tag = searchParams.get('tag')
    if (tag) {
      setSearchQuery(tag)
    }
  }, [searchParams])

  useEffect(() => {
  const fetchJobs = async () => {
      setLoading(true)
      try {
        let recommendedJobs: any[] = []
        let regularJobs: any[] = []
        let promotedJobs: any[] = []
        
        // Always fetch promoted content (public API)
        try {
          const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/jobs?limit=30`)
          const promotedData = await promotedRes.json()
          if (promotedData.success) {
            promotedJobs = promotedData.data?.jobs || []
          }
        } catch (error) {
          console.error('Error fetching promoted jobs:', error)
        }
        
        if (isAuthenticated && user) {
          // Fetch both recommendation and regular API data
          const token = localStorage.getItem('accessToken')
          const headers = { 'Authorization': `Bearer ${token}` }
          
          const [recommendedRes, regularRes] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/jobs?limit=50`, { headers }),
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/jobs`)
          ])
          
          const [recommendedData, regularData] = await Promise.all([
            recommendedRes.json(),
            regularRes.json()
          ])
          
          if (recommendedData.success) {
            recommendedJobs = recommendedData.data?.jobs || []
          }
          
          if (regularData.success) {
            regularJobs = regularData.data?.jobs || []
          }
        } else {
          // Use only regular API for non-authenticated users
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/jobs`)
      const result = await response.json()
      
      if (result.success) {
            regularJobs = result.data?.jobs || []
          }
        }
        
        // Merge and deduplicate: promoted first, then recommended, then regular data (removing duplicates)
        const mergedJobs = [...promotedJobs]
        const promotedIds = new Set(promotedJobs.map(item => item._id))
        
        // Add recommended jobs that are not already in promoted
        const uniqueRecommendedJobs = recommendedJobs.filter(item => !promotedIds.has(item._id))
        mergedJobs.push(...uniqueRecommendedJobs)
        
        const recommendedIds = new Set([...promotedJobs, ...recommendedJobs].map(item => item._id))
        
        // Add regular jobs that are not already in promoted or recommended
        const uniqueRegularJobs = regularJobs.filter(item => !recommendedIds.has(item._id))
        mergedJobs.push(...uniqueRegularJobs)
        
        setJobs(mergedJobs)
        setFilteredJobs(mergedJobs)
        
        // Initialize displayed jobs with first page
        const initialDisplay = mergedJobs.slice(0, ITEMS_PER_PAGE)
        setDisplayedJobs(initialDisplay)
        setHasMore(mergedJobs.length > ITEMS_PER_PAGE)
        setCurrentPage(1)
        
        console.log(`Loaded ${promotedJobs.length} promoted + ${recommendedJobs.length} recommended + ${uniqueRegularJobs.length} regular = ${mergedJobs.length} total jobs`)
        
      } catch (error) {
        console.error('Error fetching jobs:', error)
        setJobs([])
        setFilteredJobs([])
      }
      setLoading(false)
    }
    fetchJobs()
  }, [isAuthenticated, user])

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase()
    const filtered = jobs.filter((job) => {
      return (
        job.title?.toLowerCase().includes(lowercasedQuery) ||
        job.description?.toLowerCase().includes(lowercasedQuery) ||
        job.company?.toLowerCase().includes(lowercasedQuery) ||
        (job.location?.country || job.location?.province || '').toLowerCase().includes(lowercasedQuery) ||
        job.jobType?.toLowerCase().includes(lowercasedQuery) ||
        (job.requirements?.join(' ') || '').toLowerCase().includes(lowercasedQuery) ||
        (job.tags && job.tags.some((tag: string) => (tag?.toLowerCase() || '').includes(lowercasedQuery)))
      )
    })
    setFilteredJobs(filtered)
    
    // Reset pagination when search changes
    const initialDisplay = filtered.slice(0, ITEMS_PER_PAGE)
    setDisplayedJobs(initialDisplay)
    setHasMore(filtered.length > ITEMS_PER_PAGE)
    setCurrentPage(1)
  }, [searchQuery, jobs])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const loadMore = () => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const nextPage = currentPage + 1
      const startIndex = nextPage * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const nextBatch = filteredJobs.slice(startIndex, endIndex)
      
      setDisplayedJobs(prev => [...prev, ...nextBatch])
      setCurrentPage(nextPage)
      setHasMore(endIndex < filteredJobs.length)
      setLoadingMore(false)
    }, 500)
  }

  const suggestionTags = ["Full-time", "Part-time", "Remote", "Internship", "Contract", "Entry-level"]

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-black text-white py-16 sm:py-20 md:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 opacity-80"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="container px-4 sm:px-6 md:px-8 lg:px-12 relative z-10 text-center">
          <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-6">
            Find Your Dream Job
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed">
            Discover exciting career opportunities with companies looking for talented individuals like you.
          </p>
          
          {/* Search Section */}
          <div className="max-w-xl mx-auto mb-4 sm:mb-6 md:mb-8">
            <SearchBar
              value={searchQuery}
              onValueChange={handleSearch}
              placeholder="Search jobs by title, company, or location..."
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
                  Showing {displayedJobs.length} of {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''} for 
                  <span className="font-semibold text-gray-900"> "{searchQuery}"</span>
                </>
              ) : (
                <>Showing {displayedJobs.length} of {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
        )}


          {loading ? (
          <div className="text-center py-12 sm:py-16 md:py-20">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full mb-4">
              <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 animate-pulse" />
            </div>
            <p className="text-base sm:text-lg text-gray-600">Loading jobs...</p>
            </div>
        ) : displayedJobs.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                {displayedJobs.map((job) => (
              <Card key={job._id} className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col h-full touch-manipulation">
                <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-800 text-xs sm:text-sm font-medium rounded-full capitalize">
                        {job.jobType || 'Job'}
                      </span>
                    </div>
                    {job.pay?.isPaid !== undefined && (
                      <span className={`text-xs font-medium ${
                        job.pay.isPaid 
                          ? 'text-orange-500' 
                          : 'text-gray-400'
                      }`}>
                        {job.pay.isPaid ? 'paid' : 'free'}
                      </span>
                    )}
                      {job.featured && (
                      <span className="px-2 sm:px-3 py-1 bg-amber-500 text-white text-xs sm:text-sm font-medium rounded-full">
                        Featured
                      </span>
                      )}
                    </div>
                    
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2 group-hover:text-orange-600 transition-colors line-clamp-2">
                      {job.title}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-4 flex-grow line-clamp-3 leading-relaxed">
                    {job.description.length > 150
                      ? `${job.description.substring(0, 150)}...`
                      : job.description
                    }
                  </p>
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
                      {job.tags.slice(0, 3).map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {job.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                          +{job.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Organization and Location */}
                  {job.company && (
                    <div className="mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-3 w-3 text-orange-600" />
                        <span className="text-xs sm:text-sm font-medium text-orange-600">
                          {job.company}
                        </span>
                      </div>
                    </div>
                  )}
                  {job.location && (
                    <div className="mb-2 sm:mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-gray-500" />
                        <span className="text-xs sm:text-sm text-gray-500">
                          {job.location?.country && job.location?.province 
                            ? `${job.location.city || ''} ${job.location.province}, ${job.location.country}`.trim()
                            : job.location?.country || 'Remote'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Date Display - Show deadline if available, otherwise show start date */}
                  <div className="flex justify-end mb-3 sm:mb-4">
                    <span className="text-xs text-gray-500">
                      {job.applicationDetails?.deadline 
                        ? `Deadline: ${new Date(job.applicationDetails.deadline).toLocaleDateString()}`
                        : job.dates?.startDate 
                          ? new Date(job.dates.startDate).toLocaleDateString()
                          : 'TBD'
                      }
                    </span>
                  </div>
                  
                  {/* Salary Display */}
                  {job.pay?.isPaid && job.pay.amount && (
                    <div className="mb-3 sm:mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-thin text-gray-500">Salary:</span>
                        <span className="text-sm font-medium text-orange-600">{job.pay.currency || 'NGN'} {job.pay.amount}</span>
                        {job.pay.period && (
                          <span className="text-xs font-thin text-gray-400">({job.pay.period})</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Engagement Metrics */}
                  {job.metrics && (
                    <div className="flex items-center justify-between mb-3 sm:mb-4 p-2 bg-gray-50 rounded-lg">
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
                    <Button asChild className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs sm:text-sm py-2 sm:py-3 touch-manipulation">
                      <Link href={`/jobs/${job._id}`}>
                        Read More
                        <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                      </Link>
                    </Button>
                </CardContent>
                </Card>
                ))}
            </div>
            
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-8 sm:mt-10 md:mt-12">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading more...
                    </>
                  ) : (
                    <>
                      Load More Jobs
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* End of Results Message */}
            {!hasMore && filteredJobs.length > ITEMS_PER_PAGE && (
              <div className="text-center mt-8 sm:mt-10 md:mt-12">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
                  <Briefcase className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm sm:text-base text-gray-600">
                  You've reached the end! No more jobs to load.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 sm:py-16 md:py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4 sm:mb-6">
              <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              No jobs found
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              {searchQuery 
                ? `No jobs match "${searchQuery}". Try adjusting your search.`
                : "No jobs are available at the moment."
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

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Briefcase className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <JobsContent />
    </Suspense>
  )
}
