"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { FlaticonIcon } from "@/components/ui/flaticon-icon"
import { Input } from "@/components/ui/input"

interface ConnectionUser {
  _id: string
  email: string
  firstName?: string
  lastName?: string
  profileImage?: string
  bio?: string
  headline?: string
}

interface Connection {
  connectionId?: string
  user: ConnectionUser
  connectedAt: string
}

interface ConnectionsListModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  type: 'followers' | 'following'
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export default function ConnectionsListModal({ isOpen, onClose, userId, type }: ConnectionsListModalProps) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const typeLabel = type === 'followers' ? 'Partners' : 'Partnering'

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchConnections()
    }
  }, [isOpen, type])

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      setFilteredConnections(
        connections.filter(c => 
          c.user.firstName?.toLowerCase().includes(query) ||
          c.user.lastName?.toLowerCase().includes(query) ||
          c.user.email.toLowerCase().includes(query) ||
          c.user.headline?.toLowerCase().includes(query)
        )
      )
    } else {
      setFilteredConnections(connections)
    }
  }, [searchQuery, connections])

  const fetchConnections = async () => {
    setIsLoading(true)
    try {
      const endpoint = type === 'followers' 
        ? `${API_BASE_URL}/api/connections/${userId}/followers`
        : `${API_BASE_URL}/api/connections/${userId}/following`

      const response = await fetch(endpoint, {
        headers: getAuthHeaders()
      })
      const data = await response.json()

      if (data.success) {
        // Handle both response formats
        const connectionsList = type === 'followers' 
          ? data.data.followers || data.data.connections || []
          : data.data.connections || []
        setConnections(connectionsList)
        setFilteredConnections(connectionsList)
      }
    } catch (err) {
      console.error('Error fetching connections:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] bg-page border-border rounded-t-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-page border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FlaticonIcon name="users" className="w-5 h-5 text-orange-500" aria-hidden />
              </div>
              <SheetTitle className="text-foreground">{typeLabel}</SheetTitle>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
              <FlaticonIcon name="cross" className="w-5 h-5 text-muted-foreground" aria-hidden />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <FlaticonIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-10 bg-muted border-border text-foreground rounded-xl focus:border-orange-500/50"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(80vh-140px)] p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <FlaticonIcon name="spinner" className="w-6 h-6 text-orange-500 animate-spin" aria-hidden />
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center py-12">
              <FlaticonIcon name="users" className="w-12 h-12 text-muted-foreground mx-auto mb-3" aria-hidden />
              <h3 className="font-medium text-foreground mb-1">
                {searchQuery ? 'No Results' : type === 'followers' ? 'No Partners' : 'No Partnering Yet'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? 'Try a different search term'
                  : type === 'followers' 
                    ? "No one is partnering with this user yet"
                    : "This user isn't partnering with anyone yet"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConnections.map((connection) => {
                const displayName = connection.user.firstName 
                  ? `${connection.user.firstName}${connection.user.lastName ? ` ${connection.user.lastName}` : ''}`
                  : connection.user.email.split('@')[0]

                return (
                  <Link
                    key={connection.user._id}
                    href={`/profile/${connection.user._id}`}
                    onClick={onClose}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-surface flex-shrink-0">
                      {connection.user.profileImage ? (
                        <Image 
                          src={connection.user.profileImage} 
                          alt={displayName} 
                          width={48} 
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center">
                          <span className="text-sm font-semibold text-foreground">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{displayName}</p>
                      {connection.user.headline ? (
                        <p className="text-sm text-muted-foreground truncate">{connection.user.headline}</p>
                      ) : connection.user.bio ? (
                        <p className="text-sm text-muted-foreground truncate">{connection.user.bio}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground truncate">{connection.user.email}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

