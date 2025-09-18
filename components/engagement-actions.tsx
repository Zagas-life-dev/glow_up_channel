"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, Bookmark, ExternalLink, Send, Calendar, UserCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import ApiClient from '@/lib/api-client'
import { toast } from 'sonner'
import { isValidUrl, openExternalUrl } from '@/lib/url-utils'

interface EngagementActionsProps {
  type: 'opportunities' | 'events' | 'jobs' | 'resources'
  id: string
  externalUrl?: string
  className?: string
}

interface EngagementStatus {
  isSaved: boolean
  isLiked: boolean
}

export default function EngagementActions({ 
  type, 
  id, 
  externalUrl, 
  className = "" 
}: EngagementActionsProps) {
  const { isAuthenticated, user } = useAuth()
  const [engagementStatus, setEngagementStatus] = useState<EngagementStatus>({
    isSaved: false,
    isLiked: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isStatusLoading, setIsStatusLoading] = useState(true)

  // Load engagement status on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadEngagementStatus()
    } else {
      setIsStatusLoading(false)
    }
  }, [isAuthenticated, id])

  const loadEngagementStatus = async () => {
    try {
      setIsStatusLoading(true)
      const status = await ApiClient.getEngagementStatus(type, id)
      setEngagementStatus(status)
    } catch (error) {
      console.error('Error loading engagement status:', error)
    } finally {
      setIsStatusLoading(false)
    }
  }

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to like items')
      return
    }


    try {
      setIsLoading(true)
      if (engagementStatus.isLiked) {
        await ApiClient.unlikeItem(type, id)
        setEngagementStatus(prev => ({ ...prev, isLiked: false }))
        toast.success('Removed from liked items')
      } else {
        await ApiClient.likeItem(type, id)
        setEngagementStatus(prev => ({ ...prev, isLiked: true }))
        toast.success('Added to liked items')
        
        // Track engagement for recommendations
        try {
          await ApiClient.trackEngagement(type, id, 'like')
        } catch (trackingError) {
          console.error('Error tracking engagement:', trackingError)
          // Don't show error to user as this is background tracking
        }
      }
    } catch (error: any) {
      console.error('Error toggling like:', error)
      
      // Handle specific error cases
      if (error.message?.includes('duplicate key') || error.message?.includes('already liked')) {
        toast.error('You have already liked this item')
      } else if (error.message?.includes('Authentication required')) {
        toast.error('Please sign in to like items')
      } else {
        toast.error(error.message || 'Failed to update like status')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save items')
      return
    }

    try {
      setIsLoading(true)
      if (engagementStatus.isSaved) {
        await ApiClient.unsaveItem(type, id)
        setEngagementStatus(prev => ({ ...prev, isSaved: false }))
        toast.success('Removed from saved items')
      } else {
        await ApiClient.saveItem(type, id)
        setEngagementStatus(prev => ({ ...prev, isSaved: true }))
        toast.success('Added to saved items')
        
        // Track engagement for recommendations
        try {
          await ApiClient.trackEngagement(type, id, 'save')
        } catch (trackingError) {
          console.error('Error tracking engagement:', trackingError)
          // Don't show error to user as this is background tracking
        }
      }
    } catch (error: any) {
      console.error('Error toggling save:', error)
      
      // Handle specific error cases
      if (error.message?.includes('duplicate key') || error.message?.includes('already saved')) {
        toast.error('You have already saved this item')
      } else if (error.message?.includes('Authentication required')) {
        toast.error('Please sign in to save items')
      } else {
        toast.error(error.message || 'Failed to update save status')
      }
    } finally {
      setIsLoading(false)
    }
  }


  const handleExternalLink = async () => {
    if (!externalUrl) {
      toast.error('No external link available')
      return
    }

    // Validate URL before opening
    if (!isValidUrl(externalUrl)) {
      toast.error('Invalid external link')
      console.error('Invalid external URL:', externalUrl)
      return
    }

    // Track click for analytics/recommendations
    try {
      await ApiClient.trackEngagement(type, id, 'click')
    } catch (error) {
      console.error('Error tracking click:', error)
      // Don't prevent the redirect if tracking fails
    }
    
    // Open external link using our utility function
    openExternalUrl(externalUrl)
  }

  if (isStatusLoading) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap gap-2 sm:gap-3 ${className}`}>
      {/* Like Button */}
      <Button
        variant={engagementStatus.isLiked ? "default" : "outline"}
        size="sm"
        onClick={handleLike}
        disabled={isLoading}
        className={`flex items-center gap-2 ${
          engagementStatus.isLiked 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
        }`}
      >
        <Heart className={`h-4 w-4 ${engagementStatus.isLiked ? 'fill-current' : ''}`} />
        <span className="hidden sm:inline">
          {engagementStatus.isLiked ? 'Liked' : 'Like'}
        </span>
      </Button>

      {/* Save Button */}
      <Button
        variant={engagementStatus.isSaved ? "default" : "outline"}
        size="sm"
        onClick={handleSave}
        disabled={isLoading}
        className={`flex items-center gap-2 ${
          engagementStatus.isSaved 
            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
            : 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
        }`}
      >
        <Bookmark className={`h-4 w-4 ${engagementStatus.isSaved ? 'fill-current' : ''}`} />
        <span className="hidden sm:inline">
          {engagementStatus.isSaved ? 'Saved' : 'Save'}
        </span>
      </Button>

      {/* Apply Button (for opportunities and jobs) */}
      {(type === 'opportunities' || type === 'jobs') && (
        <Button
          variant="default"
          size="sm"
          onClick={handleExternalLink}
          disabled={isLoading || !externalUrl || !isValidUrl(externalUrl)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">
            {!externalUrl ? 'No Link' : !isValidUrl(externalUrl) ? 'Invalid Link' : 'Apply'}
          </span>
        </Button>
      )}

      {/* Register Button (for events) */}
      {type === 'events' && (
        <Button
          variant="default"
          size="sm"
          onClick={handleExternalLink}
          disabled={isLoading || !externalUrl || !isValidUrl(externalUrl)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">
            {!externalUrl ? 'No Link' : !isValidUrl(externalUrl) ? 'Invalid Link' : 'Register'}
          </span>
        </Button>
      )}

      {/* Access Resource Button (for resources) */}
      {type === 'resources' && (
        <Button
          variant="default"
          size="sm"
          onClick={handleExternalLink}
          disabled={isLoading || !externalUrl || !isValidUrl(externalUrl)}
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">
            {!externalUrl ? 'No Link' : !isValidUrl(externalUrl) ? 'Invalid Link' : 'Access Resource'}
          </span>
        </Button>
      )}

    </div>
  )
}
