"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import { AuthRequiredCard } from '@/components/auth-required-card'
import ApiClient from "@/lib/api-client"
import { getPostingLimit } from "@/lib/posting-limits"
import { ProviderShell, providerTabForPath, PROVIDER_NAV_ROUTES } from '@/components/provider/provider-shell'
import {
  Panel,
  EmptyState,
  Field,
  SegmentedTabs,
  ErrorBanner,
  ProviderLoading,
} from '@/components/provider/provider-ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Building2,
  Mail,
  Shield,
  CheckCircle2,
  Edit,
  Edit3,
  User,
  Palette,
  Save,
  Trash2,
  AlertCircle,
  LayoutDashboard,
  Loader2,
  ArrowRight,
  KeyRound,
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

type SettingsTab = 'overview' | 'profile' | 'organization' | 'preferences' | 'security'

const INPUT_CLASS = "h-11 rounded-xl border-border bg-muted/60 text-foreground placeholder:text-muted-foreground"

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </Label>
  )
}

export default function ProviderSettings() {
  const { user, isAuthenticated, profile, logout, updateProfile, updateUser, refreshUser, isLoading: authLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const router = useRouter()
  const pathname = usePathname()

  const [onboardingData, setOnboardingData] = useState<ProviderOnboardingData | null>(null)
  const [postingCount, setPostingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  // Password change
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '' })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

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

  // Preferences (local only — there is no preferences endpoint yet)
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
    if (!isAuthenticated && !authLoading) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  // Load provider onboarding data + posting count (so the sidebar quota is real)
  const loadProviderData = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setLoading(true)
      setError(null)

      const [response, count] = await Promise.all([
        ApiClient.getProviderOnboarding(),
        ApiClient.getMyPostingCount().catch(() => ({ total: 0 })),
      ])
      setOnboardingData(response.onboarding)
      setPostingCount(count.total ?? 0)
    } catch (error: any) {
      console.error('Error loading provider data:', error)
      setError(error.message || 'Failed to load provider data')
      toast.error('Failed to load provider settings')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      loadProviderData()
    }
  }, [isAuthenticated, loadProviderData])

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

  const handleChangePassword = async () => {
    const { current, next } = passwordForm
    if (!current || !next) {
      toast.error('Enter both your current and new password')
      return
    }
    if (next.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (current === next) {
      toast.error('Your new password must be different from the current one')
      return
    }

    setIsChangingPassword(true)
    try {
      await ApiClient.changePassword(current, next)
      setPasswordForm({ current: '', next: '' })
      toast.success('Password updated successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password. Please try again.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmMessage = 'Are you sure you want to delete your account? This will permanently delete:\n\n' +
      '• Your profile and preferences\n' +
      '• All saved opportunities, events, jobs, and resources\n' +
      '• All liked content\n' +
      '• All application history\n' +
      '• All promotions and provider data\n' +
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
        window.location.href = '/'
      }, 2000)

    } catch (error: any) {
      console.error('Delete account error:', error)
      toast.error(error.message || 'Failed to delete account. Please try again.')
      setIsDeletingAccount(false)
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

  if (authLoading || loading) {
    return <ProviderLoading label="Loading provider settings..." />
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredCard
        title="Authentication required"
        description="Please log in to access provider settings."
        icon={AlertCircle}
        signInLabel="Go to login"
      />
    )
  }

  const settingsTabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  const providerTypeLabel = onboardingData
    ? `${getProviderTypeLabel(onboardingData.providerType)}${onboardingData.otherProviderType ? ` — ${onboardingData.otherProviderType}` : ''}`
    : ''

  return (
    <ProviderShell
      user={user}
      profile={profile}
      activeTab={providerTabForPath(pathname)}
      onTabChange={(tab) => router.push(PROVIDER_NAV_ROUTES[tab])}
      title="Settings"
      totalPostings={postingCount}
      postingLimit={getPostingLimit(user?.role)}
      onRefresh={() => loadProviderData()}
      refreshing={loading}
    >
      <SegmentedTabs items={settingsTabs} value={activeTab} onChange={setActiveTab} />

      {error && <ErrorBanner message={error} onRetry={() => loadProviderData()} />}

      {/* ---------------- Overview ---------------- */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel icon={CheckCircle2} title="Onboarding" subtitle="Verification progress" className="lg:col-span-1">
            {onboardingData ? (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Completion</span>
                    <span className="text-body font-bold tabular-nums text-foreground">{onboardingData.completionPercentage}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${onboardingData.completionPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2.5 border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body-sm text-muted-foreground">Status</span>
                    <Badge
                      className={cn(
                        "rounded-md px-1.5 py-0 text-[10px] font-semibold",
                        onboardingData.isCompleted
                          ? "border border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "border border-amber-500/25 bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {onboardingData.isCompleted ? 'Completed' : 'In progress'}
                    </Badge>
                  </div>
                  {onboardingData.completedAt && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="shrink-0 text-body-sm text-muted-foreground">Completed</span>
                      <span className="text-right text-xs font-medium text-foreground">{formatDate(onboardingData.completedAt)}</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <span className="shrink-0 text-body-sm text-muted-foreground">Last updated</span>
                    <span className="text-right text-xs font-medium text-foreground">{formatDate(onboardingData.updatedAt)}</span>
                  </div>
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="min-h-11 w-full rounded-xl border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Link href="/dashboard/provider/onboarding">
                    <Edit className="mr-2 h-4 w-4" />
                    {onboardingData.isCompleted ? 'View onboarding' : 'Continue onboarding'}
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={AlertCircle}
                title="No onboarding data"
                description="Set up your organization to unlock publishing."
                ctaHref="/dashboard/provider/onboarding"
                ctaLabel="Start onboarding"
              />
            )}
          </Panel>

          <Panel
            icon={Building2}
            title="Organization"
            subtitle="At a glance"
            className="lg:col-span-2"
            action={
              onboardingData ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('organization')}
                  className="h-8 shrink-0 rounded-lg px-2 text-xs text-primary hover:bg-primary/10"
                >
                  Full details
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              ) : undefined
            }
            bodyClassName={onboardingData ? undefined : "p-0"}
          >
            {onboardingData ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
                  <Building2 className="h-7 w-7 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-lg font-semibold text-foreground">{onboardingData.organizationName}</p>
                  <p className="mt-0.5 truncate text-body-sm text-muted-foreground">{providerTypeLabel}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{onboardingData.officialEmail}</span>
                    </span>
                    {onboardingData.isRegistered ? (
                      <Badge className="rounded-md border border-emerald-500/25 bg-emerald-500/15 px-1.5 py-0 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Registered
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No organization data"
                description="Complete your provider onboarding to see organization details here."
                ctaHref="/dashboard/provider/onboarding"
                ctaLabel="Complete onboarding"
              />
            )}
          </Panel>
        </div>
      )}

      {/* ---------------- Profile ---------------- */}
      {activeTab === 'profile' && (
        <Panel
          icon={User}
          title="Profile information"
          subtitle="Your personal details and location"
          action={
            !isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                className="h-9 shrink-0 rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90"
              >
                <Edit3 className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <div className="flex shrink-0 gap-2">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  className="h-9 rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90"
                >
                  {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input
                  id="firstName"
                  value={userData.firstName}
                  onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                  disabled={!isEditing}
                  className={INPUT_CLASS}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input
                  id="lastName"
                  value={userData.lastName}
                  onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                  disabled={!isEditing}
                  className={INPUT_CLASS}
                  placeholder="Enter your last name"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="email">Email address</FieldLabel>
                <Input id="email" type="email" value={userData.email} disabled className={INPUT_CLASS} />
                <p className="text-[11px] text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={userData.dateOfBirth}
                  onChange={(e) => setUserData({ ...userData, dateOfBirth: e.target.value })}
                  disabled={!isEditing}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-border/50 pt-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Location</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="country">Country</FieldLabel>
                  <Input
                    id="country"
                    value={profileData.country}
                    onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                    disabled={!isEditing}
                    className={INPUT_CLASS}
                    placeholder="e.g., Nigeria"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="province">Province/State</FieldLabel>
                  <Input
                    id="province"
                    value={profileData.province}
                    onChange={(e) => setProfileData({ ...profileData, province: e.target.value })}
                    disabled={!isEditing}
                    className={INPUT_CLASS}
                    placeholder="e.g., Lagos"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="city">City/Town</FieldLabel>
                  <Input
                    id="city"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    disabled={!isEditing}
                    className={INPUT_CLASS}
                    placeholder="e.g., Ikeja"
                  />
                </div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* ---------------- Organization ---------------- */}
      {activeTab === 'organization' && (
        onboardingData ? (
          <div className="space-y-4">
            <Panel icon={Building2} title="Organization information">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Organization name" value={onboardingData.organizationName} />
                  <Field label="Provider type" value={providerTypeLabel} />
                  <Field label="Contact person" value={onboardingData.contactPersonName} />
                  <Field label="Role" value={onboardingData.contactPersonRole} />
                </div>
                <div className="grid grid-cols-1 gap-3 border-t border-border/50 pt-3">
                  <Field label="Address" value={onboardingData.providerAddress} />
                  <Field label="About organization" value={onboardingData.aboutOrganization} />
                </div>
              </div>
            </Panel>

            <Panel icon={Mail} title="Contact information">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Official email" value={onboardingData.officialEmail} />
                  <Field label="Phone number" value={onboardingData.phoneNumber} />
                  <Field label="State of operation" value={onboardingData.stateOfOperation} />
                  <Field label="Year established" value={onboardingData.yearEstablished} />
                </div>
                {(onboardingData.website || onboardingData.socialMediaHandles) && (
                  <div className="grid grid-cols-1 gap-3 border-t border-border/50 pt-3 sm:grid-cols-2">
                    {onboardingData.website && <Field label="Website" value={onboardingData.website} />}
                    {onboardingData.socialMediaHandles && <Field label="Social media" value={onboardingData.socialMediaHandles} />}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        ) : (
          <Panel bodyClassName="p-0">
            <EmptyState
              icon={Building2}
              title="No organization data"
              description="Complete your provider onboarding to see organization details."
              ctaHref="/dashboard/provider/onboarding"
              ctaLabel="Complete onboarding"
            />
          </Panel>
        )
      )}

      {/* ---------------- Preferences ---------------- */}
      {activeTab === 'preferences' && (
        <div className="space-y-4">
          <Panel icon={Palette} title="Display" subtitle="Language, timezone and theme">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="language">Language</FieldLabel>
                <Select value={preferences.language} onValueChange={(value) => setPreferences({ ...preferences, language: value })}>
                  <SelectTrigger className={INPUT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface">
                    <SelectItem value="en" className="text-foreground">English</SelectItem>
                    <SelectItem value="fr" className="text-foreground">French</SelectItem>
                    <SelectItem value="es" className="text-foreground">Spanish</SelectItem>
                    <SelectItem value="ar" className="text-foreground">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
                <Select value={preferences.timezone} onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}>
                  <SelectTrigger className={INPUT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface">
                    <SelectItem value="Africa/Lagos" className="text-foreground">Africa/Lagos (GMT+1)</SelectItem>
                    <SelectItem value="Africa/Cairo" className="text-foreground">Africa/Cairo (GMT+2)</SelectItem>
                    <SelectItem value="Africa/Johannesburg" className="text-foreground">Africa/Johannesburg (GMT+2)</SelectItem>
                    <SelectItem value="UTC" className="text-foreground">UTC (GMT+0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="theme">Theme</FieldLabel>
                <Select value={preferences.theme} onValueChange={(value) => setPreferences({ ...preferences, theme: value })}>
                  <SelectTrigger className={INPUT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface">
                    <SelectItem value="light" className="text-foreground">Light</SelectItem>
                    <SelectItem value="dark" className="text-foreground">Dark</SelectItem>
                    <SelectItem value="auto" className="text-foreground">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Panel>

          <Panel icon={Mail} title="Notifications" subtitle="What lands in your inbox">
            <div className="divide-y divide-border/50">
              {[
                { key: 'emailNotifications' as const, label: 'Email notifications', desc: 'Receive notifications via email' },
                { key: 'marketingEmails' as const, label: 'Marketing emails', desc: 'Receive promotional and marketing emails' },
                { key: 'weeklyDigest' as const, label: 'Weekly digest', desc: 'Receive a weekly summary of activities' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={preferences[item.key]}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, [item.key]: checked })}
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* ---------------- Security ---------------- */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <Panel icon={KeyRound} title="Change password">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
                  <Input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    placeholder="Enter current password"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.next}
                    onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                    placeholder="At least 8 characters"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="min-h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </div>
          </Panel>

          <Panel icon={Shield} title="Two-factor authentication">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-foreground">Add an extra layer of security</p>
                <p className="text-[11px] text-muted-foreground">Require a second factor when signing in to your account.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => toast.info('Two-factor authentication is coming soon.')}
                className="min-h-11 w-full shrink-0 rounded-xl border-primary/30 text-primary hover:bg-primary/10 sm:w-auto"
              >
                Enable 2FA
              </Button>
            </div>
          </Panel>

          <Panel icon={AlertCircle} title="Danger zone" className="border-red-500/25">
            <div className="flex flex-col gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-red-500 dark:text-red-400">Delete account</p>
                <p className="text-[11px] text-red-500/80 dark:text-red-400/80">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </div>
              <Button
                variant="outline"
                className="min-h-11 w-full shrink-0 rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10 dark:text-red-400 sm:w-auto"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete account
                  </>
                )}
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </ProviderShell>
  )
}
