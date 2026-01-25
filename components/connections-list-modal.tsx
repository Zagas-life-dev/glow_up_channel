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
import {
  User,
  Users,
  UserPlus,
  UserCheck,
  X,
  Loader2,
  Search
} from 'lucide-react'
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
      <SheetContent side="bottom" className="h-[80vh] bg-[#0a0a0a] border-white/[0.08] rounded-t-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-500" />
              </div>
              <SheetTitle className="text-white">{typeLabel}</SheetTitle>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05]">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-10 bg-white/[0.03] border-white/[0.08] text-white rounded-xl focus:border-orange-500/50"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(80vh-140px)] p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <h3 className="font-medium text-white mb-1">
                {searchQuery ? 'No Results' : type === 'followers' ? 'No Partners' : 'No Partnering Yet'}
              </h3>
              <p className="text-sm text-white/50">
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
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#141414] flex-shrink-0">
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
                          <span className="text-sm font-semibold text-white">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{displayName}</p>
                      {connection.user.headline ? (
                        <p className="text-sm text-white/50 truncate">{connection.user.headline}</p>
                      ) : connection.user.bio ? (
                        <p className="text-sm text-white/50 truncate">{connection.user.bio}</p>
                      ) : (
                        <p className="text-sm text-white/30 truncate">{connection.user.email}</p>
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

