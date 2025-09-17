"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Play, ArrowRight, Star, Calendar, Briefcase, BookOpen, Plane, Heart, Bookmark, Eye } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from '@/lib/auth-context'
import ApiClient from '@/lib/api-client'
import { toast } from 'sonner'

// Backend data structure interfaces
interface HeroPromotion {
  _id: string
  contentId: string
  contentType: string
  packageType: string
  packageName: string
  investment: number
  duration: number
  priority: number
  boostMultiplier: number
  startDate: string
  endDate: string
  heroImageUrl?: string
  content: {
    _id: string
    title: string
    description: string
    image?: string
    category: string
    type: string
    provider: string
    location: {
      country?: string
      province?: string
      city?: string
      isRemote?: boolean
    }
    financial: {
      isPaid: boolean
      amount?: number
      currency: string
    }
    dates: {
      applicationDeadline?: string
      startDate?: string
      endDate?: string
    }
    tags: string[]
    metrics: {
      viewCount: number
      saveCount: number
      likeCount: number
    }
  }
  provider: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface HeroCarouselProps {
  heroPromotions?: HeroPromotion[]
  isLoading?: boolean
}

export default function HeroCarousel({ heroPromotions = [], isLoading = false }: HeroCarouselProps) {
  const { isAuthenticated } = useAuth()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [engagementStatus, setEngagementStatus] = useState({
    isSaved: false,
    isLiked: false
  })
  const [isEngagementLoading, setIsEngagementLoading] = useState(false)

  // Debug logging
  console.log('🎠 HERO CAROUSEL RENDERED:')
  console.log('heroPromotions:', heroPromotions)
  console.log('heroPromotions length:', heroPromotions?.length)
  console.log('isLoading:', isLoading)

  // Check if mobile for better UX
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load engagement status when slide changes
  useEffect(() => {
    if (isAuthenticated && heroPromotions && heroPromotions.length > 0) {
      loadEngagementStatus()
    }
  }, [isAuthenticated, currentSlide, heroPromotions])

  const loadEngagementStatus = async () => {
    if (!heroPromotions || heroPromotions.length === 0) return
    
    const currentPromotion = heroPromotions[currentSlide]
    if (!currentPromotion) return

    // For now, set default status since API might not be available
    // This prevents the error and allows the UI to work
    setEngagementStatus({ isSaved: false, isLiked: false })
    
    // TODO: Uncomment when backend API is confirmed working
    /*
    try {
      const contentType = currentPromotion.contentType as 'opportunities' | 'events' | 'jobs' | 'resources'
      const contentId = currentPromotion.content?._id || currentPromotion.contentId
      
      // Use specific methods based on content type
      let status
      switch (contentType) {
        case 'opportunities':
          status = await ApiClient.getEngagementStatus('opportunities', contentId)
          break
        case 'events':
          status = await ApiClient.getEngagementStatus('events', contentId)
          break
        case 'jobs':
          status = await ApiClient.getEngagementStatus('jobs', contentId)
          break
        case 'resources':
          status = await ApiClient.getEngagementStatus('resources', contentId)
          break
        default:
          console.warn('Unknown content type:', contentType)
          return
      }
      
      setEngagementStatus(status)
    } catch (error) {
      console.error('Error loading engagement status:', error)
      // Set default status on error
      setEngagementStatus({ isSaved: false, isLiked: false })
    }
    */
  }

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to like items')
      return
    }

    if (!heroPromotions || heroPromotions.length === 0) return
    
    const currentPromotion = heroPromotions[currentSlide]
    if (!currentPromotion) return

    // For now, just toggle the visual state since API might not be available
    setEngagementStatus(prev => ({ ...prev, isLiked: !prev.isLiked }))
    toast.success(engagementStatus.isLiked ? 'Removed from liked items' : 'Added to liked items')
    
    // TODO: Uncomment when backend API is confirmed working
    /*
    try {
      setIsEngagementLoading(true)
      const contentType = currentPromotion.contentType as 'opportunities' | 'events' | 'jobs' | 'resources'
      const contentId = currentPromotion.content?._id || currentPromotion.contentId
      
      if (engagementStatus.isLiked) {
        await ApiClient.unlikeItem(contentType, contentId)
        setEngagementStatus(prev => ({ ...prev, isLiked: false }))
        toast.success('Removed from liked items')
      } else {
        await ApiClient.likeItem(contentType, contentId)
        setEngagementStatus(prev => ({ ...prev, isLiked: true }))
        toast.success('Added to liked items')
      }
    } catch (error: any) {
      console.error('Error toggling like:', error)
      toast.error(error.message || 'Failed to update like status')
    } finally {
      setIsEngagementLoading(false)
    }
    */
  }

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save items')
      return
    }

    if (!heroPromotions || heroPromotions.length === 0) return
    
    const currentPromotion = heroPromotions[currentSlide]
    if (!currentPromotion) return

    // For now, just toggle the visual state since API might not be available
    setEngagementStatus(prev => ({ ...prev, isSaved: !prev.isSaved }))
    toast.success(engagementStatus.isSaved ? 'Removed from saved items' : 'Added to saved items')
    
    // TODO: Uncomment when backend API is confirmed working
    /*
    try {
      setIsEngagementLoading(true)
      const contentType = currentPromotion.contentType as 'opportunities' | 'events' | 'jobs' | 'resources'
      const contentId = currentPromotion.content?._id || currentPromotion.contentId
      
      if (engagementStatus.isSaved) {
        await ApiClient.unsaveItem(contentType, contentId)
        setEngagementStatus(prev => ({ ...prev, isSaved: false }))
        toast.success('Removed from saved items')
      } else {
        await ApiClient.saveItem(contentType, contentId)
        setEngagementStatus(prev => ({ ...prev, isSaved: true }))
        toast.success('Added to saved items')
      }
    } catch (error: any) {
      console.error('Error toggling save:', error)
      toast.error(error.message || 'Failed to update save status')
    } finally {
      setIsEngagementLoading(false)
    }
    */
  }

  const handleView = () => {
    if (!heroPromotions || heroPromotions.length === 0) return
    
    const currentPromotion = heroPromotions[currentSlide]
    if (!currentPromotion) return

    const href = `/${currentPromotion.contentType}s/${currentPromotion.content?._id || currentPromotion.contentId}`
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  // Auto-play functionality with longer display times
  useEffect(() => {
    if (!isPlaying || !heroPromotions || heroPromotions.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroPromotions.length)
    }, isMobile ? 8000 : 10000) // Increased from 4s/5s to 8s/10s
    
    return () => clearInterval(interval)
  }, [isPlaying, isMobile, heroPromotions])

  // Reset image error when slide changes
  useEffect(() => {
    setImageError(false)
  }, [currentSlide])

  // Navigation functions
  const goToSlide = (index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide(index)
    setIsPlaying(false)
    setTimeout(() => {
      setIsTransitioning(false)
      setIsPlaying(true)
    }, 1000) // Wait for transition to complete
    setTimeout(() => setIsPlaying(true), isMobile ? 12000 : 15000) // Longer pause after manual interaction
  }

  const nextSlide = () => {
    if (!heroPromotions || heroPromotions.length === 0 || isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide((prev) => (prev + 1) % heroPromotions.length)
    setIsPlaying(false)
    setTimeout(() => {
      setIsTransitioning(false)
    }, 1000) // Wait for transition to complete
    setTimeout(() => setIsPlaying(true), isMobile ? 12000 : 15000) // Longer pause after manual interaction
  }

  const prevSlide = () => {
    if (!heroPromotions || heroPromotions.length === 0 || isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide((prev) => (prev - 1 + heroPromotions.length) % heroPromotions.length)
    setIsPlaying(false)
    setTimeout(() => {
      setIsTransitioning(false)
    }, 1000) // Wait for transition to complete
    setTimeout(() => setIsPlaying(true), isMobile ? 12000 : 15000) // Longer pause after manual interaction
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      nextSlide()
    } else if (isRightSwipe) {
      prevSlide()
    }
  }

  // Helper function to get content type info
  const getContentTypeInfo = (contentType: string) => {
    switch (contentType) {
      case 'event':
        return { icon: Calendar, color: 'from-green-500 to-green-700', label: 'Event' }
      case 'job':
        return { icon: Briefcase, color: 'from-blue-500 to-blue-700', label: 'Job' }
      case 'resource':
        return { icon: BookOpen, color: 'from-purple-500 to-purple-700', label: 'Resource' }
      case 'opportunity':
      default:
        return { icon: Plane, color: 'from-orange-500 to-orange-700', label: 'Opportunity' }
    }
  }

  // Helper function to format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'TBD'
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <section className="relative h-[100svh] min-h-[500px] max-h-[800px] overflow-hidden bg-black">
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <div className="w-8 h-8 text-orange-600 animate-spin">⏳</div>
            </div>
            <p className="text-xl">Loading hero promotions...</p>
          </div>
        </div>
      </section>
    )
  }

  // Show empty state if no hero promotions
  if (!heroPromotions || heroPromotions.length === 0) {
    return (
      <section className="relative h-[100svh] min-h-[500px] max-h-[800px] overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700">
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">No Hero Promotions Available</h1>
            <p className="text-lg sm:text-xl opacity-90 max-w-2xl">
              Check back later for featured opportunities, events, and resources promoted by our community.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const currentPromotion = heroPromotions[currentSlide]
  
  // Add safety checks for currentPromotion
  if (!currentPromotion) {
    console.error('❌ No current promotion found at index:', currentSlide)
    return null
  }
  
  const { icon: ContentIcon, color, label } = getContentTypeInfo(currentPromotion.contentType)
  const href = `/${currentPromotion.contentType}s/${currentPromotion.content?._id || currentPromotion.contentId}`
  
  // Handle image URL - use image from original post, fallback to heroImageUrl, then placeholder
  const getImageUrl = () => {
    if (imageError) {
      return '/images/logo-icon-transparent.png'
    }
    return currentPromotion.content?.image || currentPromotion.heroImageUrl || '/images/logo-icon-transparent.png'
  }
  
  const imageUrl = getImageUrl()
  
  // Generate responsive image URL if it's a Cloudinary URL
  const getResponsiveImageUrl = (url: string) => {
    // Validate URL
    if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
      return '/images/logo-icon-transparent.png'
    }
    
    // Clean the URL
    const cleanUrl = url.trim()
    
    if (cleanUrl.includes('cloudinary.com')) {
      // For Cloudinary URLs, return as-is since they should already be optimized
      // The error might be due to the image not existing or being deleted
      return cleanUrl
    }
    
    // Handle relative URLs
    if (cleanUrl.startsWith('/')) {
      return cleanUrl
    }
    
    // Handle absolute URLs
    if (cleanUrl.startsWith('http')) {
      return cleanUrl
    }
    
    // Fallback for other cases
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${cleanUrl}`
  }
  
  const fullImageUrl = getResponsiveImageUrl(imageUrl)

  // Validate the final URL before using it
  const isValidImageUrl = (url: string) => {
    if (!url || url === '/images/logo-icon-transparent.png') return true
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // Debug logging for image URLs
  console.log('🖼️ IMAGE DEBUG:')
  console.log('currentPromotion.content?.image:', currentPromotion.content?.image)
  console.log('currentPromotion.heroImageUrl:', currentPromotion.heroImageUrl)
  console.log('imageUrl:', imageUrl)
  console.log('fullImageUrl:', fullImageUrl)
  console.log('isValidImageUrl:', isValidImageUrl(fullImageUrl))
  console.log('imageError:', imageError)

  return (
    <>
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeInUp 0.8s ease-out;
        }
      `}</style>
      <section 
        className="relative h-[100svh] min-h-[500px] max-h-[800px] overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      <div className="relative h-full transition-all duration-1000 ease-in-out">
        {/* Transition overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-black/20 z-30 transition-opacity duration-300" />
        )}
        
        {/* Background Image */}
        <div className="absolute inset-0">
          {!imageError && isValidImageUrl(fullImageUrl) ? (
            <Image
              src={fullImageUrl}
              alt={currentPromotion.content?.title || 'Promotion image'}
              fill
              className="object-cover transition-all duration-1000 ease-in-out"
              priority={currentSlide === 0}
              sizes="100vw"
              onError={(e) => {
                console.warn('Image load error for URL:', fullImageUrl)
                console.warn('Falling back to placeholder image')
                setImageError(true)
              }}
              onLoad={() => {
                // Reset error state when image loads successfully
                if (imageError) {
                  setImageError(false)
                }
              }}
            />
          ) : (
            <div 
              className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center"
              style={{
                backgroundImage: `url('/images/logo-icon-transparent.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="text-white/50 text-center">
                <div className="text-4xl mb-2">🖼️</div>
                <div className="text-sm">Image unavailable</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Content Layer */}
        <div className="relative z-10 h-full flex items-center">
          <div className="container px-4 sm:px-6 md:px-8 lg:px-12 w-full">
            <div className="max-w-4xl mx-4 sm:mx-8 md:mx-12 lg:mx-16">
              <div 
                key={currentSlide} 
                className="space-y-6 sm:space-y-8 md:space-y-10 text-white transition-all duration-1000 ease-in-out transform animate-fade-in"
              >
                {/* Content Type Badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
                    <ContentIcon className="w-4 h-4 mr-2" />
                    {label}
                  </div>
                </div>
                
                {/* Title */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight">
                  {currentPromotion.content?.title || 'Untitled Promotion'}
                </h1>
                
                {/* Description */}
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl opacity-90 max-w-3xl leading-relaxed">
                  {currentPromotion.content?.description?.substring(0, 200) || 'No description available'}
                  {currentPromotion.content?.description && currentPromotion.content.description.length > 200 && '...'}
                </p>

                {/* Location Details */}
                {currentPromotion.content.location?.city && (
                  <div className="flex flex-wrap gap-4 text-sm sm:text-base">
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-full">
                      <span className="text-green-300">📍</span>
                      <span>{currentPromotion.content.location.city}</span>
                    </div>
                  </div>
                )}


                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <Link href={href}>
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      View Details
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-2 border-white/30 text-white hover:bg-white hover:text-black px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300 group"
                  >
                    <span className="text-black group-hover:text-black transition-colors duration-300">Read More</span>
                  </Button>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Interaction Buttons - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-3">
          <Button
            size="sm"
            variant="outline"
            className={`w-12 h-12 rounded-full border-2 backdrop-blur-sm transition-all duration-300 ${
              engagementStatus.isLiked 
                ? 'border-red-400 bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                : 'border-white/60 bg-white/10 text-white hover:bg-white hover:text-black'
            }`}
            title={engagementStatus.isLiked ? 'Unlike' : 'Like'}
            onClick={handleLike}
            disabled={isEngagementLoading}
          >
            <Heart className={`h-5 w-5 ${engagementStatus.isLiked ? 'fill-current' : ''}`} />
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className={`w-12 h-12 rounded-full border-2 backdrop-blur-sm transition-all duration-300 ${
              engagementStatus.isSaved 
                ? 'border-blue-400 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' 
                : 'border-white/60 bg-white/10 text-white hover:bg-white hover:text-black'
            }`}
            title={engagementStatus.isSaved ? 'Unsave' : 'Save'}
            onClick={handleSave}
            disabled={isEngagementLoading}
          >
            <Bookmark className={`h-5 w-5 ${engagementStatus.isSaved ? 'fill-current' : ''}`} />
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            className="w-12 h-12 rounded-full border-2 border-white/60 bg-white/10 backdrop-blur-sm text-white hover:bg-white hover:text-black transition-all duration-300"
            title="View Details"
            onClick={handleView}
          >
            <Eye className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Controls - Bottom Center */}
      <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex items-center space-x-2 sm:space-x-4 bg-black/20 backdrop-blur-md p-2 sm:p-2.5 rounded-full">
          <button
            onClick={togglePlayPause}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300"
            aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          >
            {isPlaying ? (
              <svg className="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M14 19h4V5h-4M6 19h4V5H6v14Z"></path>
              </svg>
            ) : (
              <Play className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5" />
            )}
          </button>

          <div className="flex space-x-1 sm:space-x-2">
            {heroPromotions.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "bg-orange-500 w-4 sm:w-6"
                    : "bg-white/50 hover:bg-white/75 w-1.5 sm:w-2"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation arrows - Only visible on larger screens to avoid content overlap */}
      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 md:left-6 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hidden sm:flex"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 md:right-6 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 hidden sm:flex"
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
      </button>

      {/* Swipe indicators for mobile */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent md:hidden" />
      
      {/* Mobile swipe hint */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 sm:hidden">
        <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 text-white text-xs">
          ← Swipe to navigate →
        </div>
      </div>
      </section>
    </>
  )
}
