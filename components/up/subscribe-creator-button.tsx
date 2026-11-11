"use client"

import { useEffect, useState } from "react"
import { RiNotification3Line, RiCheckLine, RiLoader4Line } from "react-icons/ri"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  getCreatorSubscription,
  subscribeToCreator,
  unsubscribeFromCreator,
  type CreatorSubscription,
} from "@/lib/subscriptions"
import { formatCount } from "@/lib/playlist-engagement"

/**
 * Subscribe to a creator (replaces Follow). Subscribing offers the quick toggle from
 * the spec: also subscribe to their public playlists. Shows the public subscriber
 * count beside it. Hidden on your own profile.
 */
export function SubscribeCreatorButton({
  creatorId,
  initialCount,
  size = "md",
  className,
  onSubscribed,
}: {
  creatorId: string
  initialCount?: number
  size?: "sm" | "md"
  className?: string
  /** Called after a subscribe; `alsoPlaylists` when their public lists were saved too. */
  onSubscribed?: (alsoPlaylists: boolean) => void
}) {
  const { user, isAuthenticated } = useAuth()
  const [state, setState] = useState<CreatorSubscription | null>(
    initialCount !== undefined ? { subscribed: false, alsoPlaylists: false, subscriberCount: initialCount } : null,
  )
  const [busy, setBusy] = useState(false)
  const isSelf = Boolean(user && user._id === creatorId)

  useEffect(() => {
    let live = true
    getCreatorSubscription(creatorId)
      .then((s) => live && setState(s))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [creatorId, isAuthenticated])

  const count = state?.subscriberCount ?? 0
  const label = count === 1 ? "1 subscriber" : `${formatCount(count)} subscribers`
  const height = size === "sm" ? "h-9 px-3 text-[13px]" : "h-11 px-4 text-sm"

  async function subscribe(alsoPlaylists: boolean) {
    setBusy(true)
    try {
      const next = await subscribeToCreator(creatorId, alsoPlaylists)
      setState(next)
      onSubscribed?.(alsoPlaylists)
      toast.success(
        alsoPlaylists && next.playlistsSubscribed
          ? `Subscribed, and to ${next.playlistsSubscribed} of their playlists`
          : "Subscribed",
      )
    } catch (err) {
      toast.error((err as Error).message || "Couldn't subscribe")
    } finally {
      setBusy(false)
    }
  }

  async function unsubscribe() {
    setBusy(true)
    try {
      setState(await unsubscribeFromCreator(creatorId))
    } catch (err) {
      toast.error((err as Error).message || "Couldn't unsubscribe")
    } finally {
      setBusy(false)
    }
  }

  if (isSelf) {
    return <span className={cn("text-[13px] tabular-nums text-muted-foreground", className)}>{label}</span>
  }

  if (!isAuthenticated) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Button asChild type="button" className={cn(height, "bg-primary text-primary-foreground hover:bg-primary/90")}>
          <a href="/login">Subscribe</a>
        </Button>
        <span className="text-[13px] tabular-nums text-muted-foreground">{label}</span>
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {state?.subscribed ? (
        <Button type="button" variant="outline" disabled={busy} onClick={unsubscribe} className={height} aria-pressed>
          {busy ? <RiLoader4Line className="mr-1.5 h-4 w-4 animate-spin" /> : <RiCheckLine className="mr-1.5 h-4 w-4" />}
          Subscribed
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" disabled={busy} className={cn(height, "bg-primary text-primary-foreground hover:bg-primary/90")}>
              {busy ? <RiLoader4Line className="mr-1.5 h-4 w-4 animate-spin" /> : <RiNotification3Line className="mr-1.5 h-4 w-4" />}
              Subscribe
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[15rem] p-1">
            <DropdownMenuItem onClick={() => subscribe(false)} className="cursor-pointer rounded-lg">
              Subscribe to this creator
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => subscribe(true)} className="cursor-pointer rounded-lg">
              Subscribe + all their public playlists
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <span className="text-[13px] tabular-nums text-muted-foreground">{label}</span>
    </span>
  )
}
