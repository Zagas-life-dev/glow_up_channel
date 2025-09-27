"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  LogOut,
  Settings,
  AlertCircle
} from 'lucide-react'

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
  
  // State management
  const [onboardingData, setOnboardingData] = useState<ProviderOnboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'organization' | 'preferences' | 'security'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // User profile data
  const [userData, setUserData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    dateOfBirth: user?.dateOfBirth || ""
  })

  // Profile data
  const [profileData, setProfileData] = useState({
    country: profile?.country || "",
    province: profile?.province || "",
    city: profile?.city || "",
    interests: profile?.interests || [],
    industrySectors: profile?.industrySectors || [],
    educationLevel: profile?.educationLevel || "",
    fieldOfStudy: profile?.fieldOfStudy || "",
    institution: profile?.institution || "",
    careerStage: profile?.careerStage || "",
    skills: profile?.skills || [],
    aspirations: profile?.aspirations || []
  })

  // Preferences
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    weeklyDigest: true,
    language: "en",
    timezone: "Africa/Lagos",
    theme: "light"
  })

  // Hide navbar and footer
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/auth/login')
      return
    }
  }, [isAuthenticated, isLoading, router])

  // Load provider onboarding data
  useEffect(() => {
    const loadProviderData = async () => {
      if (!isAuthenticated) return
      
      try {
        setLoading(true)
        setError(null)
        
        const response = await ApiClient.getProviderOnboarding()
        setOnboardingData(response.onboarding)
      } catch (error: any) {
        console.error('Error loading provider data:', error)
        setError(error.message || 'Failed to load provider data')
        toast.error('Failed to load provider settings')
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      loadProviderData()
    }
  }, [isAuthenticated])

  // Update local state when user/profile data changes
  useEffect(() => {
    if (user) {
      setUserData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        dateOfBirth: user.dateOfBirth || ""
      })
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setProfileData({
        country: profile.country || "",
        province: profile.province || "",
        city: profile.city || "",
        interests: profile.interests || [],
        industrySectors: profile.industrySectors || [],
        educationLevel: profile.educationLevel || "",
        fieldOfStudy: profile.fieldOfStudy || "",
        institution: profile.institution || "",
        careerStage: profile.careerStage || "",
        skills: profile.skills || [],
        aspirations: profile.aspirations || []
      })
    }
  }, [profile])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    
    try {
      // Update user data
      if (userData.firstName !== user?.firstName || 
          userData.lastName !== user?.lastName || 
          userData.dateOfBirth !== user?.dateOfBirth) {
        await updateUser({
          firstName: userData.firstName,
          lastName: userData.lastName,
          dateOfBirth: userData.dateOfBirth
        })
      }

      // Update profile data
      await updateProfile({
        country: profileData.country,
        province: profileData.province,
        city: profileData.city,
        interests: profileData.interests,
        industrySectors: profileData.industrySectors,
        educationLevel: profileData.educationLevel,
        fieldOfStudy: profileData.fieldOfStudy,
        institution: profileData.institution,
        careerStage: profileData.careerStage,
        skills: profileData.skills,
        aspirations: profileData.aspirations
      })
      
      // Refresh user data
      await refreshUser()
      
      setIsEditing(false)
      toast.success('Settings saved successfully!')
    } catch (error: any) {
      console.error('Failed to save settings:', error)
      setError(error.message || 'Failed to save settings')
      toast.error('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError(null)
    // Reset form data to original values
    if (user) {
      setUserData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        dateOfBirth: user.dateOfBirth || ""
      })
    }
    if (profile) {
      setProfileData({
        country: profile.country || "",
        province: profile.province || "",
        city: profile.city || "",
        interests: profile.interests || [],
        industrySectors: profile.industrySectors || [],
        educationLevel: profile.educationLevel || "",
        fieldOfStudy: profile.fieldOfStudy || "",
        institution: profile.institution || "",
        careerStage: profile.careerStage || "",
        skills: profile.skills || [],
        aspirations: profile.aspirations || []
      })
    }
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access provider settings.</p>
          <Button onClick={() => router.push('/auth/login')}>
            Go to Login
          </Button>
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 text-red-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: Settings },
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'organization', label: 'Organization', icon: Building2 },
              { id: 'preferences', label: 'Preferences', icon: Palette },
              { id: 'security', label: 'Security', icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-orange-500 text-white shadow-sm'
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress Card */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-orange-600" />
                    <span>Onboarding Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {onboardingData ? (
                    <>
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
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No onboarding data found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Organization Summary */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-orange-600" />
                    <span>Organization Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {onboardingData ? (
                    <div className="space-y-4">
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
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900 font-medium">{onboardingData.officialEmail}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500">About Organization</label>
                        <p className="text-gray-900 mt-1">{onboardingData.aboutOrganization}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No organization data available</p>
                      <Button onClick={() => router.push('/dashboard/provider/onboarding')}>
                        Complete Onboarding
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <User className="h-5 w-5 text-orange-600" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userData.email}
                        disabled
                        className="h-11 bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={userData.dateOfBirth}
                        onChange={(e) => setUserData({...userData, dateOfBirth: e.target.value})}
                        disabled={!isEditing}
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Location Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={profileData.country}
                          onChange={(e) => setProfileData({...profileData, country: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                          placeholder="e.g., Nigeria"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="province">Province/State</Label>
                        <Input
                          id="province"
                          value={profileData.province}
                          onChange={(e) => setProfileData({...profileData, province: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                          placeholder="e.g., Lagos"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City/Town</Label>
                        <Input
                          id="city"
                          value={profileData.city}
                          onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                          placeholder="e.g., Ikeja"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    {!isEditing ? (
                      <Button onClick={() => setIsEditing(true)} className="bg-orange-500 hover:bg-orange-600">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    ) : (
                      <>
                        <Button onClick={handleCancel} variant="outline">
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
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Organization Tab */}
        {activeTab === 'organization' && (
          <div className="space-y-6">
            {onboardingData ? (
              <>
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
                        <p className="text-gray-900 font-medium">{onboardingData.yearEstablished}</p>
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
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Organization Data</h3>
                  <p className="text-gray-600 mb-6">Complete your provider onboarding to see organization details.</p>
                  <Button onClick={() => router.push('/dashboard/provider/onboarding')}>
                    Complete Onboarding
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <Card>
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

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Notification Preferences</h4>
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
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card>
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
      </div>
    </div>
  )
}

