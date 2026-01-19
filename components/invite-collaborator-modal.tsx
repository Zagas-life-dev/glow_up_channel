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
import {
  UserPlus,
  X,
  Mail,
  Users,
  Crown,
  Edit,
  Eye,
  Trash2,
  Clock,
  Check,
  AlertCircle,
  Loader2,
  Send
} from 'lucide-react'

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
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs">
            <Check className="w-3 h-3" />
            Accepted
          </span>
        )
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-xs">
            <X className="w-3 h-3" />
            Declined
          </span>
        )
    }
  }

  const getRoleBadge = (role: Collaborator['role']) => {
    return role === 'editor' ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-xs">
        <Edit className="w-3 h-3" />
        Editor
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-xs">
        <Eye className="w-3 h-3" />
        Viewer
      </span>
    )
  }

  const activeCollaborators = playlist.collaborators?.filter(c => c.status !== 'declined') || []

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] bg-[#0a0a0a] border-white/[0.08] rounded-t-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <SheetTitle className="text-white">Manage Collaborators</SheetTitle>
                <SheetDescription className="text-white/40 text-xs">
                  Invite people to contribute to "{playlist.name}"
                </SheetDescription>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05]">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(80vh-80px)] p-6">
          <div className="max-w-lg mx-auto space-y-6">
            {/* Owner Info */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-semibold text-white">
                  {(playlist.createdBy.firstName?.charAt(0) || playlist.createdBy.email?.charAt(0) || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {playlist.createdBy.firstName || playlist.createdBy.email}
                  </p>
                  <p className="text-xs text-white/40">{playlist.createdBy.email}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-xs">
                  <Crown className="w-3 h-3" />
                  Owner
                </span>
              </div>
            </div>

            {/* Invite Form */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-500" />
                Invite Collaborator
              </h3>
              
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="collaborator@email.com"
                      className="bg-white/[0.05] border-white/[0.08] text-white placeholder:text-white/30 h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as 'editor' | 'viewer')}>
                    <SelectTrigger className="bg-white/[0.05] border-white/[0.08] text-white h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-white/[0.08]">
                      <SelectItem value="editor" className="text-white hover:bg-white/[0.05]">
                        <div className="flex items-center gap-2">
                          <Edit className="w-4 h-4 text-orange-500" />
                          <div>
                            <p>Editor</p>
                            <p className="text-xs text-white/40">Can add and remove items</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer" className="text-white hover:bg-white/[0.05]">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-500" />
                          <div>
                            <p>Viewer</p>
                            <p className="text-xs text-white/40">Can only view the playlist</p>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Success */}
                {success && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-400">{success}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full h-11 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Current Collaborators */}
            {activeCollaborators.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider">
                  Collaborators ({activeCollaborators.length})
                </h3>
                
                <div className="space-y-2">
                  {activeCollaborators.map((collaborator) => (
                    <div
                      key={collaborator._id}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        "bg-white/[0.02] border-white/[0.06]",
                        removingId === collaborator._id && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/[0.1] flex items-center justify-center text-sm font-semibold text-white">
                          {(collaborator.firstName?.charAt(0) || collaborator.email?.charAt(0) || '?').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {collaborator.firstName || collaborator.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-white/40">{collaborator.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(collaborator.role)}
                          {getStatusBadge(collaborator.status)}
                          <button
                            onClick={() => handleRemove(collaborator)}
                            disabled={removingId === collaborator._id}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-white/30 mt-2">
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
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-white/30" />
                </div>
                <h3 className="font-medium text-white mb-1">No Collaborators Yet</h3>
                <p className="text-sm text-white/50">Invite people to help curate this playlist</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

