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
import SkillsInput from "@/components/ui/skills-input"
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  Globe,
  Bell,
  Shield,
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

export default function SettingsPage() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, profile, logout, updateProfile, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'onboarding' | 'preferences' | 'security' | 'notifications'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Hide navbar when this page is active
  useEffect(() => {
    setHideFooter(true)
    setHideNavbar(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // User data from auth context
  const [userData, setUserData] = useState({
    firstName: user?.email?.split('@')[0] || "",
    lastName: "",
    email: user?.email || "",
    phone: "",
    location: "",
    company: "",
    website: "",
    bio: "",
    dateOfBirth: "",
    avatar: "/images/placeholder-user.jpg"
  })

  // Onboarding data from auth context
  const [onboardingData, setOnboardingData] = useState({
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

  // Update local state when user/profile data changes
  useEffect(() => {
    if (user) {
      setUserData(prev => ({
        ...prev,
        email: user.email,
        firstName: user.firstName || user.email?.split('@')[0] || prev.firstName,
        lastName: user.lastName || prev.lastName
      }))
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setOnboardingData({
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

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    weeklyDigest: true,
    language: "en",
    timezone: "Africa/Lagos",
    theme: "light"
  })

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      // Update profile data including firstName and lastName
      await updateProfile({
        firstName: userData.firstName,
        lastName: userData.lastName,
        country: onboardingData.country,
        province: onboardingData.province,
        city: onboardingData.city,
        interests: onboardingData.interests,
        industrySectors: onboardingData.industries,
        educationLevel: onboardingData.highestLevel,
        fieldOfStudy: onboardingData.fieldOfStudy,
        institution: onboardingData.institution,
        careerStage: onboardingData.careerStage,
        skills: onboardingData.skills,
        aspirations: onboardingData.aspirations
      })
      setIsEditing(false)
      setSaveMessage({ type: 'success', message: 'Profile updated successfully!' })
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

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'onboarding', label: 'Onboarding Details', icon: Target },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ]

  // Lists for selection fields
  const interestsList = [
    "Jobs & Career Opportunities",
    "Scholarships & Grants",
    "Training & Workshops",
    "Networking Events",
    "Volunteering & Community Service",
    "Entrepreneurship & Funding",
    "Remote Work & Digital Skills",
  ]

  const industriesList = [
    "Technology",
    "Healthcare",
    "Education & Research",
    "Creative Arts & Media",
    "Finance & Business",
    "NGO & Social Impact",
    "Engineering & Manufacturing",
  ]

  const educationLevels = ["Secondary School", "Undergraduate", "Postgraduate", "PhD"]
  const fieldsOfStudy = ["Business", "Engineering", "Arts", "Medicine", "Technology", "Other"]
  const careerStages = [
    "Student",
    "Entry-Level (0–2 years)",
    "Mid-Career (3–7 years)",
    "Senior/Executive (8+ years)",
  ]
  const skillsList = [
    "Web Development",
    "Data Science",
    "Digital Marketing",
    "Project Management",
    "Graphic Design",
    "Content Writing",
    "Public Speaking",
    "Sales",
  ]
  const aspirationsList = [
    "Access to career opportunities",
    "Mentorship & guidance",
    "Networking & professional connections",
    "Training & upskilling",
    "Access to funding/scholarships",
    "Community & belonging",
    "Inspiration & motivation",
    "Build leadership & influence",
    "Secure a job or internship",
    "Start or grow a business",
  ]

  const toggleArrayItem = (array: string[], item: string, setter: (value: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item))
    } else {
      setter([...array, item])
    }
  }

  // Show loading state while user data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <User className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <p className="text-lg text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Show error state if no user data
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load your profile data. Please try logging in again.</p>
          <Button onClick={logout} className="bg-orange-500 hover:bg-orange-600">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm lg:text-base text-gray-600">Manage your account and preferences</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
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
          
          {isEditing && (
            <div className="flex items-center space-x-3">
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

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
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
            {tabs.map((tab) => {
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={userData.firstName}
                          onChange={(e) => setUserData({...userData, firstName: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={userData.lastName}
                          onChange={(e) => setUserData({...userData, lastName: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                        />
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
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={userData.phone}
                          onChange={(e) => setUserData({...userData, phone: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={userData.location}
                          onChange={(e) => setUserData({...userData, location: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                        />
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company/Organization</Label>
                        <Input
                          id="company"
                          value={userData.company}
                          onChange={(e) => setUserData({...userData, company: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={userData.website}
                          onChange={(e) => setUserData({...userData, website: e.target.value})}
                          disabled={!isEditing}
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={userData.bio}
                        onChange={(e) => setUserData({...userData, bio: e.target.value})}
                        disabled={!isEditing}
                        rows={4}
                        className="resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    {!isEditing && (
                      <Button onClick={() => setIsEditing(true)} className="bg-orange-500 hover:bg-orange-600">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
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
                      value={onboardingData.country}
                      onChange={(e) => setOnboardingData({...onboardingData, country: e.target.value})}
                      disabled={!isEditing}
                      className="h-11"
                      placeholder="e.g., Nigeria"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province/State *</Label>
                    <Input
                      id="province"
                      value={onboardingData.province}
                      onChange={(e) => setOnboardingData({...onboardingData, province: e.target.value})}
                      disabled={!isEditing}
                      className="h-11"
                      placeholder="e.g., Lagos"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City/Town (Optional)</Label>
                    <Input
                      id="city"
                      value={onboardingData.city}
                      onChange={(e) => setOnboardingData({...onboardingData, city: e.target.value})}
                      disabled={!isEditing}
                      className="h-11"
                      placeholder="e.g., Ikeja"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interests Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Target className="h-5 w-5 text-green-600" />
                  What are you looking for?
                </CardTitle>
                <p className="text-sm text-gray-600">Select all that apply. This will help us tailor content for you.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {interestsList.map(interest => (
                    <button
                      key={interest}
                      onClick={() => isEditing && toggleArrayItem(onboardingData.interests, interest, (value) => setOnboardingData({...onboardingData, interests: value}))}
                      disabled={!isEditing}
                      className={`relative flex items-center justify-center p-4 h-24 text-center rounded-xl border-2 transition-all duration-200 ${
                        onboardingData.interests.includes(interest)
                          ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                          : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                      } ${!isEditing ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}
                    >
                      {onboardingData.interests.includes(interest) && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                      {interest}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Industry Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Building className="h-5 w-5 text-purple-600" />
                  Industry Information
                </CardTitle>
                <p className="text-sm text-gray-600">What industry are you in or interested in?</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {industriesList.map(industry => (
                    <button
                      key={industry}
                      onClick={() => isEditing && toggleArrayItem(onboardingData.industries, industry, (value) => setOnboardingData({...onboardingData, industries: value}))}
                      disabled={!isEditing}
                      className={`relative flex items-center justify-center p-4 h-24 text-center rounded-xl border-2 transition-all duration-200 ${
                        onboardingData.industries.includes(industry)
                          ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                          : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                      } ${!isEditing ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}
                    >
                      {onboardingData.industries.includes(industry) && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                      {industry}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Education Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <GraduationCap className="h-5 w-5 text-indigo-600" />
                  Educational Background
                </CardTitle>
                <p className="text-sm text-gray-600">This information is optional but highly recommended.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Highest Level Completed</Label>
                    <Select 
                      value={onboardingData.highestLevel} 
                      onValueChange={(value) => setOnboardingData({...onboardingData, highestLevel: value})}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {educationLevels.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Field of Study</Label>
                    <Select 
                      value={onboardingData.fieldOfStudy} 
                      onValueChange={(value) => setOnboardingData({...onboardingData, fieldOfStudy: value})}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldsOfStudy.map(field => (
                          <SelectItem key={field} value={field}>{field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution">Institution Name (Optional)</Label>
                    <Input
                      id="institution"
                      value={onboardingData.institution}
                      onChange={(e) => setOnboardingData({...onboardingData, institution: e.target.value})}
                      disabled={!isEditing}
                      className="h-11"
                      placeholder="e.g., University of Example"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Career Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Briefcase className="h-5 w-5 text-amber-600" />
                  Career Information
                </CardTitle>
                <p className="text-sm text-gray-600">What's your current career stage?</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {careerStages.map(stage => (
                    <button
                      key={stage}
                      onClick={() => isEditing && setOnboardingData({...onboardingData, careerStage: stage})}
                      disabled={!isEditing}
                      className={`relative flex items-center justify-center p-4 h-20 text-center rounded-xl border-2 transition-all duration-200 ${
                        onboardingData.careerStage === stage
                          ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                          : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                      } ${!isEditing ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}
                    >
                      {onboardingData.careerStage === stage && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                      {stage}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Skills Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Current Skills
                </CardTitle>
                <p className="text-sm text-gray-600">This is optional, but helps us recommend better content.</p>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <SkillsInput
                    value={onboardingData.skills || []}
                    onChange={(skills) => setOnboardingData({...onboardingData, skills})}
                    placeholder="Type your skills and press Enter..."
                    maxSkills={15}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {onboardingData.skills && onboardingData.skills.length > 0 ? (
                      onboardingData.skills.map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No skills added yet</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aspirations Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Heart className="h-5 w-5 text-red-600" />
                  What do you want to gain from GlowUp Channel?
                </CardTitle>
                <p className="text-sm text-gray-600">Select all that apply. This helps us align with your goals.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {aspirationsList.map(aspiration => (
                    <button
                      key={aspiration}
                      onClick={() => isEditing && toggleArrayItem(onboardingData.aspirations, aspiration, (value) => setOnboardingData({...onboardingData, aspirations: value}))}
                      disabled={!isEditing}
                      className={`relative flex items-center justify-center p-4 h-24 text-center rounded-xl border-2 transition-all duration-200 ${
                        onboardingData.aspirations.includes(aspiration)
                          ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                          : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                      } ${!isEditing ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}
                    >
                      {onboardingData.aspirations.includes(aspiration) && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                      {aspiration}
                    </button>
                  ))}
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