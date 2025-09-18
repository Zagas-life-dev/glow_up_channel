"use client"

import { useState, useEffect, useRef } from 'react'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import ApiClient from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { 
  ArrowLeft, 
  ExternalLink, 
  BookOpen, 
  User, 
  Calendar, 
  Tag, 
  DollarSign,
  Play,
  Pause,
  Volume2,
  Download,
  Eye,
  Clock,
  FileText,
  Video,
  Headphones
} from 'lucide-react'
import EngagementActions from '@/components/engagement-actions'
import AuthGuard from '@/components/auth-guard'

type ResourcePageProps = {
  params: Promise<{
    id: string
  }>
}

function ResourcePageContent({ params }: ResourcePageProps) {
  const [resource, setResource] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [id, setId] = useState<string>('')
  const { isAuthenticated } = useAuth()
  const viewedItems = useRef(new Set<string>())

  // Track view for recommendation learning
  const trackView = async (resourceId: string) => {
    if (!isAuthenticated || viewedItems.current.has(resourceId)) return
    
    viewedItems.current.add(resourceId)
    
    try {
      await ApiClient.trackEngagement('resource', resourceId, 'view')
    } catch (error) {
      console.error('Error tracking view:', error)
      // Don't show error to user as this is background tracking
    }
  }

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params
      setId(resolvedParams.id)
    }
    loadParams()
  }, [params])

  useEffect(() => {
    if (!id) return

    const getResource = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources/${id}`, {
          cache: 'no-store'
        })
        
        if (!response.ok) {
          notFound()
        }
        
        const result = await response.json()
        
        if (!result.success) {
          notFound()
        }
        
        setResource(result.data.resource)
      } catch (error) {
        console.error('Error fetching resource:', error)
        notFound()
      } finally {
        setLoading(false)
      }
    }

    getResource()
  }, [id])

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-16 sm:py-18 md:py-20 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12 lg:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-soft p-4 sm:p-6 md:p-8 lg:p-12">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-12 bg-gray-200 rounded mb-6"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!resource) {
    notFound()
  }

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-5 w-5" />
      case 'audio':
        return <Headphones className="h-5 w-5" />
      case 'document':
        return <FileText className="h-5 w-5" />
      default:
        return <BookOpen className="h-5 w-5" />
    }
  }

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'audio':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'document':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-orange-100 text-orange-800 border-orange-200'
    }
  }

  const isMediaResource = resource.category === 'video' || resource.category === 'audio'
  const hasContent = resource.description

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link href="/resources" className="inline-flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-orange-600 transition-colors mb-6 sm:mb-8 group touch-manipulation">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
            Back to Resources
          </Link>

          <div 
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            onMouseEnter={() => trackView(id)}
          >
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header Card */}
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-white to-gray-50/50 pb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={resource.isPremium ? "default" : "secondary"}
                        className={`${
                          resource.isPremium 
                            ? 'bg-orange-500 hover:bg-orange-600' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {resource.isPremium ? 'Premium Resource' : 'Free Resource'}
                      </Badge>
                      {resource.category && (
                        <Badge 
                          variant="outline"
                          className={`${getResourceTypeColor(resource.category)}`}
                        >
                          <div className="flex items-center gap-2">
                            {getResourceTypeIcon(resource.category)}
                            {resource.category.charAt(0).toUpperCase() + resource.category.slice(1)}
                          </div>
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">Published</div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(resource.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                    {resource.title}
                  </CardTitle>
                  
                  {resource.author && (
                    <div className="flex items-center gap-3 mt-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Author</div>
                        <div className="font-medium text-gray-900">{resource.author}</div>
                      </div>
                    </div>
                  )}
                </CardHeader>
              </Card>

              {/* Media Player Section */}
              {isMediaResource && resource.fileUrl && (
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      {resource.category === 'video' ? (
                        <Video className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Headphones className="h-5 w-5 text-purple-600" />
                      )}
                      {resource.category === 'video' ? 'Video Player' : 'Audio Player'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">Media player would go here</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Section */}
              {hasContent && (
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-b border-orange-200">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <BookOpen className="h-5 w-5 text-orange-600" />
                      Resource Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-gray-700 leading-relaxed">
                      {resource.description && (
                        <div className="mb-8">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                            About This Resource
                          </h3>
                          <div className="text-sm sm:text-base leading-relaxed">
                            {resource.description}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tags Section */}
              {resource.tags && resource.tags.length > 0 && (
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Tag className="h-5 w-5 text-gray-600" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-3">
                      {resource.tags.map((tag: string, index: number) => (
                        <Badge 
                          key={index}
                          variant="secondary"
                          className="bg-orange-100 text-orange-800 hover:bg-orange-200 px-3 py-1 text-sm"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Access Button */}
              {resource.fileUrl && (
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardContent className="p-6 text-center">
                    <Button 
                      asChild 
                      size="lg" 
                      className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
                        {resource.isPremium ? 'Get Premium Access' : 'Access Resource'}
                        <ExternalLink className="ml-2 h-5 w-5" />
                      </a>
                    </Button>
                    <p className="text-sm text-gray-500 mt-3">
                      Opens in a new window
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Resource Stats */}
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                  <CardTitle className="text-lg text-gray-900">Resource Stats</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Eye className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-600">Views</span>
                      </div>
                      <span className="font-semibold text-gray-900">{resource.metrics?.viewCount || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Clock className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-600">Published</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {new Date(resource.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {resource.duration && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Play className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="text-sm text-gray-600">Duration</span>
                        </div>
                        <span className="font-semibold text-gray-900">{resource.duration}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Price Information */}
              {resource.isPremium && resource.paymentLink && (
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-b border-orange-200">
                    <CardTitle className="text-lg text-gray-900">Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-orange-600">Premium Resource</div>
                      <div className="text-sm text-gray-500">Premium Resource</div>
                    </div>
                    <Button 
                      asChild 
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl"
                    >
                      <a href={resource.paymentLink} target="_blank" rel="noopener noreferrer">
                        Purchase Now
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Download Section */}
              {resource.fileUrl && (
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b border-green-200">
                    <CardTitle className="text-lg text-gray-900">Download</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Download className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="text-sm text-gray-600">Available for offline use</div>
                    </div>
                    <Button 
                      asChild 
                      variant="outline"
                      className="w-full border-green-200 text-green-700 hover:bg-green-50 rounded-xl"
                    >
                      <a href={resource.fileUrl} download>
                        Download Resource
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Engagement Actions */}
          <div className="mt-8 sm:mt-10 md:mt-12 lg:mt-16 pt-6 sm:pt-8 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  Take Action
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Like, save, or access this resource
                </p>
              </div>
              {id && (
                <EngagementActions 
                  type="resources" 
                  id={id} 
                  externalUrl={resource.paymentLink || resource.fileUrl}
                  className="flex-shrink-0"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResourcePage({ params }: ResourcePageProps) {
  return (
    <AuthGuard>
      <ResourcePageContent params={params} />
    </AuthGuard>
  )
} 