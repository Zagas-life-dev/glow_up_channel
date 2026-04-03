"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ApiClient, { Channel, ChannelMembership } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { hasPremiumAccess } from "@/lib/roles"
import AuthGuard from "@/components/auth-guard"
import { PageShell } from "@/components/layout/page-shell"
import { ArrowLeft, MessageCircle, Users } from "lucide-react"
import { ChannelsSurface } from "../../_components/channels-surface"
import { cn } from "@/lib/utils"

interface ChannelPageState {
  channel: Channel | null
  membership: ChannelMembership | null
}

/** Bottom dock mirrors channel chat composer: fixed, blur, safe-area — keeps thumbs reach on mobile. */
function DetailsBottomDock({
  chatHref,
  children,
}: {
  chatHref: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[90]",
        "border-t border-border/60 bg-page/95 backdrop-blur-xl",
        "shadow-[0_-12px_40px_-12px_hsl(222_47%_6%/0.22)] dark:shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.42)]",
      )}
      role="region"
      aria-label="Channel actions"
    >
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-6 lg:px-8">
        <div
          className={cn(
            "flex flex-col gap-2.5 pt-3",
            "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
          )}
        >
          <Button
            type="button"
            asChild
            className="h-12 min-h-12 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md shadow-primary/25"
          >
            <Link href={chatHref} className="inline-flex items-center justify-center gap-2">
              <MessageCircle className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
              Open chat
            </Link>
          </Button>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function ChannelDetailsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params?.slug as string
  const { isAuthenticated, user } = useAuth()
  const premiumOk = hasPremiumAccess({ isPremium: user?.isPremium, role: user?.role })
  const [state, setState] = useState<ChannelPageState>({ channel: null, membership: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joinLoading, setJoinLoading] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [joinStatus, setJoinStatus] = useState<"idle" | "pending" | "joined">("idle")
  const [showInvitePanel, setShowInvitePanel] = useState(false)

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
          if (data.membership) setJoinStatus("joined")
          else setJoinStatus("idle")
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
              : prev,
          )
          setJoinStatus("joined")
        } else if (res.status === "pending") {
          setJoinStatus("pending")
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setJoinLoading(false)
      }
    }
    joinViaInvite()
    return () => {
      cancelled = true
    }
  }, [searchParams, state.channel, state.membership, isAuthenticated])

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
            : prev,
        )
        setJoinStatus("joined")
      }
      if (res.status === "pending") setJoinStatus("pending")
    } catch {
      // ignore
    } finally {
      setJoinLoading(false)
    }
  }

  const chatHref = slug ? `/channels/${slug}` : "/channels"

  const showJoinInDock = !!state.channel && !state.membership
  const channelForDock = state.channel

  const dockJoinRow = showJoinInDock && channelForDock ? (
      <div className="flex w-full flex-col gap-2 xs:flex-row xs:flex-wrap">
        {isAuthenticated && channelForDock.type === "public" && (
          <Button
            type="button"
            onClick={handleJoin}
            disabled={joinLoading}
            variant="outline"
            className="h-11 min-h-11 flex-1 rounded-2xl border-border/80 bg-card/80 text-body-sm font-semibold"
          >
            {joinLoading ? "Joining…" : "Join channel"}
          </Button>
        )}
        {isAuthenticated && channelForDock.type === "private" && (
          <Button
            type="button"
            onClick={handleJoin}
            disabled={joinLoading || joinStatus === "pending"}
            variant="outline"
            className="h-11 min-h-11 flex-1 rounded-2xl border-border/80 bg-card/80 text-body-sm font-semibold"
          >
            {joinStatus === "pending" ? "Request sent" : joinLoading ? "Requesting…" : "Request to join"}
          </Button>
        )}
        {isAuthenticated && channelForDock.type === "pro" && premiumOk && (
          <Button
            type="button"
            onClick={handleJoin}
            disabled={joinLoading || joinStatus === "pending"}
            variant="outline"
            className="h-11 min-h-11 flex-1 rounded-2xl border-border/80 bg-card/80 text-body-sm font-semibold"
          >
            {joinStatus === "pending" ? "Request sent" : joinLoading ? "Requesting…" : "Request to join"}
          </Button>
        )}
        {isAuthenticated && channelForDock.type === "pro" && !premiumOk && (
          <Button type="button" asChild variant="outline" className="h-11 min-h-11 flex-1 rounded-2xl border-border/80">
            <Link href="/premium">Upgrade to Premium</Link>
          </Button>
        )}
        {!isAuthenticated && channelForDock.type === "public" && (
          <Button type="button" asChild variant="outline" className="h-11 min-h-11 flex-1 rounded-2xl border-border/80">
            <Link href="/login">Sign in to join</Link>
          </Button>
        )}
        {!isAuthenticated && channelForDock.type === "private" && (
          <Button type="button" asChild variant="outline" className="h-11 min-h-11 flex-1 rounded-2xl border-border/80">
            <Link href="/login">Sign in to request access</Link>
          </Button>
        )}
        {!isAuthenticated && channelForDock.type === "pro" && (
          <Button type="button" asChild variant="outline" className="h-11 min-h-11 flex-1 rounded-2xl border-border/80">
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>
    ) : null

  const scrollBottomPad = showJoinInDock
    ? "pb-[calc(8.75rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(9.25rem+env(safe-area-inset-bottom,0px))]"
    : "pb-[calc(5.85rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))]"

  if (loading) {
    return (
      <ChannelsSurface withAtmosphere className="flex min-h-0 flex-1 flex-col font-sans">
        <PageShell fullWidth chatMode className="relative flex min-h-0 flex-1 flex-col">
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-3 sm:px-4">
            <div className="shrink-0 border-b border-border/50 py-3">
              <div className="h-11 w-11 animate-pulse rounded-2xl bg-muted/70" />
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain py-4">
              <div className="h-36 animate-pulse rounded-[1.35rem] bg-muted/50" />
              <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
            </div>
          </div>
        </PageShell>
      </ChannelsSurface>
    )
  }

  if (error || !state.channel) {
    return (
      <ChannelsSurface withAtmosphere className="flex min-h-0 flex-1 flex-col font-sans">
        <PageShell fullWidth chatMode className="relative flex min-h-0 flex-1 flex-col">
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-12 text-center">
            <p className="text-body-sm font-medium text-destructive">{error || "Channel not found"}</p>
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

  const ch = state.channel

  const page = (
    <ChannelsSurface withAtmosphere className="flex min-h-0 flex-1 flex-col font-sans">
      <PageShell fullWidth chatMode className="relative flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
          <header className="sticky top-0 z-30 shrink-0 border-b border-border/60 bg-page/90 backdrop-blur-xl supports-[backdrop-filter]:bg-page/78">
            <div className="flex items-start gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
              <Link
                href={chatHref}
                className="flex h-11 min-h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted/90 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Back to channel chat"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-overline font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
                <h1 className="text-display-sm font-semibold tracking-tight text-foreground sm:text-display-md">
                  {ch.name}
                </h1>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div
              className={cn(
                "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
                scrollBottomPad,
                "px-3 pt-3 sm:px-4 sm:pt-4",
              )}
            >
              <div className="space-y-4 sm:space-y-5">
                <section
                  className={cn(
                    "overflow-hidden rounded-[1.35rem] border border-border/60",
                    "bg-gradient-to-b from-card/95 via-card/88 to-muted/15",
                    "shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.07)]",
                  )}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-6">
                    <div
                      className={cn(
                        "mx-auto flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl sm:mx-0 sm:h-20 sm:w-20",
                        "border border-primary/35 bg-gradient-to-br from-primary/28 to-primary/5",
                        "shadow-[0_12px_40px_-16px_hsl(var(--primary)/0.45)]",
                      )}
                    >
                      <span className="text-display-md font-bold text-primary sm:text-display-lg">#</span>
                    </div>
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <span
                          className={cn(
                            "rounded-xl border px-2.5 py-1 text-caption font-semibold uppercase tracking-wide",
                            ch.type === "public"
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : ch.type === "pro"
                                ? "border-amber-500/40 bg-amber-500/12 text-amber-900 dark:text-amber-400"
                                : "border-border/70 bg-muted/50 text-muted-foreground",
                          )}
                        >
                          {ch.type === "pro" ? "Pro" : ch.type}
                        </span>
                        {state.membership ? (
                          <span className="rounded-xl border border-primary/35 bg-primary/12 px-2.5 py-1 text-caption font-semibold uppercase tracking-wide text-primary">
                            {state.membership.role}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1.5 text-body-sm tabular-nums text-muted-foreground">
                          <Users className="h-4 w-4 opacity-80" aria-hidden />
                          {ch.memberCount} member{ch.memberCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      {ch.description ? (
                        <p className="mt-4 text-body leading-relaxed text-muted-foreground sm:text-body-lg">{ch.description}</p>
                      ) : (
                        <p className="mt-4 text-body-sm text-muted-foreground">No description yet.</p>
                      )}
                    </div>
                  </div>
                </section>

                {ch.isOwner && (
                  <section className="rounded-2xl border border-border/55 bg-muted/25 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-display-sm font-bold tracking-tight text-foreground">Members &amp; requests</h2>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 min-h-10 rounded-xl text-caption sm:h-9"
                          onClick={async () => {
                            setMembersLoading(true)
                            try {
                              const [m, r] = await Promise.all([
                                ApiClient.getChannelMembers(ch._id),
                                ApiClient.getChannelJoinRequests(ch._id),
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
                        {(ch.type === "private" || ch.type === "pro") && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 min-h-10 rounded-xl text-caption sm:h-9"
                            onClick={() => setShowInvitePanel((prev) => !prev)}
                          >
                            {showInvitePanel ? "Hide invite link" : "Invite users"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {showInvitePanel && (
                      <div className="mt-4 rounded-2xl border border-border/55 bg-card/60 p-4 text-caption backdrop-blur-sm space-y-3">
                        <p className="text-muted-foreground leading-relaxed">
                          Share this link with people you want to add. When they open it while signed in, they&apos;ll be added
                          automatically.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            readOnly
                            value={
                              typeof window !== "undefined"
                                ? `${window.location.origin}/channels/${ch.slug}?invite=1`
                                : `/channels/${ch.slug}?invite=1`
                            }
                            className="min-w-0 flex-1 rounded-xl border border-border/60 bg-muted/50 px-3 py-2.5 text-caption text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 shrink-0 rounded-full text-caption"
                            onClick={() => {
                              if (typeof window === "undefined" || !navigator?.clipboard) return
                              navigator.clipboard.writeText(`${window.location.origin}/channels/${ch.slug}?invite=1`).catch(() => {})
                            }}
                          >
                            Copy link
                          </Button>
                        </div>
                      </div>
                    )}

                    {membersOpen && (
                      <div className="mt-4 space-y-5 border-t border-border/40 pt-4">
                        <div>
                          <h3 className="mb-2 text-overline font-semibold uppercase tracking-wider text-muted-foreground">
                            Members
                          </h3>
                          {members.length === 0 ? (
                            <p className="text-caption text-muted-foreground">No members yet.</p>
                          ) : (
                            <ul className="max-h-48 space-y-1.5 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]">
                              {members.map((m) => (
                                <li
                                  key={m.userId}
                                  className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/40 px-3 py-2.5 text-caption"
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
                          <h3 className="mb-2 text-overline font-semibold uppercase tracking-wider text-muted-foreground">
                            Join requests
                          </h3>
                          {requests.length === 0 ? (
                            <p className="text-caption text-muted-foreground">No pending requests.</p>
                          ) : (
                            <ul className="max-h-48 space-y-1.5 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]">
                              {requests.map((r) => (
                                <li
                                  key={r.userId}
                                  className="flex flex-col gap-2 rounded-xl border border-border/40 bg-muted/40 px-3 py-2.5 sm:flex-row sm:items-center"
                                >
                                  <span className="text-caption">{r.user?.firstName || r.user?.email || "User"}</span>
                                  <span className="flex gap-1.5 sm:ml-auto">
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      className="h-8 rounded-lg text-caption"
                                      onClick={async () => {
                                        await ApiClient.approveChannelJoinRequest(ch._id, r.userId)
                                        setRequests((prev) => prev.filter((x) => x.userId !== r.userId))
                                      }}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      className="h-8 rounded-lg text-caption"
                                      onClick={async () => {
                                        await ApiClient.rejectChannelJoinRequest(ch._id, r.userId)
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
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>

        <DetailsBottomDock chatHref={chatHref}>{dockJoinRow}</DetailsBottomDock>
      </PageShell>
    </ChannelsSurface>
  )

  return ch.type === "public" ? page : <AuthGuard>{page}</AuthGuard>
}
