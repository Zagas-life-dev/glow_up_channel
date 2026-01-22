"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { 
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Shield,
  Mail,
  CheckCircle,
  X,
  ChevronRight,
  Home,
  LayoutDashboard
} from 'lucide-react'

// Step Components
import OrganizationDetails from '@/components/provider-onboarding/OrganizationDetails'
import ContactInformation from '@/components/provider-onboarding/ContactInformation'
import VerificationDocuments from '@/components/provider-onboarding/VerificationDocuments'
import TermsAndConditions from '@/components/provider-onboarding/TermsAndConditions'

const STEPS = [
  {
    id: 'organization',
    title: 'Organization',
    shortTitle: 'Organization',
    description: 'Tell us about your organization',
    icon: Building2,
    component: OrganizationDetails
  },
  {
    id: 'contact',
    title: 'Contact Info',
    shortTitle: 'Contact',
    description: 'How can we reach you?',
    icon: Mail,
    component: ContactInformation
  },
  {
    id: 'verification',
    title: 'Verification',
    shortTitle: 'Verify',
    description: 'Upload verification documents',
    icon: Shield,
    component: VerificationDocuments
  },
  {
    id: 'terms',
    title: 'Terms',
    shortTitle: 'Terms',
    description: 'Agree to our terms',
    icon: CheckCircle,
    component: TermsAndConditions
  }
]

interface ProviderData {
  // Organization Details
  organizationName: string
  providerType: string
  otherProviderType: string
  contactPersonName: string
  contactPersonRole: string
  providerAddress: string
  aboutOrganization: string
  
  // Contact Information
  officialEmail: string
  phoneNumber: string
  stateOfOperation: string
  yearEstablished: string
  website: string
  socialMediaHandles: string
  
  // Registration Status
  isRegistered: boolean
  registrationNumber: string
  nationalId: string
  passportId: string
  otherId: string
  otherIdType: string
  
  // Verification Documents
  verificationDocument: File | null
  verificationDocumentUrl: string
  verificationDocumentType: string
  organizationLogo: File | null
  organizationLogoUrl: string
  
  // Terms & Conditions
  agreedToTerms: boolean
}

const initialData: ProviderData = {
  organizationName: '',
  providerType: '',
  otherProviderType: '',
  contactPersonName: '',
  contactPersonRole: '',
  providerAddress: '',
  aboutOrganization: '',
  officialEmail: '',
  phoneNumber: '',
  stateOfOperation: '',
  yearEstablished: '',
  website: '',
  socialMediaHandles: '',
  isRegistered: false,
  registrationNumber: '',
  nationalId: '',
  passportId: '',
  otherId: '',
  otherIdType: '',
  verificationDocument: null,
  verificationDocumentUrl: '',
  verificationDocumentType: '',
  organizationLogo: null,
  organizationLogoUrl: '',
  agreedToTerms: false
}

const validateProviderOnboardingData = (data: ProviderData) => {
  const errors: string[] = []

  if (!data.organizationName?.trim()) errors.push('Organization Name')
  if (!data.providerType?.trim()) errors.push('Provider Type')
  if (!data.contactPersonName?.trim()) errors.push('Contact Person Name')
  if (!data.contactPersonRole?.trim()) errors.push('Contact Person Role')
  if (!data.providerAddress?.trim()) errors.push('Provider Address')
  if (!data.aboutOrganization?.trim()) errors.push('About Organization')
  if (!data.officialEmail?.trim()) errors.push('Official Email')
  if (!data.phoneNumber?.trim()) errors.push('Phone Number')
  if (!data.stateOfOperation?.trim()) errors.push('State of Operation')
  if (!data.yearEstablished?.trim()) errors.push('Year Established')

  if (data.isRegistered && !data.registrationNumber?.trim()) {
    errors.push('Registration Number')
  } else if (!data.isRegistered && !data.nationalId?.trim() && !data.passportId?.trim() && !data.otherId?.trim()) {
    errors.push('At least one form of identification')
  }

  if (!data.verificationDocument && !data.verificationDocumentUrl) {
    errors.push('Verification Document')
  }

  if (!data.agreedToTerms) errors.push('Terms and Conditions agreement')

  return {
    isValid: errors.length === 0,
    errors
  }
}

export default function ProviderOnboarding() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<ProviderData>(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    const cachedData = localStorage.getItem('providerOnboardingFormData')
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData)
        setFormData(parsedData)
      } catch (error) {
        console.error('Failed to parse cached provider onboarding data:', error)
      }
    }
  }, [])

  const updateFormData = (updates: Partial<ProviderData>) => {
    const updatedData = { ...formData, ...updates }
    setFormData(updatedData)
    localStorage.setItem('providerOnboardingFormData', JSON.stringify(updatedData))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
      setCompletedSteps(prev => [...prev, currentStep])
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const goToStep = (stepIndex: number) => {
    if (stepIndex <= completedSteps.length || stepIndex === 0) {
      setCurrentStep(stepIndex)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const validation = validateProviderOnboardingData(formData)
      if (!validation.isValid) {
        toast.error(`Please complete all required fields: ${validation.errors.join(', ')}`)
        setIsSubmitting(false)
        return
      }

      const serializableData = Object.keys(formData).reduce((acc, key) => {
        const value = formData[key as keyof ProviderData]
        if (value instanceof File || (key.includes('Document') && value === null) || (key.includes('Logo') && value === null)) {
          return acc
        }
        acc[key] = value
        return acc
      }, {} as any)
      
      const response = await ApiClient.updateProviderOnboarding(serializableData)
      
      if (response.isCompleted) {
        localStorage.removeItem('providerOnboardingFormData')
        toast.success('Provider registration completed successfully!')
        router.push('/dashboard/provider')
      } else {
        toast.error(`Registration incomplete. Please complete all required fields. (${response.completionPercentage}% complete)`)
      }
    } catch (error) {
      console.error('Error submitting provider data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please try again.'
      toast.error(`Failed to complete registration: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isStepComplete = (stepIndex: number): boolean => {
    const step = STEPS[stepIndex]
    const data = formData

    switch (step.id) {
      case 'organization':
        return !!(data.organizationName && data.providerType && data.contactPersonName && data.contactPersonRole && data.providerAddress && data.aboutOrganization)
      case 'contact':
        return !!(data.officialEmail && data.phoneNumber && data.stateOfOperation && data.yearEstablished && 
                 ((data.isRegistered && data.registrationNumber) || data.nationalId || data.passportId || data.otherId))
      case 'verification':
        return !!(data.verificationDocument || data.verificationDocumentUrl)
      case 'terms':
        return data.agreedToTerms
      default:
        return false
    }
  }

  const canProceed = isStepComplete(currentStep)
  const progress = ((currentStep + 1) / STEPS.length) * 100
  
  const calculateCompletionPercentage = () => {
    const validation = validateProviderOnboardingData(formData)
    const totalFields = 12
    const completedFields = totalFields - validation.errors.length
    return Math.round((completedFields / totalFields) * 100)
  }

  const completionPercentage = calculateCompletionPercentage()

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
          <p className="text-white/60 mb-4">Please log in to access provider onboarding</p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 rounded-xl">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  const CurrentStepComponent = STEPS[currentStep].component

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Mobile Header - Compact */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06] lg:hidden">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/provider')}
              className="h-9 w-9 p-0 text-white/60"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-sm font-bold text-white">Provider Setup</h1>
              <p className="text-[10px] text-white/50">Step {currentStep + 1} of {STEPS.length}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-9 w-9 p-0 text-white/60"
          >
            <Link href="/dashboard/provider">
              <X className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="px-4 pb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Progress</span>
            <span className="text-white/70 font-medium">{completionPercentage}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block border-b border-white/[0.06] bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/provider')}
                className="text-white/60 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">Provider Onboarding</h1>
                <p className="text-sm text-white/50">Complete your registration to start posting opportunities</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white/60 hover:text-white"
            >
              <Link href="/dashboard/provider">
                <X className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          {/* Desktop Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Step {currentStep + 1} of {STEPS.length}</span>
              <span className="text-white/70 font-medium">{completionPercentage}% Complete</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full px-4 lg:px-6 py-4 lg:py-8 gap-6">
        {/* Step Indicator - Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0">
          <Card className="bg-white/[0.02] border-white/[0.06] sticky top-24">
            <CardContent className="p-4 space-y-2">
              {STEPS.map((step, index) => {
                const Icon = step.icon
                const isCompleted = completedSteps.includes(index) || isStepComplete(index)
                const isCurrent = currentStep === index
                const canAccess = index <= completedSteps.length || index === 0
                
                return (
                  <button
                    key={step.id}
                    onClick={() => goToStep(index)}
                    disabled={!canAccess}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                      isCurrent
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : isCompleted
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : canAccess
                        ? "text-white/60 hover:text-white hover:bg-white/[0.05] border border-transparent"
                        : "text-white/30 cursor-not-allowed border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-400"
                        : isCurrent
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-white/5 text-white/30"
                    )}>
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{step.title}</p>
                      <p className="text-xs text-white/40 truncate">{step.description}</p>
                    </div>
                    {isCurrent && (
                      <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </aside>

        {/* Step Content */}
        <main className="flex-1 min-w-0">
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardContent className="p-4 md:p-6 lg:p-8">
              {/* Step Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  {React.createElement(STEPS[currentStep].icon, { className: "w-6 h-6 text-orange-400" })}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                    {STEPS[currentStep].title}
                  </h2>
                  <p className="text-sm text-white/50">{STEPS[currentStep].description}</p>
                </div>
                {/* Mobile Step Indicator */}
                <div className="lg:hidden flex items-center gap-1">
                  {STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        index === currentStep
                          ? "w-6 bg-orange-500"
                          : index < currentStep
                          ? "bg-emerald-500"
                          : "bg-white/20"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Step Component */}
              <div className="mb-8">
                <CurrentStepComponent
                  data={formData}
                  updateData={updateFormData}
                  isComplete={isStepComplete(currentStep)}
                />
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={cn(
                    "flex items-center gap-2 border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05]",
                    currentStep === 0 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                
                {currentStep === STEPS.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!canProceed || isSubmitting}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 md:px-8 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Completing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Complete Registration</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    disabled={!canProceed}
                    className={cn(
                      "bg-orange-500 hover:bg-orange-600 text-white px-6 md:px-8 flex items-center gap-2",
                      !canProceed && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Mobile Step Pills - Bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.06] safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isCompleted = completedSteps.includes(index) || isStepComplete(index)
            const isCurrent = currentStep === index
            
            return (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                disabled={index > completedSteps.length && index !== 0}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 px-2 transition-all",
                  isCurrent
                    ? "text-orange-400"
                    : isCompleted
                    ? "text-emerald-400"
                    : "text-white/30"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isCurrent
                    ? "bg-orange-500/20"
                    : isCompleted
                    ? "bg-emerald-500/20"
                    : "bg-white/5"
                )}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium truncate w-full text-center",
                  isCurrent && "text-orange-400"
                )}>
                  {step.shortTitle}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Spacer for mobile bottom nav */}
      <div className="lg:hidden h-16" />
    </div>
  )
}
