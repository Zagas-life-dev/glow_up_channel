"use client"

import { useState, useEffect, Suspense, useRef } from "react"
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Briefcase, ArrowRight, Heart, Bookmark, Eye, Users, Clock, DollarSign, MapPin } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SearchBar from "@/components/search-bar"
import { useAuth } from "@/lib/auth-context"
import AuthGuard from "@/components/auth-guard"

function JobsContent() {
  const [jobs, setJobs] = useState<any[]>([])
  const [filteredJobs, setFilteredJobs] = useState<any[]>([])
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

  // Load all jobs
  useEffect(() => {
    const fetchAllJobs = async () => {
      setLoading(true)
      try {
        let promotedJobs: any[] = []
        let recommendedJobs: any[] = []
        
        // Always fetch promoted content (public API)
        try {
          const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/jobs?limit=100`)
          const promotedData = await promotedRes.json()
          if (promotedData.success) {
            promotedJobs = promotedData.data?.jobs || []
          }
        } catch (error) {
          console.error('Error fetching promoted jobs:', error)
        }
        
        if (isAuthenticated && user) {
          // Fetch recommendation API data
          const token = localStorage.getItem('accessToken')
          const headers = { 'Authorization': `Bearer ${token}` }
          
          try {
            const recommendedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/jobs?limit=100`, { headers })
            const recommendedData = await recommendedRes.json()
          
          if (recommendedData.success) {
            recommendedJobs = recommendedData.data?.jobs || []
          }
          } catch (error) {
            console.error('Error fetching recommended jobs:', error)
          }
        }
        
        // Merge and deduplicate: promoted first, then recommended
        const mergedJobs = [...promotedJobs]
        const promotedIds = new Set(promotedJobs.map(item => item._id))
        
        // Add recommended jobs that are not already in promoted
        const uniqueRecommendedJobs = recommendedJobs.filter(item => !promotedIds.has(item._id))
        mergedJobs.push(...uniqueRecommendedJobs)
        
        setJobs(mergedJobs)
        setFilteredJobs(mergedJobs)
        setTotalCount(mergedJobs.length)
        
        console.log(`Loaded ${promotedJobs.length} promoted + ${recommendedJobs.length} recommended = ${mergedJobs.length} total jobs`)
        
      } catch (error) {
        console.error('Error fetching jobs:', error)
        setJobs([])
        setFilteredJobs([])
      }
      setLoading(false)
    }
    fetchAllJobs()
  }, [isAuthenticated, user])

  // Filter jobs based on search
  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase()
    const filtered = jobs.filter((job) => {
      return (
        (job.title?.toLowerCase() || '').includes(lowercasedQuery) ||
        (job.description?.toLowerCase() || '').includes(lowercasedQuery) ||
        (job.company?.toLowerCase() || '').includes(lowercasedQuery) ||
        (typeof job.location === 'string' ? job.location : job.location?.city || job.location?.address || '').toLowerCase().includes(lowercasedQuery) ||
        (job.job_type?.toLowerCase() || '').includes(lowercasedQuery) ||
        (job.tags && job.tags.some((tag: string) => (tag?.toLowerCase() || '').includes(lowercasedQuery)))
      )
    })
    setFilteredJobs(filtered)
  }, [searchQuery, jobs])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const suggestionTags = ["Remote", "Full-time", "Part-time", "Internship", "Contract", "Freelance"]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20 text-center">
          <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3 sm:mb-4 md:mb-6">
            Find Your Dream Job
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed">
            Discover remote, full-time, part-time, and internship opportunities from top companies worldwide.
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
                  Showing {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''} for 
                  <span className="font-semibold text-gray-900"> "{searchQuery}"</span>
                </>
              ) : (
                <>Showing {filteredJobs.length} jobs</>
              )}
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 sm:py-16 md:py-20">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-4">
              <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 animate-pulse" />
            </div>
            <p className="text-base sm:text-lg text-gray-600">Loading jobs...</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {filteredJobs.map((job) => {
              // Check if _id is a valid MongoDB ObjectId (24 hex characters)
              const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(job._id)
              
              if (isValidObjectId) {
                // Internal job - make entire card clickable
                return (
                  <Link key={job._id} href={`/jobs/${job._id}`} className="block">
              <Card 
                className={`
                        group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full touch-manipulation cursor-pointer
                  ${job.isPromoted ? 'border-2 border-yellow-400' : ''}
                `}
              >
                <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium rounded-full capitalize">
                        {job.job_type || 'Job'}
                      </span>
                    </div>
                    {job.salary && (
                      <span className="text-xs font-medium text-green-600">
                        {job.salary}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
                    {job.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-2 sm:mb-3 font-medium">
                    {job.company}
                  </p>
                  
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-3 flex-grow">
                    {job.description}
                  </p>
                  
                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
       {job.location && (
         <div className="flex items-center gap-2 text-sm text-gray-500">
           <MapPin className="w-4 h-4 flex-shrink-0 " color="#2563eb"></MapPin>
           <span className="truncate">
             {typeof job.location === 'string' 
               ? job.location 
               : job.location.isRemote ? 'Remote' : 
                 [job.location.city, job.location.country]
                   .filter(Boolean)
                   .join(', ') || 'Location TBD'
             }
           </span>
         </div>
       )}
                    
                    {job.job_type && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="capitalize">{job.job_type}</span>
                      </div>
                    )}
                    
                    {job.salary && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <DollarSign className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium text-green-600">{job.salary}</span>
                      </div>
                    )}
                    
                    {job.category && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Briefcase className="w-4 h-4 flex-shrink-0" />
                        <span className="capitalize">{job.category}</span>
                      </div>
                    )}
                  </div>
                  
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
                  
                    </CardContent>
                    </Card>
                          </Link>
                        )
                      } else {
                // External job - make entire card clickable to open in new tab
                        return (
                  <Card 
                    key={job._id}
                    className={`
                      group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full touch-manipulation cursor-pointer
                      ${job.isPromoted ? 'border-2 border-yellow-400' : ''}
                    `}
                            onClick={() => window.open(job._id, '_blank', 'noopener,noreferrer')}
                  >
                    <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium rounded-full capitalize">
                            {job.job_type || 'Job'}
                          </span>
                        </div>
                        {job.salary && (
                          <span className="text-xs font-medium text-green-600">
                            {job.salary}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
                        {job.title}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-2 sm:mb-3 font-medium">
                        {job.company}
                      </p>
                      
                      <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-3 flex-grow">
                        {job.description}
                      </p>
                      
                      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
       {job.location && (
         <div className="flex items-center gap-2 text-sm text-gray-500">
           <span className="w-4 h-4 flex-shrink-0">📍</span>
           <span className="truncate">
             {typeof job.location === 'string' 
               ? job.location 
               : job.location.isRemote ? 'Remote' : 
                 [job.location.city, job.location.country]
                   .filter(Boolean)
                   .join(', ') || 'Location TBD'
             }
           </span>
         </div>
       )}
       
       {job.job_type && (
         <div className="flex items-center gap-2 text-sm text-gray-500">
           <Briefcase className="w-4 h-4 flex-shrink-0" />
           <span className="capitalize">{job.job_type}</span>
         </div>
       )}
       
       {job.tags && job.tags.length > 0 && (
         <div className="flex flex-wrap gap-1">
           {job.tags.slice(0, 3).map((tag: string, index: number) => (
             <span
               key={index}
               className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
             >
               {tag}
             </span>
           ))}
         </div>
       )}
     </div>
     
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
                </CardContent>
              </Card>
                )
              }
            })}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16 md:py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full mb-4 sm:mb-6">
              <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
              {searchQuery ? 'No jobs found' : 'No jobs available'}
            </h3>
            <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto">
              {searchQuery 
                ? `No jobs match your search for "${searchQuery}". Try a different search term.`
                : 'There are no jobs available at the moment. Check back later for new opportunities.'
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

export default function JobsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Briefcase className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <p className="text-lg text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <JobsContent />
      </Suspense>
    </AuthGuard>
  )
}