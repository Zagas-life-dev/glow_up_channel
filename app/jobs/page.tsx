"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Briefcase, Heart, Bookmark, Eye, Users, Clock, DollarSign, MapPin } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SearchBar from "@/components/search-bar"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import AuthGuard from "@/components/auth-guard"

function JobsContent() {
  const [jobs, setJobs] = useState<any[]>([])
  const [filteredJobs, setFilteredJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [totalCount, setTotalCount] = useState(0)
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuth()
  const viewedItems = useRef(new Set<string>())

  // Track view for recommendation learning
  const trackView = async (jobId: string) => {
    if (!isAuthenticated || viewedItems.current.has(jobId)) return
    
    viewedItems.current.add(jobId)
    
    try {
      await ApiClient.trackEngagement('job', jobId, 'view')
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
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-white/[0.06] -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="max-w-7xl mx-auto py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Jobs</h1>
              <p className="text-sm text-white/50">Find your next career opportunity</p>
            </div>
          </div>
          
          {/* Search Section */}
          <div className="mb-4">
            <SearchBar
              value={searchQuery}
              onValueChange={handleSearch}
              placeholder="Search jobs by title, company, or location..."
            />
          </div>
          
          {/* Suggestion Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/60 font-medium">
              Popular:
            </span>
            {suggestionTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleSearch(tag)}
                className="px-3 py-1 bg-white/[0.05] text-white/70 text-xs rounded-full hover:bg-white/[0.08] hover:text-white transition-colors border border-white/[0.1]"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Results Summary */}
        {!loading && (
          <div className="mb-6">
            <p className="text-sm text-white/60">
              {searchQuery ? (
                <>
                  Showing {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''} for 
                  <span className="font-semibold text-white ml-1">"{searchQuery}"</span>
                </>
              ) : (
                <>Showing {filteredJobs.length} jobs</>
              )}
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.05] mb-4">
              <Briefcase className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
            <p className="text-base text-white/60">Loading jobs...</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredJobs.map((job) => {
              // Check if _id is a valid MongoDB ObjectId (24 hex characters)
              const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(job._id)
              
              if (isValidObjectId) {
                // Internal job - make entire card clickable
                return (
                  <Link key={job._id} href={`/jobs/${job._id}`} className="block">
              <Card 
                className={`
                        group bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 flex flex-col h-full touch-manipulation cursor-pointer
                  ${job.isPromoted ? 'border-yellow-500/30 bg-yellow-500/5' : ''}
                `}
                onMouseEnter={() => trackView(job._id)}
              >
                <CardContent className="p-4 flex flex-col flex-grow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full capitalize border border-blue-500/30">
                        {job.job_type || 'Job'}
                      </span>
                    </div>
                    {job.salary && (
                      <span className="text-xs font-medium text-green-400">
                        {job.salary}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {job.title}
                  </h3>
                  
                  <p className="text-sm text-white/70 mb-2 font-medium">
                    {job.company}
                  </p>
                  
                  <p className="text-sm text-white/60 mb-3 line-clamp-3 flex-grow">
                    {job.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
       {job.location && (
         <div className="flex items-center gap-2 text-sm text-white/50">
           <MapPin className="w-4 h-4 flex-shrink-0 text-blue-400"></MapPin>
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
                      <div className="flex items-center gap-2 text-sm text-white/50">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="capitalize">{job.job_type}</span>
                      </div>
                    )}
                    
                    {job.salary && (
                      <div className="flex items-center gap-2 text-sm text-white/50">
                        <DollarSign className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium text-green-400">{job.salary}</span>
                      </div>
                    )}
                    
                    {job.category && (
                      <div className="flex items-center gap-2 text-sm text-white/50">
                        <Briefcase className="w-4 h-4 flex-shrink-0" />
                        <span className="capitalize">{job.category}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Engagement Metrics */}
                  {job.metrics && (
                    <div className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                      <div className="flex items-center space-x-4 text-xs text-white/50">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>{job.metrics.viewCount || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="h-3 w-3 text-red-400" />
                          <span>{job.metrics.likeCount || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Bookmark className="h-3 w-3 text-blue-400" />
                          <span>{job.metrics.saveCount || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-green-400" />
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
                      group bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 flex flex-col h-full touch-manipulation cursor-pointer
                      ${job.isPromoted ? 'border-yellow-500/30 bg-yellow-500/5' : ''}
                    `}
                    onMouseEnter={() => trackView(job._id)}
                            onClick={() => window.open(job._id, '_blank', 'noopener,noreferrer')}
                  >
                    <CardContent className="p-4 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full capitalize border border-blue-500/30">
                            {job.job_type || 'Job'}
                          </span>
                        </div>
                        {job.salary && (
                          <span className="text-xs font-medium text-green-400">
                            {job.salary}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {job.title}
                      </h3>
                      
                      <p className="text-sm text-white/70 mb-2 font-medium">
                        {job.company}
                      </p>
                      
                      <p className="text-sm text-white/60 mb-3 line-clamp-3 flex-grow">
                        {job.description}
                      </p>
                      
                      <div className="space-y-2 mb-4">
       {job.location && (
         <div className="flex items-center gap-2 text-sm text-white/50">
           <MapPin className="w-4 h-4 flex-shrink-0 text-blue-400"></MapPin>
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
         <div className="flex items-center gap-2 text-sm text-white/50">
           <Clock className="w-4 h-4 flex-shrink-0" />
           <span className="capitalize">{job.job_type}</span>
         </div>
       )}
       
       {job.tags && job.tags.length > 0 && (
         <div className="flex flex-wrap gap-1.5">
           {job.tags.slice(0, 3).map((tag: string, index: number) => (
             <span
               key={index}
               className="px-2 py-0.5 bg-white/[0.05] text-white/60 text-xs rounded-full border border-white/[0.1]"
             >
               {tag}
             </span>
           ))}
         </div>
       )}
     </div>
     
     {job.metrics && (
       <div className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
         <div className="flex items-center space-x-4 text-xs text-white/50">
           <div className="flex items-center space-x-1">
             <Eye className="h-3 w-3" />
             <span>{job.metrics.viewCount || 0}</span>
           </div>
           <div className="flex items-center space-x-1">
             <Heart className="h-3 w-3 text-red-400" />
             <span>{job.metrics.likeCount || 0}</span>
           </div>
           <div className="flex items-center space-x-1">
             <Bookmark className="h-3 w-3 text-blue-400" />
             <span>{job.metrics.saveCount || 0}</span>
           </div>
           <div className="flex items-center space-x-1">
             <Users className="h-3 w-3 text-green-400" />
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
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.05] mb-4">
              <Briefcase className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery ? 'No jobs found' : 'No jobs available'}
            </h3>
            <p className="text-sm text-white/50 mb-6 max-w-md mx-auto">
              {searchQuery 
                ? `No jobs match your search for "${searchQuery}". Try a different search term.`
                : 'There are no jobs available at the moment. Check back later for new opportunities.'
              }
            </p>
            {searchQuery && (
              <Button 
                onClick={() => setSearchQuery('')}
                variant="outline"
                className="px-6 py-2.5 border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl"
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