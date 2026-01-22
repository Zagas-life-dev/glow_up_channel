"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from "@/components/ui/button"
import PostCard from '@/components/post-card'
import PostDetailSkeleton from '@/components/skeletons/post-detail-skeleton'
import ReplyCard from '@/components/reply-card'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Loader2,
  MessageCircle
} from 'lucide-react'

interface Post {
  _id: string
  author: {
    _id: string
    email: string
    firstName?: string
    profileImage?: string
  }
  content: {
    text: string
    images: { url: string }[]
    playlist?: any
  }
  hashtags: string[]
  mentions: any[]
  visibility: 'public' | 'private'
  likeCount: number
  replyCount: number
  repostCount: number
  bookmarkCount: number
  isRepost: boolean
  originalPost?: string
  repostedBy?: any
  createdAt: string
  updatedAt: string
  isEdited: boolean
  hasLiked?: boolean
  hasBookmarked?: boolean
  hasReposted?: boolean
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
    playlist?: any
  }
  mentions: any[]
  likeCount: number
  replyCount: number
  createdAt: string
  updatedAt: string
  isEdited: boolean
  depth: number
  hasLiked?: boolean
  children?: Reply[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [isLoading, setIsLoading] = useState(true) // Start with true to show skeleton immediately
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }, [])

  const fetchPost = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setPost(data.data.post)
      } else {
        router.push('/community')
      }
    } catch (error) {
      console.error('Error fetching post:', error)
    } finally {
      setIsLoading(false)
    }
  }, [postId, getAuthHeaders, router])

  const fetchReplies = useCallback(async () => {
    setIsLoadingReplies(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/thread`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setReplies(data.data.thread)
      }
    } catch (error) {
      console.error('Error fetching replies:', error)
    } finally {
      setIsLoadingReplies(false)
    }
  }, [postId, getAuthHeaders])

  useEffect(() => {
    fetchPost()
    fetchReplies()
  }, [fetchPost, fetchReplies])

  const handlePostUpdated = (updatedPost: Post) => {
    setPost(updatedPost)
  }

  const handlePostDeleted = () => {
    router.push('/feed')
  }

  const handleReplyCreated = (newReply: Reply) => {
    if (newReply.parentReplyId) {
      // Add to parent reply's children
      const addToParent = (replies: Reply[]): Reply[] => {
        return replies.map(reply => {
          if (reply._id === newReply.parentReplyId) {
            return {
              ...reply,
              children: [...(reply.children || []), newReply],
              replyCount: reply.replyCount + 1
            }
          }
          if (reply.children) {
            return { ...reply, children: addToParent(reply.children) }
          }
          return reply
        })
      }
      setReplies(prev => addToParent(prev))
    } else {
      // Add to top-level
      setReplies(prev => [newReply, ...prev])
    }
    
    // Update post reply count
    if (post) {
      setPost({ ...post, replyCount: post.replyCount + 1 })
    }
    setReplyingTo(null)
  }

  const handleReplyUpdated = (updatedReply: Reply) => {
    const updateReply = (replies: Reply[]): Reply[] => {
      return replies.map(reply => {
        if (reply._id === updatedReply._id) {
          return { ...reply, ...updatedReply }
        }
        if (reply.children) {
          return { ...reply, children: updateReply(reply.children) }
        }
        return reply
      })
    }
    setReplies(prev => updateReply(prev))
  }

  const handleReplyDeleted = (replyId: string) => {
    const removeReply = (replies: Reply[]): Reply[] => {
      return replies.filter(reply => {
        if (reply._id === replyId) return false
        if (reply.children) {
          reply.children = removeReply(reply.children)
        }
        return true
      })
    }
    setReplies(prev => removeReply(prev))
    
    // Update post reply count
    if (post) {
      setPost({ ...post, replyCount: Math.max(0, post.replyCount - 1) })
    }
  }

  // Show skeleton immediately while loading
  if (isLoading) {
    return <PostDetailSkeleton />
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <MessageCircle className="w-16 h-16 text-white/20 mb-4" />
        <h2 className="text-lg font-medium text-white mb-2">Post Not Found</h2>
        <p className="text-white/50 mb-4">This post may have been deleted or is private.</p>
        <Link href="/community">
          <Button variant="outline" className="border-white/10 text-white/70 rounded-xl">
            Back to Feed
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-white/[0.06] -mx-4 px-4 py-3 mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Post</span>
          </button>
        </div>

        {/* Post */}
        <PostCard
          post={post}
          onUpdate={handlePostUpdated}
          onDelete={handlePostDeleted}
        />

        {/* Reply Composer */}
        {isAuthenticated && (
          <div className="mt-4 mb-6">
            <ReplyComposer
              postId={postId}
              parentReplyId={replyingTo}
              onReplyCreated={handleReplyCreated}
              onCancel={() => setReplyingTo(null)}
            />
          </div>
        )}

        {/* Replies */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-orange-500" />
            Replies ({post.replyCount})
          </h3>

          {isLoadingReplies ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
              <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">No replies yet. Be the first to reply!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <ReplyThread
                  key={reply._id}
                  reply={reply}
                  postId={postId}
                  onReplyTo={setReplyingTo}
                  onUpdate={handleReplyUpdated}
                  onDelete={handleReplyDeleted}
                  onReplyCreated={handleReplyCreated}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Reply Composer Component
function ReplyComposer({ 
  postId, 
  parentReplyId, 
  onReplyCreated, 
  onCancel 
}: { 
  postId: string
  parentReplyId: string | null
  onReplyCreated: (reply: Reply) => void
  onCancel?: () => void
}) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [isPosting, setIsPosting] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) return

    setIsPosting(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text.trim(),
          parentReplyId
        })
      })

      const data = await response.json()
      if (data.success) {
        onReplyCreated(data.data.reply)
        setText('')
      }
    } catch (error) {
      console.error('Error creating reply:', error)
    } finally {
      setIsPosting(false)
    }
  }

  if (!user) return null

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
          {user.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profileImage}
              alt={user.firstName || user.email || 'Profile'}
              className="w-full h-full object-cover"
            />
          ) : (
            (user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={parentReplyId ? "Write a reply..." : "Write your reply..."}
            className="w-full bg-transparent text-white placeholder:text-white/30 resize-none outline-none min-h-[60px] text-sm"
            rows={2}
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="ghost"
                size="sm"
                className="text-white/50"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isPosting || !text.trim()}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 rounded-full"
            >
              {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reply'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reply Thread Component (recursive for nested replies)
function ReplyThread({ 
  reply, 
  postId,
  onReplyTo, 
  onUpdate, 
  onDelete,
  onReplyCreated,
  depth = 0 
}: { 
  reply: Reply
  postId: string
  onReplyTo: (replyId: string) => void
  onUpdate: (reply: Reply) => void
  onDelete: (replyId: string) => void
  onReplyCreated: (reply: Reply) => void
  depth?: number
}) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showChildren, setShowChildren] = useState(true)
  const maxDepth = 3

  return (
    <div className={cn("relative", depth > 0 && "ml-8 pl-4 border-l border-white/[0.06]")}>
      <ReplyCard
        reply={reply}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReply={() => {
          if (depth < maxDepth) {
            setShowReplyForm(true)
          } else {
            onReplyTo(reply._id)
          }
        }}
      />

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mt-2 ml-11">
          <ReplyComposer
            postId={postId}
            parentReplyId={reply._id}
            onReplyCreated={(newReply) => {
              onReplyCreated(newReply)
              setShowReplyForm(false)
            }}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* Children */}
      {reply.children && reply.children.length > 0 && (
        <div className="mt-2">
          {!showChildren ? (
            <button
              onClick={() => setShowChildren(true)}
              className="text-xs text-orange-500 hover:underline ml-11"
            >
              Show {reply.children.length} {reply.children.length === 1 ? 'reply' : 'replies'}
            </button>
          ) : (
            <div className="space-y-2">
              {reply.children.map((child) => (
                <ReplyThread
                  key={child._id}
                  reply={child}
                  postId={postId}
                  onReplyTo={onReplyTo}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onReplyCreated={onReplyCreated}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

