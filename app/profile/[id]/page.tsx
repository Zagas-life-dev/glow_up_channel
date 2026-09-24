"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { usePlaylist, findSavedPlaylist, type Playlist as PlaylistWithItems } from '@/contexts/playlist-context'
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'
import { KindChip, toUpKind } from '@/components/up/kind'
import { PlaylistCover } from '@/components/playlists/playlist-cover'
import {
  typeConfigFor,
  playlistItemHref,
} from '@/lib/playlist-item-display'
import PostCard from '@/components/post-card'
import GiftList from '@/components/gifts/gift-list'
import { GIFTS_TAB } from '@/lib/gifts/routes'
import ConnectionRequestsModal from '@/components/connection-requests-modal'
import ProfileSkeleton from '@/components/skeletons/profile-skeleton'
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
import {
  RiUserLine,
  RiArrowLeftLine,
  RiMoreLine,
  RiLockLine,
  RiShieldLine,
  RiMapPinLine,
  RiBriefcaseLine,
  RiArrowUpLine,
  RiCalendarLine,
  RiLink,
  RiBuildingLine,
  RiLightbulbLine,
  RiErrorWarningLine,
  RiToolsLine,
  RiSettingsLine,
  RiTimeLine,
  RiUserAddLine,
  RiBookmarkLine,
  RiGiftLine,
  RiGlobalLine,
  RiArrowRightLine,
  RiFocus3Line,
  RiSparkling2Line,
  RiGraduationCapLine,
  RiPlayList2Fill,
  RiVipCrownLine,
} from "react-icons/ri"
import { PageShell } from "@/components/layout/page-shell"
import { isFounderBatch } from '@/lib/roles'
import { trackConnectionRequest } from '@/lib/tracking'

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
  phoneNumber: string | null
  skills: string[]
  work: { company?: string; title?: string } | null
  education: { school?: string; degree?: string; field?: string } | null
  socialLinks: { linkedin?: string; twitter?: string; instagram?: string; github?: string; youtube?: string; tiktok?: string }
  isPrivate: boolean
  showConnections: boolean
  role: string
  createdAt: string
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

type CompletionItem = {
  id: string
  label: string
  completed: boolean
  location: 'Profile' | 'Settings: Basic info' | 'Settings: Background'
  href: string
}

const buildCompletionChecklist = (profileData: ProfileData | null): CompletionItem[] => {
  if (!profileData) return []

  const onboarding = profileData.onboarding

  return [
    {
      id: 'firstName',
      label: 'Add your first name',
      completed: !!profileData.firstName,
      location: 'Settings: Basic info',
      href: '/profile/settings',
    },
    {
      id: 'bio',
      label: 'Write a short bio',
      completed: !!profileData.bio,
      location: 'Settings: Basic info',
      href: '/profile/settings',
    },
    {
      id: 'headline',
      label: 'Add a profile headline',
      completed: !!profileData.headline,
      location: 'Settings: Basic info',
      href: '/profile/settings',
    },
    {
      id: 'phoneNumber',
      label: 'Add a phone number',
      completed: !!profileData.phoneNumber,
      location: 'Settings: Basic info',
      href: '/profile/settings',
    },
    {
      id: 'location',
      label: 'Set your country and state',
      completed: !!onboarding?.country && !!onboarding?.province,
      location: 'Settings: Background',
      href: '/profile/settings?tab=background',
    },
    {
      id: 'careerStage',
      label: 'Choose your career stage',
      completed: !!onboarding?.careerStage,
      location: 'Settings: Background',
      href: '/profile/settings?tab=background',
    },
    {
      id: 'educationLevel',
      label: 'Select your education level',
      completed: !!onboarding?.educationLevel,
      location: 'Settings: Background',
      href: '/profile/settings?tab=background',
    },
    {
      id: 'interests',
      label: 'Pick at least one interest',
      completed: (onboarding?.interests?.length ?? 0) > 0,
      location: 'Settings: Background',
      href: '/profile/settings?tab=background',
    },
    {
      id: 'industries',
      label: 'Pick at least one industry',
      completed: (onboarding?.industrySectors?.length ?? 0) > 0,
      location: 'Settings: Background',
      href: '/profile/settings?tab=background',
    },
    {
      id: 'aspirations',
      label: 'Add what you are looking for',
      completed: (onboarding?.aspirations?.length ?? 0) > 0,
      location: 'Settings: Background',
      href: '/profile/settings?tab=background',
    },
    {
      id: 'skills',
      label: 'Add at least one skill',
      completed: (onboarding?.onboardingSkills?.length ?? 0) > 0,
      location: 'Settings: Background',
      href: '/profile/settings?tab=background',
    },
  ]
}

// Social link config
const socialConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  linkedin: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    color: 'hover:text-[#0A66C2]',
    label: 'LinkedIn'
  },
  twitter: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    color: 'hover:text-foreground',
    label: 'X'
  },
  instagram: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
    color: 'hover:text-[#E4405F]',
    label: 'Instagram'
  },
  github: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
    color: 'hover:text-foreground',
    label: 'GitHub'
  },
  youtube: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    color: 'hover:text-[#FF0000]',
    label: 'YouTube'
  },
  tiktok: { 
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
    color: 'hover:text-foreground',
    label: 'TikTok'
  },
}

/** One labelled row inside the About panel. */
function AboutRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="px-4 py-3.5 sm:px-[22px]">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </div>
      {children}
    </div>
  )
}

/** A capped list of chips with a "+n" tail. */
function ChipList({
  items,
  limit,
  tone = "neutral",
}: {
  items: string[]
  limit: number
  tone?: "neutral" | "accent"
}) {
  const shown = items.slice(0, limit)
  const rest = items.length - shown.length
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className={cn(
            "inline-flex h-8 items-center rounded-full px-3 text-[13px] font-semibold",
            tone === "accent"
              ? "bg-up-orange-tint text-up-orange-ink"
              : "bg-up-fill text-foreground"
          )}
        >
          {item}
        </span>
      ))}
      {rest > 0 ? <span className="inline-flex h-8 items-center px-2 text-[13px] font-semibold text-muted-foreground">+{rest}</span> : null}
    </div>
  )
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const {
    savedPlaylists,
    fetchSavedPlaylists,
    playlists: myPlaylists,
    isLoading: myPlaylistsLoading,
    fetchPlaylists: refreshMyPlaylists,
    getPlaylistById,
  } = usePlaylist()
  const userId = params.id as string

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tabs data
  const [activeTab, setActiveTab] = useState('playlists')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [bookmarks, setBookmarks] = useState<Post[]>([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [loadingBookmarks, setLoadingBookmarks] = useState(false)

  /**
   * Deep link into the Gifts tab.
   *
   * The gift popup's "View others" button lands here, so the query has to be
   * honoured — but only for the profile owner, since the gift list is the
   * viewer's own and the tab is not rendered on someone else's page. Read from
   * `window.location` rather than useSearchParams to keep this page out of the
   * Suspense boundary that hook would require.
   */
  useEffect(() => {
    if (!isOwner) return
    const requested = new URLSearchParams(window.location.search).get('tab')
    if (requested === GIFTS_TAB) setActiveTab(GIFTS_TAB)
  }, [isOwner])

  // The permanent "Saved" playlist — what the bookmark button on feed cards fills.
  const [savedList, setSavedList] = useState<PlaylistWithItems | null>(null)
  const [loadingSavedList, setLoadingSavedList] = useState(false)
  const [savedListError, setSavedListError] = useState<string | null>(null)
  const savedListFetchedForRef = useRef<string | null>(null)
  const myPlaylistsRefreshedRef = useRef(false)

  // Profile completion (only for own profile)
  const [completionPercentage, setCompletionPercentage] = useState(0)
  const [loadingCompletion, setLoadingCompletion] = useState(false)

  // Modals
  const [showConnectionRequests, setShowConnectionRequests] = useState(false)

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

  // Saves live in the account's own "Saved" playlist, so it only resolves on your own profile.
  const savedPlaylistSummary = useMemo(
    () => (isOwner ? findSavedPlaylist(myPlaylists) : undefined),
    [isOwner, myPlaylists],
  )

  // Fetch the Saved playlist's contents (owner only)
  const fetchSavedList = useCallback(async () => {
    if (!savedPlaylistSummary) return

    setLoadingSavedList(true)
    setSavedListError(null)
    try {
      // `/api/playlists/my` is a listing; read the playlist itself so every item is present.
      const full = await getPlaylistById(savedPlaylistSummary._id)
      setSavedList(full ?? savedPlaylistSummary)
    } catch (err) {
      console.error('Error fetching saved items:', err)
      // Fall back to whatever the listing already carried rather than showing nothing.
      setSavedList(savedPlaylistSummary)
      setSavedListError('Could not refresh your saved items.')
    } finally {
      setLoadingSavedList(false)
    }
  }, [savedPlaylistSummary, getPlaylistById])

  // Calculate profile completion percentage based on the same checklist used for the UI
  const calculateProfileCompletion = useCallback((profileData: ProfileData | null): number => {
    if (!profileData) return 0
    const items = buildCompletionChecklist(profileData)
    if (items.length === 0) return 0
    const completed = items.filter(item => item.completed).length
    return Math.round((completed / items.length) * 100)
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
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/api/connections/${userId}`, {
          method: 'POST',
          headers: getAuthHeaders()
        })
        const data = await response.json()
        if (data.success) {
          // Only the connect direction reports. Disconnecting is a real action
          // too, but counting it would make a user churning a connection on and
          // off look like a busy day.
          trackConnectionRequest(userId)
          if (profile?.isPrivate) {
            setConnectionStatus({ ...connectionStatus!, isFollowing: false, isPending: true })
          } else {
            setConnectionStatus({ ...connectionStatus!, isFollowing: true, isPending: false })
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
    if (activeTab === 'playlists' && playlists.length === 0) {
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
    playlists.length,
    bookmarks.length,
    isOwner,
    savedPlaylists.length,
    fetchPlaylists,
    fetchBookmarks,
    fetchSavedPlaylists
  ])

  // Pull the Saved playlist's contents the first time its tab is opened. The provider
  // loads the user's playlists on mount, so the list this keys off can arrive late —
  // hence keying the guard on the id rather than a "have I run" flag.
  useEffect(() => {
    if (activeTab !== 'bookmarks' || !isOwner) return

    const savedId = savedPlaylistSummary?._id
    if (savedId) {
      if (savedListFetchedForRef.current === savedId) return
      savedListFetchedForRef.current = savedId
      void fetchSavedList()
      return
    }

    // Not in the cached listing: the Saved list may have been created after the provider
    // loaded (a first-ever save), so refresh once before concluding there is nothing.
    if (!myPlaylistsRefreshedRef.current && !myPlaylistsLoading) {
      myPlaylistsRefreshedRef.current = true
      void refreshMyPlaylists()
    }
  }, [
    activeTab,
    isOwner,
    savedPlaylistSummary,
    fetchSavedList,
    myPlaylistsLoading,
    refreshMyPlaylists,
  ])

  // Show skeleton immediately while loading
  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (error || !profile) {
    return (
      <PageShell fullWidth className="relative flex min-h-[50vh] items-center justify-center font-sans">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -top-28 right-0 h-72 w-72 rounded-full opacity-[0.1] dark:opacity-[0.14] blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 72%)" }}
          />
        </div>
        <div className="relative mx-auto max-w-md px-4 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm">
            <RiUserLine className="h-8 w-8 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="text-display-sm font-bold tracking-tight text-foreground">Profile not found</h2>
          <p className="mt-3 text-body-sm leading-relaxed text-muted-foreground">
            {error || "This profile doesn&apos;t exist or has been removed."}
          </p>
          <Button
            type="button"
            onClick={() => router.back()}
            variant="outline"
            className="mt-8 h-11 rounded-2xl border-border/70 px-6"
          >
            <RiArrowLeftLine className="mr-2 h-4 w-4" aria-hidden />
            Go back
          </Button>
        </div>
      </PageShell>
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
    <PageShell fullWidth className="relative font-sans">
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="sticky top-0 z-20 -mx-1 mb-1 flex items-center justify-between gap-2 border-b border-border bg-up-bar px-2 py-2.5 pt-[max(0.25rem,env(safe-area-inset-top))] backdrop-blur-xl sm:static sm:mx-0 sm:mb-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-3 sm:pt-0 sm:backdrop-blur-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full text-muted-foreground transition-colors hover:bg-up-fill hover:text-foreground sm:min-w-0 sm:justify-start sm:px-3"
            aria-label="Go back"
          >
            <RiArrowLeftLine className="h-5 w-5 shrink-0" aria-hidden />
            <span className="hidden text-body-sm font-semibold sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-1.5">
            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-card/80 hover:backdrop-blur-sm border border-transparent hover:border-border/50 transition-all">
                  <RiMoreLine className="w-5 h-5" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl min-w-[180px] py-1.5 shadow-xl">
                <DropdownMenuItem className="text-muted-foreground focus:bg-muted/70 focus:text-foreground cursor-pointer rounded-xl mx-2 py-2.5">
                  Share Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-muted-foreground focus:bg-muted/70 focus:text-foreground cursor-pointer rounded-xl mx-2 py-2.5">
                  Copy Link
                </DropdownMenuItem>
                {!isOwner && (
                  <>
                    <DropdownMenuSeparator className="bg-border/50 my-1" />
                    <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer rounded-xl mx-2 py-2.5">
                      Block User
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu> */}
          </div>
        </div>

        {/* Profile hero */}
        {/* A navy "place": name in Unbounded, headline in orange, card-stack tiles off the corner. */}
        <div className="relative mb-5 overflow-hidden rounded-[28px] bg-up-lead text-up-on-navy dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-[130px] w-[180px] -rotate-[8deg] rounded-up-xl bg-up-orange" />
          <span aria-hidden className="pointer-events-none absolute -top-7 right-12 z-[1] h-[70px] w-[90px] rotate-[7deg] rounded-up-lg bg-up-lime" />
          <div className="relative z-[2] p-5 sm:p-7">
            <div className="mb-5 flex items-start">
              <div className="relative shrink-0">
                <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-up-navy-subtle sm:h-28 sm:w-28">
                  {profile.profileImage ? (
                    <Image
                      src={profile.profileImage}
                      alt={displayName}
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-up-lime">
                      <span className="font-display text-3xl font-bold text-up-navy sm:text-4xl">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {profile.isPrivate && (
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-up-on-navy">
                    <RiLockLine className="h-3.5 w-3.5 text-up-navy" aria-hidden />
                  </div>
                )}
              </div>
            </div>

            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[26px] font-bold leading-tight sm:text-[32px]">{displayName}</h1>
              {isFounderBatch(profile.role) && (
                <span className="rounded-full bg-up-lime px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-up-navy">
                  Founder Batch
                </span>
              )}
              {(profile.role === "admin" || profile.role === "super_admin") && (
                <span className="flex items-center gap-1 rounded-full bg-up-navy-subtle px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] shadow-[inset_0_0_0_1px_var(--up-border-on-navy)]">
                  <RiShieldLine className="h-3 w-3 text-up-orange" aria-hidden />
                  Admin
                </span>
              )}
            </div>
            {profile.headline && <p className="mb-2 text-[15px] font-semibold text-up-orange">{profile.headline}</p>}
            {profile.bio && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-up-on-navy-muted">{profile.bio}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-up-on-navy-muted">
              {profile.onboarding?.country && (
                <span className="flex items-center gap-1">
                  <RiMapPinLine className="w-3 h-3 opacity-70" aria-hidden />
                  {[profile.onboarding.city, profile.onboarding.province, profile.onboarding.country].filter(Boolean).join(', ')}
                </span>
              )}
              {profile.work?.company && (
                <span className="flex items-center gap-1">
                  <RiBriefcaseLine className="w-3 h-3 opacity-70" aria-hidden />
                  {profile.work.title ? `${profile.work.title} @ ${profile.work.company}` : profile.work.company}
                </span>
              )}
              {(profile.onboarding?.institution || profile.education?.school) && (
                <span className="flex items-center gap-1">
                  <RiGraduationCapLine className="w-3 h-3 opacity-70" aria-hidden />
                  {profile.onboarding?.institution || profile.education?.school}
                </span>
              )}
              {profile.onboarding?.careerStage && (
                <span className="flex items-center gap-1">
                  <RiArrowUpLine className="w-3 h-3 opacity-70" aria-hidden />
                  {profile.onboarding.careerStage}
                </span>
              )}
              <span className="flex items-center gap-1">
                <RiCalendarLine className="w-3 h-3 opacity-70" aria-hidden />
                Joined {memberSince}
              </span>
            </div>

            {(profile.website || activeSocialLinks.length > 0) && (
              <div className="flex items-center gap-3 mt-3">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[13px] font-bold text-up-orange transition-colors hover:opacity-80"
                  >
                    <RiLink className="w-3 h-3" aria-hidden />
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
                      className="text-up-on-navy-muted transition-colors hover:text-up-on-navy"
                      title={config.label}
                    >
                      {config.icon}
                    </a>
                  )
                })}
              </div>
            )}

            {/* Action buttons: in top container under join date */}
            <div className="mt-5 flex flex-wrap gap-2">
              {isOwner ? (
                /* Editing lives in Settings, which already holds every field the old modal did. */
                <Link href="/profile/settings" className="min-w-0 flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 w-full border-up-border-on-navy bg-up-navy-subtle text-up-on-navy hover:border-up-border-on-navy hover:bg-white/[0.12] hover:text-up-on-navy"
                  >
                    <RiSettingsLine className="mr-2 h-4 w-4" aria-hidden />
                    Edit profile
                  </Button>
                </Link>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={handleConnect}
                    disabled={connectLoading}
                    className={cn(
                      "h-11 min-h-11 min-w-0 flex-1 border text-sm font-bold transition-all",
                      connectionStatus?.isFollowing
                        ? "border-up-border-on-navy bg-up-navy-subtle text-up-on-navy hover:bg-white/[0.12]"
                        : connectionStatus?.isPending
                          ? "border-up-border-on-navy bg-transparent text-up-on-navy-muted"
                          : "border-transparent bg-up-orange text-up-navy hover:brightness-105",
                    )}
                  >
                    {connectionStatus?.isFollowing ? (
                      "Partnering"
                    ) : connectionStatus?.isPending ? (
                      <>
                        <RiTimeLine className="w-4 h-4 mr-1.5" aria-hidden />
                        Requested
                      </>
                    ) : (
                      <>
                        <RiUserAddLine className="w-4 h-4 mr-1.5" aria-hidden />
                        Partner
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="h-11 min-h-11 min-w-0 flex-1 border-up-border-on-navy bg-transparent text-sm font-semibold text-up-on-navy-faint"
                  >
                    Message soon
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Complete your profile — owner only, and deliberately the loudest thing on the page.
            Everything it asks for is edited in Settings, so every route out of here goes there. */}
        {isOwner && completionPercentage < 100 && (() => {
          const checklist = buildCompletionChecklist(profile)
          const incomplete = checklist.filter((item) => !item.completed)
          if (incomplete.length === 0) return null
          const shown = incomplete.slice(0, 4)

          return (
            <section className="mb-5 overflow-hidden rounded-up-xl bg-up-orange-tint">
              <div className="flex items-start gap-3.5 px-4 pt-4 sm:px-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-up-md bg-up-orange text-up-navy">
                  <RiErrorWarningLine className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-foreground">Your profile is incomplete</h2>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {incomplete.length} {incomplete.length === 1 ? 'thing is' : 'things are'} missing.
                    Finishing this is how we match you to the right opportunities.
                  </p>
                </div>
                <span className="shrink-0 font-display text-lg font-bold tabular-nums text-up-orange-ink">
                  {completionPercentage}%
                </span>
              </div>

              <div className="p-4 sm:p-5">
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-card">
                  <div
                    className="h-full rounded-full bg-up-orange transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>

                <ul className="mb-4 space-y-2">
                  {shown.map((item) => (
                    <li key={item.id} className="flex items-center gap-2.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-up-orange" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-body-sm text-foreground">{item.label}</span>
                    </li>
                  ))}
                  {incomplete.length > shown.length && (
                    <li className="pl-4 text-caption text-muted-foreground">
                      and {incomplete.length - shown.length} more
                    </li>
                  )}
                </ul>

                <Link href="/profile/settings" className="block">
                  <Button
                    type="button"
                    className="h-11 w-full"
                  >
                    Complete onboarding
                    <RiArrowRightLine className="ml-1.5 h-4 w-4" aria-hidden />
                  </Button>
                </Link>
              </div>
            </section>
          )
        })()}

        {/* About — skills, interests, industries, education and aspirations were five separate
            full-width cards stacked down the page. They are one idea, so they are one panel. */}
        {(() => {
          const skills = profile.skills?.length > 0 ? profile.skills : profile.onboarding?.onboardingSkills || []
          const interests = profile.onboarding?.interests ?? []
          const industries = profile.onboarding?.industrySectors ?? []
          const aspirations = profile.onboarding?.aspirations ?? []
          const hasEducation = Boolean(profile.onboarding?.educationLevel || profile.onboarding?.fieldOfStudy)

          if (
            skills.length === 0 &&
            interests.length === 0 &&
            industries.length === 0 &&
            aspirations.length === 0 &&
            !hasEducation
          ) {
            return null
          }

          return (
            <section className="mb-5 rounded-up-xl border border-border bg-card">
              <div className="border-b border-up-hairline px-4 py-3.5 sm:px-[22px]">
                <h2 className="text-base font-bold text-foreground">About</h2>
              </div>

              <div className="divide-y divide-up-hairline">
                {skills.length > 0 && (
                  <AboutRow icon={RiToolsLine} label="Skills">
                    <ChipList items={skills} limit={8} />
                  </AboutRow>
                )}

                {interests.length > 0 && (
                  <AboutRow icon={RiFocus3Line} label="Interests">
                    <ChipList items={interests} limit={6} tone="accent" />
                  </AboutRow>
                )}

                {industries.length > 0 && (
                  <AboutRow icon={RiBuildingLine} label="Industries">
                    <ChipList items={industries} limit={5} />
                  </AboutRow>
                )}

                {hasEducation && (
                  <AboutRow icon={RiGraduationCapLine} label="Education">
                    <div className="space-y-0.5">
                      {profile.onboarding?.educationLevel && (
                        <p className="text-body-sm text-foreground">{profile.onboarding.educationLevel}</p>
                      )}
                      {profile.onboarding?.fieldOfStudy && (
                        <p className="text-caption text-muted-foreground">
                          {profile.onboarding.fieldOfStudy}
                          {profile.onboarding.institution ? ` at ${profile.onboarding.institution}` : ''}
                        </p>
                      )}
                    </div>
                  </AboutRow>
                )}

                {aspirations.length > 0 && (
                  <AboutRow icon={RiLightbulbLine} label="Looking for">
                    <ChipList items={aspirations} limit={6} />
                  </AboutRow>
                )}
              </div>
            </section>
          )
        })()}

        {/* Follows You: soft pill */}
        {!isOwner && connectionStatus?.followsYou && (
          <div className="mb-5 rounded-full bg-up-lime-tint px-4 py-2.5 text-center">
            <span className="text-xs text-muted-foreground font-medium">Partners you</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Only owners get a second tab (Saved) — a lone always-active tab is noise, so hide the bar. */}
          {isOwner && (
            <TabsList className="mb-4 flex h-auto w-full gap-1 overflow-x-auto rounded-full bg-up-fill p-1 scrollbar-hide sm:justify-stretch">
              <TabsTrigger
                value="playlists"
                className="h-[34px] shrink-0 flex-1 rounded-full px-3 text-[13px] font-semibold text-muted-foreground transition-colors data-[state=active]:bg-up-solid data-[state=active]:text-up-on-solid data-[state=active]:shadow-none"
              >
                <RiPlayList2Fill className="mr-1.5 h-4 w-4 sm:mr-2" aria-hidden />
                Lists
              </TabsTrigger>
              <TabsTrigger
                value="bookmarks"
                className="h-[34px] shrink-0 flex-1 rounded-full px-3 text-[13px] font-semibold text-muted-foreground transition-colors data-[state=active]:bg-up-solid data-[state=active]:text-up-on-solid data-[state=active]:shadow-none"
              >
                <RiBookmarkLine className="mr-1.5 h-4 w-4 sm:mr-2" aria-hidden />
                Saved
              </TabsTrigger>
              {/* Gifts are the same shared list for every member, but they are
                  reached through your own profile, so the tab is owner-only. */}
              <TabsTrigger
                value={GIFTS_TAB}
                className="h-[34px] shrink-0 flex-1 rounded-full px-3 text-[13px] font-semibold text-muted-foreground transition-colors data-[state=active]:bg-up-solid data-[state=active]:text-up-on-solid data-[state=active]:shadow-none"
              >
                <RiGiftLine className="mr-1.5 h-4 w-4 sm:mr-2" aria-hidden />
                Gifts
              </TabsTrigger>
            </TabsList>
          )}

          {/* Playlists Tab */}
          <TabsContent value="playlists" className="mt-4">
            {loadingPlaylists ? (
              <div className="space-y-4 py-8 animate-pulse">
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 rounded-up-xl border border-border bg-card" />
                  ))}
                </div>
              </div>
            ) : (() => {
              const hasOwnPlaylists = playlists.length > 0
              const hasSavedPlaylists = isOwner && savedPlaylists.length > 0
              const hasAnyPlaylists = hasOwnPlaylists || hasSavedPlaylists

              if (!hasAnyPlaylists) {
                return (
                  <div className="rounded-up-xl border border-dashed border-border bg-card py-14 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-up-lg bg-up-fill">
                      <RiPlayList2Fill className="h-7 w-7 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-body-sm font-bold text-foreground">No playlists</p>
                    <p className="mx-auto mt-2 max-w-xs text-caption leading-relaxed text-muted-foreground">
                      {isOwner ? "Create or save playlists to see them here." : "No public playlists yet."}
                    </p>
                    {isOwner && (
                      <Link href="/playlists">
                        <Button type="button" size="sm" className="mt-6 h-10 px-6">
                          Create playlist
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
                        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                          Your Playlists
                        </h3>
                        {isOwner && (
                          <Link href="/playlists">
                            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                              Manage all
                            </button>
                          </Link>
                        )}
                      </div>
                      <div className="space-y-2">
                        {playlists.map((playlist) => {
                          return (
                          <Link 
                            key={playlist._id}
                            href={`/playlists/${playlist._id}`}
                            className="group flex items-center gap-4 rounded-up-xl border border-border bg-card p-3 transition-colors hover:border-up-border-hover"
                          >
                            <PlaylistCover seed={playlist._id} className="h-12 w-12" rounded="rounded-up-md" />
                            <div className="flex-1 min-w-0">
                              <h4 className="truncate font-bold text-foreground transition-colors group-hover:text-up-orange-ink">
                                {playlist.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                <span>{playlist.itemCount} items</span>
                                <span>•</span>
                                {playlist.isPublic ? (
                                  <span className="flex items-center gap-0.5">
                                    <RiGlobalLine className="w-3 h-3" aria-hidden />
                                    Public
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5">
                                    <RiLockLine className="w-3 h-3" aria-hidden />
                                    Private
                                  </span>
                                )}
                              </div>
                            </div>
                            <RiArrowRightLine className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" aria-hidden />
                          </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {hasSavedPlaylists && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                          Saved Playlists
                        </h3>
                        <Link href="/playlists">
                          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            View all
                          </button>
                        </Link>
                      </div>
                      <div className="space-y-2">
                        {savedPlaylists.map((playlist) => (
                          <Link 
                            key={playlist._id}
                            href={`/playlists/${playlist._id}`}
                            className="group flex items-center gap-4 rounded-up-xl border border-border bg-card p-3 transition-colors hover:border-up-border-hover"
                          >
                            <PlaylistCover seed={playlist._id} className="h-12 w-12" rounded="rounded-up-md" />
                            <div className="flex-1 min-w-0">
                              <h4 className="truncate font-bold text-foreground transition-colors group-hover:text-up-orange-ink">
                                {playlist.name}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{playlist.itemCount} items</span>
                                {playlist.isPublic ? (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5">
                                      <RiGlobalLine className="w-3 h-3" aria-hidden />
                                      Public
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <RiArrowRightLine className="w-4 h-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" aria-hidden />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </TabsContent>

          {/* Saved Tab (owner only) */}
          {isOwner && (
            <TabsContent value="bookmarks" className="mt-4">
              {(() => {
                const savedItems = savedList?.items ?? []
                // Until the provider's playlist fetch lands there is no way to tell
                // "no Saved list" apart from "not loaded yet", so keep the placeholders up.
                const savedPending =
                  loadingSavedList || (!savedPlaylistSummary && myPlaylistsLoading)

                return (
                  <div className="space-y-8">
                    {/* Saved content — the account's permanent "Saved" playlist */}
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                          Saved items
                          {savedItems.length > 0 && (
                            <span className="text-xs font-normal text-muted-foreground">
                              {savedItems.length}
                            </span>
                          )}
                        </h3>
                        {savedPlaylistSummary && (
                          <Link
                            href={`/playlists/${savedPlaylistSummary._id}`}
                            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Open list
                          </Link>
                        )}
                      </div>

                      {savedListError && (
                        <p className="text-xs text-muted-foreground">{savedListError}</p>
                      )}

                      {savedPending ? (
                        <div className="space-y-2" role="status" aria-busy="true">
                          <span className="sr-only">Loading your saved items…</span>
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className="flex min-h-[4.5rem] animate-pulse items-center gap-3 rounded-up-xl border border-border bg-card p-3 sm:gap-4 sm:p-4"
                            >
                              <div className="h-11 w-11 shrink-0 rounded-up-md bg-up-fill" />
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-3 w-20 rounded-full bg-muted" />
                                <div className="h-4 w-3/4 rounded-full bg-muted" />
                                <div className="h-3 w-1/3 rounded-full bg-muted" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : savedItems.length === 0 ? (
                        <div className="rounded-up-xl border border-dashed border-border bg-card py-14 text-center">
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-up-lg bg-up-fill">
                            <RiBookmarkLine className="h-7 w-7 text-muted-foreground" aria-hidden />
                          </div>
                          <p className="text-body-sm font-bold text-foreground">No saved items</p>
                          <p className="mx-auto mt-2 max-w-xs text-caption leading-relaxed text-muted-foreground">
                            Tap the bookmark on any opportunity, job, event, or resource and it lands here.
                          </p>
                          <Link href="/">
                            <Button type="button" size="sm" className="mt-6 h-10 px-6">
                              Browse content
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {savedItems.map((item) => {
                            const config = typeConfigFor(item.contentType)
                            const source = item.company || item.organization || item.author
                            const addedAt = item.addedAt ? new Date(item.addedAt) : null
                            const addedLabel =
                              addedAt && !Number.isNaN(addedAt.getTime())
                                ? addedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : null

                            return (
                              <Link
                                key={item._id}
                                href={playlistItemHref(item)}
                                className="group flex min-h-[4.5rem] items-center gap-3 rounded-up-xl border border-border bg-card p-3 transition-colors duration-200 hover:border-up-border-hover active:scale-[0.99] sm:gap-4 sm:p-4"
                              >
                                <KindChip kind={toUpKind(item.contentType)} size="lg" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-muted-foreground">{config.label}</p>
                                  <h4 className="mt-0.5 truncate font-bold text-foreground transition-colors group-hover:text-up-orange-ink">
                                    {item.title}
                                  </h4>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                    {source && (
                                      <span className="flex min-w-0 items-center gap-1">
                                        <RiBuildingLine className="h-3 w-3 shrink-0" aria-hidden />
                                        <span className="truncate">{source}</span>
                                      </span>
                                    )}
                                    {item.location && (
                                      <span className="flex min-w-0 items-center gap-1">
                                        <RiMapPinLine className="h-3 w-3 shrink-0" aria-hidden />
                                        <span className="truncate">{item.location}</span>
                                      </span>
                                    )}
                                    {addedLabel && (
                                      <span className="flex items-center gap-1">
                                        <RiTimeLine className="h-3 w-3 shrink-0" aria-hidden />
                                        {addedLabel}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <RiArrowRightLine className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </section>

                    {/* Bookmarked community posts — a different kind of save, kept separate */}
                    {(loadingBookmarks || bookmarks.length > 0) && (
                      <section className="space-y-3">
                        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                          Saved posts
                        </h3>
                        {loadingBookmarks ? (
                          <div className="space-y-4 animate-pulse" role="status" aria-busy="true">
                            <span className="sr-only">Loading your saved posts…</span>
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="rounded-2xl bg-card border border-border p-5">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-full bg-muted" />
                                  <div className="h-4 bg-muted rounded w-32" />
                                </div>
                                <div className="h-4 bg-muted rounded w-full mb-2" />
                                <div className="h-4 bg-muted rounded w-5/6" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {bookmarks.map((post) => (
                              <PostCard key={post._id} post={post} onUpdate={fetchBookmarks} />
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                  </div>
                )
              })()}
            </TabsContent>
          )}

          {/* Gifts — the same shared list for every member, reached from your
              own profile. Owner-only, matching the trigger above. */}
          {isOwner && (
            <TabsContent value={GIFTS_TAB} className="mt-4">
              <GiftList />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {isOwner && (
        <ConnectionRequestsModal
          isOpen={showConnectionRequests}
          onClose={() => setShowConnectionRequests(false)}
          onUpdate={fetchProfile}
        />
      )}
    </PageShell>
  )
}
