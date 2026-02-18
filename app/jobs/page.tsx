// "use client"

// import { useState, useEffect, Suspense, useRef, useCallback } from 'react'
// import Link from 'next/link'
// import { useSearchParams } from 'next/navigation'
// import { FlaticonIcon } from "@/components/ui/flaticon-icon"
// import FeedListSkeleton from '@/components/skeletons/feed-card-skeleton'
// import PageSkeleton from '@/components/skeletons/page-skeleton'
// import ErrorState from '@/components/error-state'
// import { Card, CardContent } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import SearchBar from "@/components/search-bar"
// import { useAuth } from "@/lib/auth-context"
// import ApiClient from "@/lib/api-client"
// import AuthGuard from "@/components/auth-guard"

// function JobsContent() {
//   const [jobs, setJobs] = useState<any[]>([])
//   const [filteredJobs, setFilteredJobs] = useState<any[]>([])
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState(false)
//   const [searchQuery, setSearchQuery] = useState("")
//   const [totalCount, setTotalCount] = useState(0)
//   const searchParams = useSearchParams()
//   const { user, isAuthenticated } = useAuth()
//   const viewedItems = useRef(new Set<string>())

//   // Track view for recommendation learning
//   const trackView = async (jobId: string) => {
//     if (!isAuthenticated || viewedItems.current.has(jobId)) return
    
//     viewedItems.current.add(jobId)
    
//     try {
//       await ApiClient.trackEngagement('job', jobId, 'view')
//     } catch (error) {
//       console.error('Error tracking view:', error)
//       // Don't show error to user as this is background tracking
//     }
//   }

//   useEffect(() => {
//     const tag = searchParams.get('tag')
//     if (tag) {
//       setSearchQuery(tag)
//     }
//   }, [searchParams])

//   const fetchAllJobs = useCallback(async () => {
//     setLoading(true)
//     setError(false)
//     try {
//       let promotedJobs: any[] = []
//       let recommendedJobs: any[] = []
//       try {
//         const promotedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promoted/jobs?limit=100`)
//         if (!promotedRes.ok) throw new Error('Request failed')
//         const promotedData = await promotedRes.json()
//         if (promotedData.success) promotedJobs = promotedData.data?.jobs || []
//       } catch {
//         setError(true)
//         setLoading(false)
//         return
//       }
//       if (isAuthenticated && user) {
//         const token = localStorage.getItem('accessToken')
//         const headers = { 'Authorization': `Bearer ${token}` }
//         try {
//           const recommendedRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recommended/jobs?limit=100`, { headers })
//           if (!recommendedRes.ok) throw new Error('Request failed')
//           const recommendedData = await recommendedRes.json()
//           if (recommendedData.success) recommendedJobs = recommendedData.data?.jobs || []
//         } catch {}
//       }
//       const mergedJobs = [...promotedJobs]
//       const promotedIds = new Set(promotedJobs.map((item: { _id: string }) => item._id))
//       mergedJobs.push(...recommendedJobs.filter((item: { _id: string }) => !promotedIds.has(item._id)))
//       setJobs(mergedJobs)
//       setFilteredJobs(mergedJobs)
//       setTotalCount(mergedJobs.length)
//     } catch {
//       setJobs([])
//       setFilteredJobs([])
//       setError(true)
//     } finally {
//       setLoading(false)
//     }
//   }, [isAuthenticated, user])

//   useEffect(() => {
//     fetchAllJobs()
//   }, [fetchAllJobs])

//   // Filter jobs based on search
//   useEffect(() => {
//     const lowercasedQuery = searchQuery.toLowerCase()
//     const filtered = jobs.filter((job) => {
//       return (
//         (job.title?.toLowerCase() || '').includes(lowercasedQuery) ||
//         (job.description?.toLowerCase() || '').includes(lowercasedQuery) ||
//         (job.company?.toLowerCase() || '').includes(lowercasedQuery) ||
//         (typeof job.location === 'string' ? job.location : job.location?.city || job.location?.address || '').toLowerCase().includes(lowercasedQuery) ||
//         (job.job_type?.toLowerCase() || '').includes(lowercasedQuery) ||
//         (job.tags && job.tags.some((tag: string) => (tag?.toLowerCase() || '').includes(lowercasedQuery)))
//       )
//     })
//     setFilteredJobs(filtered)
//   }, [searchQuery, jobs])

//   const handleSearch = (query: string) => {
//     setSearchQuery(query)
//   }

//   const suggestionTags = ["Remote", "Full-time", "Part-time", "Internship", "Contract", "Freelance"]

//   return (
//     <div className="min-h-screen pb-24 md:pb-8">
//       {/* Header */}
//       <div className="sticky top-0 z-20 bg-page/95 backdrop-blur-lg border-b border-border -mx-4 px-4 md:-mx-6 md:px-6">
//         <div className="max-w-7xl mx-auto py-6">
//           <div className="flex items-center gap-3 mb-6">
//             <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
//               <FlaticonIcon name="briefcase" className="w-5 h-5 text-primary" />
//             </div>
//             <div>
//               <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
//               <p className="text-sm text-muted-foreground">Find your next career opportunity</p>
//             </div>
//           </div>
          
//           {/* Search Section */}
//           <div className="mb-4">
//             <SearchBar
//               value={searchQuery}
//               onValueChange={handleSearch}
//               placeholder="Search jobs by title, company, or location..."
//             />
//           </div>
          
//           {/* Suggestion Tags */}
//           <div className="flex flex-wrap items-center gap-2">
//             <span className="text-xs text-muted-foreground font-medium">
//               Popular:
//             </span>
//             {suggestionTags.map(tag => (
//               <button
//                 key={tag}
//                 onClick={() => handleSearch(tag)}
//                 className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full hover:bg-muted/80 hover:text-foreground transition-colors border border-border"
//               >
//                 {tag}
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Results Section */}
//       <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
//         {/* Results Summary */}
//         {!loading && (
//           <div className="mb-6">
//             <p className="text-sm text-muted-foreground">
//               {searchQuery ? (
//                 <>
//                   Showing {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''} for 
//                   <span className="font-semibold text-foreground ml-1">"{searchQuery}"</span>
//                 </>
//               ) : (
//                 <>Showing {filteredJobs.length} jobs</>
//               )}
//             </p>
//           </div>
//         )}

//         {loading ? (
//           <FeedListSkeleton count={8} />
//         ) : error ? (
//           <ErrorState isNetworkError onRetry={fetchAllJobs} />
//         ) : filteredJobs.length > 0 ? (
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//             {filteredJobs.map((job) => {
//               // Check if _id is a valid MongoDB ObjectId (24 hex characters)
//               const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(job._id)
              
//               if (isValidObjectId) {
//                 // Internal job - make entire card clickable
//                 return (
//                   <Link key={job._id} href={`/jobs/${job._id}`} className="block">
//               <Card 
//                 className={`
//                         group bg-card border border-border rounded-2xl overflow-hidden hover:bg-muted hover:border-border transition-all duration-300 flex flex-col h-full touch-manipulation cursor-pointer
//                   ${job.isPromoted ? 'border-yellow-500/30 bg-yellow-500/5' : ''}
//                 `}
//                 onMouseEnter={() => trackView(job._id)}
//               >
//                 <CardContent className="p-4 flex flex-col flex-grow">
//                   <div className="flex items-center justify-between mb-3">
//                     <div className="flex items-center gap-2">
//                       <span className="px-2.5 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full capitalize border border-primary/30">
//                         {job.job_type || 'Job'}
//                       </span>
//                     </div>
//                     {job.salary && (
//                       <span className="text-xs font-medium text-green-400">
//                         {job.salary}
//                       </span>
//                     )}
//                   </div>
                  
//                   <h3 className="text-base font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
//                     {job.title}
//                   </h3>
                  
//                   <p className="text-sm text-muted-foreground mb-2 font-medium">
//                     {job.company}
//                   </p>
                  
//                   <p className="text-sm text-muted-foreground mb-3 line-clamp-3 flex-grow">
//                     {job.description}
//                   </p>
                  
//                   <div className="space-y-2 mb-4">
//        {job.location && (
//          <div className="flex items-center gap-2 text-sm text-muted-foreground">
//            <FlaticonIcon name="map-marker" className="w-4 h-4 flex-shrink-0 text-primary" />
//            <span className="truncate">
//              {typeof job.location === 'string' 
//                ? job.location 
//                : job.location.isRemote ? 'Remote' : 
//                  [job.location.city, job.location.country]
//                    .filter(Boolean)
//                    .join(', ') || 'Location TBD'
//              }
//            </span>
//          </div>
//        )}
                    
//                     {job.job_type && (
//                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                         <FlaticonIcon name="clock" className="w-4 h-4 flex-shrink-0" />
//                         <span className="capitalize">{job.job_type}</span>
//                       </div>
//                     )}
                    
//                     {job.salary && (
//                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                         <FlaticonIcon name="dollar" className="w-4 h-4 flex-shrink-0" />
//                         <span className="font-medium text-green-400">{job.salary}</span>
//                       </div>
//                     )}
                    
//                     {job.category && (
//                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                         <FlaticonIcon name="briefcase" className="w-4 h-4 flex-shrink-0" />
//                         <span className="capitalize">{job.category}</span>
//                       </div>
//                     )}
//                   </div>
                  
//                   {/* Engagement Metrics */}
//                   {job.metrics && (
//                     <div className="flex items-center justify-between p-2 bg-muted rounded-lg border border-border">
//                       <div className="flex items-center space-x-4 text-xs text-muted-foreground">
//                         <div className="flex items-center space-x-1">
//                           <FlaticonIcon name="eye" className="h-3 w-3" />
//                           <span>{job.metrics.viewCount || 0}</span>
//                         </div>
//                         <div className="flex items-center space-x-1">
//                           <FlaticonIcon name="heart" className="h-3 w-3 text-red-400" />
//                           <span>{job.metrics.likeCount || 0}</span>
//                         </div>
//                         <div className="flex items-center space-x-1">
//                           <FlaticonIcon name="bookmark" className="h-3 w-3 text-primary" />
//                           <span>{job.metrics.saveCount || 0}</span>
//                         </div>
//                         <div className="flex items-center space-x-1">
//                           <FlaticonIcon name="users" className="h-3 w-3 text-green-400" />
//                           <span>{job.metrics.applicationCount || 0}</span>
//                         </div>
//                       </div>
//                     </div>
//                   )}
                  
//                     </CardContent>
//                     </Card>
//                           </Link>
//                         )
//                       } else {
//                 // External job - make entire card clickable to open in new tab
//                         return (
//                   <Card 
//                     key={job._id}
//                     className={`
//                       group bg-card border border-border rounded-2xl overflow-hidden hover:bg-muted hover:border-border transition-all duration-300 flex flex-col h-full touch-manipulation cursor-pointer
//                       ${job.isPromoted ? 'border-yellow-500/30 bg-yellow-500/5' : ''}
//                     `}
//                     onMouseEnter={() => trackView(job._id)}
//                             onClick={() => window.open(job._id, '_blank', 'noopener,noreferrer')}
//                   >
//                     <CardContent className="p-4 flex flex-col flex-grow">
//                       <div className="flex items-center justify-between mb-3">
//                         <div className="flex items-center gap-2">
//                           <span className="px-2.5 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full capitalize border border-primary/30">
//                             {job.job_type || 'Job'}
//                           </span>
//                         </div>
//                         {job.salary && (
//                           <span className="text-xs font-medium text-green-400">
//                             {job.salary}
//                           </span>
//                         )}
//                       </div>
                      
//                       <h3 className="text-base font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
//                         {job.title}
//                       </h3>
                      
//                       <p className="text-sm text-muted-foreground mb-2 font-medium">
//                         {job.company}
//                       </p>
                      
//                       <p className="text-sm text-muted-foreground mb-3 line-clamp-3 flex-grow">
//                         {job.description}
//                       </p>
                      
//                       <div className="space-y-2 mb-4">
//        {job.location && (
//          <div className="flex items-center gap-2 text-sm text-muted-foreground">
//            <FlaticonIcon name="map-marker" className="w-4 h-4 flex-shrink-0 text-primary" />
//            <span className="truncate">
//              {typeof job.location === 'string' 
//                ? job.location 
//                : job.location.isRemote ? 'Remote' : 
//                  [job.location.city, job.location.country]
//                    .filter(Boolean)
//                    .join(', ') || 'Location TBD'
//              }
//            </span>
//          </div>
//        )}
       
//        {job.job_type && (
//          <div className="flex items-center gap-2 text-sm text-muted-foreground">
//            <FlaticonIcon name="clock" className="w-4 h-4 flex-shrink-0" />
//            <span className="capitalize">{job.job_type}</span>
//          </div>
//        )}
       
//        {job.tags && job.tags.length > 0 && (
//          <div className="flex flex-wrap gap-1.5">
//            {job.tags.slice(0, 3).map((tag: string, index: number) => (
//              <span
//                key={index}
//                className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full border border-border"
//              >
//                {tag}
//              </span>
//            ))}
//          </div>
//        )}
//      </div>
     
//      {job.metrics && (
//        <div className="flex items-center justify-between p-2 bg-muted rounded-lg border border-border">
//          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
//            <div className="flex items-center space-x-1">
//              <FlaticonIcon name="eye" className="h-3 w-3" />
//              <span>{job.metrics.viewCount || 0}</span>
//            </div>
//            <div className="flex items-center space-x-1">
//              <FlaticonIcon name="heart" className="h-3 w-3 text-red-400" />
//              <span>{job.metrics.likeCount || 0}</span>
//            </div>
//            <div className="flex items-center space-x-1">
//              <FlaticonIcon name="bookmark" className="h-3 w-3 text-primary" />
//              <span>{job.metrics.saveCount || 0}</span>
//            </div>
//            <div className="flex items-center space-x-1">
//              <FlaticonIcon name="users" className="h-3 w-3 text-green-400" />
//              <span>{job.metrics.applicationCount || 0}</span>
//            </div>
//          </div>
//                   </div>
//      )}
//                 </CardContent>
//               </Card>
//                 )
//               }
//             })}
//           </div>
//           ) : (
//           <div className="text-center py-20">
//             <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
//               <FlaticonIcon name="briefcase" className="w-8 h-8 text-muted-foreground" />
//             </div>
//             <h3 className="text-lg font-semibold text-foreground mb-2">
//               {searchQuery ? 'No jobs found' : 'No jobs available'}
//             </h3>
//             <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
//               {searchQuery 
//                 ? `No jobs match your search for "${searchQuery}". Try a different search term.`
//                 : 'There are no jobs available at the moment. Check back later for new opportunities.'
//               }
//             </p>
//             {searchQuery && (
//               <Button 
//                 onClick={() => setSearchQuery('')}
//                 variant="outline"
//                 className="px-6 py-2.5 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
//               >
//                 Clear Search
//               </Button>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// export default function JobsPage() {
//   return (
//     <AuthGuard>
//       <Suspense fallback={<PageSkeleton />}>
//         <JobsContent />
//       </Suspense>
//     </AuthGuard>
//   )
// }

// app/old-page/page.js
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/');
  
  // This code below will never actually be seen
  return null; 
}