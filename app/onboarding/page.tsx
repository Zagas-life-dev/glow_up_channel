'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import ApiClient from '@/lib/api-client'
import { transformOnboardingData, validateOnboardingData } from '@/lib/onboarding-utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { FlaticonIcon } from '@/components/ui/flaticon-icon'

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
      // User has already completed onboarding, redirect to home
      router.push('/')
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
        
        // Redirect to home with param so we can show welcome popup
        router.push('/?onboarded=1')
      } catch (error) {
        console.error('Failed to save onboarding data:', error)
        alert('Failed to save your profile. Please try again.')
        // Still redirect to home even if save fails
        router.push('/?onboarded=1')
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
      <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative text-center">
          <div className="w-9 h-9 border-2 border-orange-500/80 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Preparing your GlowUp onboarding…</p>
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
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/70 backdrop-blur-md border border-border/70 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              GlowUp onboarding
            </span>
          </div>
          <span className="hidden sm:inline-flex text-xs font-medium text-muted-foreground px-3 py-1 rounded-full bg-muted/70 border border-border/60">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        <div className="bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-orange-300 bg-clip-text text-transparent">
                  Complete your GlowUp profile
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md">
                  We&apos;ll use this to personalize opportunities, events, and resources for you.
                </p>
              </div>
              <span className="inline-flex sm:hidden text-xs font-medium text-muted-foreground px-3 py-1 rounded-full bg-muted/70 border border-border/60 self-start">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <Progress
              value={progress}
              className="w-full h-2 rounded-full bg-muted [&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-rose-500"
            />
          </div>

          <div className="mb-2">
            <CurrentStepComponent
              ref={stepComponentRef}
              onSubmit={onStepSubmit}
              initialData={formData}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-full"
            >
              <FlaticonIcon name="angle-left" className="mr-2 h-4 w-4" aria-hidden />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={isCompleting}
              className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 px-6"
            >
              {isCompleting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                  <span>Completing…</span>
                </div>
              ) : currentStep === steps.length - 1 ? (
                <>
                  Finish onboarding
                  <FlaticonIcon name="check" className="ml-2 h-4 w-4" aria-hidden />
                </>
              ) : (
                <>
                  Next
                  <FlaticonIcon name="angle-right" className="ml-2 h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 