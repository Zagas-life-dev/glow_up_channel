"use client"

/**
 * Playlists → Subscriptions: the creators you subscribe to, each with their newest
 * public playlists. One request (GET /api/creators/subscriptions carries the lists).
 * Unsubscribing keeps the row in place with a Subscribe button, so a mis-tap is one
 * tap to undo; it drops off on the next visit.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { RiCheckLine, RiLoader4Line, RiNotification3Line, RiUserFollowLine, RiArrowRightSLine } from "react-icons/ri"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PlaylistCover } from "@/components/playlists/playlist-cover"
import { formatCount } from "@/lib/playlist-engagement"
import { matchScore } from "@/lib/search-rank"
import {
  getMySubscriptions,
  subscribeToCreator,
  unsubscribeFromCreator,
  type SubscribedCreator,
} from "@/lib/subscriptions"

export function creatorName(c: Pick<SubscribedCreator, "firstName" | "lastName">) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "UP creator"
}

/** Narrow to a search: the creator's name in full, their playlist names at half. */
export function searchCreators(list: SubscribedCreator[], term: string) {
  if (!term) return list
  return list
    .map((c, index) => ({
      c,
      index,
      match: Math.max(matchScore(creatorName(c), term), ...(c.playlists ?? []).map((p) => matchScore(p.name, term) * 0.5), 0),
    }))
    .filter((e) => e.match > 0)
    .sort((a, b) => b.match - a.match || a.index - b.index)
    .map((e) => e.c)
}

function Avatar({ c }: { c: SubscribedCreator }) {
  const name = creatorName(c)
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
      {c.profileImage ? (
        <Image src={c.profileImage} alt="" width={48} height={48} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-up-lime">
          <span className="font-display text-lg font-bold text-up-navy">{name.charAt(0).toUpperCase()}</span>
        </div>
      )}
    </div>
  )
}

function CreatorRow({ c, onCount }: { c: SubscribedCreator; onCount: (delta: number) => void }) {
  const [subscribed, setSubscribed] = useState(true)
  const [count, setCount] = useState(c.subscriberCount)
  const [busy, setBusy] = useState(false)
  const name = creatorName(c)
  // Older backends send neither field; treat that as no lists.
  const lists = c.playlists ?? []
  const total = c.publicPlaylistCount ?? lists.length

  async function toggle() {
    setBusy(true)
    try {
      const next = subscribed ? await unsubscribeFromCreator(c.creatorId) : await subscribeToCreator(c.creatorId, false)
      setSubscribed(next.subscribed)
      setCount(next.subscriberCount)
      onCount(next.subscribed ? 1 : -1)
      if (!next.subscribed) toast.success(`Unsubscribed from ${name}`)
    } catch (err) {
      toast.error((err as Error).message || "Couldn't update the subscription")
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="px-[18px] py-4" data-creator-id={c.creatorId}>
      <div className="flex items-center gap-3">
        <Link href={`/profile/${c.creatorId}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-up-md outline-none focus-visible:ring-2 focus-visible:ring-up-orange">
          <Avatar c={c} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-foreground">{name}</p>
            <p className="text-[13px] tabular-nums text-muted-foreground">
              {count === 1 ? "1 subscriber" : `${formatCount(count)} subscribers`}
              <span aria-hidden> · </span>
              {total === 1 ? "1 playlist" : `${total} playlists`}
            </p>
          </div>
        </Link>
        <Button
          type="button"
          variant={subscribed ? "outline" : "default"}
          disabled={busy}
          onClick={toggle}
          aria-pressed={subscribed}
          className="h-9 shrink-0 px-3 text-[13px]"
        >
          {busy ? (
            <RiLoader4Line className="mr-1.5 h-4 w-4 animate-spin" />
          ) : subscribed ? (
            <RiCheckLine className="mr-1.5 h-4 w-4" />
          ) : (
            <RiNotification3Line className="mr-1.5 h-4 w-4" />
          )}
          {subscribed ? "Subscribed" : "Subscribe"}
        </Button>
      </div>

      {lists.length > 0 ? (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {lists.map((p) => (
            <li key={p._id} className="group relative flex items-center gap-2.5 rounded-up-lg bg-up-fill p-2 transition-colors hover:bg-up-hairline">
              <PlaylistCover seed={p._id} types={[]} empty={p.itemCount === 0} imageUrl={p.coverImage} className="h-11 w-11 shrink-0" />
              <div className="min-w-0">
                <Link href={`/playlists/${p._id}`} className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground before:absolute before:inset-0 group-hover:text-up-orange-ink">
                  {p.name}
                </Link>
                <p className="text-xs tabular-nums text-muted-foreground">{p.itemCount === 1 ? "1 item" : `${p.itemCount} items`}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-muted-foreground">No public playlists yet. You'll hear when they publish one.</p>
      )}
      {total > lists.length ? (
        <Link href={`/profile/${c.creatorId}`} className="mt-2 inline-flex items-center text-[13px] font-semibold text-up-orange-ink hover:underline">
          See all {total} playlists
          <RiArrowRightSLine className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </li>
  )
}

export function SubscriptionsTab({ search, onCount }: { search: string; onCount?: (n: number) => void }) {
  const [creators, setCreators] = useState<SubscribedCreator[] | null>(null)
  const [failed, setFailed] = useState(false)
  // Live count for the tab badge: unsubscribing here counts down at once.
  const [active, setActive] = useState<number | null>(null)
  useEffect(() => {
    if (active !== null) onCount?.(active)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report only when the count moves
  }, [active])

  useEffect(() => {
    let live = true
    getMySubscriptions()
      .then((d) => {
        if (!live) return
        setCreators(d.creators)
        setActive(d.creators.length)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])

  if (failed) {
    return <p className="mt-8 text-center text-sm text-muted-foreground">Couldn't load your subscriptions. Pull to refresh or try again in a moment.</p>
  }

  if (creators === null) {
    return (
      <ul className="overflow-hidden rounded-up-xl border border-border bg-card divide-y divide-up-hairline" aria-busy="true">
        {[...Array(3)].map((_, i) => (
          <li key={i} className="animate-pulse px-[18px] py-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-up-fill" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded-full bg-up-fill" />
                <div className="h-3 w-1/4 rounded-full bg-up-hairline" />
              </div>
            </div>
            <div className="mt-3 h-14 rounded-up-lg bg-up-fill" />
          </li>
        ))}
      </ul>
    )
  }

  const shown = searchCreators(creators, search)

  if (shown.length === 0) {
    return (
      <div className="mx-auto mt-8 max-w-sm animate-fade-in-up rounded-up-xl border border-dashed border-border bg-card px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-up-md bg-up-fill">
          <RiUserFollowLine className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">
          {search ? `No creators match “${search}”` : "No subscriptions yet"}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {search ? "Try a different word, or another tab." : "Subscribe to creators to see their new playlists here."}
        </p>
        {!search ? (
          <Button asChild className="mt-6 h-11 px-6">
            <Link href="/playlists">Find creators in Discover</Link>
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <ul className="overflow-hidden rounded-up-xl border border-border bg-card divide-y divide-up-hairline">
      {shown.map((c) => (
        <CreatorRow key={c.creatorId} c={c} onCount={(d) => setActive((n) => Math.max(0, (n ?? 0) + d))} />
      ))}
    </ul>
  )
}
