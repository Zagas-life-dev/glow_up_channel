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
  Crown
} from 'lucide-react'
import { getDatePickerPropsFor16Plus } from '@/lib/date-utils'
import ApiClient from '@/lib/api-client'
import { PARTNER_PROGRAMME_ENABLED } from '@/lib/feature-flags'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import PageSkeleton from '@/components/skeletons/page-skeleton'
import { PageShell } from '@/components/layout/page-shell'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { canAccessMonitorPortal, canPublishContent, isMonitor } from '@/lib/roles'
import { trackProfileEdit } from '@/lib/tracking'

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

/**
 * The five sections, in the order someone actually works through them: who you are, what you
 * are into, what reaches you, who can see you, and finally the account itself — with the
 * destructive actions last.
 */
const SETTINGS_SECTIONS = [
  { id: 'basic' as const, label: 'Profile', icon: User },
  { id: 'background' as const, label: 'Background', icon: Target },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'privacy' as const, label: 'Privacy', icon: Lock },
  { id: 'security' as const, label: 'Account', icon: Shield },
]

const PUSH_TOPICS = [
  { key: 'pushOpportunities', label: 'Saved opportunities', desc: 'Deadline reminders for opportunities you saved' },
  { key: 'pushEvents', label: 'Saved events', desc: 'Reminders for events you saved' },
  { key: 'pushJobs', label: 'Saved jobs', desc: 'Deadline reminders for jobs you saved' },
  { key: 'pushLockedInReminders', label: 'Locked In reminders', desc: 'A daily nudge to lock in' },
  { key: 'pushConnectionPosts', label: 'When connections post', desc: 'When someone you follow posts in Community' },
  { key: 'pushChannelPosts', label: 'Channel posts', desc: 'New posts in channels you are in' },
  { key: 'pushFunReminders', label: 'Fun and motivational', desc: 'Occasional goals and motivation, about once a day' },
  { key: 'pushPromotions', label: 'Featured listings', desc: 'Occasional sponsored listings, at most twice per campaign' },
]

/**
 * One flat panel per topic. The old page nested `bg-card/80 backdrop-blur-sm` up to three
 * levels deep, so a card sat inside a card inside a card and no grouping meant anything.
 */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function SettingsField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  descriptionTone = 'muted',
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  descriptionTone?: 'muted' | 'error'
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {description ? (
          <p className={cn('mt-0.5 text-xs leading-relaxed', descriptionTone === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
            {description}
          </p>
        ) : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5 shrink-0" />
    </div>
  )
}

/**
 * Multi-select chips. One accent for all three pickers — the old page tinted interests orange,
 * sectors violet and aspirations emerald, which implied a difference in kind that isn't there.
 */
function ChipPicker({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            aria-pressed={active}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

/** A route this account can reach — Admin Hub, Provider Hub, or the Founder Batch pitch. */
function AccessRow({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  href: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <span className="shrink-0 text-xs font-medium text-primary">{cta}</span>
    </Link>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile, logout, refreshUser, isLoading, upgradeToProvider } = useAuth()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [upgradeForm, setUpgradeForm] = useState({ email: '', password: '' })
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'background' | 'privacy' | 'security' | 'notifications'>('basic')
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
    pushFunReminders: true,
    pushPromotions: true,
    promotionPopups: true
  })
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [savingPushPref, setSavingPushPref] = useState(false)

  const push = usePushNotifications()

  /**
   * Honour ?tab= for any section, not just notifications. The profile completion checklist
   * deep-links to ?tab=background, which used to land silently on Profile instead.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const requested = new URLSearchParams(window.location.search).get('tab')
    if (!requested) return
    if (SETTINGS_SECTIONS.some((section) => section.id === requested)) {
      setActiveTab(requested as typeof activeTab)
    }
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
          pushFunReminders: ns.pushFunReminders !== false,
          pushPromotions: ns.pushPromotions !== false,
          promotionPopups: ns.promotionPopups !== false
        }))
        setPreferencesLoaded(true)
      })
      .catch(() => setPreferencesLoaded(true))
    return () => { cancelled = true }
  }, [user])

  /**
   * Persists one notification preference.
   *
   * This used to be push-only. The email switches (Email notifications, Marketing emails,
   * Weekly digest) called setPreferences and nothing else — they were never sent anywhere, so
   * they reset on reload. They now go through the same endpoint.
   */
  const saveNotificationPreference = async (key: string, value: boolean) => {
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
  const [isChangingPassword, setIsChangingPassword] = useState(false)

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
    } else if (user && (user as any).phoneNumber) {
      // Fallback: if there is no separate onboarding profile yet, fall back
      // to any phone number stored directly on the user document.
      setPhoneNumber((user as any).phoneNumber || '')
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

  /**
   * Set a field and mark the form dirty. Autosave keys off this rather than an edit mode, so
   * fields are always editable and nothing saves until something actually changed.
   */
  const editField = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (value: T) => {
    setter(value)
    setIsDirty(true)
  }

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  // Auto-save profile/background changes once something has actually changed (debounced)
  useEffect(() => {
    if (!isDirty || !user) return

    const timer = setTimeout(() => {
      // Silent auto-save; errors are logged but don't interrupt the flow
      saveProfile({ silent: true })
        .then(() => {
          setIsDirty(false)
          setLastSavedAt(new Date())
        })
        .catch(() => {})
    }, 1500)

    return () => clearTimeout(timer)
  }, [
    isDirty,
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
  /**
   * The old form collected three password fields behind a button with no onClick at all, so
   * nothing ever happened. The backend route existed the whole time.
   */
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Enter your current and new password')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error('New password needs 8+ characters with an uppercase, a lowercase and a number')
      return
    }

    setIsChangingPassword(true)
    try {
      await ApiClient.changePassword(currentPassword, newPassword)
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update password')
    } finally {
      setIsChangingPassword(false)
    }
  }

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
      
      setIsDirty(false)
      setLastSavedAt(new Date())

      if (!silent) {
        // Only a deliberate save reports. The silent autosave fires on a timer
        // and would otherwise let a form left open qualify a user on its own.
        trackProfileEdit()
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
  const canPublish = canPublishContent(user?.role)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const monitors = isMonitor(user?.role)

  const saveStatus = isSaving
    ? 'Saving…'
    : isDirty
      ? 'Unsaved changes'
      : lastSavedAt
        ? 'All changes saved'
        : null

  return (
    <PageShell className="pb-24 md:pb-10">
      <div className="mx-auto max-w-5xl pt-safe pt-4">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={profileHref}
              aria-label="Back to profile"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>

          {/* Autosave says what it is doing instead of hiding behind an edit mode */}
          {saveStatus ? (
            <span
              aria-live="polite"
              className={cn(
                'mt-1 hidden shrink-0 items-center gap-1.5 text-xs sm:inline-flex',
                isDirty ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {!isSaving && !isDirty ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              {saveStatus}
            </span>
          ) : null}
        </header>

        <div className="lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-10">
          {/* Section nav — a labelled list on desktop, a labelled scrolling row on mobile.
              The old strip hid every label below sm, leaving five unlabelled icons. */}
          <nav aria-label="Settings sections" className="mb-5 lg:sticky lg:top-6 lg:mb-0 lg:self-start">
            <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon
                const active = activeTab === section.id
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveTab(section.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition-colors lg:w-full lg:justify-start',
                      active
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
                    {section.label}
                  </button>
                )
              })}
            </div>
          </nav>

          <div className="min-w-0 space-y-5">
            {/* Profile */}
            {activeTab === 'basic' && (
              <>
                <SettingsSection title="Photo" description="Shown on your profile and next to your posts.">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-muted">
                        {profileImage ? (
                          <Image src={profileImage} alt="Profile" width={80} height={80} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500 to-violet-500">
                            <span className="text-2xl font-semibold text-white">
                              {(firstName?.charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        aria-label="Change photo"
                        className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </div>
                    <div className="min-w-0 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Your name'}
                      </p>
                      <p className="mt-0.5 text-xs">JPG or PNG. Tap the camera to change it.</p>
                    </div>
                  </div>
                </SettingsSection>

                <SettingsSection title="About you" description="How you are introduced across the platform.">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SettingsField label="First name" htmlFor="firstName">
                        <Input id="firstName" value={firstName} onChange={(e) => editField(setFirstName)(e.target.value)} placeholder="John" className="h-11 rounded-xl" />
                      </SettingsField>
                      <SettingsField label="Last name" htmlFor="lastName">
                        <Input id="lastName" value={lastName} onChange={(e) => editField(setLastName)(e.target.value)} placeholder="Doe" className="h-11 rounded-xl" />
                      </SettingsField>
                    </div>

                    <SettingsField label="Headline" htmlFor="headline" hint="A short line under your name, up to 100 characters.">
                      <Input id="headline" value={headline} onChange={(e) => editField(setHeadline)(e.target.value)} maxLength={100} placeholder="e.g. Software Engineer | Entrepreneur" className="h-11 rounded-xl" />
                    </SettingsField>

                    <SettingsField label="Bio" htmlFor="bio">
                      <Textarea id="bio" value={bio} onChange={(e) => editField(setBio)(e.target.value)} rows={4} placeholder="Tell people a little about yourself." className="rounded-xl" />
                    </SettingsField>
                  </div>
                </SettingsSection>

                <SettingsSection title="Contact" description="Your email is how you sign in and cannot be changed here.">
                  <div className="space-y-4">
                    <SettingsField label="Email address" htmlFor="email">
                      <Input id="email" value={user?.email || ''} disabled className="h-11 rounded-xl" />
                    </SettingsField>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-sm">
                        {emailVerified ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">Email verified</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-amber-500" />
                            <span className="font-medium text-amber-700 dark:text-amber-400">Email not verified</span>
                          </>
                        )}
                      </span>
                      {!emailVerified && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            if (isResendingCode) return
                            setIsResendingCode(true)
                            try {
                              await ApiClient.sendVerificationCode()
                              toast.success('Verification code sent, check your email.')
                              router.push('/verify-email')
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to send verification code')
                            } finally {
                              setIsResendingCode(false)
                            }
                          }}
                          disabled={isResendingCode}
                          className="h-9 rounded-xl"
                        >
                          {isResendingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                          Verify
                        </Button>
                      )}
                    </div>

                    <SettingsField label="Phone number" htmlFor="phone">
                      <Input id="phone" value={phoneNumber} onChange={(e) => editField(setPhoneNumber)(e.target.value)} placeholder="+234 000 0000 000" className="h-11 rounded-xl" />
                    </SettingsField>
                  </div>
                </SettingsSection>

                <SettingsSection title="Work and education" description="What you are doing now.">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SettingsField label="Job title" htmlFor="workTitle">
                        <Input id="workTitle" value={workTitle} onChange={(e) => editField(setWorkTitle)(e.target.value)} placeholder="Product Designer" className="h-11 rounded-xl" />
                      </SettingsField>
                      <SettingsField label="Company" htmlFor="workCompany">
                        <Input id="workCompany" value={workCompany} onChange={(e) => editField(setWorkCompany)(e.target.value)} placeholder="Acme Inc." className="h-11 rounded-xl" />
                      </SettingsField>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SettingsField label="School" htmlFor="eduSchool">
                        <Input id="eduSchool" value={educationSchool} onChange={(e) => editField(setEducationSchool)(e.target.value)} placeholder="University of Lagos" className="h-11 rounded-xl" />
                      </SettingsField>
                      <SettingsField label="Degree" htmlFor="eduDegree">
                        <Input id="eduDegree" value={educationDegree} onChange={(e) => editField(setEducationDegree)(e.target.value)} placeholder="BSc" className="h-11 rounded-xl" />
                      </SettingsField>
                    </div>
                    <SettingsField label="Field of study" htmlFor="eduField">
                      <Input id="eduField" value={educationField} onChange={(e) => editField(setEducationField)(e.target.value)} placeholder="Computer Science" className="h-11 rounded-xl" />
                    </SettingsField>
                  </div>
                </SettingsSection>

                <SettingsSection title="Skills" description="Used to match you with relevant opportunities.">
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span key={skill} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                        {skill}
                        <button
                          type="button"
                          onClick={() => { removeSkill(skill); setIsDirty(true) }}
                          aria-label={`Remove ${skill}`}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {skills.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No skills added yet.</p>
                    ) : null}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSkill()
                          setIsDirty(true)
                        }
                      }}
                      placeholder="Add a skill"
                      className="h-11 rounded-xl"
                    />
                    <Button type="button" variant="outline" onClick={() => { addSkill(); setIsDirty(true) }} className="h-11 shrink-0 rounded-xl">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </SettingsSection>

                <SettingsSection title="Links" description="Where people can find you.">
                  <div className="space-y-4">
                    <SettingsField label="Website" htmlFor="website">
                      <Input id="website" value={website} onChange={(e) => editField(setWebsite)(e.target.value)} placeholder="https://yoursite.com" className="h-11 rounded-xl" />
                    </SettingsField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {socialPlatforms.map((platform) => (
                        <SettingsField key={platform.key} label={platform.label} htmlFor={platform.key}>
                          <Input
                            id={platform.key}
                            value={socialLinks[platform.key] || ''}
                            onChange={(e) => { updateSocialLink(platform.key, e.target.value); setIsDirty(true) }}
                            placeholder={platform.placeholder}
                            className="h-11 rounded-xl"
                          />
                        </SettingsField>
                      ))}
                    </div>
                  </div>
                </SettingsSection>
              </>
            )}

            {/* Background */}
            {activeTab === 'background' && (
              <>
                <SettingsSection title="Location" description="Used to rank opportunities near you.">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SettingsField label="Country" htmlFor="country">
                        <Input id="country" value={country} onChange={(e) => editField(setCountry)(e.target.value)} placeholder="Nigeria" className="h-11 rounded-xl" />
                      </SettingsField>
                      <SettingsField label="Province or state" htmlFor="province">
                        <Input id="province" value={province} onChange={(e) => editField(setProvince)(e.target.value)} placeholder="Lagos" className="h-11 rounded-xl" />
                      </SettingsField>
                    </div>
                    <SettingsField label="City" htmlFor="city" hint="Optional.">
                      <Input id="city" value={city} onChange={(e) => editField(setCity)(e.target.value)} placeholder="Ikeja" className="h-11 rounded-xl" />
                    </SettingsField>
                  </div>
                </SettingsSection>

                <SettingsSection title="Education and career" description="Helps us pitch opportunities at the right level.">
                  <div className="space-y-4">
                    <SettingsField label="Career stage">
                      <Select value={careerStage} onValueChange={(v) => editField(setCareerStage)(v)}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select career stage" /></SelectTrigger>
                        <SelectContent>
                          {careerStages.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </SettingsField>

                    <SettingsField label="Education level">
                      <Select value={educationLevel} onValueChange={(v) => editField(setEducationLevel)(v)}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select education level" /></SelectTrigger>
                        <SelectContent>
                          {educationLevels.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </SettingsField>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <SettingsField label="Field of study" htmlFor="fieldOfStudy">
                        <Input id="fieldOfStudy" value={fieldOfStudy} onChange={(e) => editField(setFieldOfStudy)(e.target.value)} placeholder="Economics" className="h-11 rounded-xl" />
                      </SettingsField>
                      <SettingsField label="Institution" htmlFor="institution">
                        <Input id="institution" value={institution} onChange={(e) => editField(setInstitution)(e.target.value)} placeholder="University of Lagos" className="h-11 rounded-xl" />
                      </SettingsField>
                    </div>
                  </div>
                </SettingsSection>

                <SettingsSection title="Interests" description="Pick the areas you want to hear about.">
                  <ChipPicker
                    options={interestOptions}
                    selected={interests}
                    onToggle={(value) => { toggleArrayItem(interests, value, setInterests); setIsDirty(true) }}
                  />
                </SettingsSection>

                <SettingsSection title="Industry sectors" description="The industries you work in or want to enter.">
                  <ChipPicker
                    options={industrySectorOptions}
                    selected={industrySectors}
                    onToggle={(value) => { toggleArrayItem(industrySectors, value, setIndustrySectors); setIsDirty(true) }}
                  />
                </SettingsSection>

                <SettingsSection title="What are you looking for?" description="Shapes what shows up in your feed.">
                  <ChipPicker
                    options={aspirationOptions}
                    selected={aspirations}
                    onToggle={(value) => { toggleArrayItem(aspirations, value, setAspirations); setIsDirty(true) }}
                  />
                </SettingsSection>
              </>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <>
                <SettingsSection title="Email" description="Saved the moment you switch them.">
                  <div className="divide-y divide-border">
                    <ToggleRow
                      id="emailNotifications"
                      label="Email notifications"
                      description="Account and activity emails."
                      checked={preferences.emailNotifications}
                      disabled={savingPushPref}
                      onChange={(checked) => saveNotificationPreference('emailNotifications', checked)}
                    />
                    <ToggleRow
                      id="marketingEmails"
                      label="Marketing emails"
                      description="Occasional product news and offers."
                      checked={preferences.marketingEmails}
                      disabled={savingPushPref}
                      onChange={(checked) => saveNotificationPreference('marketingEmails', checked)}
                    />
                    <ToggleRow
                      id="weeklyDigest"
                      label="Weekly digest"
                      description="A summary of what you missed, once a week."
                      checked={preferences.weeklyDigest}
                      disabled={savingPushPref}
                      onChange={(checked) => saveNotificationPreference('weeklyDigest', checked)}
                    />
                  </div>
                </SettingsSection>

                <SettingsSection
                  title="Push"
                  description={
                    push.isSupported
                      ? 'Notifications on this device, in the browser or the installed app.'
                      : 'Not supported in this browser. Use a modern browser or install the app.'
                  }
                >
                  <div className="divide-y divide-border">
                    <ToggleRow
                      id="pushNotifications"
                      label="Push notifications"
                      description={push.error || 'Turn this on to choose what you receive.'}
                      descriptionTone={push.error ? 'error' : 'muted'}
                      checked={preferences.pushNotifications || push.isSubscribed}
                      disabled={!push.isSupported || push.isLoading}
                      onChange={async (checked) => {
                        if (!push.isSupported) return
                        setPreferences((p) => ({ ...p, pushNotifications: checked, ...(checked && { pushFunReminders: true }) }))
                        if (checked) {
                          const ok = await push.subscribe()
                          if (ok) {
                            toast.success('Push notifications enabled')
                            await saveNotificationPreference('pushFunReminders', true)
                          } else {
                            toast.error(push.error || 'Could not enable push notifications')
                          }
                        } else {
                          await push.unsubscribe()
                          toast.success('Push notifications disabled')
                        }
                      }}
                    />

                    {(preferences.pushNotifications || push.isSubscribed) && push.isSupported
                      ? PUSH_TOPICS.map(({ key, label, desc }) => (
                          <ToggleRow
                            key={key}
                            id={key}
                            label={label}
                            description={desc}
                            checked={!!(preferences as Record<string, unknown>)[key]}
                            disabled={savingPushPref}
                            onChange={(checked) => saveNotificationPreference(key, checked)}
                          />
                        ))
                      : null}
                  </div>
                </SettingsSection>

                <SettingsSection
                  title="In-app"
                  description="What can interrupt you while you are using the app."
                >
                  <div className="divide-y divide-border">
                    <ToggleRow
                      id="promotionPopups"
                      label="Featured listing announcements"
                      description="A full-screen card for a sponsored listing, at most once a day. Gift announcements are unaffected."
                      checked={preferences.promotionPopups}
                      disabled={savingPushPref}
                      onChange={(checked) => saveNotificationPreference('promotionPopups', checked)}
                    />
                  </div>
                </SettingsSection>
              </>
            )}

            {/* Privacy */}
            {activeTab === 'privacy' && (
              <SettingsSection title="Visibility" description="Who can see you and what you share.">
                <div className="divide-y divide-border">
                  <ToggleRow
                    id="isPrivate"
                    label="Private account"
                    description="New partners need your approval before they can connect."
                    checked={isPrivate}
                    onChange={(checked) => editField(setIsPrivate)(checked)}
                  />
                  <ToggleRow
                    id="showConnections"
                    label="Show connections"
                    description="Let others see how many partners you have."
                    checked={showConnections}
                    onChange={(checked) => editField(setShowConnections)(checked)}
                  />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Hiding connections only affects the count shown on your profile. Visibility for an
                  individual post is set on that post.
                </p>
              </SettingsSection>
            )}

            {/* Account */}
            {activeTab === 'security' && (
              <>
                <SettingsSection title="Password" description="At least 8 characters, with an uppercase letter, a lowercase letter and a number.">
                  <div className="space-y-4">
                    <SettingsField label="Current password" htmlFor="currentPassword">
                      <Input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="h-11 rounded-xl" />
                    </SettingsField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SettingsField label="New password" htmlFor="newPassword">
                        <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="h-11 rounded-xl" />
                      </SettingsField>
                      <SettingsField label="Confirm new password" htmlFor="confirmPassword">
                        <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="h-11 rounded-xl" />
                      </SettingsField>
                    </div>
                    <Button type="button" onClick={handleChangePassword} disabled={isChangingPassword} className="h-10 rounded-xl">
                      {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                      Update password
                    </Button>
                  </div>
                </SettingsSection>

                {(isAdmin || canPublish || monitors || PARTNER_PROGRAMME_ENABLED) && (
                  <SettingsSection title="Your access" description="Where else this account can take you.">
                    <div className="space-y-2">
                      {isAdmin && (
                        <AccessRow
                          icon={Shield}
                          title="Admin Hub"
                          description="Manage content, users and platform settings."
                          href="/dashboard/admin"
                          cta="Open"
                        />
                      )}
                      {canAccessMonitorPortal(user?.role) && (
                        <AccessRow
                          icon={Eye}
                          title="Monitor"
                          description={
                            monitors
                              ? "View the listings assigned to you and how they are performing."
                              : "Read any monitor's view, or the listings assigned to you."
                          }
                          href="/dashboard/monitor"
                          cta="Open"
                        />
                      )}
                      {canPublish ? (
                        <AccessRow
                          icon={Crown}
                          title="Provider Hub"
                          description="You can publish content. Manage posts and promotions."
                          href="/dashboard/provider"
                          cta="Open"
                        />
                      ) : PARTNER_PROGRAMME_ENABLED && !monitors ? (
                        /* Not offered to monitors: the roles are mutually
                           exclusive, so taking this would cost them the
                           assignments they are here for. */
                        <AccessRow
                          icon={Crown}
                          title="Founder Batch"
                          description="Publish your own opportunities, events and jobs. 80,000 NGN for 12 months."
                          href="/founder-batch"
                          cta="Join"
                        />
                      ) : null}
                    </div>
                  </SettingsSection>
                )}

                <SettingsSection title="Two-factor authentication" description="An extra step when signing in.">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Not available yet.</p>
                    <Button variant="outline" className="h-10 rounded-xl" disabled>
                      Enable 2FA
                    </Button>
                  </div>
                </SettingsSection>

                <SettingsSection title="Session">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Sign out</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">You can sign back in anytime.</p>
                    </div>
                    <Button variant="outline" onClick={logout} className="h-10 rounded-xl">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </SettingsSection>

                {/* Destructive actions live last, alone, and clearly marked */}
                <section className="rounded-2xl border border-red-500/30 bg-red-500/[0.03]">
                  <div className="border-b border-red-500/20 px-5 py-4">
                    <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger zone</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">This cannot be undone.</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Delete account</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Permanently removes your profile, saved items and history.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="h-10 rounded-xl border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    >
                      {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Delete account
                    </Button>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
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

    </PageShell>
  )
}
