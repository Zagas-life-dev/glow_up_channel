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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Lightbulb,
  QrCode,
  Crown
} from 'lucide-react'
import { getDatePickerPropsFor16Plus } from '@/lib/date-utils'
import ApiClient from '@/lib/api-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import PageSkeleton from '@/components/skeletons/page-skeleton'
import { PageShell } from '@/components/layout/page-shell'
import { usePushNotifications } from '@/hooks/use-push-notifications'

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

const QR_APP_URL = process.env.NEXT_PUBLIC_QR_APP_URL

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile, logout, refreshUser, isLoading, upgradeToProvider } = useAuth()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeForm, setUpgradeForm] = useState({ email: '', password: '' })
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'background' | 'privacy' | 'security' | 'notifications'>('basic')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [emailVerified, setEmailVerified] = useState<boolean>(false)
  const [isResendingCode, setIsResendingCode] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isOpeningQrDashboard, setIsOpeningQrDashboard] = useState(false)

  // Premium membership state
  const [isPremium, setIsPremium] = useState<boolean>(false)
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null)
  const [canCancelPremium, setCanCancelPremium] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [isStartingPremium, setIsStartingPremium] = useState(false)
  const [isCancellingPremium, setIsCancellingPremium] = useState(false)

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

  // Preferences State (notificationSettings from backend + local UI)
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    weeklyDigest: true,
    language: "en",
    timezone: "Africa/Lagos",
    theme: "dark",
    pushOpportunities: true,
    pushEvents: true,
    pushJobs: true,
    pushResources: true,
    pushLockedInReminders: true,
    pushChannelPosts: true,
    pushConnectionPosts: true,
    pushFunReminders: true
  })
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [savingPushPref, setSavingPushPref] = useState(false)

  const push = usePushNotifications()

  // Open notifications tab when ?tab=notifications
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'notifications') setActiveTab('notifications')
  }, [])

  // Sync push preference from actual subscription state
  useEffect(() => {
    if (!push.isLoading && push.isSubscribed) {
      setPreferences((p) => (p.pushNotifications ? p : { ...p, pushNotifications: true }))
    }
  }, [push.isSubscribed, push.isLoading])

  // Load preferences from backend (for notification settings)
  useEffect(() => {
    if (!user || !ApiClient.isAuthenticated()) return
    let cancelled = false
    fetch(`${API_BASE_URL}/api/users/preferences`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.data?.preferences) return
        const ns = data.data.preferences.notificationSettings || {}
        setPreferences((p) => ({
          ...p,
          emailNotifications: ns.emailNotifications !== false,
          pushNotifications: ns.pushNotifications !== false,
          weeklyDigest: ns.weeklyDigest !== false,
          newOpportunities: ns.newOpportunities !== false,
          eventReminders: ns.eventReminders !== false,
          jobAlerts: ns.jobAlerts !== false,
          pushOpportunities: ns.pushOpportunities !== false,
          pushEvents: ns.pushEvents !== false,
          pushJobs: ns.pushJobs !== false,
          pushResources: ns.pushResources !== false,
          pushLockedInReminders: ns.pushLockedInReminders !== false,
          pushChannelPosts: ns.pushChannelPosts !== false,
          pushConnectionPosts: ns.pushConnectionPosts !== false,
          pushFunReminders: ns.pushFunReminders !== false
        }))
        setPreferencesLoaded(true)
      })
      .catch(() => setPreferencesLoaded(true))
    return () => { cancelled = true }
  }, [user])

  const savePushPreference = async (key: string, value: boolean) => {
    if (!ApiClient.isAuthenticated()) return
    setSavingPushPref(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/preferences`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationSettings: { [key]: value } })
      })
      const data = await res.json()
      if (data.success) setPreferences((p) => ({ ...p, [key]: value }))
      else toast.error(data.message || 'Failed to save')
    } catch {
      toast.error('Failed to save notification setting')
    } finally {
      setSavingPushPref(false)
    }
  }

  // Security State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleOpenQrDashboard = () => {
    if (!user) {
      toast.error('Please log in again to manage your QR profile.')
      return
    }

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || localStorage.getItem('authToken')
      : null

    if (!token) {
      toast.error('No active session found. Please sign in again.')
      return
    }

    if (!QR_APP_URL) {
      toast.error('QR app URL is not configured.')
      return
    }

    setIsOpeningQrDashboard(true)

    try {
      const url = `${QR_APP_URL.replace(/\/$/, '')}/dashboard?token=${encodeURIComponent(token)}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setTimeout(() => setIsOpeningQrDashboard(false), 500)
    }
  }

  // Load data from profile/user
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setEmailVerified(user.emailVerified || false)
      
      // Basic Profile Info (from user object)
      setBio((user as any).bio || '')
      setHeadline((user as any).headline || '')
      setWebsite((user as any).website || '')
      setSkills((user as any).skills || [])
      setWorkCompany((user as any).work?.company || '')
      setWorkTitle((user as any).work?.title || '')
      setEducationSchool((user as any).education?.school || '')
      setEducationDegree((user as any).education?.degree || '')
      setEducationField((user as any).education?.field || '')
      setSocialLinks((user as any).socialLinks || {})
      setProfileImage((user as any).profileImage || profile?.profileImage || '')
      
      // Privacy
      setIsPrivate((user as any).isPrivate || false)
      setShowConnections((user as any).showConnections !== false)

      // Initialize premium state from user if available
      if (typeof user.isPremium === 'boolean') {
        setIsPremium(user.isPremium)
      }
      if ((user as any).premiumExpiresAt) {
        setPremiumExpiresAt((user as any).premiumExpiresAt)
      }
    }
  }, [user, profile])

  useEffect(() => {
    if (profile) {
      // Onboarding/Background (from profile object directly)
      setCountry(profile.country || '')
      setProvince(profile.province || '')
      setCity(profile.city || '')
      setCareerStage(profile.careerStage || '')
      setInterests(profile.interests || [])
      setIndustrySectors(profile.industrySectors || [])
      setEducationLevel(profile.educationLevel || '')
      setFieldOfStudy(profile.fieldOfStudy || '')
      setInstitution(profile.institution || '')
      setAspirations(profile.aspirations || [])
      setPhoneNumber(profile.phoneNumber || '')
    }
  }, [profile])

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

  // When premium modal opens, fetch status to get canCancel
  useEffect(() => {
    if (!showPremiumModal || !user || !ApiClient.isAuthenticated()) return
    let cancelled = false
    ApiClient.getPremiumStatus()
      .then((status) => {
        if (!cancelled) {
          setCanCancelPremium(!!status.canCancel)
          if (typeof status.isPremium === 'boolean') setIsPremium(status.isPremium)
          if (status.premiumExpiresAt != null) setPremiumExpiresAt(status.premiumExpiresAt)
        }
      })
      .catch(() => { if (!cancelled) setCanCancelPremium(false) })
    return () => { cancelled = true }
  }, [showPremiumModal, user])

  // Handle premium callback from Paystack (?premium=success&reference=...)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const premiumFlag = params.get('premium')
    const reference = params.get('reference')

    if (premiumFlag === 'success' && reference) {
      ;(async () => {
        try {
          setIsStartingPremium(true)
          const result = await ApiClient.verifyPremiumSubscription(reference)
          setIsPremium(result.isPremium)
          setPremiumExpiresAt(result.premiumExpiresAt)
          await refreshUser()
          toast.success('Premium subscription activated!')
        } catch (error: any) {
          console.error('Error verifying premium subscription:', error)
          toast.error(error?.message || 'Failed to verify premium subscription')
        } finally {
          setIsStartingPremium(false)
          // Clean up query params
          const url = new URL(window.location.href)
          url.searchParams.delete('premium')
          url.searchParams.delete('reference')
          window.history.replaceState({}, '', url.toString())
        }
      })()
    }
  }, [refreshUser])

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  // Auto-save profile/background changes while editing (debounced)
  useEffect(() => {
    if (!isEditing || !user) return

    const timer = setTimeout(() => {
      // Silent auto-save; errors are logged but don't interrupt the flow
      saveProfile({ silent: true }).catch(() => {})
    }, 2000)

    return () => clearTimeout(timer)
  }, [
    isEditing,
    user,
    firstName,
    lastName,
    bio,
    headline,
    website,
    phoneNumber,
    workCompany,
    workTitle,
    educationSchool,
    educationDegree,
    educationField,
    country,
    province,
    city,
    careerStage,
    educationLevel,
    fieldOfStudy,
    institution,
    isPrivate,
    showConnections,
    // Arrays/objects – stringify to keep deps simple
    JSON.stringify(skills),
    JSON.stringify(socialLinks),
    JSON.stringify(interests),
    JSON.stringify(industrySectors),
    JSON.stringify(aspirations),
  ])

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

  // Save profile (used for manual Save and silent auto-save)
  const saveProfile = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
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
        if (!silent) {
          toast.error(data.message || 'Failed to save profile')
        }
        setIsSaving(false)
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

      if (!onboardingData.success && !silent) {
        console.warn('Failed to update onboarding data:', onboardingData.message)
      }

      // Refresh user data
      await refreshUser()
      
      if (!silent) {
        setIsEditing(false)
        toast.success('Profile updated successfully!')
      }
    } catch (err) {
      console.error('Error saving profile:', err)
      if (!silent) {
        toast.error('Failed to save profile')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = () => {
    return saveProfile({ silent: false })
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
    return <PageSkeleton />
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4 border border-red-500/30">
            <User className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">Unable to load your profile data. Please try logging in again.</p>
          <Button onClick={logout} className="bg-primary hover:bg-primary/90 rounded-xl">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  const profileHref = user?._id ? `/profile/${user._id}` : '/'

  return (
    <PageShell className="pb-20 md:pb-8">
      <div className="max-w-2xl mx-auto pt-safe pt-4">
        {/* Top row: Back + actions */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link
            href={profileHref}
            className="p-2.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="border-border/60 bg-card/60 backdrop-blur-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
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
                  className="border-border/60 bg-card/60 backdrop-blur-sm text-muted-foreground hover:text-foreground rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 rounded-xl"
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

        {/* Glass header card */}
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 mb-6">
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        {/* Admin: only visible for admin / super_admin */}
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/40 flex items-center justify-center">
                <Shield className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Admin Hub</p>
                <p className="text-xs text-muted-foreground">
                  Manage content, users, and platform settings.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-violet-500/40 text-violet-500 hover:bg-violet-500/10 hover:text-violet-400 shrink-0"
            >
              <Link href="/dashboard/admin">Open Admin</Link>
            </Button>
          </div>
        )}

        {/* Tab Navigation - glass pills */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
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
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap border",
                    activeTab === tab.id
                      ? "bg-card/80 backdrop-blur-sm border-border/60 text-foreground"
                      : "border-transparent bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/60"
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
            {/* QR Profile quick access / Premium gate */}
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-orange-500/40 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    QR Profile {isPremium && <span className="ml-1 text-[11px] text-primary/80">(Premium)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Generate and manage a QR code that shares your public contact card.
                  </p>
                </div>
              </div>
              {isPremium ? (
                <Button
                  type="button"
                  onClick={handleOpenQrDashboard}
                  disabled={isOpeningQrDashboard}
                  className="rounded-full bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-medium"
                >
                  {isOpeningQrDashboard ? 'Opening…' : 'Manage QR Profile'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    window.location.href = '/premium'
                  }}
                  className="rounded-full bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-medium"
                >
                  View premium plans
                </Button>
              )}
            </div>

            {/* Become a provider card - only show when not already a provider */}
            {user?.role !== 'opportunity_poster' && user?.role !== 'admin' && user?.role !== 'super_admin' && (
              <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/40 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Become a provider</p>
                    <p className="text-xs text-muted-foreground">
                      Post opportunities and events. Reach seekers and grow your audience.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setUpgradeForm({ email: user?.email || '', password: '' })
                    setUpgradeError(null)
                    setShowUpgradeModal(true)
                  }}
                  className="rounded-full bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-medium gap-2"
                >
                  <Crown className="h-4 w-4" />
                  Become a provider
                </Button>
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 space-y-6">
              {/* Premium membership card */}
              <div className="p-4 rounded-xl border border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Glow Up Premium
                      {isPremium && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                          Premium
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unlock extra power features:
                    </p>
                    <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                      <li>• Weekly premium newsletter</li>
                      <li>• Ability to create channels</li>
                      <li>• Ability to host a general Lock In</li>
                      <li>• No ads (still see promoted content)</li>
                      <li>• Special library with free premium guides</li>
                    </ul>
                    {isPremium && premiumExpiresAt && (
                      <p className="text-[11px] text-yellow-300 mt-2">
                        Premium active · renews by {new Date(premiumExpiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => router.push('/premium/manage')}
                  className="rounded-full bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-medium"
                >
                  {isPremium ? 'Manage Premium' : 'See Premium Plans'}
                </Button>
              </div>

              {/* Profile Image and basic fields */}
              {/* Profile Image */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-surface border-2 border-border">
                    {profileImage ? (
                      <Image src={profileImage} alt="Profile" width={128} height={128} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center">
                        <span className="text-2xl md:text-3xl font-semibold text-foreground">
                          {(firstName?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage || !isEditing}
                    className="absolute -bottom-1 -right-1 p-2 rounded-full bg-primary hover:bg-primary/90 text-foreground shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <p className="text-xs text-muted-foreground mt-2">Tap to change photo</p>
                )}
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm mb-2 block">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="John"
                    className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm mb-2 block">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Doe"
                    className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block">Email Address</Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-muted border-border text-muted-foreground rounded-xl h-11"
                />
                <div className="flex items-center justify-between mt-3 p-3 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm">
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
                      className="border-orange-500/30 text-orange-400 hover:bg-primary/10 rounded-xl"
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
                <Label className="text-muted-foreground text-sm mb-2 block">Headline</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g. Software Engineer | Entrepreneur"
                  maxLength={100}
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Bio */}
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Tell people about yourself..."
                  maxLength={500}
                  rows={3}
                  className="bg-muted border-border text-foreground rounded-xl focus:border-orange-500/50 resize-none disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/500</p>
              </div>

              {/* Phone Number */}
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block">Phone Number</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={!isEditing}
                  type="tel"
                  placeholder="+1234567890"
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Work */}
              <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Briefcase className="w-4 h-4" />
                  <span>Work</span>
                </div>
                <Input
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Job Title"
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
                <Input
                  value={workCompany}
                  onChange={(e) => setWorkCompany(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Company"
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Education */}
              <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span>Education</span>
                </div>
                <Input
                  value={educationSchool}
                  onChange={(e) => setEducationSchool(e.target.value)}
                  disabled={!isEditing}
                  placeholder="School/University"
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
                <Input
                  value={educationDegree}
                  onChange={(e) => setEducationDegree(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Degree"
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
                <Input
                  value={educationField}
                  onChange={(e) => setEducationField(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Field of Study"
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Skills */}
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block flex items-center gap-1">
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
                        className="flex-1 bg-muted border-border text-foreground rounded-xl h-10 focus:border-orange-500/50"
                      />
                      <Button 
                        onClick={addSkill}
                        disabled={!newSkill.trim() || skills.length >= 20}
                        variant="outline"
                        size="icon"
                        className="border-border text-muted-foreground hover:text-foreground rounded-xl h-10 w-10"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill, i) => (
                          <span 
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-orange-400 text-xs"
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
                          className="px-2.5 py-1 rounded-lg bg-primary/10 text-orange-400 text-xs"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No skills added yet</span>
                    )}
                  </div>
                )}
              </div>

              {/* Website & Social Links */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-sm block flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  Links
                </Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://yourwebsite.com"
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
                {socialPlatforms.map((platform) => (
                  <Input
                    key={platform.key}
                    value={socialLinks[platform.key] || ''}
                    onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                    disabled={!isEditing}
                    placeholder={platform.placeholder}
                    className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                  />
                ))}
              </div>

              {!isEditing && (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="w-full bg-primary hover:bg-primary/90 rounded-xl"
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
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 space-y-6">
              {/* Location */}
              <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>Location</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Country"
                    className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                  />
                  <Input
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Province/State"
                    className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                  />
                </div>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!isEditing}
                  placeholder="City (optional)"
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Career Stage */}
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Career Stage
                </Label>
                <Select value={careerStage} onValueChange={setCareerStage} disabled={!isEditing}>
                  <SelectTrigger className="bg-muted border-border text-foreground rounded-xl h-11 disabled:opacity-50">
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
              <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span>Education</span>
                </div>
                <Select value={educationLevel} onValueChange={setEducationLevel} disabled={!isEditing}>
                  <SelectTrigger className="bg-muted border-border text-foreground rounded-xl h-11 disabled:opacity-50">
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
                  disabled={!isEditing}
                  placeholder="Field of Study"
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
                <Input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Institution/University"
                  className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50 disabled:opacity-50"
                />
              </div>

              {/* Interests */}
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block flex items-center gap-1">
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
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-muted text-muted-foreground border border-border hover:border-border",
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
                <Label className="text-muted-foreground text-sm mb-2 block flex items-center gap-1">
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
                          : "bg-muted text-muted-foreground border border-border hover:border-border",
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
                <Label className="text-muted-foreground text-sm mb-2 block flex items-center gap-1">
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
                          : "bg-muted text-muted-foreground border border-border hover:border-border",
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
                  className="w-full bg-primary hover:bg-primary/90 rounded-xl"
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
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 space-y-4">
              <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 space-y-4">
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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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

              {!isEditing && (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="w-full bg-primary hover:bg-primary/90 rounded-xl"
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
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-sm mb-2 block">Current Password</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm mb-2 block">New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm mb-2 block">Confirm New Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="bg-muted border-border text-foreground rounded-xl h-11 focus:border-orange-500/50"
                    />
                  </div>
                  <Button className="bg-primary hover:bg-primary/90 rounded-xl">
                    Update Password
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                  <div>
                    <p className="font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-primary/10 rounded-xl">
                    Enable 2FA
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Become a provider</h3>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm">
                  <div>
                    <p className="font-medium text-foreground">
                      {user?.role === 'opportunity_poster' || user?.role === 'admin' || user?.role === 'super_admin'
                        ? 'You have provider access'
                        : 'Post opportunities and reach seekers'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user?.role === 'opportunity_poster' || user?.role === 'admin' || user?.role === 'super_admin'
                        ? 'Manage your content and promotions in Provider Hub.'
                        : 'Upgrade your account to post opportunities and events.'}
                    </p>
                  </div>
                  {(user?.role === 'opportunity_poster' || user?.role === 'admin' || user?.role === 'super_admin') ? (
                    <Link href="/dashboard/provider">
                      <Button className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl gap-2">
                        <Crown className="h-4 w-4" />
                        Provider Hub
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => {
                        setUpgradeForm({ email: user?.email || '', password: '' })
                        setUpgradeError(null)
                        setShowUpgradeModal(true)
                      }}
                      className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl gap-2"
                    >
                      <Crown className="h-4 w-4" />
                      Become a provider
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Sign Out</h3>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm">
                  <div>
                    <p className="font-medium text-foreground">Sign out of your account</p>
                    <p className="text-sm text-muted-foreground">You can sign back in anytime.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={logout}
                    className="border-border/60 text-foreground hover:bg-muted rounded-xl"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Danger Zone</h3>
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <h4 className="font-medium text-red-400 mb-2">Delete Account</h4>
                  <p className="text-sm text-muted-foreground mb-4">
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
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) => setPreferences({...preferences, emailNotifications: checked})}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Marketing Emails</p>
                      <p className="text-sm text-muted-foreground">Receive promotional and marketing emails</p>
                    </div>
                    <Switch
                      checked={preferences.marketingEmails}
                      onCheckedChange={(checked) => setPreferences({...preferences, marketingEmails: checked})}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Weekly Digest</p>
                      <p className="text-sm text-muted-foreground">Receive a weekly summary of activities</p>
                    </div>
                    <Switch
                      checked={preferences.weeklyDigest}
                      onCheckedChange={(checked) => setPreferences({...preferences, weeklyDigest: checked})}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Push Notifications</h3>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      {push.isSupported
                        ? "Receive notifications on your device (works when app is installed or in browser)"
                        : "Not supported in this browser. Use a modern browser or install the app."}
                    </p>
                    {push.error && (
                      <p className="text-sm text-destructive mt-1">{push.error}</p>
                    )}
                  </div>
                  <Switch
                    disabled={!push.isSupported || push.isLoading}
                    checked={preferences.pushNotifications || push.isSubscribed}
                    onCheckedChange={async (checked) => {
                      if (!push.isSupported) return
                      setPreferences((p) => ({ ...p, pushNotifications: checked, ...(checked && { pushFunReminders: true }) }))
                      if (checked) {
                        const ok = await push.subscribe()
                        if (ok) {
                          toast.success("Push notifications enabled")
                          await savePushPreference('pushFunReminders', true)
                        } else {
                          toast.error(push.error || "Could not enable push notifications")
                        }
                      } else {
                        await push.unsubscribe()
                        toast.success("Push notifications disabled")
                      }
                    }}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                {(preferences.pushNotifications || push.isSubscribed) && push.isSupported && (
                  <div className="mt-4 pl-1 space-y-3 border-l-2 border-border/60">
                    <p className="text-sm font-medium text-foreground mt-2 mb-2">What to receive</p>
                    {[
                      { key: 'pushOpportunities', label: 'Saved opportunities', desc: 'Deadline reminders for saved opportunities' },
                      { key: 'pushEvents', label: 'Saved events', desc: 'Reminders for saved events' },
                      { key: 'pushJobs', label: 'Saved jobs', desc: 'Deadline reminders for saved jobs' },
                      { key: 'pushLockedInReminders', label: 'Locked In reminders', desc: 'Daily nudge to lock in' },
                      { key: 'pushConnectionPosts', label: 'When connections post', desc: 'When someone you follow posts in Community' },
                      { key: 'pushChannelPosts', label: 'Channel posts', desc: 'New posts in channels you\'re in' },
                      { key: 'pushFunReminders', label: 'Fun & motivational', desc: 'Occasional goals and motivation (about once a day)' }
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between gap-4 py-1">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          disabled={savingPushPref}
                          checked={!!(preferences as Record<string, unknown>)[key]}
                          onCheckedChange={(checked) => savePushPreference(key, checked)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade to provider modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Upgrade to provider
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Confirm your password to upgrade your account to provider status.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!upgradeForm.password) {
                setUpgradeError('Password is required')
                return
              }
              setIsUpgrading(true)
              setUpgradeError(null)
              try {
                await upgradeToProvider(upgradeForm.email, upgradeForm.password)
                toast.success('Successfully upgraded to provider!')
                setShowUpgradeModal(false)
                router.push('/dashboard/provider')
              } catch (err: unknown) {
                setUpgradeError(err instanceof Error ? err.message : 'Failed to upgrade. Please check your password and try again.')
              } finally {
                setIsUpgrading(false)
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">Email</Label>
              <Input
                type="email"
                value={upgradeForm.email}
                onChange={(e) => setUpgradeForm((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-muted border-border rounded-xl"
                required
                disabled
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-2 block">Password</Label>
              <Input
                type="password"
                value={upgradeForm.password}
                onChange={(e) => {
                  setUpgradeForm((prev) => ({ ...prev, password: e.target.value }))
                  setUpgradeError(null)
                }}
                placeholder="Enter your password to confirm"
                className="bg-muted border-border rounded-xl"
                required
              />
            </div>
            {upgradeError && (
              <p className="text-sm text-red-400">{upgradeError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowUpgradeModal(false)
                  setUpgradeError(null)
                }}
                disabled={isUpgrading}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpgrading} className="bg-primary hover:bg-primary/90 rounded-xl gap-2">
                {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                Upgrade
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Premium subscription modal */}
      <Dialog open={showPremiumModal} onOpenChange={setShowPremiumModal}>
        <DialogContent className="bg-card border-border rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              {isPremium ? 'Manage Premium' : 'Upgrade to Premium'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isPremium
                ? 'Your premium membership unlocks extra benefits on Glow Up Channel.'
                : 'Get access to creator tools, special resources, and an ad‑light experience.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Glow Up Premium – Monthly</p>
                  <p className="text-xs text-muted-foreground">
                    Billed monthly via Paystack. You can cancel any time.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">₦2,500</p>
                  <p className="text-[11px] text-muted-foreground">per month</p>
                </div>
              </div>
              <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                <li>• Weekly premium newsletter and insights</li>
                <li>• Create and manage your own channels</li>
                <li>• Host general Lock In sessions</li>
                <li>• Experience Glow Up with no ads (promoted content may still appear)</li>
                <li>• Access a special library of premium guides and resources</li>
              </ul>
            </div>

            {isPremium && premiumExpiresAt && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground">
                Premium is currently active. Your access runs until{' '}
                <span className="font-semibold">
                  {new Date(premiumExpiresAt).toLocaleDateString()}
                </span>
                .
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex-wrap gap-2">
            {isPremium && canCancelPremium && (
              <Button
                type="button"
                variant="outline"
                disabled={isStartingPremium || isCancellingPremium}
                className="rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={async () => {
                  if (!window.confirm('Cancel your premium subscription? You will keep access until the end of your current billing period and will not be charged again.')) return
                  try {
                    setIsCancellingPremium(true)
                    const { premiumExpiresAt: expiresAt } = await ApiClient.cancelPremiumSubscription()
                    setCanCancelPremium(false)
                    await refreshUser()
                    toast.success('Subscription cancelled. You keep premium until ' + (expiresAt ? new Date(expiresAt).toLocaleDateString() : 'the end of your period') + '.')
                    setShowPremiumModal(false)
                  } catch (error: unknown) {
                    console.error('Error cancelling premium:', error)
                    toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription')
                  } finally {
                    setIsCancellingPremium(false)
                  }
                }}
              >
                {isCancellingPremium ? 'Cancelling…' : 'Cancel subscription'}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPremiumModal(false)}
              disabled={isStartingPremium}
              className="rounded-xl"
            >
              Close
            </Button>
            <Button
              type="button"
              disabled={isStartingPremium || isCancellingPremium}
              className="bg-primary hover:bg-primary/90 rounded-xl"
              onClick={async () => {
                try {
                  setIsStartingPremium(true)
                  // Paystack expects amount in kobo (1 NGN = 100 kobo). ₦2,500 = 250000 kobo.
                  const result = await ApiClient.startPremiumSubscription(250000, {
                    planId: 'premium_monthly',
                    callbackUrl: typeof window !== 'undefined' ? `${window.location.origin}/profile/settings?premium=success` : undefined,
                  })
                  if (result.authorizationUrl) {
                    window.location.href = result.authorizationUrl
                  } else {
                    toast.error('Failed to start premium subscription')
                  }
                } catch (error: unknown) {
                  console.error('Error starting premium subscription:', error)
                  toast.error(error instanceof Error ? error.message : 'Failed to start premium subscription')
                } finally {
                  // do not reset isStartingPremium here; we are leaving page to Paystack
                  setShowPremiumModal(false)
                }
              }}
            >
              {isStartingPremium ? 'Connecting to Paystack…' : isPremium ? 'Renew / Manage via Paystack' : 'Continue with Paystack'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
