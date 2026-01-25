"use client"

import { useState, useEffect } from 'react'
import { notFound, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ExternalLink, 
  BookOpen, 
  Calendar, 
  DollarSign,
  Download,
  Eye,
  Clock,
  FileText,
  Video,
  Headphones,
  Crown,
  Loader2,
  Share2
} from 'lucide-react'
import EngagementActions from '@/components/engagement-actions'
import ContentShareComposer from '@/components/content-share-composer'
import ContentDetailSkeleton from '@/components/skeletons/content-detail-skeleton'
import AuthGuard from '@/components/auth-guard'
import { cleanUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import ApiClient from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { trackContentView } from '@/lib/tracking'

type ResourcePageProps = {
  params: Promise<{
    id: string
  }>
}

function ResourcePageContent({ params }: ResourcePageProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [resource, setResource] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [id, setId] = useState<string>('')
  const [showShareComposer, setShowShareComposer] = useState(false)

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
        
        // Track content view for active user activity (fire-and-forget, won't throw errors)
        if (isAuthenticated) {
          trackContentView('resource', id)
        }
      } catch (error) {
        console.error('Error fetching resource:', error)
        notFound()
      } finally {
        setLoading(false)
      }
    }

    getResource()
  }, [id])

  // Show skeleton immediately while loading
  if (loading) {
    return <ContentDetailSkeleton />
  }

  if (!resource) {
    notFound()
  }

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />
      case 'audio':
        return <Headphones className="w-4 h-4" />
      case 'document':
        return <FileText className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/[0.05] rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white/60" />
            </button>
            <h1 className="text-lg font-semibold text-white">Resource</h1>
            <div className="w-9" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Main Card */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                {getResourceTypeIcon(resource.category || 'resource')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-white truncate">{resource.author || 'Author'}</h2>
                  {resource.isPremium && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs px-2 py-0.5 flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Premium
                    </Badge>
                  )}
                  {resource.category && (
                    <Badge className={cn("text-xs px-2 py-0.5 flex items-center gap-1", 
                      resource.category === 'video' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      resource.category === 'audio' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      resource.category === 'document' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-violet-500/10 text-violet-400 border-violet-500/20'
                    )}>
                      {getResourceTypeIcon(resource.category)}
                      <span className="capitalize">{resource.category}</span>
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-white/50">Resource</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title */}
            <h3 className="text-2xl font-bold text-white leading-tight">
              {resource.title}
            </h3>

            {/* Meta Info Row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Published {formatDate(resource.createdAt)}</span>
              </div>
              {resource.metrics?.viewCount !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>{resource.metrics.viewCount} views</span>
                </div>
              )}
              {resource.duration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{resource.duration}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {resource.tags && resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag: string, index: number) => (
                  <Badge 
                    key={index} 
                    variant="outline"
                    className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-xs px-2 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            {resource.description && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </h4>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {resource.description}
                </p>
              </div>
            )}

            {/* Resource Type */}
            {resource.category && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  {getResourceTypeIcon(resource.category)}
                  Resource Type
                </h4>
                <div className="text-sm text-white/70 pl-6">
                  <span className="capitalize">{resource.category} Resource</span>
                </div>
              </div>
            )}

            {/* Duration */}
            {resource.duration && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration
                </h4>
                <div className="text-sm text-white/70 pl-6">
                  <span>{resource.duration}</span>
                </div>
              </div>
            )}

            {/* Statistics */}
            {resource.metrics && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Statistics
                </h4>
                <div className="space-y-1.5 text-sm text-white/70 pl-6">
                  {resource.metrics.viewCount !== undefined && (
                    <div>
                      <span className="font-medium text-white/90">Views: </span>
                      <span>{resource.metrics.viewCount}</span>
                    </div>
                  )}
                  {resource.metrics.likeCount !== undefined && (
                    <div>
                      <span className="font-medium text-white/90">Likes: </span>
                      <span>{resource.metrics.likeCount}</span>
                    </div>
                  )}
                  {resource.metrics.saveCount !== undefined && (
                    <div>
                      <span className="font-medium text-white/90">Saves: </span>
                      <span>{resource.metrics.saveCount}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                {id && (
                  <EngagementActions 
                    type="resources" 
                    id={id} 
                    externalUrl={resource.paymentLink || resource.fileUrl}
                    className="flex-shrink-0"
                  />
                )}
                {isAuthenticated && (
                  <Button
                    onClick={() => setShowShareComposer(true)}
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-white/70 hover:text-violet-500 hover:bg-violet-500/10 rounded-xl"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Post About This
                  </Button>
                )}
              </div>

              {/* Access Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                {resource.isPremium && resource.paymentLink ? (
                  <Button
                    asChild
                    size="lg"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl"
                  >
                    <a href={cleanUrl(resource.paymentLink)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                      <Crown className="w-4 h-4" />
                      Purchase Premium
                    </a>
                  </Button>
                ) : resource.fileUrl ? (
                  <Button
                    asChild
                    size="lg"
                    className="flex-1 bg-violet-500 hover:bg-violet-600 text-white rounded-xl"
                  >
                    <a href={cleanUrl(resource.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Access Resource
                    </a>
                  </Button>
                ) : null}
                
                {resource.fileUrl && !resource.isPremium && (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="flex-1 border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl"
                  >
                    <a href={resource.fileUrl} download className="flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Share Composer */}
      {showShareComposer && resource && (
        <ContentShareComposer
          content={{
            _id: resource._id,
            title: resource.title,
            description: resource.description,
            type: 'resource',
            author: resource.author,
            category: resource.category,
            duration: resource.duration,
            isPremium: resource.isPremium
          }}
          onPostCreated={() => {
            setShowShareComposer(false)
            toast.success('Post created!')
          }}
          onClose={() => setShowShareComposer(false)}
        />
      )}
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
