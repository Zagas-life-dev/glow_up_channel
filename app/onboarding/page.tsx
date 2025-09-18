'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import ApiClient from '@/lib/api-client'
import { transformOnboardingData, validateOnboardingData } from '@/lib/onboarding-utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

import LocationStep from '@/components/onboarding/location-step'
import InterestsStep from '@/components/onboarding/interests-step'
import IndustryStep from '@/components/onboarding/industry-step'
import EducationStep from '@/components/onboarding/education-step'
import CareerStep from '@/components/onboarding/career-step'
import SkillsStep from '@/components/onboarding/skills-step'
import AspirationsStep from '@/components/onboarding/aspirations-step'

const steps = [
  { id: 'location', title: 'Location', component: LocationStep },
  { id: 'interests', title: 'Interests', component: InterestsStep },
  { id: 'industry', title: 'Industry', component: IndustryStep },
  { id: 'education', title: 'Education', component: EducationStep },
  { id: 'career', title: 'Career Stage', component: CareerStep },
  { id: 'skills', title: 'Skills', component: SkillsStep },
  { id: 'aspirations', title: 'Aspirations', component: AspirationsStep },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({})
  const [isCompleting, setIsCompleting] = useState(false)
  const stepComponentRef = useRef<{ submit: () => void }>(null)
  const router = useRouter()
  const { user, profile, isLoading: isPending, isOnboardingCompleted } = useAuth()

  // Load cached form data and temp user data on mount
  useEffect(() => {
    const cachedData = localStorage.getItem('onboardingFormData')
    const tempUserData = localStorage.getItem('tempUserData')
    
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData)
        setFormData(parsedData)
      } catch (error) {
        console.error('Failed to parse cached form data:', error)
      }
    }
    
    if (tempUserData) {
      try {
        const parsedUserData = JSON.parse(tempUserData)
        setFormData(prev => ({ ...prev, ...parsedUserData }))
      } catch (error) {
        console.error('Failed to parse temp user data:', error)
      }
    }
  }, [])

  // Redirect if not authenticated or if onboarding is already completed
  useEffect(() => {
    if (!isPending && !user) {
      router.push('/login')
    } else if (user && isOnboardingCompleted) {
      // User has already completed onboarding, redirect to dashboard
      router.push('/dashboard')
    }
  }, [user, isOnboardingCompleted, isPending, router])

  const handleNext = () => {
    if (stepComponentRef.current) {
      stepComponentRef.current.submit()
    }
  }

  const onStepSubmit = async (data: any) => {
    const updatedFormData = { ...formData, ...data }
    setFormData(updatedFormData)
    
    // Cache form data after each step
    localStorage.setItem('onboardingFormData', JSON.stringify(updatedFormData))
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Finish onboarding
      setIsCompleting(true)
      
      try {
        // Validate the data before transformation
        const validation = validateOnboardingData(updatedFormData)
        if (!validation.isValid) {
          console.error('Onboarding validation failed:', validation.errors)
          alert(`Please complete all required fields: ${validation.errors.join(', ')}`)
          setIsCompleting(false)
          return
        }

        // Transform data to backend format
        const transformedData = transformOnboardingData(updatedFormData)
        console.log('Onboarding complete - transformed data:', transformedData)
        
        if (user?._id) {
          await ApiClient.createUserProfile(transformedData)
          console.log('✅ Onboarding data saved successfully')
          
          // Clear cached data after successful save
          localStorage.removeItem('onboardingFormData')
          localStorage.removeItem('tempUserData')
        }
        
        // Redirect to dashboard
        router.push('/dashboard')
      } catch (error) {
        console.error('Failed to save onboarding data:', error)
        alert('Failed to save your profile. Please try again.')
        // Still redirect to dashboard even if save fails
        router.push('/dashboard')
      } finally {
        setIsCompleting(false)
      }
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Clear cached data when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // Only clear if onboarding is not completed
      if (currentStep < steps.length - 1) {
        // Keep the data cached for potential return
        console.log('Onboarding data cached for potential return')
      }
    }
  }, [currentStep])

  // Show loading if checking auth
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null
  }

  const progress = ((currentStep + 1) / steps.length) * 100
  const CurrentStepComponent = steps[currentStep].component

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200/50 p-6 sm:p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              Complete Your Profile
            </h1>
            <span className="text-sm font-medium text-gray-600 bg-orange-50 px-3 py-1 rounded-full">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="w-full h-3 bg-gray-100 [&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-orange-400" />
        </div>

        <div className="mb-8">
          <CurrentStepComponent 
            ref={stepComponentRef} 
            onSubmit={onStepSubmit} 
            initialData={formData}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={isCompleting}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isCompleting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Completing...</span>
              </div>
            ) : currentStep === steps.length - 1 ? (
              <>
                Finish Onboarding
                <Check className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 