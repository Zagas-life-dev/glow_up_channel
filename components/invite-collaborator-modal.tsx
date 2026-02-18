"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePlaylist, Playlist, Collaborator } from '@/contexts/playlist-context'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FlaticonIcon } from "@/components/ui/flaticon-icon"
import { RiCloseLine, RiGroupLine, RiUserAddLine, RiPencilLine } from "react-icons/ri"

interface InviteCollaboratorModalProps {
  isOpen: boolean
  onClose: () => void
  playlist: Playlist
}

export default function InviteCollaboratorModal({ isOpen, onClose, playlist }: InviteCollaboratorModalProps) {
  const { inviteCollaborator, removeCollaborator } = usePlaylist()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter an email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await inviteCollaborator(playlist._id, email.trim(), role)
      setSuccess(`Invitation sent to ${email}`)
      setEmail('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (collaborator: Collaborator) => {
    if (!confirm(`Remove ${collaborator.email} from this playlist?`)) return
    
    setRemovingId(collaborator._id)
    try {
      await removeCollaborator(playlist._id, collaborator._id)
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator')
    } finally {
      setRemovingId(null)
    }
  }

  const getStatusBadge = (status: Collaborator['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-xs">
            <FlaticonIcon name="clock" className="w-3 h-3" aria-hidden />
            Pending
          </span>
        )
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs">
            <FlaticonIcon name="check" className="w-3 h-3" aria-hidden />
            Accepted
          </span>
        )
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-xs">
            <RiCloseLine className="w-3 h-3" />
            Declined
          </span>
        )
    }
  }

  const getRoleBadge = (role: Collaborator['role']) => {
    return role === 'editor' ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-orange-400 text-xs">
        <FlaticonIcon name="pen" className="w-3 h-3" aria-hidden />
        Editor
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs">
        <FlaticonIcon name="eye" className="w-3 h-3" aria-hidden />
        Viewer
      </span>
    )
  }

  const activeCollaborators = playlist.collaborators?.filter(c => c.status !== 'declined') || []

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] bg-page border-border rounded-t-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-page border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <RiGroupLine className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <SheetTitle className="text-foreground">Manage Collaborators</SheetTitle>
                <SheetDescription className="text-muted-foreground text-xs">
                  Invite people to contribute to "{playlist.name}"
                </SheetDescription>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
              <FlaticonIcon name="cross" className="w-5 h-5 text-muted-foreground" aria-hidden />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(80vh-80px)] p-6">
          <div className="max-w-lg mx-auto space-y-6">
            {/* Owner Info */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-semibold text-foreground">
                  {(playlist.createdBy.firstName?.charAt(0) || playlist.createdBy.email?.charAt(0) || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {playlist.createdBy.firstName || playlist.createdBy.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{playlist.createdBy.email}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-orange-400 text-xs">
                  <FlaticonIcon name="crown" className="w-3 h-3" aria-hidden />
                  Owner
                </span>
              </div>
            </div>

            {/* Invite Form */}
            <div className="p-5 rounded-xl bg-card border border-border">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <RiUserAddLine className="w-4 h-4 text-violet-500" />
                Invite Collaborator
              </h3>
              
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email Address</Label>
                  <div className="relative">
                    <FlaticonIcon name="envelope" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="collaborator@email.com"
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as 'editor' | 'viewer')}>
                    <SelectTrigger className="bg-muted border-border text-foreground h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border">
                      <SelectItem value="editor" className="text-foreground hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <RiPencilLine className="w-4 h-4 text-orange-500" />
                          <div>
                            <p>Editor</p>
                            <p className="text-xs text-muted-foreground">Can add and remove items</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer" className="text-foreground hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <FlaticonIcon name="eye" className="w-4 h-4 text-primary" aria-hidden />
                          <div>
                            <p>Viewer</p>
                            <p className="text-xs text-muted-foreground">Can only view the playlist</p>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                    <FlaticonIcon name="exclamation" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Success */}
                {success && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
                    <FlaticonIcon name="check" className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden />
                    <p className="text-sm text-emerald-400">{success}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full h-11 bg-violet-500 hover:bg-violet-600 text-foreground font-semibold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <FlaticonIcon name="spinner" className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FlaticonIcon name="paper-plane" className="w-4 h-4 mr-2" aria-hidden />
                      Send Invitation
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Current Collaborators */}
            {activeCollaborators.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Collaborators ({activeCollaborators.length})
                </h3>
                
                <div className="space-y-2">
                  {activeCollaborators.map((collaborator) => (
                    <div
                      key={collaborator._id}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        "bg-card border-border",
                        removingId === collaborator._id && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                          {(collaborator.firstName?.charAt(0) || collaborator.email?.charAt(0) || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {collaborator.firstName || collaborator.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(collaborator.role)}
                          {getStatusBadge(collaborator.status)}
                          <button
                            onClick={() => handleRemove(collaborator)}
                            disabled={removingId === collaborator._id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <FlaticonIcon name="trash" className="w-4 h-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Invited {new Date(collaborator.invitedAt).toLocaleDateString()}
                        {collaborator.acceptedAt && ` • Accepted ${new Date(collaborator.acceptedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {activeCollaborators.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <FlaticonIcon name="users" className="w-7 h-7 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="font-medium text-foreground mb-1">No Collaborators Yet</h3>
                <p className="text-sm text-muted-foreground">Invite people to help curate this playlist</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

