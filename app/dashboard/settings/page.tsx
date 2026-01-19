"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  LogOut,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Plus,
  X,
  Sparkles,
  TrendingUp,
  Building2,
  Lightbulb
} from 'lucide-react'
import { getDatePickerPropsFor16Plus } from '@/lib/date-utils'
import ApiClient from '@/lib/api-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

// Social platforms config
const socialPlatforms = [
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/username' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@username' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@username' },
]

// Career stage options
const careerStages = [
  'Student',
  'Entry-Level (0-2 years)',
  'Mid-Career (3-7 years)',
  'Senior/Executive (8+ years)'
]

// Education level options
const educationLevels = [
  'High School',
  'Undergraduate',
  'Graduate',
  'Professional'
]

// Interest options
const interestOptions = [
  'Jobs & Career Opportunities',
  'Scholarships & Grants',
  'Training & Workshops',
  'Networking Events',
  'Volunteering & Community Service',
  'Entrepreneurship & Funding',
  'Remote Work & Digital Skills',
  'Research & Academic Opportunities',
  'International Exchange Programs'
]

// Industry sector options
const industrySectorOptions = [
  'Technology',
  'Creative Arts & Media',
  'Business & Finance',
  'Healthcare & Sciences',
  'Government & Public Service'
]

// Aspiration options
const aspirationOptions = [
  'Access to career opportunities',
  'Mentorship & guidance',
  'Networking & professional connections',
  'Skill development',
  'Entrepreneurship support'
]

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile, logout, refreshUser, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'basic' | 'background' | 'privacy' | 'security' | 'notifications'>('basic')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [emailVerified, setEmailVerified] = useState<boolean>(false)
  const [isResendingCode, setIsResendingCode] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  // Basic Info State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  const [headline, setHeadline] = useState('')
  const [website, setWebsite] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [workCompany, setWorkCompany] = useState('')
  const [workTitle, setWorkTitle] = useState('')
  const [educationSchool, setEducationSchool] = useState('')
  const [educationDegree, setEducationDegree] = useState('')
  const [educationField, setEducationField] = useState('')
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})
  const [profileImage, setProfileImage] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  // Background/Onboarding State
  const [country, setCountry] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [careerStage, setCareerStage] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [industrySectors, setIndustrySectors] = useState<string[]>([])
  const [educationLevel, setEducationLevel] = useState('')
  const [fieldOfStudy, setFieldOfStudy] = useState('')
  const [institution, setInstitution] = useState('')
  const [aspirations, setAspirations] = useState<string[]>([])

  // Privacy State
  const [isPrivate, setIsPrivate] = useState(false)
  const [showConnections, setShowConnections] = useState(true)

  // Preferences State
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    weeklyDigest: true,
    language: "en",
    timezone: "Africa/Lagos",
    theme: "dark"
  })

  // Security State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Load data from profile/user
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setEmailVerified(user.emailVerified || false)
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      // Basic Info
      setBio(profile.bio || '')
      setHeadline(profile.headline || '')
      setWebsite(profile.website || '')
      setSkills(profile.skills || [])
      setWorkCompany(profile.work?.company || '')
      setWorkTitle(profile.work?.title || '')
      setEducationSchool(profile.education?.school || '')
      setEducationDegree(profile.education?.degree || '')
      setEducationField(profile.education?.field || '')
      setSocialLinks(profile.socialLinks || {})
      setProfileImage(profile.profileImage || user?.profileImage || '')
      setPhoneNumber(profile.phoneNumber || '')
      
      // Privacy
      setIsPrivate(profile.isPrivate || false)
      setShowConnections(profile.showConnections !== false)

      // Onboarding/Background
      if (profile.onboarding) {
        setCountry(profile.onboarding.country || '')
        setProvince(profile.onboarding.province || '')
        setCity(profile.onboarding.city || '')
        setCareerStage(profile.onboarding.careerStage || '')
        setInterests(profile.onboarding.interests || [])
        setIndustrySectors(profile.onboarding.industrySectors || [])
        setEducationLevel(profile.onboarding.educationLevel || '')
        setFieldOfStudy(profile.onboarding.fieldOfStudy || '')
        setInstitution(profile.onboarding.institution || '')
        setAspirations(profile.onboarding.aspirations || [])
      }
    }
  }, [profile, user])

  // Load verification status
  useEffect(() => {
    const loadVerificationStatus = async () => {
      if (user && ApiClient.isAuthenticated()) {
        try {
          const status = await ApiClient.getVerificationStatus()
          setEmailVerified(status.emailVerified)
        } catch (error) {
          console.error('Error loading verification status:', error)
        }
      }
    }
    loadVerificationStatus()
  }, [user])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`${API_BASE_URL}/api/profile/image`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setProfileImage(data.data.profileImage)
        await refreshUser()
        toast.success('Profile picture updated!')
      } else {
        toast.error(data.message || 'Failed to upload image')
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  // Toggle array items
  const toggleArrayItem = (arr: string[], item: string, setArr: (v: string[]) => void) => {
    if (arr.includes(item)) {
      setArr(arr.filter(i => i !== item))
    } else {
      setArr([...arr, item])
    }
  }

  // Add skill
  const addSkill = () => {
    const trimmed = newSkill.trim()
    if (trimmed && !skills.includes(trimmed) && skills.length < 20) {
      setSkills([...skills, trimmed])
      setNewSkill('')
    }
  }

  // Remove skill
  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill))
  }

  // Update social link
  const updateSocialLink = (platform: string, url: string) => {
    setSocialLinks({ ...socialLinks, [platform]: url })
  }

  // Save profile
  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Update user profile
      const userUpdates: Record<string, any> = {
        firstName: firstName || null,
        lastName: lastName || null,
        bio: bio || null,
        headline: headline || null,
        website: website || null,
        skills,
        work: workCompany || workTitle ? { company: workCompany, title: workTitle } : null,
        education: educationSchool || educationDegree || educationField 
          ? { school: educationSchool, degree: educationDegree, field: educationField } 
          : null,
        socialLinks: Object.fromEntries(
          Object.entries(socialLinks).filter(([_, v]) => v)
        ),
        isPrivate,
        showConnections,
        phoneNumber: phoneNumber || null
      }

      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userUpdates)
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.message || 'Failed to save profile')
        setIsSaving(false)
        return
      }

      // Update onboarding profile if we have onboarding data
      if (profile?.onboarding) {
        const onboardingUpdates = {
          country,
          province,
          city: city || undefined,
          careerStage,
          interests,
          industrySectors,
          educationLevel,
          fieldOfStudy: fieldOfStudy || undefined,
          institution: institution || undefined,
          skills,
          aspirations
        }

        const onboardingResponse = await fetch(`${API_BASE_URL}/api/users/profile`, {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(onboardingUpdates)
        })

        const onboardingData = await onboardingResponse.json()

        if (!onboardingData.success) {
          console.warn('Failed to update onboarding data:', onboardingData.message)
        }
      }

      // Refresh user data
      await refreshUser()
      
      setIsEditing(false)
      toast.success('Profile updated successfully!')
    } catch (err) {
      console.error('Error saving profile:', err)
      toast.error('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmMessage = 'Are you sure you want to delete your account? This will permanently delete:\n\n' +
      '• Your profile and preferences\n' +
      '• All saved opportunities, events, jobs, and resources\n' +
      '• All liked content\n' +
      '• All application history\n' +
      '• All other account data\n\n' +
      'This action cannot be undone!'
    
    if (!confirm(confirmMessage)) {
      return
    }

    const finalConfirm = 'This is your final warning. Type "DELETE" to confirm account deletion:'
    const userInput = prompt(finalConfirm)
    
    if (userInput !== 'DELETE') {
      toast.error('Account deletion cancelled')
      return
    }

    setIsDeletingAccount(true)
    
    try {
      await ApiClient.deleteAccount()
      toast.success('Account deleted successfully')
      
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      
      setTimeout(() => {
        logout()
        router.push('/')
      }, 2000)
      
    } catch (error: any) {
      console.error('Delete account error:', error)
      toast.error(error.message || 'Failed to delete account. Please try again.')
      setIsDeletingAccount(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading your settings...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4 border border-red-500/30">
            <User className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Profile Not Found</h2>
          <p className="text-white/60 mb-4">Unable to load your profile data. Please try logging in again.</p>
          <Button onClick={logout} className="bg-orange-500 hover:bg-orange-600 rounded-xl">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="p-2 hover:bg-white/[0.05] rounded-xl transition-colors">
                <ArrowLeft className="h-5 w-5 text-white/60" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Settings</h1>
                <p className="text-sm text-white/50 hidden sm:block">Manage your account and preferences</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="border-white/10 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
              
              {isEditing && (
                <>
                  <Button 
                    onClick={() => setIsEditing(false)} 
                    variant="outline" 
                    size="sm"
                    className="border-white/10 text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 rounded-xl"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Save</span>
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl overflow-x-auto">
            {[
              { id: 'basic', label: 'Basic Info', icon: User },
              { id: 'background', label: 'Background', icon: Target },
              { id: 'privacy', label: 'Privacy', icon: Lock },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'notifications', label: 'Notifications', icon: Bell }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-orange-500 text-white"
                      : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-6">
              {/* Profile Image */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-[#141414] border-2 border-white/[0.06]">
                    {profileImage ? (
                      <Image src={profileImage} alt="Profile" width={128} height={128} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center">
                        <span className="text-2xl md:text-3xl font-semibold text-white">
                          {(firstName?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage || !isEditing}
                    className="absolute -bottom-1 -right-1 p-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                {isEditing && (
                  <p className="text-xs text-white/40 mt-2">Tap to change photo</p>
                )}
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/60 text-sm mb-2 block">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="John"
                    className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                  />
                </div>
                <div>
                  <Label className="text-white/60 text-sm mb-2 block">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Doe"
                    className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label className="text-white/60 text-sm mb-2 block">Email Address</Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-white/[0.03] border-white/[0.08] text-white/50 rounded-xl h-11"
                />
                <div className="flex items-center justify-between mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    {emailVerified ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <span className="text-sm text-emerald-400 font-medium">Email Verified</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-orange-500" />
                        <span className="text-sm text-orange-400 font-medium">Email Not Verified</span>
                      </>
                    )}
                  </div>
                  {!emailVerified && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (isResendingCode) return
                        setIsResendingCode(true)
                        try {
                          await ApiClient.sendVerificationCode()
                          toast.success('Verification code sent! Please check your email.')
                          router.push('/verify-email')
                        } catch (error: any) {
                          toast.error(error.message || 'Failed to send verification code')
                        } finally {
                          setIsResendingCode(false)
                        }
                      }}
                      disabled={isResendingCode}
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 rounded-xl"
                    >
                      {isResendingCode ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Verify
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Headline */}
              <div>
                <Label className="text-white/60 text-sm mb-2 block">Headline</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g. Software Engineer | Entrepreneur"
                  maxLength={100}
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Bio */}
              <div>
                <Label className="text-white/60 text-sm mb-2 block">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Tell people about yourself..."
                  maxLength={500}
                  rows={3}
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl focus:border-orange-500/50 resize-none disabled:opacity-50"
                />
                <p className="text-xs text-white/30 mt-1 text-right">{bio.length}/500</p>
              </div>

              {/* Phone Number */}
              <div>
                <Label className="text-white/60 text-sm mb-2 block">Phone Number</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={!isEditing}
                  type="tel"
                  placeholder="+1234567890"
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Work */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Briefcase className="w-4 h-4" />
                  <span>Work</span>
                </div>
                <Input
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Job Title"
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
                <Input
                  value={workCompany}
                  onChange={(e) => setWorkCompany(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Company"
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Education */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span>Education</span>
                </div>
                <Input
                  value={educationSchool}
                  onChange={(e) => setEducationSchool(e.target.value)}
                  disabled={!isEditing}
                  placeholder="School/University"
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
                <Input
                  value={educationDegree}
                  onChange={(e) => setEducationDegree(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Degree"
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
                <Input
                  value={educationField}
                  onChange={(e) => setEducationField(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Field of Study"
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Skills */}
              <div>
                <Label className="text-white/60 text-sm mb-2 block flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Skills
                </Label>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        placeholder="Add a skill..."
                        className="flex-1 bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-10 focus:border-orange-500/50"
                      />
                      <Button 
                        onClick={addSkill}
                        disabled={!newSkill.trim() || skills.length >= 20}
                        variant="outline"
                        size="icon"
                        className="border-white/10 text-white/60 hover:text-white rounded-xl h-10 w-10"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill, i) => (
                          <span 
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-xs"
                          >
                            {skill}
                            <button onClick={() => removeSkill(skill)} className="opacity-60 hover:opacity-100">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.length > 0 ? (
                      skills.map((skill, i) => (
                        <span 
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-xs"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-white/40 text-sm">No skills added yet</span>
                    )}
                  </div>
                )}
              </div>

              {/* Website & Social Links */}
              <div className="space-y-3">
                <Label className="text-white/60 text-sm block flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  Links
                </Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://yourwebsite.com"
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
                {socialPlatforms.map((platform) => (
                  <Input
                    key={platform.key}
                    value={socialLinks[platform.key] || ''}
                    onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                    disabled={!isEditing}
                    placeholder={platform.placeholder}
                    className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                  />
                ))}
              </div>

              {!isEditing && (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Background Tab */}
        {activeTab === 'background' && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-6">
              {/* Location */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>Location</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Country"
                    className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                  />
                  <Input
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Province/State"
                    className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                  />
                </div>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!isEditing}
                  placeholder="City (optional)"
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Career Stage */}
              <div>
                <Label className="text-white/60 text-sm mb-2 block flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Career Stage
                </Label>
                <Select value={careerStage} onValueChange={setCareerStage} disabled={!isEditing}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 disabled:opacity-50">
                    <SelectValue placeholder="Select career stage" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                    {careerStages.map((stage) => (
                      <SelectItem key={stage} value={stage} className="text-white focus:bg-white/[0.05]">
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Education */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span>Education</span>
                </div>
                <Select value={educationLevel} onValueChange={setEducationLevel} disabled={!isEditing}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 disabled:opacity-50">
                    <SelectValue placeholder="Education level" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/[0.08]">
                    {educationLevels.map((level) => (
                      <SelectItem key={level} value={level} className="text-white focus:bg-white/[0.05]">
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Field of Study"
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
                <Input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Institution/University"
                  className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Interests */}
              <div>
                <Label className="text-white/60 text-sm mb-2 block flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Interests
                </Label>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => isEditing && toggleArrayItem(interests, interest, setInterests)}
                      disabled={!isEditing}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        interests.includes(interest)
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-white/[0.03] text-white/50 border border-white/[0.06] hover:border-white/[0.1]",
                        !isEditing && "opacity-50 cursor-default"
                      )}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Industry Sectors */}
              <div>
                <Label className="text-white/60 text-sm mb-2 block flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Industry Sectors
                </Label>
                <div className="flex flex-wrap gap-2">
                  {industrySectorOptions.map((sector) => (
                    <button
                      key={sector}
                      onClick={() => isEditing && toggleArrayItem(industrySectors, sector, setIndustrySectors)}
                      disabled={!isEditing}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        industrySectors.includes(sector)
                          ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                          : "bg-white/[0.03] text-white/50 border border-white/[0.06] hover:border-white/[0.1]",
                        !isEditing && "opacity-50 cursor-default"
                      )}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspirations */}
              <div>
                <Label className="text-white/60 text-sm mb-2 block flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  What are you looking for?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {aspirationOptions.map((aspiration) => (
                    <button
                      key={aspiration}
                      onClick={() => isEditing && toggleArrayItem(aspirations, aspiration, setAspirations)}
                      disabled={!isEditing}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        aspirations.includes(aspiration)
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-white/[0.03] text-white/50 border border-white/[0.06] hover:border-white/[0.1]",
                        !isEditing && "opacity-50 cursor-default"
                      )}
                    >
                      {aspiration}
                    </button>
                  ))}
                </div>
              </div>

              {!isEditing && (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Background
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-4">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPrivate ? <Lock className="w-5 h-5 text-white/40" /> : <Globe className="w-5 h-5 text-emerald-500" />}
                    <div>
                      <p className="text-sm font-medium text-white">Private Account</p>
                      <p className="text-xs text-white/40">New followers will need your approval</p>
                    </div>
                  </div>
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                    disabled={!isEditing}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {showConnections ? <Eye className="w-5 h-5 text-emerald-500" /> : <EyeOff className="w-5 h-5 text-white/40" />}
                    <div>
                      <p className="text-sm font-medium text-white">Show Connections</p>
                      <p className="text-xs text-white/40">Let others see your follower counts</p>
                    </div>
                  </div>
                  <Switch
                    checked={showConnections}
                    onCheckedChange={setShowConnections}
                    disabled={!isEditing}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                <p className="text-sm text-orange-400 font-medium mb-1">Privacy Tips</p>
                <ul className="text-xs text-white/50 space-y-1">
                  <li>• Private accounts require approval for new followers</li>
                  <li>• Hidden connections only affect the count display</li>
                  <li>• Your posts visibility can be set individually</li>
                </ul>
              </div>

              {!isEditing && (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Privacy Settings
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/60 text-sm mb-2 block">Current Password</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 text-sm mb-2 block">New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 text-sm mb-2 block">Confirm New Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="bg-white/[0.03] border-white/[0.08] text-white rounded-xl h-11 focus:border-orange-500/50"
                    />
                  </div>
                  <Button className="bg-blue-500 hover:bg-blue-600 rounded-xl">
                    Update Password
                  </Button>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <div>
                    <p className="font-medium text-white">Two-Factor Authentication</p>
                    <p className="text-sm text-white/50">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 rounded-xl">
                    Enable 2FA
                  </Button>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Danger Zone</h3>
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <h4 className="font-medium text-red-400 mb-2">Delete Account</h4>
                  <p className="text-sm text-white/50 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button 
                    variant="outline" 
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Email Notifications</p>
                      <p className="text-sm text-white/50">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) => setPreferences({...preferences, emailNotifications: checked})}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Marketing Emails</p>
                      <p className="text-sm text-white/50">Receive promotional and marketing emails</p>
                    </div>
                    <Switch
                      checked={preferences.marketingEmails}
                      onCheckedChange={(checked) => setPreferences({...preferences, marketingEmails: checked})}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Weekly Digest</p>
                      <p className="text-sm text-white/50">Receive a weekly summary of activities</p>
                    </div>
                    <Switch
                      checked={preferences.weeklyDigest}
                      onCheckedChange={(checked) => setPreferences({...preferences, weeklyDigest: checked})}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Push Notifications</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Push Notifications</p>
                    <p className="text-sm text-white/50">Receive notifications on your device</p>
                  </div>
                  <Switch
                    checked={preferences.pushNotifications}
                    onCheckedChange={(checked) => setPreferences({...preferences, pushNotifications: checked})}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
