"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import { toast } from 'sonner'
import { 
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  FileText,
  Upload,
  Shield,
  Users,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Globe,
  Image as ImageIcon,
  FileUp,
  CheckCircle
} from 'lucide-react'

// Step 1: Organization Details
import OrganizationDetails from '@/components/provider-onboarding/OrganizationDetails'
// Step 2: Contact Information
import ContactInformation from '@/components/provider-onboarding/ContactInformation'
// Step 3: Verification Documents
import VerificationDocuments from '@/components/provider-onboarding/VerificationDocuments'
// Step 4: Terms & Conditions
import TermsAndConditions from '@/components/provider-onboarding/TermsAndConditions'
const STEPS = [
  {
    id: 'organization',
    title: 'Organization Details',
    description: 'Tell us about your organization',
    icon: Building2,
    component: OrganizationDetails
  },
  {
    id: 'contact',
    title: 'Contact Information',
    description: 'How can we reach you?',
    icon: Mail,
    component: ContactInformation
  },
  {
    id: 'verification',
    title: 'Registration & Verification',
    description: 'Upload verification documents',
    icon: Shield,
    component: VerificationDocuments
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
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
  // Organization Details
  organizationName: '',
  providerType: '',
  otherProviderType: '',
  contactPersonName: '',
  contactPersonRole: '',
  providerAddress: '',
  aboutOrganization: '',
  
  // Contact Information
  officialEmail: '',
  phoneNumber: '',
  stateOfOperation: '',
  yearEstablished: '',
  website: '',
  socialMediaHandles: '',
  
  // Registration Status
  isRegistered: false,
  registrationNumber: '',
  nationalId: '',
  passportId: '',
  otherId: '',
  otherIdType: '',
  
  // Verification Documents
  verificationDocument: null,
  verificationDocumentUrl: '',
  verificationDocumentType: '',
  organizationLogo: null,
  organizationLogoUrl: '',
  
  // Terms & Conditions
  agreedToTerms: false
}

// Validation function for provider onboarding data
const validateProviderOnboardingData = (data: ProviderData) => {
  const errors: string[] = []

  // Organization Details validation
  if (!data.organizationName?.trim()) errors.push('Organization Name')
  if (!data.providerType?.trim()) errors.push('Provider Type')
  if (!data.contactPersonName?.trim()) errors.push('Contact Person Name')
  if (!data.contactPersonRole?.trim()) errors.push('Contact Person Role')
  if (!data.providerAddress?.trim()) errors.push('Provider Address')
  if (!data.aboutOrganization?.trim()) errors.push('About Organization')

  // Contact Information validation
  if (!data.officialEmail?.trim()) errors.push('Official Email')
  if (!data.phoneNumber?.trim()) errors.push('Phone Number')
  if (!data.stateOfOperation?.trim()) errors.push('State of Operation')
  if (!data.yearEstablished?.trim()) errors.push('Year Established')

  // Registration validation
  if (data.isRegistered && !data.registrationNumber?.trim()) {
    errors.push('Registration Number')
  } else if (!data.isRegistered && !data.nationalId?.trim() && !data.passportId?.trim() && !data.otherId?.trim()) {
    errors.push('At least one form of identification')
  }

  // Verification validation
  if (!data.verificationDocument && !data.verificationDocumentUrl) {
    errors.push('Verification Document')
  }

  // Terms validation
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

  // Hide navbar and footer when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  // Clear cached data when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // Only clear if onboarding is not completed
      if (currentStep < STEPS.length - 1) {
        // Keep the data cached for potential return
        console.log('Provider onboarding data cached for potential return')
      }
    }
  }, [currentStep])

  // Load cached form data on mount
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
    
    // Cache form data after each update
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
      // Validate that all required fields are filled
      const validation = validateProviderOnboardingData(formData)
      if (!validation.isValid) {
        toast.error(`Please complete all required fields: ${validation.errors.join(', ')}`)
        setIsSubmitting(false)
        return
      }

      // Filter out File objects and other non-serializable data
      const serializableData = Object.keys(formData).reduce((acc, key) => {
        const value = formData[key as keyof ProviderData]
        // Skip File objects and null values for files
        if (value instanceof File || (key.includes('Document') && value === null) || (key.includes('Logo') && value === null) || (key.includes('Banner') && value === null)) {
          return acc
        }
        acc[key] = value
        return acc
      }, {} as any)
      
      console.log('Submitting provider onboarding with data:', serializableData)
      
      // Update onboarding data in backend (single API call)
      const response = await ApiClient.updateProviderOnboarding(serializableData)
      console.log('Provider onboarding data updated successfully:', response)
      
      // Check if onboarding is completed
      if (response.isCompleted) {
        // Clear cached data after successful save
        localStorage.removeItem('providerOnboardingFormData')
        
        toast.success('Provider registration completed successfully!')
        router.push('/dashboard/provider')
      } else {
        toast.error(`Registration incomplete. Please complete all required fields. (${response.completionPercentage}% complete)`)
      }
    } catch (error) {
      console.error('Error submitting provider data:', error)
      console.error('Error details:', error)
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
  
  // Calculate overall completion percentage
  const calculateCompletionPercentage = () => {
    const validation = validateProviderOnboardingData(formData)
    const totalFields = 12; // Total number of required fields (6 org + 4 contact + 1 verification + 1 terms)
    const completedFields = totalFields - validation.errors.length;
    return Math.round((completedFields / totalFields) * 100);
  }

  const completionPercentage = calculateCompletionPercentage()

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-lg text-gray-600">Please log in to access provider onboarding</p>
        </div>
      </div>
    )
  }

  const CurrentStepComponent = STEPS[currentStep].component

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Homepage"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/provider')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Provider Onboarding</h1>
              <p className="text-sm lg:text-base text-gray-600">Complete your registration to start posting opportunities</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {STEPS.length}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Step Progress</span>
            <span className="text-gray-500">{currentStep + 1} of {STEPS.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Overall Completion</span>
            <span className="text-gray-500">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-1" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Step Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Registration Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {STEPS.map((step, index) => {
                  const Icon = step.icon
                  const isCompleted = completedSteps.includes(index)
                  const isCurrent = currentStep === index
                  const canAccess = index <= completedSteps.length || index === 0
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => goToStep(index)}
                      disabled={!canAccess}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all ${
                        isCurrent
                          ? 'bg-orange-100 text-orange-700 border border-orange-200'
                          : isCompleted
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : canAccess
                          ? 'text-gray-600 hover:bg-gray-50'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{step.title}</p>
                        <p className="text-xs text-gray-500 truncate">{step.description}</p>
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    {React.createElement(STEPS[currentStep].icon, { className: "w-5 h-5 text-orange-600" })}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{STEPS[currentStep].title}</CardTitle>
                    <p className="text-sm text-gray-600">{STEPS[currentStep].description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CurrentStepComponent
                  data={formData}
                  updateData={updateFormData}
                  isComplete={isStepComplete(currentStep)}
                />
                
                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>
                  
                  <div className="flex items-center space-x-3">
                    {currentStep === STEPS.length - 1 ? (
                      <Button
                        onClick={handleSubmit}
                        disabled={!canProceed || isSubmitting}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Completing Registration...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Complete Registration</span>
                          </div>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={nextStep}
                        disabled={!canProceed}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                      >
                        <span>Next</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
