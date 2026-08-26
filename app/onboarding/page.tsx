'use client'

/**
 * Onboarding.
 *
 * One question per screen, a segmented bar showing exactly how much is left, and no way to
 * skip anything — every answer here feeds the ranking layer, and a half-filled profile produces
 * a feed nobody comes back to.
 *
 * Continue is disabled until the current step reports itself valid. The old flow let you click
 * through all seven screens empty and only failed at the very end, with a browser `alert()`
 * listing everything you had missed.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiArrowLeftLine, RiLoader4Line } from 'react-icons/ri'

import { useAuth } from '@/lib/auth-context'
import ApiClient from '@/lib/api-client'
import { transformOnboardingData, validateOnboardingData } from '@/lib/onboarding-utils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import LocationStep from '@/components/onboarding/location-step'
import PhoneStep from '@/components/onboarding/phone-step'
import EducationStep from '@/components/onboarding/education-step'
import InterestsStep from '@/components/onboarding/interests-step'
import IndustryStep from '@/components/onboarding/industry-step'
import SkillsStep from '@/components/onboarding/skills-step'
import AspirationsStep from '@/components/onboarding/aspirations-step'

const steps = [
  { id: 'location', component: LocationStep },
  { id: 'phone', component: PhoneStep },
  { id: 'education', component: EducationStep },
  { id: 'interests', component: InterestsStep },
  { id: 'industry', component: IndustryStep },
  { id: 'skills', component: SkillsStep },
  { id: 'aspirations', component: AspirationsStep },
] as const

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isCompleting, setIsCompleting] = useState(false)
  const [stepValid, setStepValid] = useState(false)
  const stepComponentRef = useRef<{ submit: () => void }>(null)
  const router = useRouter()
  const { user, isLoading: isPending, isOnboardingCompleted } = useAuth()

  // Restore anything cached from a previous attempt
  useEffect(() => {
    for (const key of ['onboardingFormData', 'tempUserData']) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        setFormData((prev) => ({ ...prev, ...JSON.parse(raw) }))
      } catch (error) {
        console.error(`Failed to parse ${key}:`, error)
      }
    }
  }, [])

  useEffect(() => {
    if (!isPending && !user) {
      router.push('/login')
    } else if (user && !user.emailVerified) {
      router.push('/verify-email')
    } else if (user && isOnboardingCompleted) {
      router.push('/dashboard')
    }
  }, [user, isOnboardingCompleted, isPending, router])

  // Each step reports its own validity; reset the gate when the step changes.
  const handleValidityChange = useCallback((valid: boolean) => setStepValid(valid), [])
  useEffect(() => {
    setStepValid(false)
  }, [currentStep])

  const onStepSubmit = async (data: any) => {
    const updated = { ...formData, ...data }
    setFormData(updated)
    localStorage.setItem('onboardingFormData', JSON.stringify(updated))

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
      return
    }

    setIsCompleting(true)
    try {
      const validation = validateOnboardingData(updated)
      if (!validation.isValid) {
        // Per-step gating should make this unreachable; if it fires, something upstream changed.
        toast.error(`Still missing: ${validation.errors.join(', ')}`)
        setIsCompleting(false)
        return
      }

      if (user?._id) {
        await ApiClient.createUserProfile(transformOnboardingData(updated))
        localStorage.removeItem('onboardingFormData')
        localStorage.removeItem('tempUserData')
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to save onboarding data:', error)
      toast.error('Could not save your profile. Please try again.')
      setIsCompleting(false)
    }
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <RiLoader4Line className="h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (!user) return null

  const CurrentStepComponent = steps[currentStep].component
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6">
        {/* Segmented progress — how much is left is legible at a glance, unlike one long bar */}
        <div className="mb-5 flex items-center gap-1.5" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                index <= currentStep ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>

        <div className="mb-6 flex items-center gap-3">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              aria-label="Back"
              className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RiArrowLeftLine className="h-4.5 w-4.5" />
            </button>
          ) : null}
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        <div className="flex-1">
          <CurrentStepComponent
            key={steps[currentStep].id}
            ref={stepComponentRef}
            onSubmit={onStepSubmit}
            initialData={formData}
            onValidityChange={handleValidityChange}
          />
        </div>

        {/* Nothing here is skippable, so there is one action and it is the whole width */}
        <div className="sticky bottom-0 mt-8 bg-page pb-1 pt-4">
          <Button
            type="button"
            onClick={() => stepComponentRef.current?.submit()}
            disabled={!stepValid || isCompleting}
            className="h-14 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/20 disabled:opacity-40 disabled:shadow-none"
          >
            {isCompleting ? (
              <>
                <RiLoader4Line className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                Setting up your feed…
              </>
            ) : isLastStep ? (
              'Finish setup'
            ) : (
              'Continue'
            )}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            {stepValid ? 'You can change any of this later in Settings.' : 'Answer this to continue.'}
          </p>
        </div>
      </div>
    </div>
  )
}
