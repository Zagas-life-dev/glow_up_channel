'use client'

import { useState, useEffect } from 'react'
import { ApiClient } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'

interface UserProfile {
  id: string
  user_id: string
  location_data: any
  interests: string[]
  industry: string[]
  education_level: string
  field_of_study: string
  institution: string
  career_stage: string
  skills: string[]
  aspirations: string[]
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

interface Recommendations {
  opportunities: any[]
  events: any[]
  jobs: any[]
  resources: any[]
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendations>({
    opportunities: [],
    events: [],
    jobs: [],
    resources: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useAuth()

  const fetchProfile = async () => {
    if (!session?.user?.id) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const userProfile = await ApiClient.getUserProfile(session.user.id)
      setProfile(userProfile)

      // If user has completed onboarding, fetch recommendations
      if (userProfile?.onboarding_completed) {
        const userRecommendations = await ApiClient.getRecommendations(session.user.id)
        setRecommendations(userRecommendations)
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshRecommendations = async () => {
    if (!session?.user?.id) return

    try {
      const userRecommendations = await ApiClient.getRecommendations(session.user.id)
      setRecommendations(userRecommendations)
    } catch (err) {
      console.error('Error refreshing recommendations:', err)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [session?.user?.id])

  return {
    profile,
    recommendations,
    isLoading,
    error,
    refetch: fetchProfile,
    refreshRecommendations,
    hasCompletedOnboarding: profile?.onboarding_completed || false,
    isNewUser: !profile
  }
} 