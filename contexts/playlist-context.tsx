"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'

export interface PlaylistItem {
  _id: string
  contentId: string
  title: string
  contentType: 'opportunity' | 'job' | 'event' | 'resource'
  company?: string
  organization?: string
  author?: string
  description?: string
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
  fetchInvitations: () => Promise<void>
  fetchSavedPlaylists: () => Promise<void>
  getPlaylistById: (id: string) => Promise<Playlist | null>
  canEditPlaylist: (playlist: Playlist) => boolean
}

interface CreatePlaylistData {
  name: string
  description: string
  hashtags: string[]
  isPublic: boolean
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
  const [invitations, setInvitations] = useState<PlaylistInvitation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('accessToken')
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
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
      // Fetch own playlists
      const myResponse = await fetch(`${API_BASE_URL}/api/playlists/my`, {
        headers: getAuthHeaders()
      })
      const myData = await myResponse.json()
      
      if (myData.success) {
        setPlaylists(myData.data.playlists || [])
      }

      // Fetch shared playlists
      const sharedResponse = await fetch(`${API_BASE_URL}/api/playlists/shared`, {
        headers: getAuthHeaders()
      })
      const sharedData = await sharedResponse.json()
      
      if (sharedData.success) {
        setSharedPlaylists(sharedData.data.playlists || [])
      }
    } catch (err) {
      console.error('Error fetching playlists:', err)
      setError('Failed to load playlists')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user, getAuthHeaders])

  // Fetch public playlists
  const fetchPublicPlaylists = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/public?limit=50`)
      const data = await response.json()
      
      if (data.success) {
        setPublicPlaylists(data.data.playlists || [])
      }
    } catch (err) {
      console.error('Error fetching public playlists:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setInvitations([])
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/invitations`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      
      if (data.success) {
        setInvitations(data.data.invitations || [])
      }
    } catch (err) {
      console.error('Error fetching invitations:', err)
    }
  }, [isAuthenticated, user, getAuthHeaders])

  // Fetch saved playlists
  const fetchSavedPlaylists = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setSavedPlaylists([])
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/saved`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      
      if (data.success) {
        setSavedPlaylists(data.data.playlists || [])
      }
    } catch (err) {
      console.error('Error fetching saved playlists:', err)
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

    const response = await fetch(`${API_BASE_URL}/api/playlists`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to create playlist')
    }

    // Refresh playlists
    await fetchPlaylists()
    
    return result.data.playlist
  }, [isAuthenticated, getAuthHeaders, fetchPlaylists])

  // Update a playlist
  const updatePlaylist = useCallback(async (id: string, data: Partial<CreatePlaylistData>): Promise<Playlist> => {
    const response = await fetch(`${API_BASE_URL}/api/playlists/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to update playlist')
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
    if (playlist.createdBy._id === user.id || playlist.createdBy.email === user.email) {
      return true
    }
    
    // Check if user is a collaborator with editor role
    const collaborator = playlist.collaborators?.find(
      c => (c.userId === user.id || c.email === user.email) && c.status === 'accepted'
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
      
      if (result.success) {
        return result.data.playlist
      }
      
      return null
    } catch (err) {
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
