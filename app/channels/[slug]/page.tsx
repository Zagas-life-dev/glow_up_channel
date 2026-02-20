"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ApiClient, { Channel, ChannelMembership } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import AuthGuard from "@/components/auth-guard"
import PostComposer from "@/components/post-composer"
import PostCard from "@/components/post-card"
import FeedAd from "@/components/feed-ad"
import { buildFeedWithAds } from "@/lib/feed-ads"
import { cn } from "@/lib/utils"
import { PageShell } from "@/components/layout/page-shell"
import { PageHeader } from "@/components/layout/page-header"
import { SectionCard } from "@/components/layout/section-card"

interface ChannelPageState {
  channel: Channel | null
  membership: ChannelMembership | null
}

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
    images: { url: string; publicId?: string }[]
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
  likeCount: number
  replyCount: number
  repostCount: number
  bookmarkCount: number
  isRepost: boolean
  originalPost?: string
  repostedBy?: { _id: string; email: string; firstName?: string }
  createdAt: string
  updatedAt: string
  isEdited: boolean
  hasLiked?: boolean
  hasBookmarked?: boolean
  hasReposted?: boolean
}

export default function ChannelDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params?.slug as string
  const { isAuthenticated } = useAuth()
  const [state, setState] = useState<ChannelPageState>({ channel: null, membership: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [joinLoading, setJoinLoading] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [joinStatus, setJoinStatus] = useState<"idle" | "pending" | "joined">("idle")
  const [showInvitePanel, setShowInvitePanel] = useState(false)

  const canViewFeed =
    state.channel &&
    (state.channel.type === "public" || (state.channel.type === "private" && !!state.membership))

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
          if (data.membership) {
            setJoinStatus("joined")
          }
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
          setJoinStatus("joined")
        } else if (res.status === "pending") {
          setJoinStatus("pending")
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
        const data = await ApiClient.getChannelPosts(state.channel._id, { page: 1, limit: 20 })
        setPosts(data.posts || [])
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

  const handleJoin = async () => {
    if (!state.channel) return
    setJoinLoading(true)
    try {
      const res = await ApiClient.joinChannel(state.channel._id)
      if (res.status === "joined") {
        setState((prev) =>
          prev.channel
            ? {
              channel: { ...prev.channel, memberCount: prev.channel.memberCount + 1 },
              membership: { role: "member", joinedAt: new Date().toISOString() },
            }
            : prev
        )
        setJoinStatus("joined")
      }
      if (res.status === "pending") {
        setJoinStatus("pending")
      }
    } catch (err) {
      // show toast in future
    } finally {
      setJoinLoading(false)
    }
  }

  const handlePostCreated = (post: Post) => {
    if (!post?._id) return
    setPosts((prev) => [post, ...prev])
  }

  const handlePostUpdate = (updated: Post) => {
    if (!updated?._id) return
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)))
  }

  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId))
  }

  if (loading) {
    return (
      <PageShell className="flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading channel…</p>
      </PageShell>
    )
  }

  if (error || !state.channel) {
    return (
      <PageShell className="flex flex-col items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">{error || "Channel not found"}</p>
          <Link href="/channels" className="text-xs text-primary underline">
            Back to channels
          </Link>
        </div>
      </PageShell>
    )
  }

  const headerActions = (
    <div className="flex gap-2 flex-wrap">
      {!state.membership && isAuthenticated && state.channel.type === "public" && (
        <Button size="sm" onClick={handleJoin} disabled={joinLoading} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-md shadow-orange-500/20 font-semibold">
          {joinLoading ? "Joining…" : "Join channel"}
        </Button>
      )}
      {!state.membership && isAuthenticated && state.channel.type === "private" && (
        <Button size="sm" onClick={handleJoin} disabled={joinLoading || joinStatus === "pending"} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-md shadow-orange-500/20 font-semibold">
          {joinStatus === "pending" ? "Request sent" : joinLoading ? "Requesting…" : "Request to join"}
        </Button>
      )}
      {!isAuthenticated && state.channel.type === "public" && (
        <Link href="/login">
          <Button size="sm" variant="outline" className="rounded-full border-border/70">
            Sign in to join
          </Button>
        </Link>
      )}
      {!isAuthenticated && state.channel.type === "private" && (
        <Link href="/login">
          <Button size="sm" variant="outline" className="rounded-full border-border/70">
            Sign in to request access
          </Button>
        </Link>
      )}
    </div>
  )

  const feedSection = canViewFeed ? (
    <div className="space-y-4 mt-4">
      {isAuthenticated && state.membership && state.channel && (
        <div className="pt-2 pb-4 border-b border-border/50">
          <PostComposer
            onPostCreated={handlePostCreated}
            channelId={state.channel._id}
            placeholder="Share something with this channel…"
          />
        </div>
      )}
      <div className="pt-4 space-y-4">
        {postsLoading && posts.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-full rounded-2xl bg-card/80 border border-border/70 overflow-hidden animate-pulse"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                  <div className="h-48 bg-muted rounded-xl mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <SectionCard
            className="mt-4 text-center"
            title="No posts in this channel yet"
            description="Start the conversation by sharing something with this group."
          />
        ) : (
          <div className="space-y-4">
            {buildFeedWithAds(posts, { adEvery: 5 }).map((item) =>
              item.type === "post" ? (
                <PostCard
                  key={item.post._id}
                  post={item.post}
                  onUpdate={handlePostUpdate}
                  onDelete={handlePostDelete}
                />
              ) : (
                <FeedAd key={item.key} slotId={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT || ""} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  ) : (
    <SectionCard
      className="mt-4"
      title="Private channel"
      description="Join to see posts and participate in the conversation."
    />
  )

  const pageContent = (
    <PageShell fullWidth>
      <div className="max-w-5xl mx-auto pt-4 pb-10 space-y-6">
        <PageHeader
          title={state.channel.name}
          description={
            state.channel.description || `${state.channel.memberCount} member${state.channel.memberCount === 1 ? "" : "s"}`
          }
          icon={<span className="text-lg font-bold">#</span>}
          actions={headerActions}
        />

        <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/70 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-orange-400 text-xl font-bold">#</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="font-bold text-base text-foreground">{state.channel.name}</h2>
                <span className={cn(
                  "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full",
                  state.channel.type === "public"
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-muted text-muted-foreground border border-border/60"
                )}>
                  {state.channel.type}
                </span>
                {state.membership && (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {state.membership.role}
                  </span>
                )}
              </div>
              {state.channel.description && (
                <p className="text-xs text-muted-foreground">{state.channel.description}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                {state.channel.memberCount} member{state.channel.memberCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {state.channel.isOwner && (
            <div className="mt-4 rounded-2xl border border-border/60 bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-sm font-semibold">Members & requests</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={async () => {
                      if (!state.channel) return
                      setMembersLoading(true)
                      try {
                        const [m, r] = await Promise.all([
                          ApiClient.getChannelMembers(state.channel._id),
                          ApiClient.getChannelJoinRequests(state.channel._id),
                        ])
                        setMembers(m.members || [])
                        setRequests(r.requests || [])
                        setMembersOpen(true)
                      } finally {
                        setMembersLoading(false)
                      }
                    }}
                  >
                    {membersLoading ? "Loading…" : "View members"}
                  </Button>
                  {state.channel.type === "private" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowInvitePanel((prev) => !prev)}
                    >
                      {showInvitePanel ? "Hide invite link" : "Invite users"}
                    </Button>
                  )}
                </div>
              </div>

              {showInvitePanel && state.channel && (
                <div className="rounded-2xl border border-border/60 bg-muted/40 backdrop-blur-sm p-4 text-xs space-y-3">
                  <p className="text-muted-foreground">
                    Share this link with people you want to add to the channel. When they open it while signed in, they&apos;ll be added automatically.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== "undefined"
                          ? `${window.location.origin}/channels/${state.channel.slug}?invite=1`
                          : `/channels/${state.channel.slug}?invite=1`
                      }
                      className="flex-1 px-3 py-2 rounded-xl border border-border/60 bg-muted/60 text-[11px] truncate focus:outline-none focus:border-orange-500/60"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs whitespace-nowrap rounded-full border-border/60 hover:bg-muted/60"
                      onClick={() => {
                        if (typeof window === "undefined" || !navigator?.clipboard || !state.channel) return
                        const url = `${window.location.origin}/channels/${state.channel.slug}?invite=1`
                        navigator.clipboard.writeText(url).catch(() => {
                          // ignore clipboard errors silently
                        })
                      }}
                    >
                      Copy link
                    </Button>
                  </div>
                </div>
              )}

              {membersOpen && (
                <div className="space-y-4 pt-2">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Members
                    </h3>
                    {members.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No members yet.</p>
                    ) : (
                      <ul className="space-y-1 max-h-40 overflow-y-auto pr-1 text-xs">
                        {members.map((m) => (
                          <li
                            key={m.userId}
                            className="flex items-center gap-2 rounded bg-muted px-3 py-2"
                          >
                            <span>
                              {m.user?.firstName || m.user?.email || "User"} • {m.role}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Join requests
                    </h3>
                    {requests.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No pending requests.</p>
                    ) : (
                      <ul className="space-y-1 max-h-40 overflow-y-auto pr-1 text-xs">
                        {requests.map((r) => (
                          <li
                            key={r.userId}
                            className="flex items-center gap-2 rounded bg-muted px-3 py-2"
                          >
                            <span>{r.user?.firstName || r.user?.email || "User"}</span>
                            <span className="ml-auto flex gap-1">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={async () => {
                                  if (!state.channel) return
                                  await ApiClient.approveChannelJoinRequest(state.channel._id, r.userId)
                                  setRequests((prev) => prev.filter((x) => x.userId !== r.userId))
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={async () => {
                                  if (!state.channel) return
                                  await ApiClient.rejectChannelJoinRequest(state.channel._id, r.userId)
                                  setRequests((prev) => prev.filter((x) => x.userId !== r.userId))
                                }}
                              >
                                Reject
                              </Button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {feedSection}
        </div>
      </div>
    </PageShell>
  )

  // Allow public read for public channels; guard posting by isAuthenticated above
  return state.channel.type === "public" ? pageContent : <AuthGuard>{pageContent}</AuthGuard>
}
