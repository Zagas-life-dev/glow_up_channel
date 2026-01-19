"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { usePlaylist } from '@/contexts/playlist-context'
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'
import EditProfileModal from '@/components/edit-profile-modal'
import PostCard from '@/components/post-card'
import ConnectionRequestsModal from '@/components/connection-requests-modal'
import ConnectionsListModal from '@/components/connections-list-modal'
import ProfileSkeleton from '@/components/skeletons/profile-skeleton'
import {
  User,
  Link as LinkIcon,
  Briefcase,
  GraduationCap,
  Calendar,
  Edit3,
  Settings,
  MoreHorizontal,
  UserPlus,
  UserCheck,
  Clock,
  Lock,
  Globe,
  ListMusic,
  Bookmark,
  FileText,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Shield,
  Sparkles,
  Check,
  X,
  ChevronRight,
  MapPin,
  Target,
  Building2,
  Lightbulb,
  TrendingUp,
  Crown,
  BookOpen
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

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
  _id: string
  email: string
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
  role: string
  createdAt: string
  followingCount: number | null
  followersCount: number | null
  postCount: number
  playlistCount: number
  onboarding: OnboardingData | null
}

interface ConnectionStatus {
  isFollowing: boolean
  isPending: boolean
  followsYou: boolean
}

interface Post {
  _id: string
  author: {
    _id: string
    firstName: string
    email: string
    profileImage?: string
  }
  content: {
    text: string
    images: { url: string; publicId?: string }[]
    playlist?: {
      _id: string
      name: string
      description: string
      itemCount: number
      items: { _id: string; title: string; contentType: string }[]
    }
  }
  hashtags: string[]
  mentions: { userId: string; username: string }[]
  visibility: 'public' | 'private'
  likeCount: number
  replyCount: number
  repostCount: number
  bookmarkCount: number
  isRepost: boolean
  originalPost?: string
  repostedBy?: { _id: string; email: string; firstName?: string }
  createdAt: string
  updatedAt: string
  isEdited: boolean
  hasLiked?: boolean
  hasBookmarked?: boolean
  hasReposted?: boolean
}

interface Playlist {
  _id: string
  name: string
  description: string
  hashtags: string[]
  isPublic: boolean
  itemCount: number
  createdAt: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

// Social link config
const socialConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  linkedin: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    color: 'hover:text-[#0A66C2]',
    label: 'LinkedIn'
  },
  twitter: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    color: 'hover:text-white',
    label: 'X'
  },
  instagram: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
    color: 'hover:text-[#E4405F]',
    label: 'Instagram'
  },
  github: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
    color: 'hover:text-white',
    label: 'GitHub'
  },
  youtube: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    color: 'hover:text-[#FF0000]',
    label: 'YouTube'
  },
  tiktok: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
    color: 'hover:text-white',
    label: 'TikTok'
  },
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser, isAuthenticated, upgradeToProvider } = useAuth()
  const { savedPlaylists, fetchSavedPlaylists } = usePlaylist()
  const userId = params.id as string
  const [isUpgrading, setIsUpgrading] = useState(false)

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tabs data
  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState<Post[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [bookmarks, setBookmarks] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [loadingBookmarks, setLoadingBookmarks] = useState(false)

  // Profile completion (only for own profile)
  const [completionPercentage, setCompletionPercentage] = useState(0)
  const [loadingCompletion, setLoadingCompletion] = useState(false)

  // Modals
  const [showEditModal, setShowEditModal] = useState(false)
  const [showConnectionRequests, setShowConnectionRequests] = useState(false)
  const [showConnectionsList, setShowConnectionsList] = useState<'followers' | 'following' | null>(null)
  
  // Connection action
  const [connectLoading, setConnectLoading] = useState(false)

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }, [])

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()

      if (data.success) {
        setProfile(data.data.profile)
        setIsOwner(data.data.isOwner)
        setConnectionStatus(data.data.connectionStatus)
      } else {
        setError(data.message || 'Failed to load profile')
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }, [userId, getAuthHeaders])

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}/posts?page=1&limit=50`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setPosts(data.data.posts)
      }
    } catch (err) {
      console.error('Error fetching posts:', err)
    } finally {
      setLoadingPosts(false)
    }
  }, [userId, getAuthHeaders])

  // Fetch playlists
  const fetchPlaylists = useCallback(async () => {
    setLoadingPlaylists(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}/playlists?page=1&limit=50`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setPlaylists(data.data.playlists)
      }
    } catch (err) {
      console.error('Error fetching playlists:', err)
    } finally {
      setLoadingPlaylists(false)
    }
  }, [userId, getAuthHeaders])

  // Fetch bookmarks (owner only)
  const fetchBookmarks = useCallback(async () => {
    if (!isOwner) return
    
    setLoadingBookmarks(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/me/bookmarks?page=1&limit=50`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setBookmarks(data.data.posts)
      }
    } catch (err) {
      console.error('Error fetching bookmarks:', err)
    } finally {
      setLoadingBookmarks(false)
    }
  }, [isOwner, getAuthHeaders])

  // Calculate profile completion percentage
  const calculateProfileCompletion = useCallback((profileData: ProfileData | null): number => {
    if (!profileData) return 0
    
    const fields = [
      profileData.firstName,
      profileData.bio,
      profileData.headline,
      profileData.onboarding?.country,
      profileData.onboarding?.province,
      profileData.onboarding?.careerStage,
      profileData.onboarding?.educationLevel,
      profileData.onboarding?.interests?.length > 0,
      profileData.onboarding?.industrySectors?.length > 0,
      profileData.onboarding?.aspirations?.length > 0,
      profileData.onboarding?.onboardingSkills?.length > 0
    ]
    
    const completedFields = fields.filter(field => {
      if (typeof field === 'boolean') return field
      if (Array.isArray(field)) return field.length > 0
      return field && field !== ''
    }).length
    
    return Math.round((completedFields / fields.length) * 100)
  }, [])

  // Fetch profile completion (only for own profile)
  const fetchProfileCompletion = useCallback(async () => {
    if (!isOwner || !profile) return
    
    setLoadingCompletion(true)
    try {
      const percentage = calculateProfileCompletion(profile)
      setCompletionPercentage(percentage)
    } catch (err) {
      console.error('Error calculating profile completion:', err)
    } finally {
      setLoadingCompletion(false)
    }
  }, [isOwner, profile, calculateProfileCompletion])

  // Handle connect/disconnect
  const handleConnect = async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    setConnectLoading(true)
    try {
      if (connectionStatus?.isFollowing || connectionStatus?.isPending) {
        const response = await fetch(`${API_BASE_URL}/api/connections/${userId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
        const data = await response.json()
        if (data.success) {
          setConnectionStatus({ ...connectionStatus, isFollowing: false, isPending: false })
          if (profile && profile.followersCount !== null) {
            setProfile({ ...profile, followersCount: profile.followersCount - 1 })
          }
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/api/connections/${userId}`, {
          method: 'POST',
          headers: getAuthHeaders()
        })
        const data = await response.json()
        if (data.success) {
          if (profile?.isPrivate) {
            setConnectionStatus({ ...connectionStatus!, isFollowing: false, isPending: true })
          } else {
            setConnectionStatus({ ...connectionStatus!, isFollowing: true, isPending: false })
            if (profile && profile.followersCount !== null) {
              setProfile({ ...profile, followersCount: profile.followersCount + 1 })
            }
          }
        }
      }
    } catch (err) {
      console.error('Error updating connection:', err)
    } finally {
      setConnectLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Fetch profile completion when profile is loaded and user is owner
  useEffect(() => {
    if (isOwner && profile) {
      fetchProfileCompletion()
    }
  }, [isOwner, profile, fetchProfileCompletion])

  // Fetch tab data when tab changes
  useEffect(() => {
    if (activeTab === 'posts' && posts.length === 0) {
      fetchPosts()
    } else if (activeTab === 'playlists' && playlists.length === 0) {
      fetchPlaylists()
      if (isOwner && savedPlaylists.length === 0) {
        fetchSavedPlaylists().catch(err => {
          console.error('Error fetching saved playlists for profile:', err)
        })
      }
    } else if (activeTab === 'bookmarks' && bookmarks.length === 0 && isOwner) {
      fetchBookmarks()
    }
  }, [
    activeTab, 
    posts.length, 
    playlists.length, 
    bookmarks.length, 
    isOwner, 
    savedPlaylists.length,
    fetchPosts, 
    fetchPlaylists, 
    fetchBookmarks, 
    fetchSavedPlaylists
  ])

  // Show skeleton immediately while loading
  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Profile Not Found</h2>
          <p className="text-white/50 text-sm mb-6">{error || 'This profile doesn\'t exist or has been removed.'}</p>
          <Button onClick={() => router.back()} variant="outline" className="border-white/10 text-white rounded-full px-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const displayName = profile.firstName 
    ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ''}`
    : profile.email.split('@')[0]

  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  })

  const activeSocialLinks = Object.entries(profile.socialLinks || {}).filter(([_, url]) => url)

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="p-2 -ml-2 rounded-full hover:bg-white/[0.05] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          
          <div className="text-center">
            <h1 className="text-sm font-semibold text-white truncate max-w-[200px]">{displayName}</h1>
            <p className="text-[11px] text-white/40">{profile.postCount} posts</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 -mr-2 rounded-full hover:bg-white/[0.05] transition-colors">
                <MoreHorizontal className="w-5 h-5 text-white/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/[0.08] rounded-xl min-w-[180px]">
              <DropdownMenuItem className="text-white/70 focus:bg-white/[0.05] focus:text-white cursor-pointer rounded-lg">
                Share Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white/70 focus:bg-white/[0.05] focus:text-white cursor-pointer rounded-lg">
                Copy Link
              </DropdownMenuItem>
              {!isOwner && (
                <>
                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                  <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer rounded-lg">
                    Block User
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="flex items-start gap-5 mb-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-2 ring-white/[0.08] ring-offset-2 ring-offset-[#0a0a0a]">
              {profile.profileImage ? (
                <Image 
                  src={profile.profileImage} 
                  alt={displayName} 
                  width={96} 
                  height={96} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 via-orange-600 to-rose-500 flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {profile.isPrivate && (
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#0a0a0a] border-2 border-[#0a0a0a] flex items-center justify-center">
                <Lock className="w-3 h-3 text-white/60" />
              </div>
            )}
          </div>

          {/* Stats */}
          {profile.showConnections && (
            <div className="flex-1 flex items-center justify-around pt-2">
              <div className="text-center">
                <p className="text-lg sm:text-xl font-bold text-white">{profile.postCount}</p>
                <p className="text-xs text-white/40">Posts</p>
              </div>
              <button 
                onClick={() => setShowConnectionsList('followers')}
                className="text-center hover:opacity-70 transition-opacity"
              >
                <p className="text-lg sm:text-xl font-bold text-white">{profile.followersCount ?? 0}</p>
                <p className="text-xs text-white/40">Followers</p>
              </button>
              <button 
                onClick={() => setShowConnectionsList('following')}
                className="text-center hover:opacity-70 transition-opacity"
              >
                <p className="text-lg sm:text-xl font-bold text-white">{profile.followingCount ?? 0}</p>
                <p className="text-xs text-white/40">Following</p>
              </button>
            </div>
          )}
        </div>

        {/* Name & Bio */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-white">{displayName}</h2>
            {profile.role === 'opportunity_poster' && (
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px] font-medium">
                Provider
              </span>
            )}
            {(profile.role === 'admin' || profile.role === 'super_admin') && (
              <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 text-[10px] font-medium flex items-center gap-0.5">
                <Shield className="w-2.5 h-2.5" />
                Admin
              </span>
            )}
          </div>
          
          {profile.headline && (
            <p className="text-sm text-white/60 mb-2">{profile.headline}</p>
          )}
          
          {profile.bio && (
            <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">{profile.bio}</p>
          )}

          {/* Quick Info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-white/40">
            {/* Location from onboarding */}
            {profile.onboarding?.country && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {[profile.onboarding.city, profile.onboarding.province, profile.onboarding.country].filter(Boolean).join(', ')}
              </span>
            )}
            {/* Work info */}
            {profile.work?.company && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {profile.work.title ? `${profile.work.title} @ ${profile.work.company}` : profile.work.company}
              </span>
            )}
            {/* Education from onboarding or profile */}
            {(profile.onboarding?.institution || profile.education?.school) && (
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                {profile.onboarding?.institution || profile.education?.school}
              </span>
            )}
            {/* Career Stage from onboarding */}
            {profile.onboarding?.careerStage && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {profile.onboarding.careerStage}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Joined {memberSince}
            </span>
          </div>

          {/* Website & Social Links */}
          {(profile.website || activeSocialLinks.length > 0) && (
            <div className="flex items-center gap-3 mt-3">
              {profile.website && (
                <a 
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
                >
                  <LinkIcon className="w-3 h-3" />
                  {new URL(profile.website).hostname.replace('www.', '')}
                </a>
              )}
              {activeSocialLinks.map(([platform, url]) => {
                const config = socialConfig[platform]
                if (!config) return null
                return (
                  <a 
                    key={platform}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("text-white/40 transition-colors", config.color)}
                    title={config.label}
                  >
                    {config.icon}
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* Skills (from profile or onboarding) */}
        {(() => {
          const skills = profile.skills?.length > 0 ? profile.skills : profile.onboarding?.onboardingSkills || []
          return skills.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Skills</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.slice(0, 8).map((skill, i) => (
                  <span 
                    key={i}
                    className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs border border-orange-500/20"
                  >
                    {skill}
                  </span>
                ))}
                {skills.length > 8 && (
                  <span className="px-2.5 py-1 text-white/30 text-xs">
                    +{skills.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )
        })()}

        {/* Interests from onboarding */}
        {profile.onboarding?.interests && profile.onboarding.interests.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
              <Target className="w-3 h-3" />
              <span>Interests</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.onboarding.interests.slice(0, 6).map((interest, i) => (
                <span 
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20"
                >
                  {interest}
                </span>
              ))}
              {profile.onboarding.interests.length > 6 && (
                <span className="px-2.5 py-1 text-white/30 text-xs">
                  +{profile.onboarding.interests.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Industry Sectors from onboarding */}
        {profile.onboarding?.industrySectors && profile.onboarding.industrySectors.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
              <Building2 className="w-3 h-3" />
              <span>Industries</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.onboarding.industrySectors.slice(0, 5).map((sector, i) => (
                <span 
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs border border-violet-500/20"
                >
                  {sector}
                </span>
              ))}
              {profile.onboarding.industrySectors.length > 5 && (
                <span className="px-2.5 py-1 text-white/30 text-xs">
                  +{profile.onboarding.industrySectors.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Education Details from onboarding */}
        {profile.onboarding && (profile.onboarding.educationLevel || profile.onboarding.fieldOfStudy) && (
          <div className="mb-5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
              <GraduationCap className="w-3 h-3" />
              <span>Education</span>
            </div>
            <div className="space-y-1">
              {profile.onboarding.educationLevel && (
                <p className="text-sm text-white">{profile.onboarding.educationLevel}</p>
              )}
              {profile.onboarding.fieldOfStudy && (
                <p className="text-xs text-white/50">
                  {profile.onboarding.fieldOfStudy}
                  {profile.onboarding.institution && ` at ${profile.onboarding.institution}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Aspirations from onboarding */}
        {profile.onboarding?.aspirations && profile.onboarding.aspirations.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
              <Lightbulb className="w-3 h-3" />
              <span>Looking for</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.onboarding.aspirations.map((aspiration, i) => (
                <span 
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20"
                >
                  {aspiration}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Profile Completion (only for own profile) */}
        {isOwner && completionPercentage < 100 && (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-white">Profile Completion</span>
              </div>
              <span className="text-sm font-bold text-orange-400">{completionPercentage}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <Link href="/onboarding">
              <Button 
                size="sm" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-8 text-xs"
              >
                Complete Your Profile
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          {isOwner ? (
            <>
              <Button 
                onClick={() => setShowEditModal(true)}
                variant="outline" 
                className="flex-1 border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.06] rounded-xl h-9 text-sm font-medium"
              >
                Edit Profile
              </Button>
              <Link href="/dashboard/settings" className="flex-1">
                <Button 
                  variant="outline" 
                  className="w-full border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.06] rounded-xl h-9 text-sm font-medium"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              {(currentUser?.role === 'opportunity_poster' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') ? (
                <Link href="/dashboard/provider" className="flex-1">
                  <Button 
                    variant="outline" 
                    className="w-full border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-xl h-9 text-sm font-medium"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Provider
                  </Button>
                </Link>
              ) : (
                <Button 
                  onClick={async () => {
                    setIsUpgrading(true)
                    try {
                      await upgradeToProvider(currentUser?.email || '', '')
                      router.push('/dashboard/provider/onboarding')
                    } catch (error: any) {
                      console.error('Upgrade error:', error)
                      // Show upgrade modal or handle error
                    } finally {
                      setIsUpgrading(false)
                    }
                  }}
                  disabled={isUpgrading}
                  variant="outline" 
                  className="flex-1 border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-xl h-9 text-sm font-medium"
                >
                  {isUpgrading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      Become Provider
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button 
                onClick={handleConnect}
                disabled={connectLoading}
                className={cn(
                  "flex-1 rounded-xl h-9 text-sm font-medium transition-all",
                  connectionStatus?.isFollowing 
                    ? "bg-white/[0.08] text-white hover:bg-red-500/20 hover:text-red-400 border border-white/[0.08]"
                    : connectionStatus?.isPending
                    ? "bg-white/[0.08] text-white/60 border border-white/[0.08]"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
                )}
              >
                {connectLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : connectionStatus?.isFollowing ? (
                  'Following'
                ) : connectionStatus?.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-1.5" />
                    Requested
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Follow
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.06] rounded-xl h-9 text-sm font-medium"
              >
                Message
              </Button>
            </>
          )}
        </div>

        {/* Follows You Badge */}
        {!isOwner && connectionStatus?.followsYou && (
          <div className="mb-5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
            <span className="text-xs text-white/50">Follows you</span>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-transparent border-b border-white/[0.06] rounded-none p-0 h-auto">
            <TabsTrigger 
              value="posts" 
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-white text-white/40 pb-3 pt-2 text-sm font-medium"
            >
              <FileText className="w-4 h-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="playlists"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-white text-white/40 pb-3 pt-2 text-sm font-medium"
            >
              <ListMusic className="w-4 h-4 mr-2" />
              Playlists
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger 
                value="bookmarks"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-white text-white/40 pb-3 pt-2 text-sm font-medium"
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Saved
              </TabsTrigger>
            )}
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-4">
            {loadingPosts ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-white/20" />
                </div>
                <p className="font-medium text-white mb-1">No Posts Yet</p>
                <p className="text-sm text-white/40 max-w-xs mx-auto">
                  {isOwner ? "Share your first post and start connecting!" : "This user hasn't shared any posts yet."}
                </p>
                {isOwner && (
                  <Link href="/community">
                    <Button size="sm" className="mt-4 bg-orange-500 hover:bg-orange-600 rounded-full px-6">
                      Create Post
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} onUpdate={fetchPosts} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Playlists Tab */}
          <TabsContent value="playlists" className="mt-4">
            {loadingPlaylists ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : (() => {
              const hasOwnPlaylists = playlists.length > 0
              const hasSavedPlaylists = isOwner && savedPlaylists.length > 0
              const hasAnyPlaylists = hasOwnPlaylists || hasSavedPlaylists

              if (!hasAnyPlaylists) {
                return (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                      <ListMusic className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="font-medium text-white mb-1">No Playlists</p>
                    <p className="text-sm text-white/40 max-w-xs mx-auto">
                      {isOwner 
                        ? "Create or save playlists to see them here." 
                        : "This user hasn't created any public playlists."}
                    </p>
                    {isOwner && (
                      <Link href="/playlists">
                        <Button size="sm" className="mt-4 bg-orange-500 hover:bg-orange-600 rounded-full px-6">
                          Create Playlist
                        </Button>
                      </Link>
                    )}
                  </div>
                )
              }

              return (
                <div className="space-y-6">
                  {hasOwnPlaylists && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                          <ListMusic className="w-4 h-4 text-orange-400" />
                          Your Playlists
                        </h3>
                        {isOwner && (
                          <Link href="/playlists">
                            <button className="text-xs text-white/50 hover:text-white/80 transition-colors">
                              Manage all
                            </button>
                          </Link>
                        )}
                      </div>
                      <div className="space-y-2">
                        {playlists.map((playlist) => (
                          <Link 
                            key={playlist._id}
                            href={`/playlists/${playlist._id}`}
                            className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                          >
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/80 to-rose-500/80 flex items-center justify-center flex-shrink-0">
                              <ListMusic className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-white truncate group-hover:text-orange-400 transition-colors">
                                {playlist.name}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-white/40">
                                <span>{playlist.itemCount} items</span>
                                <span>•</span>
                                {playlist.isPublic ? (
                                  <span className="flex items-center gap-0.5">
                                    <Globe className="w-3 h-3" />
                                    Public
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5">
                                    <Lock className="w-3 h-3" />
                                    Private
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasSavedPlaylists && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                          <Bookmark className="w-4 h-4 text-orange-400" />
                          Saved Playlists
                        </h3>
                        <Link href="/playlists">
                          <button className="text-xs text-white/50 hover:text-white/80 transition-colors">
                            View all
                          </button>
                        </Link>
                      </div>
                      <div className="space-y-2">
                        {savedPlaylists.map((playlist) => (
                          <Link 
                            key={playlist._id}
                            href={`/playlists/${playlist._id}`}
                            className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                          >
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/40 to-rose-500/40 flex items-center justify-center flex-shrink-0">
                              <ListMusic className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-white truncate group-hover:text-orange-400 transition-colors">
                                {playlist.name}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-white/40">
                                <span>{playlist.itemCount} items</span>
                                {playlist.isPublic ? (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5">
                                      <Globe className="w-3 h-3" />
                                      Public
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </TabsContent>

          {/* Bookmarks Tab (owner only) */}
          {isOwner && (
            <TabsContent value="bookmarks" className="mt-4">
              {loadingBookmarks ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                </div>
              ) : bookmarks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                    <Bookmark className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="font-medium text-white mb-1">No Saved Posts</p>
                  <p className="text-sm text-white/40 max-w-xs mx-auto">
                    Posts you bookmark will appear here for easy access.
                  </p>
                  <Link href="/community">
                    <Button size="sm" className="mt-4 bg-orange-500 hover:bg-orange-600 rounded-full px-6">
                      Explore Feed
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookmarks.map((post) => (
                    <PostCard key={post._id} post={post} onUpdate={fetchBookmarks} />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Modals */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={profile}
        onSuccess={(updatedProfile) => {
          setProfile({ ...profile, ...updatedProfile })
          setShowEditModal(false)
        }}
      />

      {showConnectionsList && (
        <ConnectionsListModal
          isOpen={!!showConnectionsList}
          onClose={() => setShowConnectionsList(null)}
          userId={userId}
          type={showConnectionsList}
        />
      )}

      {isOwner && (
        <ConnectionRequestsModal
          isOpen={showConnectionRequests}
          onClose={() => setShowConnectionRequests(false)}
          onUpdate={fetchProfile}
        />
      )}
    </div>
  )
}
