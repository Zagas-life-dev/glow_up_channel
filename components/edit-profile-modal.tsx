"use client"

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import SkillsInput from "@/components/ui/skills-input"
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  User,
  Camera,
  X,
  Plus,
  Loader2,
  Link as LinkIcon,
  Briefcase,
  GraduationCap,
  Globe,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Target,
  Building2,
  Lightbulb,
  TrendingUp,
  Sparkles
} from 'lucide-react'

interface OnboardingData {
  country: string
  province: string
  city?: string
  careerStage: string
  interests: string[]
  industrySectors: string[]
  educationLevel: string
  fieldOfStudy?: string
  institution?: string
  aspirations: string[]
  onboardingCompleted: boolean
  onboardingSkills: string[]
}

interface ProfileData {
  firstName: string | null
  lastName: string | null
  bio: string | null
  headline: string | null
  profileImage: string | null
  website: string | null
  skills: string[]
  work: { company?: string; title?: string } | null
  education: { school?: string; degree?: string; field?: string } | null
  socialLinks: { linkedin?: string; twitter?: string; instagram?: string; github?: string; youtube?: string; tiktok?: string }
  isPrivate: boolean
  showConnections: boolean
  phoneNumber?: string | null
  onboarding: OnboardingData | null
}

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: ProfileData
  onSuccess: (updatedProfile: Partial<ProfileData>) => void
}

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

export default function EditProfileModal({ isOpen, onClose, profile, onSuccess }: EditProfileModalProps) {
  const { refreshUser } = useAuth()
  
  // Form state - Basic Info
  const [firstName, setFirstName] = useState(profile.firstName || '')
  const [lastName, setLastName] = useState(profile.lastName || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [headline, setHeadline] = useState(profile.headline || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [skills, setSkills] = useState<string[]>(profile.skills || [])
  const [workCompany, setWorkCompany] = useState(profile.work?.company || '')
  const [workTitle, setWorkTitle] = useState(profile.work?.title || '')
  const [educationSchool, setEducationSchool] = useState(profile.education?.school || '')
  const [educationDegree, setEducationDegree] = useState(profile.education?.degree || '')
  const [educationField, setEducationField] = useState(profile.education?.field || '')
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(profile.socialLinks || {})
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '')
  const [isPrivate, setIsPrivate] = useState(profile.isPrivate || false)
  const [showConnections, setShowConnections] = useState(profile.showConnections !== false)

  // Form state - Onboarding
  const [country, setCountry] = useState(profile.onboarding?.country || '')
  const [province, setProvince] = useState(profile.onboarding?.province || '')
  const [city, setCity] = useState(profile.onboarding?.city || '')
  const [careerStage, setCareerStage] = useState(profile.onboarding?.careerStage || '')
  const [interests, setInterests] = useState<string[]>(profile.onboarding?.interests || [])
  const [industrySectors, setIndustrySectors] = useState<string[]>(profile.onboarding?.industrySectors || [])
  const [educationLevel, setEducationLevel] = useState(profile.onboarding?.educationLevel || '')
  const [fieldOfStudy, setFieldOfStudy] = useState(profile.onboarding?.fieldOfStudy || '')
  const [institution, setInstitution] = useState(profile.onboarding?.institution || '')
  const [aspirations, setAspirations] = useState<string[]>(profile.onboarding?.aspirations || [])

  // Image upload
  const [profileImage, setProfileImage] = useState(profile.profileImage || '')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'basic' | 'onboarding' | 'privacy'>('basic')

  // Reset form when profile changes
  useEffect(() => {
    setFirstName(profile.firstName || '')
    setLastName(profile.lastName || '')
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
    setIsPrivate(profile.isPrivate || false)
    setShowConnections(profile.showConnections !== false)
    setProfileImage(profile.profileImage || '')
    setPhoneNumber(profile.phoneNumber || '')
    
    // Onboarding
    setCountry(profile.onboarding?.country || '')
    setProvince(profile.onboarding?.province || '')
    setCity(profile.onboarding?.city || '')
    setCareerStage(profile.onboarding?.careerStage || '')
    setInterests(profile.onboarding?.interests || [])
    setIndustrySectors(profile.onboarding?.industrySectors || [])
    setEducationLevel(profile.onboarding?.educationLevel || '')
    setFieldOfStudy(profile.onboarding?.fieldOfStudy || '')
    setInstitution(profile.onboarding?.institution || '')
    setAspirations(profile.onboarding?.aspirations || [])
  }, [profile])

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploadingImage(true)
    setError('')

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
      } else {
        setError(data.message || 'Failed to upload image')
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      setError('Failed to upload image')
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

  // Skills are now managed by SkillsInput component

  // Update social link
  const updateSocialLink = (platform: string, url: string) => {
    setSocialLinks({ ...socialLinks, [platform]: url })
  }

  // Save profile
  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      // Update user profile
      const userUpdates: Record<string, any> = {
        firstName: firstName || null,
        lastName: lastName || null,
        bio: bio || null,
        headline: headline || null,
        website: website || null,
        phoneNumber: phoneNumber || null,
        skills,
        work: workCompany || workTitle ? { company: workCompany, title: workTitle } : null,
        education: educationSchool || educationDegree || educationField 
          ? { school: educationSchool, degree: educationDegree, field: educationField } 
          : null,
        socialLinks: Object.fromEntries(
          Object.entries(socialLinks).filter(([_, v]) => v)
        ),
        isPrivate,
        showConnections
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
        setError(data.message || 'Failed to save profile')
        setSaving(false)
        return
      }

      // Update onboarding profile
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
        aspirations,
        phoneNumber: phoneNumber || undefined
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

      // Refresh user data to sync across all pages (settings, profile, etc.)
      try {
        await refreshUser()
      } catch (refreshError) {
        console.warn('Failed to refresh user data:', refreshError)
      }

      onSuccess({
        ...userUpdates,
        profileImage,
        onboarding: profile.onboarding ? {
          ...profile.onboarding,
          country,
          province,
          city,
          careerStage,
          interests,
          industrySectors,
          educationLevel,
          fieldOfStudy,
          institution,
          aspirations,
          onboardingSkills: skills
        } : null,
        phoneNumber: phoneNumber || null
      })
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-page border-border p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-page border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-foreground">Edit Profile</SheetTitle>
              <SheetDescription className="text-muted-foreground text-sm">
                Update your profile information
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={onClose} 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground hover:text-foreground rounded-lg"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="bg-primary hover:bg-primary/90 rounded-lg"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab('basic')}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'basic' 
                  ? "bg-primary text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('onboarding')}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'onboarding' 
                  ? "bg-primary text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Background
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'privacy' 
                  ? "bg-primary text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Privacy
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-140px)] p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <>
              {/* Profile Image */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-surface border-2 border-border">
                    {profileImage ? (
                      <Image src={profileImage} alt="Profile" width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center">
                        <User className="w-8 h-8 text-foreground" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="absolute -bottom-1 -right-1 p-2 rounded-full bg-primary hover:bg-primary/90 text-foreground shadow-lg transition-colors"
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
                <p className="text-xs text-muted-foreground mt-2">Tap to change photo</p>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="mt-1 bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="mt-1 bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                  />
                </div>
              </div>

              {/* Headline */}
              <div>
                <Label className="text-muted-foreground text-xs">Headline</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Software Engineer | Entrepreneur"
                  maxLength={100}
                  className="mt-1 bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                />
              </div>

              {/* Bio */}
              <div>
                <Label className="text-muted-foreground text-xs">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about yourself..."
                  maxLength={500}
                  rows={3}
                  className="mt-1 bg-muted border-border text-foreground rounded-xl focus:border-orange-500/50 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/500</p>
              </div>

              {/* Phone Number */}
              <div>
                <Label className="text-muted-foreground text-xs">Phone Number</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  type="tel"
                  placeholder="+1234567890"
                  className="mt-1 bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                />
              </div>

              {/* Work */}
              <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Briefcase className="w-4 h-4" />
                  <span>Work</span>
                </div>
                <Input
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  placeholder="Job Title"
                  className="bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                />
                <Input
                  value={workCompany}
                  onChange={(e) => setWorkCompany(e.target.value)}
                  placeholder="Company"
                  className="bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                />
              </div>

              {/* Skills */}
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1 mb-2">
                  <Sparkles className="w-3 h-3" />
                  Skills
                </Label>
                <SkillsInput
                  value={skills}
                  onChange={setSkills}
                  placeholder="Type a skill and press Enter..."
                  maxSkills={20}
                  className="[&_input]:bg-muted [&_input]:border-border [&_input]:text-foreground [&_input]:rounded-xl [&_input]:h-10 [&_input]:focus:border-orange-500/50 [&_.bg-card]:bg-card [&_.border-border]:border-border [&_.text-foreground]:text-foreground [&_button]:hover:bg-primary/10 [&_button]:focus:bg-primary/10"
                />
              </div>

              {/* Website & Social Links */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  Links
                </Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                />
                {socialPlatforms.map((platform) => (
                  <Input
                    key={platform.key}
                    value={socialLinks[platform.key] || ''}
                    onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                    placeholder={platform.placeholder}
                    className="bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                  />
                ))}
              </div>
            </>
          )}

          {/* Onboarding Tab */}
          {activeTab === 'onboarding' && (
            <>
              {/* Location */}
              <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>Location</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Country"
                    className="bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                  />
                  <Input
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Province/State"
                    className="bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                  />
                </div>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City (optional)"
                  className="bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                />
              </div>

              {/* Career Stage */}
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Career Stage
                </Label>
                <Select value={careerStage} onValueChange={setCareerStage}>
                  <SelectTrigger className="mt-1 bg-muted border-border text-foreground rounded-xl h-10">
                    <SelectValue placeholder="Select career stage" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    {careerStages.map((stage) => (
                      <SelectItem key={stage} value={stage} className="text-foreground focus:bg-muted">
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Education */}
              <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span>Education</span>
                </div>
                <Select value={educationLevel} onValueChange={setEducationLevel}>
                  <SelectTrigger className="bg-muted border-border text-foreground rounded-xl h-10">
                    <SelectValue placeholder="Education level" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    {educationLevels.map((level) => (
                      <SelectItem key={level} value={level} className="text-foreground focus:bg-muted">
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  placeholder="Field of Study"
                  className="bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                />
                <Input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Institution/University"
                  className="bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                />
              </div>

              {/* Interests */}
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1 mb-2">
                  <Target className="w-3 h-3" />
                  Interests
                </Label>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleArrayItem(interests, interest, setInterests)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        interests.includes(interest)
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-muted text-muted-foreground border border-border hover:border-border"
                      )}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Industry Sectors */}
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1 mb-2">
                  <Building2 className="w-3 h-3" />
                  Industry Sectors
                </Label>
                <div className="flex flex-wrap gap-2">
                  {industrySectorOptions.map((sector) => (
                    <button
                      key={sector}
                      onClick={() => toggleArrayItem(industrySectors, sector, setIndustrySectors)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        industrySectors.includes(sector)
                          ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                          : "bg-muted text-muted-foreground border border-border hover:border-border"
                      )}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspirations */}
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1 mb-2">
                  <Lightbulb className="w-3 h-3" />
                  What are you looking for?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {aspirationOptions.map((aspiration) => (
                    <button
                      key={aspiration}
                      onClick={() => toggleArrayItem(aspirations, aspiration, setAspirations)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        aspirations.includes(aspiration)
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground border border-border hover:border-border"
                      )}
                    >
                      {aspiration}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-card border border-border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPrivate ? <Lock className="w-5 h-5 text-muted-foreground" /> : <Globe className="w-5 h-5 text-emerald-500" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">Private Account</p>
                      <p className="text-xs text-muted-foreground">New partners will need your approval</p>
                    </div>
                  </div>
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {showConnections ? <Eye className="w-5 h-5 text-emerald-500" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">Show Connections</p>
                      <p className="text-xs text-muted-foreground">Let others see your partner counts</p>
                    </div>
                  </div>
                  <Switch
                    checked={showConnections}
                    onCheckedChange={setShowConnections}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-orange-500/20">
                <p className="text-sm text-orange-400 font-medium mb-1">Privacy Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Private accounts require approval for new partners</li>
                  <li>• Hidden connections only affect the count display</li>
                  <li>• Your posts visibility can be set individually</li>
                </ul>
              </div>
            </div>
          )}

          {/* Bottom padding */}
          <div className="h-8" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
