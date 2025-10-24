"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import ApiClient from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { 
  Briefcase, 
  Calendar, 
  BookOpen, 
  FileText, 
  Star,
  Filter,
  RefreshCw,
  TrendingUp
} from 'lucide-react'

interface RecommendationItem {
  _id: string
  contentType: 'opportunity' | 'event' | 'job' | 'resource'
  title: string
  description: string
  score: number
  reasons: string[]
  tags?: string[]
  [key: string]: any
}

interface UnifiedRecommendationsProps {
  className?: string
}

const UnifiedRecommendations: React.FC<UnifiedRecommendationsProps> = ({ className }) => {
  const { user, isAuthenticated } = useAuth()
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  // Filter options
  const [filters, setFilters] = useState({
    includeOpportunities: true,
    includeEvents: true,
    includeJobs: true,
    includeResources: true,
    minScore: 0,
    limit: 20
  })

  const loadRecommendations = async () => {
    if (!isAuthenticated) return

    setLoading(true)
    try {
      const result = await ApiClient.getUnifiedRecommendations({
        includeOpportunities: filters.includeOpportunities,
        includeEvents: filters.includeEvents,
        includeJobs: filters.includeJobs,
        includeResources: filters.includeResources,
        minScore: filters.minScore,
        limit: filters.limit
      })
      setRecommendations(result.content)
      setTotal(result.total)
      setUserProfile(result.userProfile)
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecommendations()
  }, [isAuthenticated, filters])

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'opportunity': return <Briefcase className="h-4 w-4" />
      case 'event': return <Calendar className="h-4 w-4" />
      case 'job': return <FileText className="h-4 w-4" />
      case 'resource': return <BookOpen className="h-4 w-4" />
      default: return <Star className="h-4 w-4" />
    }
  }

  const getContentColor = (contentType: string) => {
    switch (contentType) {
      case 'opportunity': return 'bg-orange-100 text-orange-800'
      case 'event': return 'bg-green-100 text-green-800'
      case 'job': return 'bg-blue-100 text-blue-800'
      case 'resource': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Highly Recommended'
    if (score >= 70) return 'Good Match'
    if (score >= 50) return 'Moderate Match'
    return 'Low Match'
  }

  if (!isAuthenticated) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Personalized Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Please log in to see personalized recommendations.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Filter Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Recommendation Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="opportunities"
                checked={filters.includeOpportunities}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeOpportunities: checked }))}
              />
              <Label htmlFor="opportunities">Opportunities</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="events"
                checked={filters.includeEvents}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeEvents: checked }))}
              />
              <Label htmlFor="events">Events</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="jobs"
                checked={filters.includeJobs}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeJobs: checked }))}
              />
              <Label htmlFor="jobs">Jobs</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="resources"
                checked={filters.includeResources}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeResources: checked }))}
              />
              <Label htmlFor="resources">Resources</Label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Minimum Score: {filters.minScore}</Label>
            <Slider
              value={[filters.minScore]}
              onValueChange={([value]) => setFilters(prev => ({ ...prev, minScore: value }))}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {recommendations.length} of {total} recommendations
            </div>
            <Button onClick={loadRecommendations} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading recommendations...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No recommendations found with current filters.</p>
            </CardContent>
          </Card>
        ) : (
          recommendations.map((item, index) => (
            <Card key={`${item.contentType}-${item._id}`} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getContentColor(item.contentType)}`}>
                      {getContentIcon(item.contentType)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={getContentColor(item.contentType)}>
                          {item.contentType}
                        </Badge>
                        <span className="text-sm text-gray-500">#{index + 1}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                      {Math.round(item.score)}
                    </div>
                    <div className="text-xs text-gray-500">{getScoreLabel(item.score)}</div>
                    <div className="text-xs text-gray-400">hybrid score</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 5).map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {item.tags.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{item.tags.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}

                {item.reasons && item.reasons.length > 0 && (
                  <div className="text-sm text-gray-500">
                    <strong>Why recommended:</strong> {item.reasons.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* User Profile Info */}
      {userProfile && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <strong>Interests:</strong> {userProfile.interests?.join(', ') || 'Not specified'}
              </div>
              <div>
                <strong>Career Stage:</strong> {userProfile.careerStage || 'Not specified'}
              </div>
              <div>
                <strong>Location:</strong> {userProfile.location || 'Not specified'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default UnifiedRecommendations




