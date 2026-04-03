"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import { AuthRequiredCard } from '@/components/auth-required-card'
import ApiClient from "@/lib/api-client"
import ProviderDashboardSidebar from '@/components/provider/provider-dashboard-sidebar'
import ProviderDashboardBottomNav from '@/components/provider/provider-dashboard-bottom-nav'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
  AlertCircle,
  Home,
  Menu,
  X,
  LayoutDashboard,
  Activity,
  RefreshCw,
  Crown,
  Loader2,
  Plus,
  Zap,
  MoreVertical
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
  const { user, isAuthenticated, profile, logout, updateProfile, updateUser, refreshUser, isLoading: authLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const router = useRouter()
  const pathname = usePathname()
  
  // State management
  const [onboardingData, setOnboardingData] = useState<ProviderOnboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'organization' | 'preferences' | 'security'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

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
    if (!isAuthenticated && !authLoading) {
      router.push('/login')
      return
    }
  }, [isAuthenticated, authLoading, router])

  // Load provider onboarding data
  const loadProviderData = useCallback(async () => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading provider settings...</p>
        </div>
      </div>
    )
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

  const settingsTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard/provider/settings' },
    { id: 'profile', label: 'Profile', icon: User, href: '/dashboard/provider/settings' },
    { id: 'organization', label: 'Organization', icon: Building2, href: '/dashboard/provider/settings' },
    { id: 'preferences', label: 'Preferences', icon: Palette, href: '/dashboard/provider/settings' },
    { id: 'security', label: 'Security', icon: Shield, href: '/dashboard/provider/settings' },
  ]

  const quickLinks = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard/provider', variant: 'outline' as const },
    { label: 'Post Content', icon: Plus, href: '/dashboard/provider/posting', variant: 'default' as const },
    { label: 'Promotions', icon: Zap, href: '/dashboard/provider/promotions', variant: 'outline' as const },
    { label: 'Home', icon: Home, href: '/', variant: 'outline' as const },
  ]
  const providerNavItems = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'content' as const, label: 'Content', icon: FileText },
    { id: 'promotions' as const, label: 'Promotions', icon: Zap },
    { id: 'analytics' as const, label: 'Analytics', icon: Settings },
  ]
  const providerNavRouteMap = {
    overview: '/dashboard/provider',
    content: '/dashboard/provider/posting',
    promotions: '/dashboard/provider/promotions',
    analytics: '/dashboard/provider/settings',
  }
  const activeProviderTab: 'overview' | 'content' | 'promotions' | 'analytics' =
    pathname?.startsWith('/dashboard/provider/settings') ? 'analytics' : 'overview'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.16),transparent_58%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.08),transparent_55%)] font-sans flex">
      <ProviderDashboardSidebar
        user={user as any}
        profile={profile as any}
        navItems={providerNavItems}
        quickLinks={quickLinks}
        activeTab={activeProviderTab}
        onTabChange={(tab) => router.push(providerNavRouteMap[tab])}
        totalPostings={0}
        postingLimit={20}
        hasPremium
      />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 bg-page/80 backdrop-blur-xl border-b border-border/70">
          <div className="flex items-center justify-between h-14 px-4 pt-[max(0rem,env(safe-area-inset-top))]">
            <div>
              <p className="text-overline uppercase tracking-[0.14em] text-muted-foreground">Provider workspace</p>
              <h1 className="text-body font-semibold text-foreground">Settings</h1>
            </div>
            <Button onClick={() => loadProviderData()} variant="ghost" size="sm" disabled={loading} className="h-9 w-9 p-0 text-muted-foreground">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
            <div className="mb-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {settingsTabs.map((item) => {
                  const Icon = item.icon
                  const active = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={cn(
                        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-body-sm font-semibold transition-all",
                        active
                          ? "border-primary/30 bg-primary/12 text-primary"
                          : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Error Message */}
            {error && (
              <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-red-400 break-words">{error}</p>
                </div>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                  {/* Progress Card */}
                  <div className="lg:col-span-1">
                    <Card className="border border-border bg-card">
                      <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                        <CardTitle className="flex items-center gap-2 text-foreground text-base md:text-lg">
                          <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                          Onboarding Progress
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 pt-0 space-y-4">
                        {onboardingData ? (
                          <>
                            <div>
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Completion</span>
                                <span className="font-medium text-foreground">{onboardingData.completionPercentage}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${onboardingData.completionPercentage}%` }}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <Badge className={cn(
                                  "text-xs",
                                  onboardingData.isCompleted 
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                )}>
                                  {onboardingData.isCompleted ? 'Completed' : 'In Progress'}
                                </Badge>
                              </div>
                              
                              {onboardingData.completedAt && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Completed</span>
                                  <span className="font-medium text-foreground text-xs">{formatDate(onboardingData.completedAt)}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Last Updated</span>
                                <span className="font-medium text-foreground text-xs">{formatDate(onboardingData.updatedAt)}</span>
                              </div>
                            </div>

                            <Button 
                              asChild 
                              variant="outline" 
                              className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <Link href="/dashboard/provider/onboarding">
                                <Edit className="h-4 w-4 mr-2" />
                                {onboardingData.isCompleted ? 'View Onboarding' : 'Continue Onboarding'}
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground mb-4">No onboarding data found</p>
                            <Button 
                              asChild 
                              className="bg-primary hover:bg-primary/90 rounded-xl"
                            >
                              <Link href="/dashboard/provider/onboarding">
                                Start Onboarding
                              </Link>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Organization Summary */}
                  <div className="lg:col-span-2">
                    <Card className="border border-border bg-card">
                      <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                        <CardTitle className="flex items-center gap-2 text-foreground text-base md:text-lg">
                          <Building2 className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                          Organization Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 pt-0">
                        {onboardingData ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs md:text-sm font-medium text-muted-foreground">Organization Name</label>
                                <p className="text-foreground font-medium mt-1">{onboardingData.organizationName}</p>
                              </div>
                              <div>
                                <label className="text-xs md:text-sm font-medium text-muted-foreground">Provider Type</label>
                                <p className="text-foreground font-medium mt-1">
                                  {getProviderTypeLabel(onboardingData.providerType)}
                                  {onboardingData.otherProviderType && ` - ${onboardingData.otherProviderType}`}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs md:text-sm font-medium text-muted-foreground">Contact Person</label>
                                <p className="text-foreground font-medium mt-1">{onboardingData.contactPersonName}</p>
                              </div>
                              <div>
                                <label className="text-xs md:text-sm font-medium text-muted-foreground">Email</label>
                                <p className="text-foreground font-medium mt-1">{onboardingData.officialEmail}</p>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-xs md:text-sm font-medium text-muted-foreground">About Organization</label>
                              <p className="text-foreground mt-1 text-sm md:text-base">{onboardingData.aboutOrganization}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 md:py-12">
                            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">No organization data available</p>
                            <Button 
                              asChild 
                              className="bg-primary hover:bg-primary/90 rounded-xl"
                            >
                              <Link href="/dashboard/provider/onboarding">
                                Complete Onboarding
                              </Link>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4 md:space-y-6">
                <Card className="border border-border bg-card">
                  <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                    <CardTitle className="flex items-center gap-2 text-foreground text-base md:text-lg">
                      <User className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="space-y-6">
                      {/* Personal Information */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-muted-foreground">First Name</Label>
                          <Input
                            id="firstName"
                            value={userData.firstName}
                            onChange={(e) => setUserData({...userData, firstName: e.target.value})}
                            disabled={!isEditing}
                            className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            placeholder="Enter your first name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-muted-foreground">Last Name</Label>
                          <Input
                            id="lastName"
                            value={userData.lastName}
                            onChange={(e) => setUserData({...userData, lastName: e.target.value})}
                            disabled={!isEditing}
                            className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            placeholder="Enter your last name"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={userData.email}
                            disabled
                            className="h-11 bg-muted border-border text-muted-foreground"
                          />
                          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth" className="text-muted-foreground">Date of Birth</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={userData.dateOfBirth}
                            onChange={(e) => setUserData({...userData, dateOfBirth: e.target.value})}
                            disabled={!isEditing}
                            className="h-11 bg-muted border-border text-foreground"
                          />
                        </div>
                      </div>

                      {/* Location Information */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-foreground">Location Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="country" className="text-muted-foreground">Country</Label>
                            <Input
                              id="country"
                              value={profileData.country}
                              onChange={(e) => setProfileData({...profileData, country: e.target.value})}
                              disabled={!isEditing}
                              className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                              placeholder="e.g., Nigeria"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="province" className="text-muted-foreground">Province/State</Label>
                            <Input
                              id="province"
                              value={profileData.province}
                              onChange={(e) => setProfileData({...profileData, province: e.target.value})}
                              disabled={!isEditing}
                              className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                              placeholder="e.g., Lagos"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="city" className="text-muted-foreground">City/Town</Label>
                            <Input
                              id="city"
                              value={profileData.city}
                              onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                              disabled={!isEditing}
                              className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                              placeholder="e.g., Ikeja"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                        {!isEditing ? (
                          <Button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary/90 rounded-xl w-full sm:w-auto">
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        ) : (
                          <>
                            <Button onClick={handleCancel} variant="outline" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl w-full sm:w-auto">
                              Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 rounded-xl w-full sm:w-auto">
                              {isSaving ? (
                                <div className="flex items-center space-x-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
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
              <div className="space-y-4 md:space-y-6">
                {onboardingData ? (
                  <>
                    {/* Organization Information */}
                    <Card className="border border-border bg-card">
                      <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                        <CardTitle className="flex items-center gap-2 text-foreground text-base md:text-lg">
                          <Building2 className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                          Organization Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 pt-0 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs md:text-sm font-medium text-muted-foreground">Organization Name</label>
                            <p className="text-foreground font-medium mt-1">{onboardingData.organizationName}</p>
                          </div>
                          <div>
                            <label className="text-xs md:text-sm font-medium text-muted-foreground">Provider Type</label>
                            <p className="text-foreground font-medium mt-1">
                              {getProviderTypeLabel(onboardingData.providerType)}
                              {onboardingData.otherProviderType && ` - ${onboardingData.otherProviderType}`}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs md:text-sm font-medium text-muted-foreground">Contact Person</label>
                            <p className="text-foreground font-medium mt-1">{onboardingData.contactPersonName}</p>
                          </div>
                          <div>
                            <label className="text-xs md:text-sm font-medium text-muted-foreground">Role</label>
                            <p className="text-foreground font-medium mt-1">{onboardingData.contactPersonRole}</p>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs md:text-sm font-medium text-muted-foreground">Address</label>
                          <p className="text-foreground mt-1">{onboardingData.providerAddress}</p>
                        </div>
                        
                        <div>
                          <label className="text-xs md:text-sm font-medium text-muted-foreground">About Organization</label>
                          <p className="text-foreground mt-1">{onboardingData.aboutOrganization}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card className="border border-border bg-card">
                      <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                        <CardTitle className="flex items-center gap-2 text-foreground text-base md:text-lg">
                          <Mail className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 pt-0 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs md:text-sm font-medium text-muted-foreground">Official Email</label>
                            <p className="text-foreground font-medium mt-1">{onboardingData.officialEmail}</p>
                          </div>
                          <div>
                            <label className="text-xs md:text-sm font-medium text-muted-foreground">Phone Number</label>
                            <p className="text-foreground font-medium mt-1">{onboardingData.phoneNumber}</p>
                          </div>
                          <div>
                            <label className="text-xs md:text-sm font-medium text-muted-foreground">State of Operation</label>
                            <p className="text-foreground font-medium mt-1">{onboardingData.stateOfOperation}</p>
                          </div>
                          <div>
                            <label className="text-xs md:text-sm font-medium text-muted-foreground">Year Established</label>
                            <p className="text-foreground font-medium mt-1">{onboardingData.yearEstablished}</p>
                          </div>
                        </div>
                        
                        {(onboardingData.website || onboardingData.socialMediaHandles) && (
                          <>
                            <Separator className="bg-muted" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {onboardingData.website && (
                                <div>
                                  <label className="text-xs md:text-sm font-medium text-muted-foreground">Website</label>
                                  <p className="text-foreground font-medium mt-1">{onboardingData.website}</p>
                                </div>
                              )}
                              {onboardingData.socialMediaHandles && (
                                <div>
                                  <label className="text-xs md:text-sm font-medium text-muted-foreground">Social Media</label>
                                  <p className="text-foreground font-medium mt-1">{onboardingData.socialMediaHandles}</p>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="border border-border bg-card">
                    <CardContent className="p-4 md:p-6 text-center py-12">
                      <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">No Organization Data</h3>
                      <p className="text-sm text-muted-foreground mb-6">Complete your provider onboarding to see organization details.</p>
                      <Button 
                        asChild 
                        className="bg-primary hover:bg-primary/90 rounded-xl"
                      >
                        <Link href="/dashboard/provider/onboarding">
                          Complete Onboarding
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-4 md:space-y-6">
                <Card className="border border-border bg-card">
                  <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                    <CardTitle className="flex items-center gap-2 text-foreground text-base md:text-lg">
                      <Palette className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                      Account Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="language" className="text-muted-foreground">Language</Label>
                          <Select value={preferences.language} onValueChange={(value) => setPreferences({...preferences, language: value})}>
                            <SelectTrigger className="h-11 bg-muted border-border text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-border">
                              <SelectItem value="en" className="text-foreground">English</SelectItem>
                              <SelectItem value="fr" className="text-foreground">French</SelectItem>
                              <SelectItem value="es" className="text-foreground">Spanish</SelectItem>
                              <SelectItem value="ar" className="text-foreground">Arabic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="timezone" className="text-muted-foreground">Timezone</Label>
                          <Select value={preferences.timezone} onValueChange={(value) => setPreferences({...preferences, timezone: value})}>
                            <SelectTrigger className="h-11 bg-muted border-border text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-border">
                              <SelectItem value="Africa/Lagos" className="text-foreground">Africa/Lagos (GMT+1)</SelectItem>
                              <SelectItem value="Africa/Cairo" className="text-foreground">Africa/Cairo (GMT+2)</SelectItem>
                              <SelectItem value="Africa/Johannesburg" className="text-foreground">Africa/Johannesburg (GMT+2)</SelectItem>
                              <SelectItem value="UTC" className="text-foreground">UTC (GMT+0)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="theme" className="text-muted-foreground">Theme</Label>
                        <Select value={preferences.theme} onValueChange={(value) => setPreferences({...preferences, theme: value})}>
                          <SelectTrigger className="h-11 bg-muted border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-surface border-border">
                            <SelectItem value="light" className="text-foreground">Light</SelectItem>
                            <SelectItem value="dark" className="text-foreground">Dark</SelectItem>
                            <SelectItem value="auto" className="text-foreground">Auto (System)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-border">
                        <h4 className="font-medium text-foreground">Notification Preferences</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">Email Notifications</p>
                              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                            </div>
                            <Switch
                              checked={preferences.emailNotifications}
                              onCheckedChange={(checked) => setPreferences({...preferences, emailNotifications: checked})}
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
              <div className="space-y-4 md:space-y-6">
                <Card className="border border-border bg-card">
                  <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                    <CardTitle className="flex items-center gap-2 text-foreground text-base md:text-lg">
                      <Shield className="h-4 w-4 md:h-5 md:w-5 text-orange-400" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-foreground">Change Password</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword" className="text-muted-foreground">Current Password</Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              placeholder="Enter current password"
                              className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-muted-foreground">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              placeholder="Enter new password"
                              className="h-11 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                        </div>
                        <Button className="bg-primary hover:bg-primary/90 rounded-xl">
                          Update Password
                        </Button>
                      </div>

                      <div className="border-t border-border pt-6">
                        <h4 className="font-medium text-foreground mb-4">Two-Factor Authentication</h4>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted rounded-xl border border-border">
                          <div>
                            <p className="font-medium text-foreground">Two-Factor Authentication</p>
                            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                          </div>
                          <Button variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-primary/10 rounded-xl w-full sm:w-auto">
                            Enable 2FA
                          </Button>
                        </div>
                      </div>

                      <div className="border-t border-border pt-6">
                        <h4 className="font-medium text-foreground mb-4">Danger Zone</h4>
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                          <h5 className="font-medium text-red-400 mb-2">Delete Account</h5>
                          <p className="text-sm text-red-400/80 mb-4">
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
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>

        <ProviderDashboardBottomNav
          navItems={providerNavItems}
          activeTab={activeProviderTab}
          onTabChange={(tab) => router.push(providerNavRouteMap[tab])}
        />
      </div>
    </div>
  )
}
