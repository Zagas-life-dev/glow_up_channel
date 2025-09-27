"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import { 
  Plus,
  Target,
  Calendar,
  Briefcase,
  BookOpen,
  Users,
  MapPin,
  Clock,
  DollarSign,
  Globe,
  Mail,
  Phone,
  Building,
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export default function PostingDashboard() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<'opportunity' | 'event' | 'job' | 'resource'>('opportunity')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canPost, setCanPost] = useState(false)
  const [onboardingStatus, setOnboardingStatus] = useState<{
    completionPercentage: number
    isCompleted: boolean
    reason: string
  } | null>(null)
  
  // Toggle states for isPaid switches
  const [isOpportunityPaid, setIsOpportunityPaid] = useState(false)
  const [isJobPaid, setIsJobPaid] = useState(false)
  const [isEventPaid, setIsEventPaid] = useState(false)
  const [isResourcePaid, setIsResourcePaid] = useState(false)
  
  // Toggle states for isRemote switches
  const [isOpportunityRemote, setIsOpportunityRemote] = useState(false)
  const [isJobRemote, setIsJobRemote] = useState(false)
  const [isEventRemote, setIsEventRemote] = useState(false)
  
  // Salary state for jobs
  const [hasSalary, setHasSalary] = useState(false)
  
  // Opportunity type and tags state
  const [opportunityType, setOpportunityType] = useState('')
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [opportunityTags, setOpportunityTags] = useState<string[]>([])
  const [opportunityTagInput, setOpportunityTagInput] = useState('')
  const [opportunityTagSuggestions, setOpportunityTagSuggestions] = useState<string[]>([])
  const [showOpportunityTagSuggestions, setShowOpportunityTagSuggestions] = useState(false)
  const [isLoadingOpportunityTags, setIsLoadingOpportunityTags] = useState(false)
  
  // Job tags state
  const [jobTags, setJobTags] = useState<string[]>([])
  const [jobTagInput, setJobTagInput] = useState('')
  const [jobTagSuggestions, setJobTagSuggestions] = useState<string[]>([])
  const [showJobTagSuggestions, setShowJobTagSuggestions] = useState(false)
  const [isLoadingJobTags, setIsLoadingJobTags] = useState(false)
  
  // Event tags state
  const [eventTags, setEventTags] = useState<string[]>([])
  const [eventTagInput, setEventTagInput] = useState('')
  const [eventTagSuggestions, setEventTagSuggestions] = useState<string[]>([])
  const [showEventTagSuggestions, setShowEventTagSuggestions] = useState(false)
  const [isLoadingEventTags, setIsLoadingEventTags] = useState(false)
  
  // Resource tags state
  const [resourceTags, setResourceTags] = useState<string[]>([])
  const [resourceTagInput, setResourceTagInput] = useState('')
  const [resourceTagSuggestions, setResourceTagSuggestions] = useState<string[]>([])
  const [showResourceTagSuggestions, setShowResourceTagSuggestions] = useState(false)
  const [isLoadingResourceTags, setIsLoadingResourceTags] = useState(false)

  // Opportunity type recommendations
  const opportunityTypeSuggestions = [
    'Internship',
    'Scholarship',
    'Grant',
    'Fellowship',
    'Volunteer Work',
    'Mentorship Program',
    'Training Program',
    'Workshop',
    'Competition',
    'Research Opportunity',
    'Startup Incubator',
    'Accelerator Program',
    'Networking Event',
    'Conference',
    'Hackathon',
    'Bootcamp',
    'Exchange Program',
    'Study Abroad',
    'Job Shadowing',
    'Apprenticeship',
    'Freelance Project',
    'Consulting Opportunity',
    'Partnership',
    'Collaboration',
    'Community Service',
    'Leadership Program',
    'Entrepreneurship Program',
    'Innovation Challenge',
    'Design Contest',
    'Writing Competition',
    'Photography Contest',
    'Video Contest',
    'Coding Challenge',
    'Business Plan Competition',
    'Pitch Competition'
  ]

  // Filter suggestions based on input
  const filteredSuggestions = opportunityTypeSuggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(opportunityType.toLowerCase())
  )

  // Handle opportunity type selection
  const handleTypeSelect = (type: string) => {
    setOpportunityType(type)
    setShowTypeDropdown(false)
  }

  // Search for tag suggestions using skills API
  const searchTagSuggestions = async (query: string, formType: 'opportunity' | 'job' | 'event' | 'resource') => {
    if (query.length < 2) {
      setEventTagSuggestions([])
      setShowEventTagSuggestions(false)
      return
    }

    // Fallback suggestions for all form types
    const fallbackSuggestions = [
      'Technology', 'Business', 'Education', 'Healthcare', 'Finance', 'Marketing', 'Design', 'Engineering',
      'Programming', 'Data Science', 'Artificial Intelligence', 'Machine Learning', 'Web Development',
      'Mobile Development', 'Cybersecurity', 'Cloud Computing', 'DevOps', 'UI/UX Design',
      'Digital Marketing', 'Content Writing', 'Project Management', 'Sales', 'Customer Service',
      'Human Resources', 'Accounting', 'Legal', 'Medicine', 'Nursing', 'Teaching', 'Research',
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes',
      'SQL', 'MongoDB', 'Git', 'Agile', 'Scrum', 'Leadership', 'Communication', 'Analytics'
    ].filter(tag => tag.toLowerCase().includes(query.toLowerCase()))

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/skills/suggestions?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      const apiSuggestions = data.success ? data.suggestions : []
      
      // Combine API suggestions with fallback suggestions, removing duplicates
      const combinedSuggestions = [...new Set([...apiSuggestions, ...fallbackSuggestions])]
      const suggestions = combinedSuggestions.slice(0, 7)

      if (formType === 'event') {
        setIsLoadingEventTags(true)
        setEventTagSuggestions(suggestions)
        setShowEventTagSuggestions(true)
        setIsLoadingEventTags(false)
      } else if (formType === 'opportunity') {
        setIsLoadingOpportunityTags(true)
        setOpportunityTagSuggestions(suggestions)
        setShowOpportunityTagSuggestions(true)
        setIsLoadingOpportunityTags(false)
      } else if (formType === 'job') {
        setIsLoadingJobTags(true)
        setJobTagSuggestions(suggestions)
        setShowJobTagSuggestions(true)
        setIsLoadingJobTags(false)
      } else if (formType === 'resource') {
        setIsLoadingResourceTags(true)
        setResourceTagSuggestions(suggestions)
        setShowResourceTagSuggestions(true)
        setIsLoadingResourceTags(false)
      }
    } catch (error) {
      console.error('Error fetching tag suggestions:', error)
      // Use fallback suggestions on error
      const suggestions = fallbackSuggestions.slice(0, 7)
      
      if (formType === 'event') {
        setIsLoadingEventTags(true)
        setEventTagSuggestions(suggestions)
        setShowEventTagSuggestions(true)
        setIsLoadingEventTags(false)
      } else if (formType === 'opportunity') {
        setIsLoadingOpportunityTags(true)
        setOpportunityTagSuggestions(suggestions)
        setShowOpportunityTagSuggestions(true)
        setIsLoadingOpportunityTags(false)
      } else if (formType === 'job') {
        setIsLoadingJobTags(true)
        setJobTagSuggestions(suggestions)
        setShowJobTagSuggestions(true)
        setIsLoadingJobTags(false)
      } else if (formType === 'resource') {
        setIsLoadingResourceTags(true)
        setResourceTagSuggestions(suggestions)
        setShowResourceTagSuggestions(true)
        setIsLoadingResourceTags(false)
      }
    }
  }

  // Handle tag input change with suggestions
  const handleTagInputChange = (value: string, formType: 'opportunity' | 'job' | 'event' | 'resource') => {
    switch (formType) {
      case 'opportunity':
        setOpportunityTagInput(value)
        searchTagSuggestions(value, 'opportunity')
        break
      case 'job':
        setJobTagInput(value)
        searchTagSuggestions(value, 'job')
        break
      case 'event':
        setEventTagInput(value)
        searchTagSuggestions(value, 'event')
        break
      case 'resource':
        setResourceTagInput(value)
        searchTagSuggestions(value, 'resource')
        break
    }
  }

  // Handle tag input for different forms
  const handleTagAdd = (e: React.KeyboardEvent, formType: 'opportunity' | 'job' | 'event' | 'resource') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      let tagInput = ''
      let tags: string[] = []
      let setTags: (tags: string[]) => void = () => {}
      let setTagInput: (input: string) => void = () => {}
      
      switch (formType) {
        case 'opportunity':
          tagInput = opportunityTagInput
          tags = opportunityTags
          setTags = setOpportunityTags
          setTagInput = setOpportunityTagInput
          break
        case 'job':
          tagInput = jobTagInput
          tags = jobTags
          setTags = setJobTags
          setTagInput = setJobTagInput
          break
        case 'event':
          tagInput = eventTagInput
          tags = eventTags
          setTags = setEventTags
          setTagInput = setEventTagInput
          break
        case 'resource':
          tagInput = resourceTagInput
          tags = resourceTags
          setTags = setResourceTags
          setTagInput = setResourceTagInput
          break
      }
      
      if (tagInput.trim() && !tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
        setTagInput('')
        if (formType === 'event') {
          setShowEventTagSuggestions(false)
          setEventTagSuggestions([])
        }
      }
    }
  }

  // Remove tag for different forms
  const removeTag = (tagToRemove: string, formType: 'opportunity' | 'job' | 'event' | 'resource') => {
    switch (formType) {
      case 'opportunity':
        setOpportunityTags(opportunityTags.filter(tag => tag !== tagToRemove))
        break
      case 'job':
        setJobTags(jobTags.filter(tag => tag !== tagToRemove))
        break
      case 'event':
        setEventTags(eventTags.filter(tag => tag !== tagToRemove))
        break
      case 'resource':
        setResourceTags(resourceTags.filter(tag => tag !== tagToRemove))
        break
    }
  }

  // Hide navbar when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // Check posting permission
  useEffect(() => {
    const checkPostingPermission = async () => {
      if (!isAuthenticated || !user) return
      
      // All users must complete onboarding
      
      try {
        const response = await ApiClient.checkPostingPermission()
        setCanPost(response.canPost)
        setOnboardingStatus({
          completionPercentage: response.completionPercentage,
          isCompleted: response.isCompleted,
          reason: response.reason
        })
      } catch (error) {
        console.error('Error checking posting permission:', error)
        setCanPost(false)
        setOnboardingStatus({
          completionPercentage: 0,
          isCompleted: false,
          reason: 'Failed to verify onboarding status'
        })
      }
    }

    checkPostingPermission()
  }, [isAuthenticated, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement)
      const data = Object.fromEntries(formData.entries())
      
      // Determine which form is being submitted based on activeTab
      let submissionData: any = {}
      
      if (activeTab === 'opportunity') {
        submissionData = {
          title: data.title,
          company: data.company,
          provider: data.provider,
          type: opportunityType || data.type,
          description: data.description,
          url: data.url,
          requirements: data.requirements,
          benefits: data.benefits,
          tags: opportunityTags,
          location: {
            country: data.opportunityCountry,
            province: data.opportunityProvince,
            city: data.opportunityCity,
            isRemote: isOpportunityRemote
          },
          financial: {
            isPaid: isOpportunityPaid,
            amount: data.amount,
            currency: 'NGN'
          },
          dates: {
            applicationDeadline: data.deadline
          }
        }
      } else if (activeTab === 'job') {
        submissionData = {
          title: data.jobTitle,
          company: data.jobCompany,
          type: data.jobType,
          description: data.jobDescription,
          url: data.jobUrl,
          tags: jobTags,
          location: {
            country: data.jobCountry,
            province: data.jobProvince,
            city: data.jobCity,
            isRemote: isJobRemote
          },
          pay: {
            isPaid: isJobPaid,
            amount: hasSalary ? 'Salary Present' : data.jobSalary,
            period: data.jobPeriod,
            currency: 'NGN'
          },
          dates: {
            applicationDeadline: data.jobDeadline
          }
        }
      } else if (activeTab === 'event') {
        submissionData = {
          title: data.eventTitle,
          organizer: data.eventCompany,
          type: data.eventType,
          description: data.eventDescription,
          url: data.eventUrl,
          tags: eventTags,
          isPaid: isEventPaid,
          price: data.eventPrice,
          currency: 'NGN',
          location: {
            country: data.eventCountry,
            province: data.eventProvince,
            city: data.eventCity,
            isRemote: isEventRemote
          },
          dates: {
            startDate: data.eventStartDate,
            endDate: data.eventEndDate || null,
            registrationDeadline: data.eventRegistrationDeadline || null
          },
          capacity: data.eventCapacity
        }
      } else if (activeTab === 'resource') {
        submissionData = {
          title: data.resourceTitle,
          author: data.resourceName,
          description: data.resourceDescription,
          category: data.resourceCategory,
          paymentLink: data.resourceUrl,
          tags: resourceTags
        }
      }
      
      console.log('Submitting data:', submissionData)
      
      // Call the appropriate API based on activeTab
      let response
      switch (activeTab) {
        case 'opportunity':
          response = await ApiClient.createOpportunity(submissionData)
          break
        case 'job':
          response = await ApiClient.createJob(submissionData)
          break
        case 'event':
          response = await ApiClient.createEvent(submissionData)
          break
        case 'resource':
          response = await ApiClient.createResource(submissionData)
          break
        default:
          throw new Error(`Unknown form type: ${activeTab}`)
      }
      
      console.log(`${activeTab} posted successfully!`, response)
      
      // Show success message (you can add a toast notification here)
      alert(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} posted successfully!`)
      
      // Reset form after successful submission
      const form = document.getElementById('posting-form') as HTMLFormElement
      if (form) {
        form.reset()
        // Reset all tag states
        setOpportunityTags([])
        setOpportunityTagInput('')
        setJobTags([])
        setJobTagInput('')
        setEventTags([])
        setEventTagInput('')
        setResourceTags([])
        setResourceTagInput('')
        setOpportunityType('')
        setIsOpportunityPaid(false)
        setIsJobPaid(false)
        setIsEventPaid(false)
        setIsResourcePaid(false)
      }
      
    } catch (error) {
      console.error('Error submitting form:', error)
      
      // Show error message to user
      let errorMessage = 'Failed to post. Please try again.'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as any).message
      }
      
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const postingTabs = [
    {
      id: 'opportunity',
      title: 'Opportunity',
      icon: Target,
      description: 'Post internships, freelance gigs, and other opportunities',
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'event',
      title: 'Event',
      icon: Calendar,
      description: 'Post workshops, conferences, and networking events',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'job',
      title: 'Job',
      icon: Briefcase,
      description: 'Post full-time, part-time, and remote positions',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'resource',
      title: 'Resource',
      icon: BookOpen,
      description: 'Contact us to list your educational resources',
      color: 'from-purple-500 to-purple-600'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/provider" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Posting Dashboard</h1>
              <p className="text-sm lg:text-base text-gray-600">Share opportunities with the community</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        {/* Onboarding Status Check */}
        {!canPost && onboardingStatus && (
          <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Complete Your Provider Onboarding
                  </h3>
                  <p className="text-gray-700 mb-4">
                    {onboardingStatus.reason}. You need to complete your provider onboarding before you can post content.
                  </p>
                  
                  {onboardingStatus.completionPercentage > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-600">{onboardingStatus.completionPercentage}% Complete</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${onboardingStatus.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Link href="/dashboard/provider/onboarding">
                        Complete Onboarding
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/dashboard/provider">
                        Provider Dashboard
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posting Type Selection */}
        <div className="mb-8">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">What would you like to post?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {postingTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-sm ${
                    activeTab === tab.id
                      ? `border-orange-500 bg-gradient-to-r ${tab.color} text-white`
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        activeTab === tab.id ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <h3 className={`font-semibold ${
                      activeTab === tab.id ? 'text-white' : 'text-gray-900'
                    }`}>
                      {tab.title}
                    </h3>
                  </div>
                  <p className={`text-sm ${
                    activeTab === tab.id ? 'text-white/90' : 'text-gray-600'
                  }`}>
                    {tab.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Posting Forms */}
        <div className={`space-y-6 ${!canPost ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Opportunity Form */}
          {activeTab === 'opportunity' && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Target className="h-5 w-5 text-orange-600" />
                  Post New Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form id="posting-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Opportunity Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="e.g., Frontend Developer Internship"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company/Organization *</Label>
                      <Input
                        id="company"
                        name="company"
                        placeholder="e.g., TechCorp Africa"
                        required
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Provider/Contact Person *</Label>
                      <Input
                        id="provider"
                        name="provider"
                        placeholder="e.g., John Doe, HR Manager"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deadline">Application Deadline</Label>
                      <Input
                        id="deadline"
                        name="deadline"
                        type="date"
                        className="h-11"
                      />
                    </div>
                  </div>
{/* this is a demo */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="type">Opportunity Type *</Label>
                      <div className="relative">
                        <Input
                          id="type"
                          name="type"
                          value={opportunityType}
                          onChange={(e) => {
                            setOpportunityType(e.target.value)
                            setShowTypeDropdown(true)
                          }}
                          onFocus={() => setShowTypeDropdown(true)}
                          onBlur={() => setTimeout(() => setShowTypeDropdown(false), 200)}
                          placeholder="Type or select opportunity type..."
                          className="h-11"
                          required
                        />
                        {showTypeDropdown && filteredSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-sm max-h-60 overflow-y-auto">
                            {filteredSuggestions.slice(0, 10).map((suggestion, index) => (
                              <div
                                key={index}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onMouseDown={() => handleTypeSelect(suggestion)}
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Location Section */}
                    <div className="col-span-full bg-gradient-to-r from-orange-50/70 to-amber-50/70 border border-orange-200/60 rounded-xl p-6 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="opportunityIsRemote" className="text-lg font-bold text-orange-800">
                            {isOpportunityRemote ? 'Remote Opportunity' : 'In-Person Opportunity'}
                          </Label>
                          <p className="text-sm text-orange-600 mt-1 font-medium">
                            {isOpportunityRemote ? 'This is a remote opportunity' : 'This is an in-person opportunity with a physical location'}
                          </p>
                        </div>
                        <Switch
                          id="opportunityIsRemote"
                          checked={isOpportunityRemote}
                          onCheckedChange={setIsOpportunityRemote}
                          className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-orange-200/60"
                        />
                      </div>
                      
                      {!isOpportunityRemote && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200 bg-white/80 rounded-lg p-4 border border-orange-200/60">
                          <div className="space-y-2">
                            <Label htmlFor="opportunityCountry" className="text-sm font-semibold text-orange-700">
                              Country *
                            </Label>
                            <Input
                              id="opportunityCountry"
                              name="opportunityCountry"
                              placeholder="e.g., Nigeria"
                              required
                              className="h-11 border-orange-200/60 focus:border-orange-400 focus:ring-orange-400 bg-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="opportunityCity" className="text-sm font-semibold text-orange-700">
                              State *
                            </Label>
                            <Input
                              id="opportunityCity"
                              name="opportunityCity"
                              placeholder="e.g., Lagos"
                              required
                              className="h-11 border-orange-200/60 focus:border-orange-400 focus:ring-orange-400 bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                  </div>

                  {/* Payment Section */}
                  <div className="bg-gradient-to-r from-orange-50/70 to-amber-50/70 border border-orange-200/60 rounded-xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="isPaid" className="text-lg font-bold text-orange-800">
                          {isOpportunityPaid ? 'Paid Opportunity' : 'Free Opportunity'}
                        </Label>
                        <p className="text-sm text-orange-600 mt-1 font-medium">
                          {isOpportunityPaid ? 'This opportunity offers compensation' : 'This is a free opportunity'}
                        </p>
                      </div>
                      <Switch
                        id="isPaid"
                        checked={isOpportunityPaid}
                        onCheckedChange={setIsOpportunityPaid}
                        className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-orange-200/60"
                      />
                    </div>
                    
                    {isOpportunityPaid && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-200 bg-white/80 rounded-lg p-4 border border-orange-200/60">
                        <Label htmlFor="amount" className="text-sm font-semibold text-orange-700">
                          💵 Compensation Amount *
                        </Label>
                        <Input
                          id="amount"
                          name="amount"
                          placeholder="e.g., ₦100,000, ₦50,000/month"
                          className="h-11 border-orange-200/60 focus:border-orange-400 focus:ring-orange-400 bg-white"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url">External Application URL *</Label>
                    <Input
                      id="url"
                      name="url"
                      type="url"
                      placeholder="https://example.com/apply"
                      required
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500">
                      Link to where users can apply for this opportunity
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe the opportunity, requirements, and benefits..."
                      rows={6}
                      required
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="requirements">Requirements</Label>
                      <Textarea
                        id="requirements"
                        name="requirements"
                        placeholder="List the skills and qualifications needed..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="benefits">Benefits & Compensation</Label>
                      <Textarea
                        id="benefits"
                        name="benefits"
                        placeholder="What will participants gain? (compensation, experience, etc.)"
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags *</Label>
                    <div className="space-y-3">
                       <div className="relative">
                         <Input
                           id="tags"
                           value={opportunityTagInput}
                           onChange={(e) => handleTagInputChange(e.target.value, 'opportunity')}
                           onKeyDown={(e) => handleTagAdd(e, 'opportunity')}
                           placeholder="Type a tag and press Enter (e.g., technology, remote, entry-level)"
                           className="h-11"
                         />
                         {showOpportunityTagSuggestions && opportunityTagSuggestions.length > 0 && (
                           <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
                             {opportunityTagSuggestions.map((suggestion, index) => (
                               <div
                                 key={index}
                                 className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                 onMouseDown={() => {
                                   setOpportunityTagInput(suggestion)
                                   setOpportunityTags([...opportunityTags, suggestion])
                                   setOpportunityTagInput('')
                                   setShowOpportunityTagSuggestions(false)
                                 }}
                               >
                                 {suggestion}
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                      {opportunityTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {opportunityTags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800 border border-orange-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag, 'opportunity')}
                                className="ml-2 text-orange-600 hover:text-orange-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Add relevant tags to help users find this opportunity. Tags are important for the recommendation algorithm.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" className="px-6">
                      Save Draft
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="px-6 bg-orange-500 hover:bg-orange-600">
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Posting...</span>
                        </div>
                      ) : (
                        'Post Opportunity'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Event Form */}
          {activeTab === 'event' && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Post New Event
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form id="posting-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="eventTitle">Event Title *</Label>
                      <Input
                        id="eventTitle"
                        name="eventTitle"
                        placeholder="e.g., Tech Innovation Summit 2024"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventCompany">Organizer *</Label>
                      <Input
                        id="eventCompany"
                        name="eventCompany"
                        placeholder="e.g., TechHub Africa"
                        required
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="eventType">Event Type *</Label>
                      <Select required>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conference">Conference</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="networking">Networking</SelectItem>
                          <SelectItem value="seminar">Seminar</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventStartDate">Event Start Date *</Label>
                      <Input
                        id="eventStartDate"
                        name="eventStartDate"
                        type="date"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventEndDate">Event End Date</Label>
                      <Input
                        id="eventEndDate"
                        name="eventEndDate"
                        type="date"
                        className="h-11"
                        placeholder="When does the event end?"
                      />
                      <p className="text-xs text-gray-500">
                        Leave empty for single-day events
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventRegistrationDeadline">Registration Deadline</Label>
                      <Input
                        id="eventRegistrationDeadline"
                        name="eventRegistrationDeadline"
                        type="date"
                        className="h-11"
                        placeholder="When should registration close?"
                      />
                      <p className="text-xs text-gray-500">
                        Leave empty if registration is open until event date
                      </p>
                    </div>
                  </div>

                  {/* Location Section */}
                  <div className="bg-gradient-to-r from-green-50/70 to-lime-50/70 border border-green-200/60 rounded-xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="eventIsRemote" className="text-lg font-bold text-green-600">
                          {isEventRemote ? 'Remote Event' : 'In-Person Event'}
                        </Label>
                        <p className="text-sm text-green-500 mt-1 font-medium">
                          {isEventRemote ? 'This is a remote/virtual event' : 'This is an in-person event with a physical location'}
                        </p>
                      </div>
                      <Switch
                        id="eventIsRemote"
                        checked={isEventRemote}
                        onCheckedChange={setIsEventRemote}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-green-200/60"
                      />
                    </div>
                    
                    {!isEventRemote && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200 bg-white/80 rounded-lg p-4 border border-green-200/60">
                        <div className="space-y-2">
                          <Label htmlFor="eventCountry" className="text-sm font-semibold text-green-700">
                            Country *
                          </Label>
                          <Input
                            id="eventCountry"
                            name="eventCountry"
                            placeholder="e.g., Nigeria"
                            required
                            className="h-11 border-green-200/60 focus:border-blue-400 focus:ring-blue-400 bg-white"
                          />
                        </div>
                       
                        <div className="space-y-2">
                          <Label htmlFor="eventCity" className="text-sm font-semibold text-green-700">
                            State *
                          </Label>
                          <Input
                            id="eventCity"
                            name="eventCity"
                            placeholder="e.g., Lagos"
                            required
                            className="h-11 border-green-200/60 focus:border-green-400 focus:ring-green-400 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>



                  {/* Payment Section */}
                  <div className="bg-gradient-to-r from-green-50/70 to-emerald-50/70 border border-green-200/60 rounded-xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="eventIsPaid" className="text-lg font-bold text-green-800">
                          {isEventPaid ? 'Paid Event' : 'Free Event'}
                        </Label>
                        <p className="text-sm text-green-600 mt-1 font-medium">
                          {isEventPaid ? 'This event requires payment to attend' : 'This is a free event open to all'}
                        </p>
                      </div>
                      <Switch
                        id="eventIsPaid"
                        checked={isEventPaid}
                        onCheckedChange={setIsEventPaid}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-green-200/60"
                      />
                    </div>
                    
                    {isEventPaid && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-200 bg-white/80 rounded-lg p-4 border border-green-200/60">
                        <Label htmlFor="eventPrice" className="text-sm font-semibold text-green-700">
                          💵 Event Price *
                        </Label>
                        <Input
                          id="eventPrice"
                          name="eventPrice"
                          placeholder="e.g., ₦2,500, ₦5,000"
                          className="h-11 border-green-200/60 focus:border-green-400 focus:ring-green-400 bg-white"
                          required
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="eventCapacity">Capacity</Label>
                      <Input
                        id="eventCapacity"
                        type="number"
                        placeholder="e.g., 100"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="eventUrl">External Registration URL *</Label>
                    <Input
                      id="eventUrl"
                      name="eventUrl"
                      type="url"
                      placeholder="https://example.com/register"
                      required
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500">
                      Link to where users can register for this event
                    </p>
                  </div>
                  </div>
                 

                  <div className="space-y-2">
                    <Label htmlFor="eventDescription">Event Description *</Label>
                    <Textarea
                      id="eventDescription"
                      name="eventDescription"
                      placeholder="Describe the event, agenda, and what attendees will gain..."
                      rows={6}
                      required
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="eventAgenda">Agenda</Label>
                      <Textarea
                        id="eventAgenda"
                        placeholder="Outline the event schedule and activities..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventSpeakers">Speakers/Presenters</Label>
                      <Textarea
                        id="eventSpeakers"
                        placeholder="List the speakers and their topics..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-2">
                    <Label htmlFor="eventTags">Tags *</Label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          id="eventTags"
                          value={eventTagInput}
                          onChange={(e) => handleTagInputChange(e.target.value, 'event')}
                          onKeyDown={(e) => handleTagAdd(e, 'event')}
                          onFocus={() => {
                            if (eventTagInput.length >= 2) {
                              setShowEventTagSuggestions(true)
                            }
                          }}
                          onBlur={() => {
                            // Delay hiding suggestions to allow clicking on them
                            setTimeout(() => setShowEventTagSuggestions(false), 200)
                          }}
                          placeholder="Type a tag and press Enter (e.g., networking, workshop, tech, free)"
                          className="h-11"
                        />
                        
                        {/* Tag Suggestions Dropdown */}
                        {showEventTagSuggestions && eventTagSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
                            {isLoadingEventTags ? (
                              <div className="p-3 text-center text-gray-500">
                                <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                <span className="ml-2">Loading suggestions...</span>
                              </div>
                            ) : (
                              eventTagSuggestions
                                .filter(suggestion => !eventTags.includes(suggestion))
                                .map((suggestion, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                      if (!eventTags.includes(suggestion)) {
                                        setEventTags([...eventTags, suggestion])
                                        setEventTagInput('')
                                        setShowEventTagSuggestions(false)
                                        setEventTagSuggestions([])
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                  >
                                    {suggestion}
                                  </button>
                                ))
                            )}
                          </div>
                        )}
                      </div>
                      {eventTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {eventTags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 border border-green-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag, 'event')}
                                className="ml-2 text-green-600 hover:text-green-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Add relevant tags to help attendees find this event. Tags are important for the recommendation algorithm.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" className="px-6">
                      Save Draft
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="px-6 bg-green-500 hover:bg-green-600">
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Posting...</span>
                        </div>
                      ) : (
                        'Post Event'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Job Form */}
          {activeTab === 'job' && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Post New Job
                </CardTitle>
                <div className="text-sm text-gray-600 mt-2">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  Job postings require payment. You'll be redirected to payment after form submission.
                </div>
              </CardHeader>
              <CardContent>
                <form id="posting-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title *</Label>
                      <Input
                        id="jobTitle"
                        name="jobTitle"
                        placeholder="e.g., Senior Software Engineer"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobCompany">Company *</Label>
                      <Input
                        id="jobCompany"
                        name="jobCompany"
                        placeholder="e.g., InnovateTech Solutions"
                        required
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="jobType">Employment Type *</Label>
                      <Select required>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full Time</SelectItem>
                          <SelectItem value="part-time">Part Time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobExperience">Experience Level</Label>
                      <Select>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Entry Level</SelectItem>
                          <SelectItem value="mid">Mid Level</SelectItem>
                          <SelectItem value="senior">Senior Level</SelectItem>
                          <SelectItem value="lead">Lead/Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="jobDeadline">Application Deadline</Label>
                      <Input
                        id="jobDeadline"
                        name="jobDeadline"
                        type="date"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobType">Job Type</Label>
                      <Select name="jobType" required>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                    {/* Location Section */}
                    <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/60 rounded-xl p-6 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="jobIsRemote" className="text-lg font-bold text-blue-800">
                            {isJobRemote ? 'Remote Job' : 'In-Person Job'}
                          </Label>
                          <p className="text-sm text-blue-600 mt-1 font-medium">
                            {isJobRemote ? 'This is a remote job' : 'This is an in-person job with a physical location'}
                          </p>
                        </div>
                        <Switch
                          id="jobIsRemote"
                          checked={isJobRemote}
                          onCheckedChange={setIsJobRemote}
                          className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-blue-200/60"
                        />
                      </div>
                      
                      {!isJobRemote && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200 bg-white/80 rounded-lg p-4 border border-blue-200/60">
                          <div className="space-y-2">
                            <Label htmlFor="jobCountry" className="text-sm font-semibold text-blue-700">
                              Country *
                            </Label>
                            <Input
                              id="jobCountry"
                              name="jobCountry"
                              placeholder="e.g., Nigeria"
                              required
                              className="h-11 border-blue-200/60 focus:border-blue-400 focus:ring-blue-400 bg-white"
                            />
                          </div>
                     
                          <div className="space-y-2">
                            <Label htmlFor="jobCity" className="text-sm font-semibold text-blue-700">
                              City *
                            </Label>
                            <Input
                              id="jobCity"
                              name="jobCity"
                              placeholder="e.g., Lagos"
                              required
                              className="h-11 border-blue-200/60 focus:border-blue-400 focus:ring-blue-400 bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                   
                  

                  {/* Payment Section */}
                  <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/60 rounded-xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="jobIsPaid" className="text-xl font-black text-blue-800">
                          {isJobPaid ? 'SALARY POSITION' : 'VOLUNTEER POSITION'}
                        </Label>
                        <p className="text-sm text-blue-600 mt-1 font-bold">
                          {isJobPaid ? 'This job offers competitive compensation' : 'This is an unpaid volunteer position'}
                        </p>
                      </div>
                      <Switch
                        id="jobIsPaid"
                        checked={isJobPaid}
                        onCheckedChange={setIsJobPaid}
                        className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-blue-200/60"
                      />
                    </div>
                    
                    {isJobPaid && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-200 bg-white/80 rounded-lg p-4 border border-blue-200/60">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-blue-700">
                              💰 Salary Information
                            </Label>
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                onClick={() => {
                                  setHasSalary(true)
                                  const salaryInput = document.getElementById('jobSalary') as HTMLInputElement
                                  if (salaryInput) {
                                    salaryInput.value = 'Salary Present'
                                  }
                                }}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                  hasSalary 
                                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                              >
                                {hasSalary ? '✓ Salary Present' : 'Mark as Salary Present'}
                              </Button>
                              <span className="text-sm text-gray-600">
                                {hasSalary ? 'This job includes salary' : 'Click to indicate this job has a salary'}
                              </span>
                            </div>
                            <Input
                              id="jobSalary"
                              name="jobSalary"
                              value={hasSalary ? 'Salary Present' : ''}
                              readOnly
                              className="h-11 border-blue-200/60 bg-gray-50 text-gray-700"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="jobPeriod" className="text-sm font-semibold text-blue-700">
                              ⏰ Payment Period *
                            </Label>
                            <Select name="jobPeriod" required>
                              <SelectTrigger className="h-11 border-blue-200/60 focus:border-blue-400 focus:ring-blue-400 bg-white">
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hourly">Hourly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="annually">Annually</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  

                  <div className="space-y-2">
                    <Label htmlFor="jobUrl">External Application URL *</Label>
                    <Input
                      id="jobUrl"
                      name="jobUrl"
                      type="url"
                      placeholder="https://example.com/apply"
                      required
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500">
                      Link to where candidates can apply for this job
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobDescription">Job Description *</Label>
                    <Textarea
                      id="jobDescription"
                      name="jobDescription"
                      placeholder="Describe the role, responsibilities, and requirements..."
                      rows={6}
                      required
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="jobRequirements">Requirements</Label>
                      <Textarea
                        id="jobRequirements"
                        placeholder="List the skills, qualifications, and experience needed..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobBenefits">Benefits & Perks</Label>
                      <Textarea
                        id="jobBenefits"
                        placeholder="What benefits does your company offer?"
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-2">
                    <Label htmlFor="jobTags">Tags *</Label>
                    <div className="space-y-3">
                       <div className="relative">
                         <Input
                           id="jobTags"
                           value={jobTagInput}
                           onChange={(e) => handleTagInputChange(e.target.value, 'job')}
                           onKeyDown={(e) => handleTagAdd(e, 'job')}
                           placeholder="Type a tag and press Enter (e.g., remote, senior, frontend, react)"
                           className="h-11"
                         />
                         {showJobTagSuggestions && jobTagSuggestions.length > 0 && (
                           <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
                             {jobTagSuggestions.map((suggestion, index) => (
                               <div
                                 key={index}
                                 className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                 onMouseDown={() => {
                                   setJobTagInput(suggestion)
                                   setJobTags([...jobTags, suggestion])
                                   setJobTagInput('')
                                   setShowJobTagSuggestions(false)
                                 }}
                               >
                                 {suggestion}
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                      {jobTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {jobTags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag, 'job')}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Add relevant tags to help candidates find this job. Tags are important for the recommendation algorithm.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" className="px-6">
                      Save Draft
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="px-6 bg-blue-500 hover:bg-blue-600">
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        'Continue to Payment'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Resource Contact Form */}
          {activeTab === 'resource' && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  Contact Us About Resources
                </CardTitle>
                <div className="text-sm text-gray-600 mt-2">
                  <CheckCircle className="h-4 w-4 inline mr-2 text-green-600" />
                  We'd love to help you share your educational resources with the community.
                </div>
              </CardHeader>
              <CardContent>
                <form id="posting-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="resourceName">Your Name *</Label>
                      <Input
                        id="resourceName"
                        name="resourceName"
                        placeholder="e.g., John Doe"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resourceEmail">Email Address *</Label>
                      <Input
                        id="resourceEmail"
                        type="email"
                        placeholder="e.g., john@example.com"
                        required
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="resourceCompany">Company/Organization</Label>
                      <Input
                        id="resourceCompany"
                        placeholder="e.g., CodeAcademy"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resourcePhone">Phone Number</Label>
                      <Input
                        id="resourcePhone"
                        placeholder="e.g., +234 801 234 5678"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resourceType">Resource Type *</Label>
                    <Select required>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select resource type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="course">Online Course</SelectItem>
                        <SelectItem value="template">Template/Download</SelectItem>
                        <SelectItem value="guide">Guide/Tutorial</SelectItem>
                        <SelectItem value="tool">Software Tool</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resourceUrl">External Resource URL *</Label>
                    <Input
                      id="resourceUrl"
                      name="resourceUrl"
                      type="url"
                      placeholder="https://example.com/resource"
                      required
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500">
                      Link to where users can access this resource
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resourceDescription">Resource Description *</Label>
                    <Textarea
                      id="resourceDescription"
                      placeholder="Tell us about your resource, what it offers, and who it's for..."
                      rows={6}
                      required
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resourceDetails">Additional Details</Label>
                    <Textarea
                      id="resourceDetails"
                      placeholder="Any additional information, pricing, availability, etc..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {/* Payment Section */}
                  <div className="bg-gradient-to-r from-purple-50/70 to-violet-50/70 border border-purple-200/60 rounded-xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="resourceIsPaid" className="text-lg font-bold text-purple-800">
                          {isResourcePaid ? 'Paid Resource' : 'Free Resource'}
                        </Label>
                        <p className="text-sm text-purple-600 mt-1 font-medium">
                          {isResourcePaid ? 'This resource requires payment to access' : 'This is a free resource available to all'}
                        </p>
                      </div>
                      <Switch
                        id="resourceIsPaid"
                        checked={isResourcePaid}
                        onCheckedChange={setIsResourcePaid}
                        className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-purple-200/60"
                      />
                    </div>
                    
                    {isResourcePaid && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-200 bg-white/80 rounded-lg p-4 border border-purple-200/60">
                        <Label htmlFor="resourcePrice" className="text-sm font-semibold text-purple-700">
                          💵 Resource Price *
                        </Label>
                        <Input
                          id="resourcePrice"
                          name="resourcePrice"
                          placeholder="e.g., ₦5,000 or $50"
                          className="h-11 border-purple-200/60 focus:border-purple-400 focus:ring-purple-400 bg-white"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-2">
                    <Label htmlFor="resourceTags">Tags *</Label>
                    <div className="space-y-3">
                       <div className="relative">
                         <Input
                           id="resourceTags"
                           value={resourceTagInput}
                           onChange={(e) => handleTagInputChange(e.target.value, 'resource')}
                           onKeyDown={(e) => handleTagAdd(e, 'resource')}
                           placeholder="Type a tag and press Enter (e.g., tutorial, free, coding, design)"
                           className="h-11"
                         />
                         {showResourceTagSuggestions && resourceTagSuggestions.length > 0 && (
                           <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
                             {resourceTagSuggestions.map((suggestion, index) => (
                               <div
                                 key={index}
                                 className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                 onMouseDown={() => {
                                   setResourceTagInput(suggestion)
                                   setResourceTags([...resourceTags, suggestion])
                                   setResourceTagInput('')
                                   setShowResourceTagSuggestions(false)
                                 }}
                               >
                                 {suggestion}
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                      {resourceTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {resourceTags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 border border-purple-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag, 'resource')}
                                className="ml-2 text-purple-600 hover:text-purple-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Add relevant tags to help users find this resource. Tags are important for the recommendation algorithm.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" className="px-6">
                      Clear Form
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="px-6 bg-purple-500 hover:bg-purple-600">
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending...</span>
                        </div>
                      ) : (
                        'Send Message'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 