"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { usePlaylist, PlaylistInvitation } from '@/contexts/playlist-context'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { FlaticonIcon } from "@/components/ui/flaticon-icon"

interface PlaylistInvitationsProps {
  isOpen: boolean
  onClose: () => void
}

export default function PlaylistInvitations({ isOpen, onClose }: PlaylistInvitationsProps) {
  const { invitations, acceptInvitation, declineInvitation } = usePlaylist()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [action, setAction] = useState<'accept' | 'decline' | null>(null)

  const handleAccept = async (invitation: PlaylistInvitation) => {
    setProcessingId(invitation._id)
    setAction('accept')
    try {
      await acceptInvitation(invitation.playlistId)
    } catch (err) {
      console.error('Error accepting invitation:', err)
    } finally {
      setProcessingId(null)
      setAction(null)
    }
  }

  const handleDecline = async (invitation: PlaylistInvitation) => {
    setProcessingId(invitation._id)
    setAction('decline')
    try {
      await declineInvitation(invitation.playlistId)
    } catch (err) {
      console.error('Error declining invitation:', err)
    } finally {
      setProcessingId(null)
      setAction(null)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[400px] bg-page border-border p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-page border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FlaticonIcon name="envelope" className="w-5 h-5 text-orange-500" aria-hidden />
              </div>
              <div>
                <SheetTitle className="text-foreground">Invitations</SheetTitle>
                <SheetDescription className="text-muted-foreground text-xs">
                  {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
                </SheetDescription>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
              <FlaticonIcon name="cross" className="w-5 h-5 text-muted-foreground" aria-hidden />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {invitations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FlaticonIcon name="bell" className="w-7 h-7 text-muted-foreground" aria-hidden />
              </div>
              <h3 className="font-medium text-foreground mb-1">No Invitations</h3>
              <p className="text-sm text-muted-foreground">You don't have any pending invitations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation._id}
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    "bg-card border-border",
                    processingId === invitation._id && "opacity-50"
                  )}
                >
                  {/* Playlist Info */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <FlaticonIcon name="music" className="w-5 h-5 text-orange-500" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{invitation.playlistName}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        From {invitation.invitedBy.firstName || invitation.invitedBy.email}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    {invitation.role === 'editor' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-orange-400 text-xs">
                        <FlaticonIcon name="pen" className="w-3 h-3" aria-hidden />
                        Editor Access
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs">
                        <FlaticonIcon name="eye" className="w-3 h-3" aria-hidden />
                        Viewer Access
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(invitation.invitedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleAccept(invitation)}
                      disabled={processingId === invitation._id}
                      size="sm"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-foreground rounded-lg"
                    >
                      {processingId === invitation._id && action === 'accept' ? (
                        <FlaticonIcon name="spinner" className="w-4 h-4 animate-spin" aria-hidden />
                      ) : (
                        <>
                          <FlaticonIcon name="check" className="w-4 h-4 mr-1" aria-hidden />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleDecline(invitation)}
                      disabled={processingId === invitation._id}
                      size="sm"
                      variant="outline"
                      className="flex-1 border-border text-muted-foreground hover:text-foreground hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 rounded-lg"
                    >
                      {processingId === invitation._id && action === 'decline' ? (
                        <FlaticonIcon name="spinner" className="w-4 h-4 animate-spin" aria-hidden />
                      ) : (
                        <>
                          <FlaticonIcon name="cross" className="w-4 h-4 mr-1" aria-hidden />
                          Decline
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Small badge component for notification bell
export function InvitationsBadge({ onClick }: { onClick: () => void }) {
  const { invitations } = usePlaylist()
  
  if (invitations.length === 0) return null
  
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-muted transition-colors"
    >
      <FlaticonIcon name="envelope" className="w-5 h-5 text-muted-foreground" aria-hidden />
      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[10px] font-bold text-foreground flex items-center justify-center">
        {invitations.length > 9 ? '9+' : invitations.length}
      </span>
    </button>
  )
}

