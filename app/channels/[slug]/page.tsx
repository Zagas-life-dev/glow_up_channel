"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ApiClient, { Channel, ChannelMembership } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { hasPremiumAccess } from "@/lib/roles"
import AuthGuard from "@/components/auth-guard"
import ChannelChatMessage, { type ChannelChatPost, type ReadReceiptState } from "@/components/channel-chat-message"
import { ChannelChatComposerDock } from "@/components/channel-chat-composer-dock"
import { ChannelChatThread } from "@/components/channel-chat-thread"
import { cn } from "@/lib/utils"
import { PageShell } from "@/components/layout/page-shell"
import { SectionCard } from "@/components/layout/section-card"
import { ArrowLeft } from "lucide-react"
import { ChannelsSurface } from "../_components/channels-surface"
import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"
const POLL_MS = 5000
const NEAR_BOTTOM_PX = 140
const MARK_READ_DEBOUNCE_MS = 700

interface ChannelPageState {
  channel: Channel | null
  membership: ChannelMembership | null
}

interface Post extends ChannelChatPost {
  content: ChannelChatPost["content"] & {
    playlist?: {
      _id: string
      name: string
      description: string
      itemCount: number
      items: { _id: string; title: string; contentType: string }[]
    }
    contentReference?: {
      type: "opportunity" | "job" | "event" | "resource"
      contentId: string
      title: string
      description?: string
      organization?: string
      location?: {
        country?: string
        province?: string
        city?: string
        isRemote?: boolean
      }
      dates?: {
        applicationDeadline?: string
        startDate?: string
        endDate?: string
        registrationDeadline?: string
      }
      financial?: {
        isPaid?: boolean
        amount?: string
        currency?: string
      }
    }
    poll?: any
  }
  hashtags: string[]
  mentions: { userId: string; username: string }[]
  visibility: "public" | "private"
  repostCount: number
  bookmarkCount: number
  isRepost: boolean
  originalPost?: string
  repostedBy?: { _id: string; email: string; firstName?: string }
  updatedAt: string
  hasLiked?: boolean
  hasBookmarked?: boolean
  hasReposted?: boolean
}

type ReaderRow = { userId: string; firstName: string | null; lastReadPostId: string | null }

function readReceiptForLastOwnMessage(
  postsAsc: Post[],
  currentUserId: string | undefined,
  readers: ReaderRow[] | undefined,
): ReadReceiptState | null {
  if (!currentUserId || !readers?.length) return null
  const own = postsAsc.filter((p) => p.author._id === currentUserId)
  const lastOwn = own[own.length - 1]
  if (!lastOwn) return null
  const others = readers.filter((r) => r.userId !== currentUserId)
  if (others.length === 0) return null
  const msgId = lastOwn._id
  let readCount = 0
  for (const r of others) {
    if (r.lastReadPostId && r.lastReadPostId >= msgId) readCount += 1
  }
  if (readCount === others.length) return "read"
  return "sent"
}

function mergePostsIncremental(prev: Post[], incoming: Post[]): Post[] {
  const map = new Map<string, Post>()
  for (const p of prev) map.set(p._id, p)
  for (const p of incoming) map.set(p._id, p)
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

export default function ChannelDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params?.slug as string
  const { isAuthenticated, user } = useAuth()
  const premiumOk = hasPremiumAccess({ isPremium: user?.isPremium, role: user?.role })
  const [state, setState] = useState<ChannelPageState>({ channel: null, membership: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [joinLoading, setJoinLoading] = useState(false)
  const [readSummary, setReadSummary] = useState<{ readers: ReaderRow[]; capped: boolean } | null>(null)
  const [typers, setTypers] = useState<{ userId: string; firstName: string }[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const nearBottomRef = useRef(true)
  const postsRef = useRef<Post[]>([])
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  postsRef.current = posts

  const canViewFeed =
    state.channel &&
    (state.channel.type === "public" ||
      (state.channel.type === "private" && !!state.membership) ||
      (state.channel.type === "pro" && premiumOk && !!state.membership))

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await ApiClient.getChannelBySlug(slug)
        if (!cancelled) {
          setState({ channel: data.channel, membership: data.membership })
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load channel")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  // Auto-join flow when visiting with invite=1
  useEffect(() => {
    const invite = searchParams?.get("invite")
    if (!invite || invite !== "1") return
    if (!state.channel || state.membership || !isAuthenticated) return

    let cancelled = false
    const joinViaInvite = async () => {
      try {
        setJoinLoading(true)
        const res = await ApiClient.joinChannel(state.channel!._id, { viaInvite: true })
        if (cancelled) return
        if (res.status === "joined") {
          setState((prev) =>
            prev.channel
              ? {
                channel: { ...prev.channel, memberCount: prev.channel.memberCount + 1 },
                membership: { role: "member", joinedAt: new Date().toISOString() },
              }
              : prev
          )
        }
      } catch {
        // ignore for now
      } finally {
        if (!cancelled) setJoinLoading(false)
      }
    }

    joinViaInvite()
    return () => {
      cancelled = true
    }
  }, [searchParams, state.channel, state.membership, isAuthenticated])

  useEffect(() => {
    const loadPosts = async () => {
      if (!state.channel) return
      try {
        setPostsLoading(true)
        const data = await ApiClient.getChannelPosts(state.channel._id, { page: 1, limit: 50 })
        const raw = data.posts || []
        setPosts([...raw].reverse())
        nearBottomRef.current = true
      } catch (err) {
        // ignore for now, error will be visible via main error if needed
      } finally {
        setPostsLoading(false)
      }
    }
    if (canViewFeed) {
      loadPosts()
    } else {
      setPosts([])
    }
  }, [state.channel?._id, canViewFeed])

  const chronologicalPosts = useMemo(
    () =>
      [...posts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [posts],
  )

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  useEffect(() => {
    if (postsLoading || posts.length === 0) return
    if (!nearBottomRef.current) return
    scrollToBottom()
  }, [postsLoading, posts.length, chronologicalPosts[chronologicalPosts.length - 1]?._id, scrollToBottom])

  const handleMessagesScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    nearBottomRef.current = dist < NEAR_BOTTOM_PX
  }

  const scheduleMarkRead = useCallback(
    (lastPostId: string) => {
      if (!state.channel?._id || !isAuthenticated || !state.membership) return
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current)
      markReadTimerRef.current = setTimeout(() => {
        ApiClient.markChannelRead(state.channel!._id, lastPostId).catch(() => {})
      }, MARK_READ_DEBOUNCE_MS)
    },
    [state.channel?._id, isAuthenticated, state.membership],
  )

  const lastPostIdForRead = chronologicalPosts[chronologicalPosts.length - 1]?._id

  useEffect(() => {
    if (!lastPostIdForRead || !nearBottomRef.current) return
    scheduleMarkRead(lastPostIdForRead)
  }, [lastPostIdForRead, scheduleMarkRead])

  useEffect(() => {
    if (!canViewFeed || !state.channel) return

    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      const ch = state.channel
      if (!ch) return
      const ordered = [...postsRef.current].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      const lastPost = ordered[ordered.length - 1]

      try {
        if (lastPost?._id) {
          const data = await ApiClient.getChannelPosts(ch._id, { after: lastPost._id, limit: 50 })
          if (data.posts?.length) {
            setPosts((prev) => mergePostsIncremental(prev, data.posts as Post[]))
            if (nearBottomRef.current) {
              requestAnimationFrame(() => scrollToBottom())
            }
          }
        } else {
          const data = await ApiClient.getChannelPosts(ch._id, { page: 1, limit: 50 })
          const raw = data.posts || []
          if (raw.length) {
            setPosts([...raw].reverse())
            nearBottomRef.current = true
            requestAnimationFrame(() => scrollToBottom())
          }
        }

        if (isAuthenticated && state.membership) {
          const [rs, ty] = await Promise.all([
            ApiClient.getChannelReadSummary(ch._id),
            ApiClient.getChannelTyping(ch._id),
          ])
          setReadSummary(rs)
          const selfId = user?._id
          setTypers((ty.typers || []).filter((t) => t.userId !== selfId))
        } else {
          try {
            const ty = await ApiClient.getChannelTyping(ch._id)
            const selfId = user?._id
            setTypers((ty.typers || []).filter((t) => t.userId !== selfId))
          } catch {
            setTypers([])
          }
        }
      } catch {
        // network / auth edge cases: ignore for polling
      }
    }

    const id = window.setInterval(tick, POLL_MS)
    const onVis = () => {
      if (document.visibilityState === "visible") tick()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [canViewFeed, state.channel, isAuthenticated, state.membership, user?._id, scrollToBottom])

  const handlePostCreated = (post: Post) => {
    if (!post?._id) return
    setPosts((prev) => mergePostsIncremental(prev, [post]))
    nearBottomRef.current = true
    requestAnimationFrame(() => scrollToBottom())
  }

  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId))
  }

  const handleDeleteChannelPost = async (postId: string) => {
    if (!confirm("Delete this message?")) return
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, { method: "DELETE", headers })
      const data = await response.json()
      if (data.success) {
        toast.success("Message deleted")
        handlePostDelete(postId)
      } else {
        toast.error(data.message || "Failed to delete")
      }
    } catch {
      toast.error("Failed to delete message")
    }
  }

  const lastOwnPostId = useMemo(() => {
    if (!user) return null
    const own = chronologicalPosts.filter(
      (p) => p.author._id === user._id || (!!user.email && user.email === p.author.email),
    )
    return own[own.length - 1]?._id ?? null
  }, [chronologicalPosts, user])

  const lastOwnReadReceipt = useMemo(
    () => readReceiptForLastOwnMessage(chronologicalPosts, user?._id, readSummary?.readers),
    [chronologicalPosts, user?._id, readSummary?.readers],
  )

  const typingLabel = useMemo(() => {
    const names = typers.slice(0, 3).map((t) => t.firstName || "Someone")
    if (names.length === 0) return null
    if (names.length === 1) return `${names[0]} is typing…`
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`
    if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]} are typing…`
    return `${names[0]} and ${typers.length - 1} others are typing…`
  }, [typers])

  if (loading) {
    return (
      <ChannelsSurface withAtmosphere className="flex min-h-0 flex-1 flex-col">
        <PageShell fullWidth chatMode className="relative">
          <div className="mx-auto max-w-5xl space-y-4 px-0 py-4">
            <div className="h-12 animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-28 animate-pulse rounded-[1.35rem] border border-border/50 bg-card/50" />
            <div className="space-y-3 pt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl border border-border/50 bg-card/50" />
              ))}
            </div>
          </div>
        </PageShell>
      </ChannelsSurface>
    )
  }

  if (error || !state.channel) {
    return (
      <ChannelsSurface withAtmosphere className="flex min-h-0 flex-1 flex-col">
        <PageShell fullWidth chatMode className="relative">
          <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
            <p className="text-sm font-medium text-destructive">{error || "Channel not found"}</p>
            <Button type="button" asChild variant="outline" className="mt-6 h-11 rounded-2xl">
              <Link href="/channels" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to channels
              </Link>
            </Button>
          </div>
        </PageShell>
      </ChannelsSurface>
    )
  }

  const showChatDock = !!(canViewFeed && isAuthenticated && state.membership && state.channel)
  const detailsHref = slug ? `/channels/${slug}/details` : "/channels"

  const feedSection = canViewFeed ? (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/95 via-card/85 to-muted/20 p-2 shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.06)] backdrop-blur-sm sm:p-3",
      )}
    >
      <ChannelChatThread
        ref={scrollRef}
        onScroll={handleMessagesScroll}
        reserveBottomForComposer={false}
        className="px-1 py-2 sm:px-2 sm:py-3"
      >
        {postsLoading && posts.length === 0 ? (
          <div className="space-y-3 px-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded bg-muted" />
                  <div className="h-16 rounded-2xl bg-muted/80" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Say hello and start the thread — messages appear here in order.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 pb-2">
            {chronologicalPosts.map((post) => {
              const isOwn =
                !!user &&
                (post.author._id === user._id || (!!user.email && user.email === post.author.email))
              const showReceipt = isOwn && post._id === lastOwnPostId && !!lastOwnReadReceipt
              return (
                <ChannelChatMessage
                  key={post._id}
                  post={post as ChannelChatPost}
                  isOwn={isOwn}
                  readReceipt={lastOwnReadReceipt}
                  showReadReceipt={showReceipt}
                  onDelete={isOwn ? handleDeleteChannelPost : undefined}
                />
              )
            })}
          </div>
        )}
      </ChannelChatThread>
      {showChatDock && state.channel ? (
        <ChannelChatComposerDock
          variant="inline"
          channelId={state.channel._id}
          typingLabel={typingLabel}
          onPostCreated={(p) => handlePostCreated(p as Post)}
          onTypingActivity={() => {
            ApiClient.setChannelTyping(state.channel!._id, true).catch(() => {})
          }}
          onTypingEnd={() => {
            ApiClient.setChannelTyping(state.channel!._id, false).catch(() => {})
          }}
        />
      ) : null}
    </div>
  ) : (
    <SectionCard
      className="mt-4"
      title={
        state.channel.type === "pro" && !premiumOk
          ? "Premium members only"
          : state.channel.type === "pro"
            ? "Members only"
            : "Private channel"
      }
      description={
        state.channel.type === "pro" && !premiumOk ? (
          <span>
            <Link href="/premium" className="font-medium text-primary underline-offset-4 hover:underline">
              Upgrade to Premium
            </Link>{" "}
            to view and join this channel.{" "}
            <Link href={detailsHref} className="text-muted-foreground underline-offset-4 hover:underline">
              Details
            </Link>
          </span>
        ) : (
          <span>
            Open{" "}
            <Link href={detailsHref} className="font-medium text-primary underline-offset-4 hover:underline">
              channel details
            </Link>{" "}
            to request access or learn more.
          </span>
        )
      }
    />
  )

  const pageContent = (
    <ChannelsSurface withAtmosphere className="flex min-h-0 flex-1 flex-col">
      <PageShell fullWidth chatMode className="relative flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
          <div className="sticky top-0 z-40 shrink-0 border-b border-border/60 bg-page/90 backdrop-blur-xl supports-[backdrop-filter]:bg-page/80">
            <div className="flex items-center gap-2 py-2 sm:gap-3 sm:py-3">
              <Link
                href="/channels"
                className="flex h-11 min-h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                aria-label="Back to channels"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Link
                href={detailsHref}
                className="min-w-0 flex-1 rounded-xl px-1 py-1 text-left outline-none ring-offset-background transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="sr-only">Open channel details for </span>
                <span className="block truncate text-base font-semibold leading-tight text-foreground sm:text-lg">
                  {state.channel.name}
                </span>
                <span className="sr-only"> — view description, members, and settings</span>
              </Link>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col px-0 py-2 sm:py-3">{feedSection}</div>
        </div>
      </PageShell>
    </ChannelsSurface>
  )

  // Allow public read for public channels; guard posting by isAuthenticated above
  return state.channel.type === "public" ? pageContent : <AuthGuard>{pageContent}</AuthGuard>
}
