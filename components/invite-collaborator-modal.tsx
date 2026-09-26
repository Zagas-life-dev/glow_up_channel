"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePlaylist, Playlist, Collaborator } from '@/contexts/playlist-context'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/up/confirm-dialog"
import { Loader2, Mail, Send, Trash2 } from "lucide-react"

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
  const [confirming, setConfirming] = useState<Collaborator | null>(null)

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
    setRemovingId(collaborator._id)
    try {
      await removeCollaborator(playlist._id, collaborator._id)
      setConfirming(null)
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator')
      setConfirming(null)
    } finally {
      setRemovingId(null)
    }
  }

  const activeCollaborators = playlist.collaborators?.filter(c => c.status !== 'declined') || []
  const ownerName = playlist.createdBy.firstName || playlist.createdBy.email
  const initial = (name?: string, email?: string) => (name?.charAt(0) || email?.charAt(0) || '?').toUpperCase()
  // Initials rotate through the sidebar's avatar colours.
  const AVATAR = ['bg-up-lime text-up-navy', 'bg-up-orange text-up-navy', 'bg-[#FBFAF7] text-up-navy shadow-[inset_0_0_0_1px_var(--up-border-hover)]']

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[520px] gap-0 p-0 sm:p-0">
        <DialogHeader className="px-5 pb-4 pt-7 sm:px-6 sm:pt-6">
          <DialogTitle>Manage collaborators</DialogTitle>
          <DialogDescription className="pr-10">
            Invite people to contribute to &ldquo;{playlist.name}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(64vh,560px)] space-y-5 overflow-y-auto px-5 pb-6 sm:px-6">
          {/* Invite */}
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  aria-label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="h-[46px] pl-10"
                />
              </div>
              <Button type="submit" disabled={isSubmitting || !email.trim()} className="h-[46px] shrink-0 px-5">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSubmitting ? 'Sending…' : 'Invite'}
              </Button>
            </div>

            {/* Role: a segmented pill with its meaning underneath. */}
            <div>
              <div role="radiogroup" aria-label="Role" className="flex gap-1 rounded-full bg-up-fill p-1">
                {(['editor', 'viewer'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={role === r}
                    onClick={() => setRole(r)}
                    className={cn(
                      'h-[34px] flex-1 rounded-full text-[13px] font-semibold transition-colors',
                      role === r ? 'bg-up-solid text-up-on-solid' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r === 'editor' ? 'Editor' : 'Viewer'}
                  </button>
                ))}
              </div>
              <p className="mt-2 px-1 text-xs text-muted-foreground">
                {role === 'editor' ? 'Can add and remove items' : 'Can only view the playlist'}
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-up-md bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">{error}</p>
            )}
            {success && (
              <p role="status" className="rounded-up-md bg-up-lime-tint px-3.5 py-2.5 text-sm font-semibold text-foreground">{success}</p>
            )}
          </form>

          {/* People: the owner is always first. */}
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              People with access
            </p>
            <ul className="divide-y divide-up-hairline overflow-hidden rounded-up-xl border border-border bg-card">
              <li className="flex items-center gap-3 px-3.5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-up-lime font-display text-xs font-bold text-up-navy">
                  {initial(playlist.createdBy.firstName, playlist.createdBy.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{ownerName}</p>
                  <p className="truncate text-xs text-muted-foreground">{playlist.createdBy.email}</p>
                </div>
                <span className="rounded-full bg-up-solid px-2.5 py-[5px] text-xs font-bold text-up-on-solid">Owner</span>
              </li>
              {activeCollaborators.map((collaborator, i) => (
                <li
                  key={collaborator._id}
                  className={cn('flex items-center gap-3 px-3.5 py-3', removingId === collaborator._id && 'opacity-50')}
                >
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-xs font-bold', AVATAR[(i + 1) % AVATAR.length])}>
                    {initial(collaborator.firstName, collaborator.email)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {collaborator.firstName || collaborator.email.split('@')[0]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {collaborator.role === 'editor' ? 'Editor' : 'Viewer'} · {collaborator.email}
                    </p>
                  </div>
                  {collaborator.status === 'pending' ? (
                    <span className="shrink-0 rounded-full bg-up-orange-tint px-2.5 py-[5px] text-xs font-bold text-up-orange-ink">Invited</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setConfirming(collaborator)}
                    disabled={removingId === collaborator._id}
                    aria-label={`Remove ${collaborator.email}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-up-fill hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            {activeCollaborators.length === 0 && (
              <p className="mt-3 px-1 text-sm text-muted-foreground">
                No collaborators yet — invite people to help curate this playlist.
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={Boolean(confirming)}
      onOpenChange={(open) => !open && setConfirming(null)}
      title={`Remove ${confirming?.firstName || confirming?.email || 'this person'}?`}
      description={`They'll lose access to "${playlist.name}". Anything they added stays.`}
      confirmLabel="Remove"
      busyLabel="Removing…"
      busy={Boolean(confirming && removingId === confirming._id)}
      onConfirm={() => (confirming ? handleRemove(confirming) : undefined)}
    />
    </>
  )
}
