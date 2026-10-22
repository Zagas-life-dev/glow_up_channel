"use client"

/**
 * The Monday digest (A/B test, group A only — see lib/digest/api.ts).
 *
 * Opens by itself on the first visit from Monday on, until it has been seen
 * once that week. Opening the digest push (`?digest=open`) shows it again
 * whether or not it was seen. Group B and everyone outside the test get a null
 * digest and this never renders.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CalendarClock, ListChecks, Bookmark, Sparkles, Check } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useInterruption } from "@/lib/interruptions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  fetchDigest,
  logDigestEvent,
  saveDigest,
  trackAllDigest,
  type Digest,
  type DigestItem,
} from "@/lib/digest/api"

/** Lets the page settle before a pop-up lands on it. */
const SETTLE_MS = 2000

/** `?digest=open` from the push. Read once, then removed from the address bar. */
function takeOpenParam(): boolean {
  if (typeof window === "undefined") return false
  const url = new URL(window.location.href)
  if (url.searchParams.get("digest") !== "open") return false
  url.searchParams.delete("digest")
  url.searchParams.delete("src")
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
  return true
}

function ItemRow({ item, onOpen }: { item: DigestItem; onOpen: (item: DigestItem) => void }) {
  return (
    <li>
      <Link
        href={`${item.url}?src=digest`}
        onClick={() => onOpen(item)}
        className="flex items-start justify-between gap-3 rounded-up-md px-3 py-2.5 transition-colors hover:bg-muted"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
          {item.org ? <span className="block truncate text-xs text-muted-foreground">{item.org}</span> : null}
        </span>
        {item.closesLabel ? (
          <span
            className={
              item.section === "expiring"
                ? "shrink-0 rounded-full bg-up-orange-tint px-2 py-0.5 text-[11px] font-semibold text-up-orange-ink"
                : "shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            }
          >
            {item.closesLabel}
          </span>
        ) : null}
      </Link>
    </li>
  )
}

function Section({
  title,
  icon: Icon,
  items,
  onOpen,
}: {
  title: string
  icon: typeof Sparkles
  items: DigestItem[]
  onOpen: (item: DigestItem) => void
}) {
  if (items.length === 0) return null
  return (
    <section>
      <h3 className="mb-1 flex items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {title}
      </h3>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  )
}

export default function DigestPopup() {
  const { user } = useAuth()
  // Keyed on the id: the user object is replaced once its profile loads, and a
  // second fetch would otherwise race the first.
  const userId = user?._id || user?.id || null
  /** Read once per page load, before anything can strip it. */
  const pushedRef = useRef<boolean | null>(null)
  const pushLogged = useRef(false)
  const [digest, setDigest] = useState<Digest | null>(null)
  const [fromPush, setFromPush] = useState(false)
  const [settled, setSettled] = useState(false)
  const [open, setOpen] = useState(false)
  const [closed, setClosed] = useState(false)
  const [busy, setBusy] = useState<"save" | "track" | null>(null)

  useEffect(() => {
    if (pushedRef.current === null) pushedRef.current = takeOpenParam()
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchDigest().then((d) => {
      if (cancelled || !d) return
      setDigest(d)
      if (pushedRef.current) {
        setFromPush(true)
        if (!pushLogged.current) {
          pushLogged.current = true
          logDigestEvent("push_open")
        }
      }
    })
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [userId])

  const wants = !!digest && digest.items.length > 0 && !closed && (fromPush || (!digest.seen && settled))
  // The push open is something they just did, so it never waits for the slot.
  const granted = useInterruption("digest", wants && !fromPush)
  const show = wants && (fromPush || granted)

  useEffect(() => {
    if (show && !open) {
      setOpen(true)
      logDigestEvent("shown")
    }
  }, [show, open])

  const close = useCallback(() => {
    setOpen(false)
    setClosed(true)
    logDigestEvent("dismissed")
  }, [])

  const onOpenItem = useCallback((item: DigestItem) => {
    logDigestEvent("item_click", item.id)
    setOpen(false)
    setClosed(true)
  }, [])

  const onSave = async () => {
    setBusy("save")
    const r = await saveDigest()
    setBusy(null)
    if (!r?.ok) return toast.error("Couldn't save your digest. Try again.")
    setDigest((d) => (d ? { ...d, savedPlaylistId: r.playlistId ?? d.savedPlaylistId } : d))
    toast.success("Saved to your playlists", {
      action: r.playlistId ? { label: "Open", onClick: () => (window.location.href = `/playlists/${r.playlistId}`) } : undefined,
    })
  }

  const onTrackAll = async () => {
    setBusy("track")
    const r = await trackAllDigest()
    setBusy(null)
    if (!r?.ok) return toast.error("Couldn't add these to your tracker. Try again.")
    setDigest((d) => (d ? { ...d, trackedAll: true } : d))
    toast.success(
      r.added ? `${r.added} added to your tracker. We'll remind you before each one closes.` : "These are already on your tracker.",
      { action: { label: "Open tracker", onClick: () => (window.location.href = "/tracker") } },
    )
  }

  if (!digest || !open) return null
  const recommended = digest.items.filter((i) => i.section === "recommended")
  const expiring = digest.items.filter((i) => i.section === "expiring")

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="flex max-h-[88vh] max-w-[460px] flex-col gap-4 overflow-hidden p-0">
        <DialogHeader className="px-5 pt-5">
          <span className="mb-2 grid h-11 w-11 place-items-center rounded-up-md bg-up-orange-tint text-up-orange-ink">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <DialogTitle>Your Monday digest</DialogTitle>
          <DialogDescription>Picked for you this week, plus what closes soon. Tap one to open it.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2">
          <Section title="Picked for you" icon={Sparkles} items={recommended} onOpen={onOpenItem} />
          <Section title="Closing soon" icon={CalendarClock} items={expiring} onOpen={onOpenItem} />
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:pb-4">
          <Button variant="outline" className="h-11 flex-1" onClick={onSave} disabled={busy !== null || !!digest.savedPlaylistId}>
            {digest.savedPlaylistId ? <Check className="mr-2 h-4 w-4" aria-hidden /> : <Bookmark className="mr-2 h-4 w-4" aria-hidden />}
            {digest.savedPlaylistId ? "Saved" : busy === "save" ? "Saving…" : "Save digest"}
          </Button>
          <Button className="h-11 flex-1" onClick={onTrackAll} disabled={busy !== null || digest.trackedAll}>
            {digest.trackedAll ? <Check className="mr-2 h-4 w-4" aria-hidden /> : <ListChecks className="mr-2 h-4 w-4" aria-hidden />}
            {digest.trackedAll ? "On your tracker" : busy === "track" ? "Adding…" : "Track all"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
