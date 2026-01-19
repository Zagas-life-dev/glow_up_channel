"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  UserPlus,
  X,
  Check,
  Loader2,
  Users
} from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

interface ConnectionRequest {
  requestId: string
  user: {
    _id: string
    email: string
    firstName?: string
    lastName?: string
    profileImage?: string
    headline?: string
    bio?: string
  }
  requestedAt: string
}

interface ConnectionRequestsProps {
  isOpen: boolean
  onClose: () => void
  requests: ConnectionRequest[]
  onUpdate: () => void
}

export default function ConnectionRequests({ isOpen, onClose, requests, onUpdate }: ConnectionRequestsProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [action, setAction] = useState<'accept' | 'decline' | null>(null)

  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    return token 
      ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  }, [])

  const handleRespond = async (request: ConnectionRequest, responseAction: 'accept' | 'decline') => {
    setProcessingId(request.requestId)
    setAction(responseAction)
    
    try {
      const endpoint = responseAction === 'accept'
        ? `${API_BASE_URL}/api/connections/requests/${request.requestId}/accept`
        : `${API_BASE_URL}/api/connections/requests/${request.requestId}/decline`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      
      const data = await response.json()
      
      if (data.success) {
        onUpdate() // Refresh the requests list
      }
    } catch (err) {
      console.error(`Error ${responseAction}ing request:`, err)
    } finally {
      setProcessingId(null)
      setAction(null)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[400px] bg-[#0a0a0a] border-white/[0.08] p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <SheetTitle className="text-white">Connection Requests</SheetTitle>
                <SheetDescription className="text-white/40 text-xs">
                  {requests.length} pending request{requests.length !== 1 ? 's' : ''}
                </SheetDescription>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05]">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-white/30" />
              </div>
              <h3 className="font-medium text-white mb-1">No Pending Requests</h3>
              <p className="text-sm text-white/50">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => {
                const isProcessing = processingId === request.requestId
                const displayName = request.user.firstName 
                  ? `${request.user.firstName}${request.user.lastName ? ' ' + request.user.lastName : ''}`
                  : request.user.email.split('@')[0]

                return (
                  <div
                    key={request.requestId}
                    className={cn(
                      "p-4 rounded-xl border transition-all",
                      "bg-white/[0.02] border-white/[0.06]",
                      isProcessing && "opacity-50"
                    )}
                  >
                    {/* User Info */}
                    <div className="flex items-start gap-3 mb-3">
                      <Link href={`/profile/${request.user._id}`} onClick={onClose}>
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/[0.05] flex-shrink-0">
                          {request.user.profileImage ? (
                            <Image
                              src={request.user.profileImage}
                              alt={displayName}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                              <span className="text-lg font-bold text-white">
                                {displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/profile/${request.user._id}`} 
                          onClick={onClose}
                          className="font-medium text-white hover:text-orange-400 truncate block transition-colors"
                        >
                          {displayName}
                        </Link>
                        {request.user.headline && (
                          <p className="text-xs text-white/50 truncate mt-0.5">
                            {request.user.headline}
                          </p>
                        )}
                        <p className="text-xs text-white/30 mt-0.5">
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleRespond(request, 'accept')}
                        disabled={isProcessing}
                        size="sm"
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                      >
                        {isProcessing && action === 'accept' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleRespond(request, 'decline')}
                        disabled={isProcessing}
                        size="sm"
                        variant="outline"
                        className="flex-1 border-white/10 text-white/70 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 rounded-lg"
                      >
                        {isProcessing && action === 'decline' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Small badge component for notification bell
export function ConnectionRequestsBadge({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null
  
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
    >
      <UserPlus className="w-5 h-5 text-white/60" />
      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
        {count > 9 ? '9+' : count}
      </span>
    </button>
  )
}

