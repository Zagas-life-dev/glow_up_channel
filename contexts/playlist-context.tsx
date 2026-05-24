"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { canCreatePremiumPlaylist } from '@/lib/roles'

export interface PlaylistItem {
  _id: string
  contentId: string
  title: string
  contentType: 'opportunity' | 'job' | 'event' | 'resource'
  company?: string
  organization?: string
  author?: string
  description?: string
  location?: string
  addedAt: string
  addedBy?: {
    _id: string
    email: string
    firstName?: string
  }
}

export interface Collaborator {
  _id: string
  userId?: string
  email: string
  firstName?: string
  role: 'editor' | 'viewer'
  status: 'pending' | 'accepted' | 'declined'
  invitedAt: string
  acceptedAt?: string
}

export interface PlaylistInvitation {
  _id: string
  playlistId: string
  playlistName: string
  invitedBy: {
    _id: string
    email: string
    firstName?: string
  }
  role: 'editor' | 'viewer'
  invitedAt: string
}

export interface Playlist {
  _id: string
  name: string
  description: string
  hashtags: string[]
  isPublic: boolean
  /** Premium playlist flag (mirrors DB `isPremiumPlaylist` / `is_premium`). */
  isPremiumPlaylist?: boolean
  is_premium?: boolean
  items: PlaylistItem[]
  createdBy: {
    _id: string
    email: string
    firstName?: string
  }
  collaborators: Collaborator[]
  createdAt: string
  updatedAt: string
  itemCount: number
  saveCount?: number
  coverImage?: string
  isSaved?: boolean
}

interface PlaylistContextType {
  playlists: Playlist[]
  publicPlaylists: Playlist[]
  sharedPlaylists: Playlist[]
  savedPlaylists: Playlist[]
  premiumPlaylists: Playlist[]
  invitations: PlaylistInvitation[]
  isLoading: boolean
  error: string | null
  createPlaylist: (data: CreatePlaylistData) => Promise<Playlist>
  updatePlaylist: (id: string, data: Partial<CreatePlaylistData>) => Promise<Playlist>
  deletePlaylist: (id: string) => Promise<void>
  addToPlaylist: (playlistId: string, item: AddToPlaylistItem) => Promise<void>
  removeFromPlaylist: (playlistId: string, itemId: string) => Promise<void>
  inviteCollaborator: (playlistId: string, email: string, role: 'editor' | 'viewer') => Promise<void>
  removeCollaborator: (playlistId: string, collaboratorId: string) => Promise<void>
  acceptInvitation: (playlistId: string) => Promise<void>
  declineInvitation: (playlistId: string) => Promise<void>
  savePlaylist: (playlistId: string) => Promise<void>
  unsavePlaylist: (playlistId: string) => Promise<void>
  isPlaylistSaved: (playlistId: string) => boolean
  fetchPlaylists: () => Promise<void>
  fetchPublicPlaylists: () => Promise<void>
  fetchPremiumPlaylists: () => Promise<void>
  fetchInvitations: () => Promise<void>
  fetchSavedPlaylists: () => Promise<void>
  getPlaylistById: (id: string) => Promise<Playlist | null>
  canEditPlaylist: (playlist: Playlist) => boolean
}

/** Optional rows for POST /api/playlists — same shape as add-item, persisted with `addedBy` from the creator. */
export interface PlaylistCreateInitialItem {
  contentId: string
  contentType: 'opportunity' | 'job' | 'event' | 'resource'
  title: string
  company?: string | null
  organization?: string | null
  author?: string | null
  description?: string | null
}

export interface CreatePlaylistData {
  name: string
  description: string
  hashtags: string[]
  isPublic: boolean
  /** Backend allows active premium or admin. */
  isPremiumPlaylist?: boolean
  /** Up to 100 items; duplicates by contentId return 409. */
  items?: PlaylistCreateInitialItem[]
}

interface AddToPlaylistItem {
  _id: string
  title: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  company?: string
  organization?: string
  author?: string
  description?: string
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined)

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [publicPlaylists, setPublicPlaylists] = useState<Playlist[]>([])
  const [sharedPlaylists, setSharedPlaylists] = useState<Playlist[]>([])
  const [savedPlaylists, setSavedPlaylists] = useState<Playlist[]>([])
  const [premiumPlaylists, setPremiumPlaylists] = useState<Playlist[]>([])
  const [invitations, setInvitations] = useState<PlaylistInvitation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }, [])

  // Fetch user's own playlists
  const fetchPlaylists = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPlaylists([])
      setSharedPlaylists([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (!API_BASE_URL) {
        console.warn('Backend URL not configured, skipping playlists fetch')
        setError('Backend not configured')
        return
      }

      // Fetch own playlists
      const myResponse = await fetch(`${API_BASE_URL}/api/playlists/my`, {
        headers: getAuthHeaders()
      })

      if (myResponse.ok) {
        const myData = await myResponse.json()
        if (myData.success) {
          setPlaylists(myData.data.playlists || [])
        }
      } else {
        console.warn(`Failed to fetch own playlists: ${myResponse.status} ${myResponse.statusText}`)
      }

      // Fetch shared playlists
      const sharedResponse = await fetch(`${API_BASE_URL}/api/playlists/shared`, {
        headers: getAuthHeaders()
      })

      if (sharedResponse.ok) {
        const sharedData = await sharedResponse.json()
        if (sharedData.success) {
          setSharedPlaylists(sharedData.data.playlists || [])
        }
      } else {
        console.warn(`Failed to fetch shared playlists: ${sharedResponse.status} ${sharedResponse.statusText}`)
      }
    } catch (err) {
      console.error('Error fetching playlists:', err)
      setError('Failed to load playlists')
      setPlaylists([])
      setSharedPlaylists([])
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user, getAuthHeaders])

  // Fetch public playlists
  const fetchPublicPlaylists = useCallback(async () => {
    // Don't set global loading state for public playlists (non-critical)
    try {
      // Check if API_BASE_URL is available
      if (!API_BASE_URL) {
        console.warn('Backend URL not configured, skipping public playlists fetch')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/playlists/public?limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        console.warn(`Failed to fetch public playlists: ${response.status} ${response.statusText}`)
        return
      }

      const data = await response.json()
      
      if (data.success) {
        setPublicPlaylists(data.data.playlists || [])
      }
    } catch (err) {
      // Silently handle network errors - public playlists are not critical
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error fetching public playlists (non-critical):', err)
      }
      // Set empty array on error to prevent UI issues
      setPublicPlaylists([])
    }
  }, [])

  // Fetch premium playlists (only when authenticated; call from Premium tab)
  const fetchPremiumPlaylists = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPremiumPlaylists([])
      return
    }
    try {
      if (!API_BASE_URL) return
      const response = await fetch(`${API_BASE_URL}/api/playlists/premium?page=1&limit=50`, {
        headers: getAuthHeaders()
      })
      if (response.status === 403) {
        setPremiumPlaylists([])
        return
      }
      if (!response.ok) return
      const data = await response.json()
      if (data.success && data.data?.playlists) {
        setPremiumPlaylists(data.data.playlists)
      } else {
        setPremiumPlaylists([])
      }
    } catch {
      setPremiumPlaylists([])
    }
  }, [isAuthenticated, user, getAuthHeaders])

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setInvitations([])
      return
    }

    try {
      if (!API_BASE_URL) {
        console.warn('Backend URL not configured, skipping invitations fetch')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/playlists/invitations`, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        console.warn(`Failed to fetch invitations: ${response.status} ${response.statusText}`)
        return
      }

      const data = await response.json()
      
      if (data.success) {
        setInvitations(data.data.invitations || [])
      }
    } catch (err) {
      console.error('Error fetching invitations:', err)
      setInvitations([])
    }
  }, [isAuthenticated, user, getAuthHeaders])

  // Fetch saved playlists
  const fetchSavedPlaylists = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setSavedPlaylists([])
      return
    }

    try {
      if (!API_BASE_URL) {
        console.warn('Backend URL not configured, skipping saved playlists fetch')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/playlists/saved`, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        console.warn(`Failed to fetch saved playlists: ${response.status} ${response.statusText}`)
        return
      }

      const data = await response.json()
      
      if (data.success) {
        setSavedPlaylists(data.data.playlists || [])
      }
    } catch (err) {
      console.error('Error fetching saved playlists:', err)
      setSavedPlaylists([])
    }
  }, [isAuthenticated, user, getAuthHeaders])

  // Save a playlist
  const savePlaylist = useCallback(async (playlistId: string): Promise<void> => {
    if (!isAuthenticated) throw new Error('Must be logged in to save a playlist')

    const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/save`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to save playlist')
    }

    // Refresh saved playlists
    await fetchSavedPlaylists()
  }, [isAuthenticated, getAuthHeaders, fetchSavedPlaylists])

  // Unsave a playlist
  const unsavePlaylist = useCallback(async (playlistId: string): Promise<void> => {
    if (!isAuthenticated) throw new Error('Must be logged in to unsave a playlist')

    const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/unsave`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to unsave playlist')
    }

    // Refresh saved playlists
    await fetchSavedPlaylists()
  }, [isAuthenticated, getAuthHeaders, fetchSavedPlaylists])

  // Check if a playlist is saved
  const isPlaylistSaved = useCallback((playlistId: string): boolean => {
    return savedPlaylists.some(p => p._id === playlistId)
  }, [savedPlaylists])

  // Create a new playlist
  const createPlaylist = useCallback(async (data: CreatePlaylistData): Promise<Playlist> => {
    if (!isAuthenticated) throw new Error('Must be logged in to create a playlist')

    // Send premium flag as requested; backend enforces permission (avoid stripping when user.isPremium is stale)
    const premium = !!data.isPremiumPlaylist
    const payload = {
      ...data,
      isPremiumPlaylist: premium,
      is_premium: premium
    }

    // Same-origin Next route proxies to the backend with a canonical body (avoids CORS / dev URL mismatches).
    const response = await fetch('/api/playlists', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })

    let result: { success?: boolean; message?: string; data?: { playlist: Playlist } }
    try {
      result = await response.json()
    } catch {
      const err = new Error(`Invalid response from server (${response.status})`) as Error & { status: number }
      err.status = response.status
      throw err
    }

    if (!result.success || !result.data) {
      const err = new Error(result.message || 'Failed to create playlist') as Error & { status: number }
      err.status = response.status
      throw err
    }

    // Refresh playlists
    await fetchPlaylists()
    
    return result.data.playlist
  }, [isAuthenticated, getAuthHeaders, fetchPlaylists])

  // Update a playlist
  const updatePlaylist = useCallback(async (id: string, data: Partial<CreatePlaylistData>): Promise<Playlist> => {
    const payload: Record<string, unknown> = { ...data }
    if (Object.prototype.hasOwnProperty.call(data, 'isPremiumPlaylist')) {
      payload.is_premium = !!data.isPremiumPlaylist
    }

    const response = await fetch(`/api/playlists/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })

    let result: { success?: boolean; message?: string; data?: { playlist: Playlist } }
    try {
      result = await response.json()
    } catch {
      const err = new Error(`Invalid response from server (${response.status})`) as Error & { status: number }
      err.status = response.status
      throw err
    }

    if (!result.success || !result.data) {
      const err = new Error(result.message || 'Failed to update playlist') as Error & { status: number }
      err.status = response.status
      throw err
    }

    // Refresh playlists
    await fetchPlaylists()
    
    return result.data.playlist
  }, [getAuthHeaders, fetchPlaylists])

  // Delete a playlist
  const deletePlaylist = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/playlists/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete playlist')
    }

    // Refresh playlists
    await fetchPlaylists()
  }, [getAuthHeaders, fetchPlaylists])

  // Check if user can edit a playlist
  const canEditPlaylist = useCallback((playlist: Playlist): boolean => {
    if (!user) return false
    
    // Owner can always edit
    if (playlist.createdBy._id === user._id || playlist.createdBy.email === user.email) {
      return true
    }

    // Check if user is a collaborator with editor role
    const collaborator = playlist.collaborators?.find(
      c => (c.userId === user._id || c.email === user.email) && c.status === 'accepted'
    )
    
    return collaborator?.role === 'editor'
  }, [user])

  // Add item to playlist
  const addToPlaylist = useCallback(async (playlistId: string, item: AddToPlaylistItem): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        contentId: item._id,
        contentType: item.type,
        title: item.title,
        company: item.company,
        organization: item.organization,
        author: item.author,
        description: item.description
      })
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to add item to playlist')
    }

    // Refresh playlists
    await fetchPlaylists()
  }, [getAuthHeaders, fetchPlaylists])

  // Remove item from playlist
  const removeFromPlaylist = useCallback(async (playlistId: string, itemId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/items/${itemId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to remove item from playlist')
    }

    // Refresh playlists
    await fetchPlaylists()
  }, [getAuthHeaders, fetchPlaylists])

  // Invite collaborator
  const inviteCollaborator = useCallback(async (playlistId: string, email: string, role: 'editor' | 'viewer'): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/collaborators`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, role })
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to send invitation')
    }

    // Refresh playlists
    await fetchPlaylists()
  }, [getAuthHeaders, fetchPlaylists])

  // Remove collaborator
  const removeCollaborator = useCallback(async (playlistId: string, collaboratorId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/collaborators/${collaboratorId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to remove collaborator')
    }

    // Refresh playlists
    await fetchPlaylists()
  }, [getAuthHeaders, fetchPlaylists])

  // Accept invitation
  const acceptInvitation = useCallback(async (playlistId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/accept`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to accept invitation')
    }

    // Refresh data
    await fetchPlaylists()
    await fetchInvitations()
  }, [getAuthHeaders, fetchPlaylists, fetchInvitations])

  // Decline invitation
  const declineInvitation = useCallback(async (playlistId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/decline`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to decline invitation')
    }

    // Refresh invitations
    await fetchInvitations()
  }, [getAuthHeaders, fetchInvitations])

  // Get playlist by ID
  const getPlaylistById = useCallback(async (id: string): Promise<Playlist | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${id}`, {
        headers: getAuthHeaders()
      })

      const result = await response.json()

      if (response.status === 403) {
        const err = Object.assign(new Error(result?.message || 'Premium membership required'), { status: 403 })
        throw err
      }

      if (result.success) {
        return result.data.playlist
      }

      return null
    } catch (err) {
      if ((err as { status?: number })?.status === 403) throw err
      console.error('Error fetching playlist:', err)
      return null
    }
  }, [getAuthHeaders])

  // Load playlists on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchPlaylists()
      fetchInvitations()
      fetchSavedPlaylists()
    } else {
      setPlaylists([])
      setSharedPlaylists([])
      setSavedPlaylists([])
      setInvitations([])
    }
    fetchPublicPlaylists()
  }, [isAuthenticated, fetchPlaylists, fetchPublicPlaylists, fetchInvitations, fetchSavedPlaylists])

  return (
    <PlaylistContext.Provider value={{
      playlists,
      publicPlaylists,
      sharedPlaylists,
      savedPlaylists,
      premiumPlaylists,
      invitations,
      isLoading,
      error,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      inviteCollaborator,
      removeCollaborator,
      acceptInvitation,
      declineInvitation,
      savePlaylist,
      unsavePlaylist,
      isPlaylistSaved,
      fetchPlaylists,
      fetchPublicPlaylists,
      fetchPremiumPlaylists,
      fetchInvitations,
      fetchSavedPlaylists,
      getPlaylistById,
      canEditPlaylist
    }}>
      {children}
    </PlaylistContext.Provider>
  )
}

export function usePlaylist() {
  const context = useContext(PlaylistContext)
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a PlaylistProvider')
  }
  return context
}
