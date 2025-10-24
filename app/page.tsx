"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Calendar, Plane, Briefcase, BookOpen, Users, Target, ArrowRight, Heart, Bookmark, Eye, Star } from "lucide-react"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { useAuth } from "@/lib/auth-context"
import HeroCarousel from "@/components/hero-carousel"


export default function Home() {
  const [loading, setLoading] = useState(true)
  const [heroPromotions, setHeroPromotions] = useState<any[]>([])
  const [featuredPromotions, setFeaturedPromotions] = useState<any[]>([])
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    const getPromotions = async () => {
      try {
        setLoading(true)
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        
        if (!backendUrl) {
          console.error('❌ NEXT_PUBLIC_BACKEND_URL is not defined')
          setHeroPromotions([])
          setFeaturedPromotions([])
          return
        }
        
        console.log('🚀 Fetching promotions from backend:', backendUrl)
        
        // Fetch hero promotions with error handling
        console.log('📡 Fetching hero promotions...')
        let heroData: any = { success: false, promotions: [] }
        try {
          const heroRes = await fetch(`${backendUrl}/api/promotions/hero?limit=5`)
          if (!heroRes.ok) {
            throw new Error(`HTTP error! status: ${heroRes.status}`)
          }
          heroData = await heroRes.json()
          console.log('Hero API response:', {
            status: heroRes.status,
            success: heroData.success,
            count: heroData.promotions?.length || 0
          })
        } catch (heroError) {
          console.error('❌ Hero promotions fetch error:', heroError)
        }
        
        // Fetch featured promotions with error handling
        console.log('📡 Fetching featured promotions...')
        let featuredData: any = { success: false, promotions: [] }
        try {
          const featuredRes = await fetch(`${backendUrl}/api/promotions/featured?limit=10`)
          if (!featuredRes.ok) {
            throw new Error(`HTTP error! status: ${featuredRes.status}`)
          }
          featuredData = await featuredRes.json()
          console.log('Featured API response:', {
            status: featuredRes.status,
            success: featuredData.success,
            count: featuredData.promotions?.length || 0
          })
        } catch (featuredError) {
          console.error('❌ Featured promotions fetch error:', featuredError)
        }
        
        // Handle hero promotions
        console.log('🔍 Hero data structure:', {
          success: heroData.success,
          message: heroData.message,
          hasPromotions: !!heroData.promotions,
          promotionsType: typeof heroData.promotions,
          promotionsLength: heroData.promotions?.length,
          fullResponse: heroData
        })

        if (heroData.success) {
          // Check if promotions exist in different possible locations
          const promotions = heroData.data?.promotions || heroData.promotions || []
          
          if (Array.isArray(promotions) && promotions.length > 0) {
            setHeroPromotions(promotions)
            console.log('✅ Hero promotions loaded successfully:', promotions.length)
            
            // Log each promotion for debugging
            promotions.forEach((promo: any, index: number) => {
              console.log(`🎯 Hero Promotion ${index + 1}:`, {
                id: promo._id,
                title: promo.content?.title,
                contentType: promo.contentType,
                packageType: promo.packageType,
                investment: promo.investment,
                paymentStatus: promo.paymentStatus
              })
            })
          } else {
            console.log('ℹ️ Hero promotions API returned success but no promotions found')
            setHeroPromotions([])
          }
        } else {
          console.error('❌ Hero promotions API error:', heroData.message || 'API returned success: false')
          setHeroPromotions([])
        }
        
        // Handle featured promotions
        console.log('🔍 Featured data structure:', {
          success: featuredData.success,
          message: featuredData.message,
          hasPromotions: !!featuredData.promotions,
          promotionsType: typeof featuredData.promotions,
          promotionsLength: featuredData.promotions?.length,
          fullResponse: featuredData
        })

        if (featuredData.success) {
          // Check if promotions exist in different possible locations
          const promotions = featuredData.data?.promotions || featuredData.promotions || []
          
          if (Array.isArray(promotions) && promotions.length > 0) {
            setFeaturedPromotions(promotions)
            console.log('✅ Featured promotions loaded successfully:', promotions.length)
            
            // Log each promotion for debugging
            promotions.forEach((promo: any, index: number) => {
              console.log(`⭐ Featured Promotion ${index + 1}:`, {
                id: promo._id,
                title: promo.content?.title,
                contentType: promo.contentType,
                packageType: promo.packageType,
                investment: promo.investment
              })
            })
          } else {
            console.log('ℹ️ Featured promotions API returned success but no promotions found')
            setFeaturedPromotions([])
          }
        } else {
          console.error('❌ Featured promotions API error:', featuredData.message || 'API returned success: false')
          setFeaturedPromotions([])
        }
        
  } catch (error) {
        console.error('❌ Error fetching promotions:', error)
        setHeroPromotions([])
        setFeaturedPromotions([])
      } finally {
        setLoading(false)
      }
    }

    getPromotions()
  }, []) // Remove dependencies - fetch once on mount

  const services = [
    {
      icon: Briefcase,
      title: "Career Opportunities",
      description: "Find jobs, internships, and career advancement roles.",
      href: "/jobs"
    },
    {
      icon: BookOpen,
      title: "Learning Resources",
      description: "Access training, workshops, and educational materials.",
      href: "/resources"
    },
    {
      icon: Users,
      title: "Networking Events",
      description: "Connect with professionals and build meaningful relationships.",
      href: "/events"
    },
    {
      icon: Target,
      title: "Personal Growth",
      description: "Develop skills and achieve your personal aspirations.",
      href: "/opportunities"
    }
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Carousel Section */}
      <HeroCarousel heroPromotions={heroPromotions} isLoading={loading} />

      {/* Services Section with Icons */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white">
        <div className="container px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
              How We Can Help You
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Explore our core offerings designed to accelerate your growth
            </p>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {services.map((service, index) => (
              <Link key={index} href={service.href} className="block">
                <div className="group text-center p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl hover:bg-orange-50 transition-all duration-300 cursor-pointer touch-manipulation">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                    <service.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2 sm:mb-3 group-hover:text-orange-600 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
                    {service.description}
                  </p>
                  <div className="mt-3 flex items-center justify-center">
                    <span className="text-xs text-orange-500 font-medium group-hover:text-orange-600 transition-colors">
                      Click me
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Content Slider */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-gray-50">
        <div className="container px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
              Featured Content
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-4">
              Discover featured opportunities, events, jobs, and resources promoted by our community
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                {featuredPromotions.length} Featured Promotions
              </span>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12 sm:py-16 md:py-20">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full mb-4">
                <Plane className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 animate-pulse" />
              </div>
              <p className="text-base sm:text-lg text-gray-600">Loading featured content...</p>
            </div>
          ) : featuredPromotions.length > 0 ? (
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 sm:-ml-4">
            {/* Featured Promotions Section */}
            {featuredPromotions.map((promo: any) => {
              const getContentType = () => {
                switch (promo.contentType) {
                  case 'event':
                    return { type: 'Event', icon: Calendar, color: 'green', href: `/events/${promo.content._id}` }
                  case 'job':
                    return { type: 'Job', icon: Briefcase, color: 'blue', href: `/jobs/${promo.content._id}` }
                  case 'resource':
                    return { type: 'Resource', icon: BookOpen, color: 'purple', href: `/resources/${promo.content._id}` }
                  case 'opportunity':
                  default:
                    return { type: 'Opportunity', icon: Plane, color: 'orange', href: `/opportunities/${promo.content._id}` }
                }
              }

              const { type, icon: Icon, color, href } = getContentType()
              const colorClasses = {
                orange: 'from-orange-400 to-orange-600',
                green: 'from-green-400 to-green-600',
                blue: 'from-blue-400 to-blue-600',
                purple: 'from-purple-400 to-purple-600'
              }

              // Calculate days left safely
              const getDaysLeft = () => {
                try {
                  if (!promo.endDate) return 'TBD'
                  const daysLeft = Math.ceil((new Date(promo.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return daysLeft > 0 ? `${daysLeft} days left` : 'Expired'
                } catch {
                  return 'TBD'
                }
              }

              return (
                <CarouselItem key={`promo-${promo._id}`} className="pl-2 sm:pl-4 basis-full xs:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <div className="h-full">
                    <div className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full flex flex-col touch-manipulation border-2 border-yellow-400">
                      <div className={`h-32 sm:h-40 md:h-48 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center relative overflow-hidden`}>
                        <Icon className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-white opacity-80" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                        <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          FEATURED
                        </div>
                        </div>
                        <div className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <span className={`px-2 sm:px-3 py-1 bg-${color}-100 text-${color}-800 text-xs font-medium rounded-full`}>
                            {type}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-500">
                            {promo.createdAt ? new Date(promo.createdAt).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-2 sm:mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
                          {promo.content?.title || 'Untitled'}
                          </h3>
                          <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-4 flex-grow line-clamp-3 leading-relaxed">
                          {(promo.content?.description || '').length > 120
                            ? `${(promo.content?.description || '').substring(0, 120)}...`
                            : promo.content?.description || 'No description available'
                            }
                          </p>
                        
                        <div className="flex items-center justify-between mb-3 sm:mb-4 p-2 bg-yellow-50 rounded-lg">
                          <div className="text-xs text-yellow-800 font-medium">
                            {promo.packageName || 'Featured'}
                              </div>
                          <div className="text-xs text-yellow-600">
                            {getDaysLeft()}
                          </div>
                        </div>
                        
                        <Button asChild className={`w-full bg-${color}-500 hover:bg-${color}-600 text-white rounded-lg mt-auto text-xs sm:text-sm py-2 sm:py-3 touch-manipulation`}>
                          <Link href={href}>
                            View {type}
                              <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
              )
            })}

              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-8" />
              <CarouselNext className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-8" />
              
              {/* Mobile scroll indicator */}
              <div className="flex sm:hidden justify-center mt-4 space-x-2">
                {featuredPromotions.slice(0, 4).map((_: any, index: number) => (
                  <div key={index} className="w-2 h-2 bg-gray-300 rounded-full"></div>
            ))}
          </div>
            </Carousel>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <p className="text-base sm:text-lg text-gray-500">No content available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-black">
        <div className="container px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-5 md:mb-6">
                About Glow Up Channel
              </h2>
              <div className="space-y-3 sm:space-y-4 md:space-y-6 text-white">
                <p className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed">
                  We're a platform dedicated to helping young ambitious individuals discover opportunities, 
                  events, and resources that can accelerate their personal and professional growth.
            </p>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed">
                  Our mission is to democratize access to quality opportunities regardless of background.
                </p>
              </div>
              <div className="mt-6 sm:mt-8 md:mt-10">
                <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg font-semibold touch-manipulation">
                  <Link href="/about">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
              </Button>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative aspect-square max-w-xs sm:max-w-sm md:max-w-md mx-auto">
                <Image
                  src="/images/logo-transparent.svg"
                  alt="About Glow Up Channel"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 320px, (max-width: 768px) 384px, (max-width: 1024px) 448px, 500px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
