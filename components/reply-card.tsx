"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FlaticonIcon } from '@/components/ui/flaticon-icon'
import { RiMore2Line, RiPlayList2Fill } from 'react-icons/ri'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

function safeFormatDistanceToNow(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "N/A"
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return "N/A"
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return "N/A"
  }
}

interface Reply {
  _id: string
  postId: string
  parentReplyId?: string
  author: {
    _id: string
    email: string
    firstName?: string
    profileImage?: string
  }
  content: {
    text: string
    images: { url: string }[]
    playlist?: {
      _id: string
      name: string
      description: string
      itemCount: number
    }
  }
  mentions: any[]
  likeCount: number
  replyCount: number
  createdAt: string
  updatedAt: string
  isEdited: boolean
  depth: number
  hasLiked?: boolean
}

interface ReplyCardProps {
  reply: Reply
  onUpdate?: (reply: Reply) => void
  onDelete?: (replyId: string) => void
  onReply?: () => void
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export default function ReplyCard({ reply, onUpdate, onDelete, onReply }: ReplyCardProps) {
  const { user } = useAuth()
  const [isLiking, setIsLiking] = useState(false)
  const [localReply, setLocalReply] = useState(reply)

  const isOwner = user?._id === reply.author._id || user?.email === reply.author.email

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like replies')
      return
    }

    setIsLiking(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/replies/${reply._id}/like`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        const updated = {
          ...localReply,
          hasLiked: data.data.liked,
          likeCount: data.data.likeCount
        }
        setLocalReply(updated)
        onUpdate?.(updated)
      }
    } catch (error) {
      toast.error('Failed to like reply')
    } finally {
      setIsLiking(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this reply?')) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/replies/${reply._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Reply deleted')
        onDelete?.(reply._id)
      }
    } catch (error) {
      toast.error('Failed to delete reply')
    }
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4 hover:bg-muted transition-colors">
      {/* Author Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Link href={`/profile/${localReply.author._id}`}>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary flex items-center justify-center text-xs font-semibold text-foreground">
              {localReply.author.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={localReply.author.profileImage}
                  alt={localReply.author.firstName || localReply.author.email || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                (localReply.author.firstName?.charAt(0) || localReply.author.email?.charAt(0) || '?').toUpperCase()
              )}
            </div>
          </Link>
          <div>
            <Link href={`/profile/${localReply.author._id}`} className="text-sm font-medium text-foreground hover:underline">
              {localReply.author.firstName || localReply.author.email.split('@')[0]}
            </Link>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{safeFormatDistanceToNow(localReply.createdAt)}</span>
              {localReply.isEdited && <span>• edited</span>}
            </div>
          </div>
        </div>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-muted-foreground">
                <RiMore2Line className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-red-400 focus:text-red-400 cursor-pointer">
                <FlaticonIcon name="trash" className="w-4 h-4 mr-2" aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <div className="ml-10">
        {/* Text */}
        {localReply.content.text && (
          <p className="text-sm text-foreground whitespace-pre-wrap mb-2">
            {localReply.content.text}
          </p>
        )}

        {/* Images */}
        {localReply.content.images && localReply.content.images.length > 0 && (
          <div className={cn(
            "grid gap-1 mb-2 rounded-lg overflow-hidden",
            localReply.content.images.length === 1 && "grid-cols-1",
            localReply.content.images.length >= 2 && "grid-cols-2"
          )}>
            {localReply.content.images.slice(0, 4).map((img, index) => (
              <div key={index} className="relative aspect-square bg-muted overflow-hidden">
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
            ))}
          </div>
        )}

        {/* Playlist */}
        {localReply.content.playlist && (
          <Link href={`/playlists/${localReply.content.playlist._id}`}>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border border-border hover:bg-muted transition-colors mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-violet-500/20 flex items-center justify-center">
                <RiPlayList2Fill className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{localReply.content.playlist.name}</p>
                <p className="text-[10px] text-muted-foreground">{localReply.content.playlist.itemCount} items</p>
              </div>
              <FlaticonIcon name="external-link" className="w-3 h-3 text-muted-foreground" aria-hidden />
            </div>
          </Link>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 mt-2">
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
              localReply.hasLiked
                ? "text-red-500 bg-red-500/10"
                : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            )}
          >
            <FlaticonIcon name="heart" className={cn("w-3.5 h-3.5", localReply.hasLiked && "text-current")} aria-hidden />
            {localReply.likeCount > 0 && <span>{localReply.likeCount}</span>}
          </button>

          {/* Reply */}
          {onReply && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <FlaticonIcon name="comment" className="w-3.5 h-3.5" aria-hidden />
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

