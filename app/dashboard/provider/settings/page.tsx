"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import ApiClient from "@/lib/api-client"
import { toast } from 'sonner'
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  CheckCircle, 
  Clock, 
  Edit,
  FileText,
  Globe,
  Calendar,
  User,
  Upload,
  ArrowRight,
  ArrowLeft,
  Bell,
  Palette,
  Save,
  Camera,
  Edit3,
  Trash2,
  Target,
  GraduationCap,
  Briefcase,
  Star,
  Heart,
  LogOut
} from 'lucide-react'
import { getDatePickerPropsFor16Plus } from '@/lib/date-utils'

interface ProviderOnboardingData {
  _id: string
  userId: string
  organizationName: string
  providerType: string
  otherProviderType?: string
  contactPersonName: string
  contactPersonRole: string
  providerAddress: string
  aboutOrganization: string
  officialEmail: string
  phoneNumber: string
  stateOfOperation: string
  isRegistered: boolean
  registrationNumber?: string
  nationalId?: string
  passportId?: string
  otherId?: string
  yearEstablished: string
  website?: string
  socialMediaHandles?: string
  organizationLogo?: string
  verificationDocument?: string
  agreedToTerms: boolean
  completionPercentage: number
  isCompleted: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export default function ProviderSettings() {
  const { user, isAuthenticated, profile, logout, updateProfile, updateUser, refreshUser, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const router = useRouter()
  const [onboardingData, setOnboardingData] = useState<ProviderOnboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'provider' | 'profile' | 'onboarding' | 'preferences' | 'security' | 'notifications'>('provider')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // User data from auth context
  const [userData, setUserData] = useState({
    email: user?.email || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    dateOfBirth: user?.dateOfBirth || "",
    avatar: "/images/placeholder-user.jpg"
  })

  // Onboarding data from auth context
  const [onboardingDataUser, setOnboardingDataUser] = useState({
    // Location
    country: profile?.country || "",
    province: profile?.province || "",
    city: profile?.city || "",
    
    // Interests
    interests: profile?.interests || [],
    
    // Industry
    industries: profile?.industrySectors || [],
    
    // Education
    highestLevel: profile?.educationLevel || "",
    fieldOfStudy: profile?.fieldOfStudy || "",
    institution: profile?.institution || "",
    
    // Career
    careerStage: profile?.careerStage || "",
    
    // Skills
    skills: profile?.skills || [],
    
    // Aspirations
    aspirations: profile?.aspirations || []
  })

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    weeklyDigest: true,
    language: "en",
    timezone: "Africa/Lagos",
    theme: "light"
  })

  // Hide navbar and footer when this page is active
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
      router.push('/auth/login')
      return
    }

    const loadOnboardingData = async () => {
      try {
        const response = await ApiClient.getProviderOnboarding()
        setOnboardingData(response.onboarding)
      } catch (error) {
        console.error('Error loading onboarding data:', error)
        toast.error('Failed to load provider settings')
      } finally {
        setLoading(false)
      }
    }

    loadOnboardingData()
  }, [isAuthenticated, router])

  // Update local state when user/profile data changes
  useEffect(() => {
    if (user) {
      setUserData(prev => ({
        ...prev,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        dateOfBirth: user.dateOfBirth || ""
      }))
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setOnboardingDataUser({
        country: profile.country || "",
        province: profile.province || "",
        city: profile.city || "",
        interests: profile.interests || [],
        industries: profile.industrySectors || [],
        highestLevel: profile.educationLevel || "",
        fieldOfStudy: profile.fieldOfStudy || "",
        institution: profile.institution || "",
        careerStage: profile.careerStage || "",
        skills: profile.skills || [],
        aspirations: profile.aspirations || []
      })
    }
  }, [profile])

  // Refresh local state when user data changes (after refreshUser)
  useEffect(() => {
    if (user) {
      setUserData(prev => ({
        ...prev,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        dateOfBirth: user.dateOfBirth || ""
      }))
    }
  }, [user])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      // Try to update user data (firstName, lastName, dateOfBirth) - with fallback for backward compatibility
      try {
        await updateUser({
          firstName: userData.firstName,
          lastName: userData.lastName,
          dateOfBirth: userData.dateOfBirth
        })
        console.log('User data updated successfully')
      } catch (userUpdateError) {
        console.warn('Failed to update user data, continuing with profile update:', userUpdateError)
        // For backward compatibility, we'll still try to update the profile
        // and include firstName/lastName/dateOfBirth there as a fallback
      }

      // Update profile data (including firstName and lastName as fallback for backward compatibility)
      await updateProfile({
        firstName: userData.firstName, // Include as fallback
        lastName: userData.lastName,   // Include as fallback
        country: onboardingDataUser.country,
        province: onboardingDataUser.province,
        city: onboardingDataUser.city,
        interests: onboardingDataUser.interests,
        industrySectors: onboardingDataUser.industries,
        educationLevel: onboardingDataUser.highestLevel,
        fieldOfStudy: onboardingDataUser.fieldOfStudy,
        institution: onboardingDataUser.institution,
        careerStage: onboardingDataUser.careerStage,
        skills: onboardingDataUser.skills,
        aspirations: onboardingDataUser.aspirations
      })
      
      // Refresh user data to ensure UI reflects latest changes
      console.log('Refreshing user data after save...')
      await refreshUser()
      
      // Update local state to reflect the changes immediately
      setUserData(prev => ({
        ...prev,
        firstName: userData.firstName,
        lastName: userData.lastName,
        dateOfBirth: userData.dateOfBirth
      }))
      
      setIsEditing(false)
      setSaveMessage({ type: 'success', message: 'Profile updated successfully! Data refreshed.' })
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save profile:', error)
      setSaveMessage({ type: 'error', message: 'Failed to save profile. Please try again.' })
      // Clear error message after 5 seconds
      setTimeout(() => setSaveMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form data if needed
  }

  const getProviderTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'individual': 'Individual',
      'private-company': 'Private Company',
      'ngo': 'NGO/Non Profit',
      'government': 'Government',
      'academic': 'Academic Institution',
      'other': 'Other'
    }
    return types[type] || type
  }

  const getYearEstablishedLabel = (year: string) => {
    // If it's a number, return it as is
    if (!isNaN(Number(year))) {
      return year
    }
    // For backward compatibility with old string values
    const years: { [key: string]: string } = {
      'before-2000': 'Before 2000',
      '2000-2010': '2000–2010',
      '2011-2020': '2011–2020',
      '2021-present': '2021–Present',
      'not-registered': 'Not formally registered'
    }
    return years[year] || year
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading provider settings...</p>
        </div>
      </div>
    )
  }


  if (!onboardingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Provider Data...</h2>
          <p className="text-gray-600 mb-4">Please wait while we load your provider information.</p>
          {loading && (
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
              <span className="text-sm text-gray-600">Loading...</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/provider')}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Provider Settings</h1>
                <p className="text-gray-600 mt-1">Manage your organization details and account settings</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {onboardingData && (
                <Badge 
                  variant={onboardingData.isCompleted ? "default" : "secondary"}
                  className={onboardingData.isCompleted ? "bg-green-500" : "bg-yellow-500"}
                >
                  {onboardingData.isCompleted ? (
                    <><CheckCircle className="w-4 h-4 mr-1" /> Completed</>
                  ) : (
                    <><Clock className="w-4 h-4 mr-1" /> In Progress</>
                  )}
                </Badge>
              )}
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/provider/onboarding')}
              >
                <Edit className="w-4 h-4 mr-2" />
                {onboardingData?.isCompleted ? 'View Onboarding' : 'Continue Onboarding'}
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            saveMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className={`w-5 h-5 mr-3 ${
              saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {saveMessage.type === 'success' ? '✓' : '✗'}
            </div>
            <span className="font-medium">{saveMessage.message}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'provider', label: 'Provider Details', icon: Building2 },
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'onboarding', label: 'Onboarding Details', icon: Target },
              { id: 'preferences', label: 'Preferences', icon: Palette },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'notifications', label: 'Notifications', icon: Bell }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Provider Details Tab */}
        {activeTab === 'provider' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Onboarding Progress */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-orange-600" />
                    <span>Onboarding Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Completion</span>
                      <span className="font-medium">{onboardingData.completionPercentage}%</span>
                    </div>
                    <Progress value={onboardingData.completionPercentage} className="h-2" />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status</span>
                      <Badge variant={onboardingData.isCompleted ? "default" : "secondary"}>
                        {onboardingData.isCompleted ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>
                    
                    {onboardingData.completedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Completed</span>
                        <span className="font-medium">{formatDate(onboardingData.completedAt)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium">{formatDate(onboardingData.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Organization Details */}
            <div className="lg:col-span-2 space-y-6">
            {/* Organization Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-orange-600" />
                  <span>Organization Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Organization Name</label>
                    <p className="text-gray-900 font-medium">{onboardingData.organizationName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Provider Type</label>
                    <p className="text-gray-900 font-medium">
                      {getProviderTypeLabel(onboardingData.providerType)}
                      {onboardingData.otherProviderType && ` - ${onboardingData.otherProviderType}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact Person</label>
                    <p className="text-gray-900 font-medium">{onboardingData.contactPersonName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Role</label>
                    <p className="text-gray-900 font-medium">{onboardingData.contactPersonRole}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-gray-900">{onboardingData.providerAddress}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">About Organization</label>
                  <p className="text-gray-900">{onboardingData.aboutOrganization}</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-orange-600" />
                  <span>Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Official Email</label>
                    <p className="text-gray-900 font-medium">{onboardingData.officialEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-gray-900 font-medium">{onboardingData.phoneNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">State of Operation</label>
                    <p className="text-gray-900 font-medium">{onboardingData.stateOfOperation}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Year Established</label>
                    <p className="text-gray-900 font-medium">{getYearEstablishedLabel(onboardingData.yearEstablished)}</p>
                  </div>
                </div>
                
                {(onboardingData.website || onboardingData.socialMediaHandles) && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {onboardingData.website && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Website</label>
                          <p className="text-gray-900 font-medium">{onboardingData.website}</p>
                        </div>
                      )}
                      {onboardingData.socialMediaHandles && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Social Media</label>
                          <p className="text-gray-900 font-medium">{onboardingData.socialMediaHandles}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Registration & Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-orange-600" />
                  <span>Registration & Verification</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Registration Status</label>
                    <p className="text-gray-900 font-medium">
                      {onboardingData.isRegistered ? 'Registered Organization' : 'Not Registered'}
                    </p>
                  </div>
                  
                  {onboardingData.isRegistered && onboardingData.registrationNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Registration Number</label>
                      <p className="text-gray-900 font-medium">{onboardingData.registrationNumber}</p>
                    </div>
                  )}
                  
                  {!onboardingData.isRegistered && (
                    <>
                      {onboardingData.nationalId && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">National ID</label>
                          <p className="text-gray-900 font-medium">{onboardingData.nationalId}</p>
                        </div>
                      )}
                      {onboardingData.passportId && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Passport ID</label>
                          <p className="text-gray-900 font-medium">{onboardingData.passportId}</p>
                        </div>
                      )}
                      {onboardingData.otherId && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Other ID</label>
                          <p className="text-gray-900 font-medium">{onboardingData.otherId}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {onboardingData.verificationDocument && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Verification Document</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">{onboardingData.verificationDocument}</span>
                      </div>
                    </div>
                  )}
                  
                  {onboardingData.organizationLogo && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Organization Logo</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Upload className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">{onboardingData.organizationLogo}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-orange-600" />
                  <span>Terms & Conditions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">
                    Terms and Conditions Accepted
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  You have agreed to comply with the platform's Terms of Service, Privacy Policy, and Community Guidelines.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <User className="h-5 w-5 text-orange-600" />
                  Profile Information
                </CardTitle>
                {!profile && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                    <p className="text-sm text-yellow-800">
                      <strong>Profile Incomplete:</strong> Complete your onboarding details to see your full profile information.
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Image
                        src={userData.avatar}
                        alt="Profile"
                        width={120}
                        height={120}
                        className="w-30 h-30 rounded-full border-4 border-orange-100"
                      />
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors">
                        <Camera className="h-4 w-4 text-white" />
                      </button>
                    </div>
                    <Button variant="outline" size="sm" className="border-orange-200 text-orange-600 hover:bg-orange-50">
                      Change Photo
                    </Button>
                  </div>

                  {/* Profile Form */}
                  <div className="flex-1 space-y-6">
                    {/* Personal Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={userData.firstName}
                          onChange={(e) => setUserData({...userData, firstName: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={userData.lastName}
                          onChange={(e) => setUserData({...userData, lastName: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={userData.dateOfBirth}
                          onChange={(e) => setUserData({...userData, dateOfBirth: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                          {...getDatePickerPropsFor16Plus()}
                        />
                        <p className="text-xs text-gray-500">
                          You must be at least 16 years old
                        </p>
                      </div>
                      <div className="space-y-2">
                        {/* Empty div for grid layout */}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={userData.email}
                          onChange={(e) => setUserData({...userData, email: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                        />
                      </div>

                    {!isEditing && (
                      <div className="flex space-x-3">
                        <Button onClick={() => setIsEditing(true)} className="bg-orange-500 hover:bg-orange-600">
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </div>
                    )}

                    {isEditing && (
                      <div className="flex space-x-3">
                        <Button onClick={handleCancel} variant="outline" className="border-gray-200">
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
                          {isSaving ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Saving...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Save className="h-4 w-4" />
                              <span>Save Changes</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Onboarding Details Tab */}
        {activeTab === 'onboarding' && (
          <div className="space-y-6">
            {!profile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Target className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Complete Your Profile</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Fill out your onboarding details to help us personalize your experience and show you relevant opportunities.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            
            {/* Location Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Location Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={onboardingDataUser.country}
                      onChange={(e) => setOnboardingDataUser({...onboardingDataUser, country: e.target.value})}
                      disabled={!isEditing}
                      className="h-11"
                      placeholder="e.g., Nigeria"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province/State *</Label>
                    <Input
                      id="province"
                      value={onboardingDataUser.province}
                      onChange={(e) => setOnboardingDataUser({...onboardingDataUser, province: e.target.value})}
                      disabled={!isEditing}
                      className="h-11"
                      placeholder="e.g., Lagos"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City/Town (Optional)</Label>
                    <Input
                      id="city"
                      value={onboardingDataUser.city}
                      onChange={(e) => setOnboardingDataUser({...onboardingDataUser, city: e.target.value})}
                      disabled={!isEditing}
                      className="h-11"
                      placeholder="e.g., Ikeja"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isEditing && (
              <div className="flex justify-center">
                <Button onClick={() => setIsEditing(true)} className="bg-orange-500 hover:bg-orange-600">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Onboarding Details
                </Button>
              </div>
            )}

            {isEditing && (
              <div className="flex justify-center space-x-3">
                <Button onClick={handleCancel} variant="outline" className="border-gray-200">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
                  {isSaving ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </div>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Palette className="h-5 w-5 text-purple-600" />
                  Account Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select value={preferences.language} onValueChange={(value) => setPreferences({...preferences, language: value})}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={preferences.timezone} onValueChange={(value) => setPreferences({...preferences, timezone: value})}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Africa/Lagos">Africa/Lagos (GMT+1)</SelectItem>
                          <SelectItem value="Africa/Cairo">Africa/Cairo (GMT+2)</SelectItem>
                          <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (GMT+2)</SelectItem>
                          <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select value={preferences.theme} onValueChange={(value) => setPreferences({...preferences, theme: value})}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto (System)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Change Password</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          placeholder="Enter current password"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="Enter new password"
                          className="h-11"
                        />
                      </div>
                    </div>
                    <Button className="bg-blue-500 hover:bg-blue-600">
                      Update Password
                    </Button>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Two-Factor Authentication</h4>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                      </div>
                      <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
                        Enable 2FA
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Danger Zone</h4>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h5 className="font-medium text-red-900 mb-2">Delete Account</h5>
                      <p className="text-sm text-red-700 mb-4">
                        Once you delete your account, there is no going back. Please be certain.
                      </p>
                      <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Bell className="h-5 w-5 text-green-600" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Email Notifications</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Email Notifications</p>
                          <p className="text-sm text-gray-600">Receive notifications via email</p>
                        </div>
                        <Switch
                          checked={preferences.emailNotifications}
                          onCheckedChange={(checked) => setPreferences({...preferences, emailNotifications: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Marketing Emails</p>
                          <p className="text-sm text-gray-600">Receive promotional and marketing emails</p>
                        </div>
                        <Switch
                          checked={preferences.marketingEmails}
                          onCheckedChange={(checked) => setPreferences({...preferences, marketingEmails: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Weekly Digest</p>
                          <p className="text-sm text-gray-600">Receive a weekly summary of activities</p>
                        </div>
                        <Switch
                          checked={preferences.weeklyDigest}
                          onCheckedChange={(checked) => setPreferences({...preferences, weeklyDigest: checked})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Push Notifications</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Push Notifications</p>
                        <p className="text-sm text-gray-600">Receive notifications on your device</p>
                      </div>
                      <Switch
                        checked={preferences.pushNotifications}
                        onCheckedChange={(checked) => setPreferences({...preferences, pushNotifications: checked})}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
