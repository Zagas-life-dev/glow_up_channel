"use client"

/**
 * The Monday digest pop-up.
 *
 * Once a week, on the first visit from Monday on, it says the digest is ready
 * and "View" opens the Digest story. The digest itself lives in Stories now
 * (lib/stories); this is only the door to it. Shown for every signed-in user
 * with a digest story, except the 10% Stories holdout, who have none.
 */

import { useEffect, useRef, useState } from "react"
import { Sparkles } from "lucide-react"
import { useInterruption } from "@/lib/interruptions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { flushStoryEvents, openStoryViewer, patchStories, queueStoryEvent, useStories } from "@/lib/stories/store"
import { useStoriesKey } from "@/components/stories/stories-rail"

/** Lets the page settle before a pop-up lands on it. */
const SETTLE_MS = 2000

export default function DigestPopup() {
  const key = useStoriesKey()
  const { data } = useStories(key)
  const [settled, setSettled] = useState(false)
  const [open, setOpen] = useState(false)
  const shownRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [])

  const digest = data?.stories.find((s) => s.id === "digest")
  const wants = !!data?.digestPopup && !!digest && settled && !shownRef.current
  const granted = useInterruption("digest", wants)

  useEffect(() => {
    if (!granted || shownRef.current) return
    shownRef.current = true
    setOpen(true)
    // Recorded straight away: the server marks the week as shown on this event.
    queueStoryEvent({ type: "popup_shown", storyId: "digest", kind: "digest" })
    flushStoryEvents()
    patchStories({ digestPopup: false })
  }, [granted])

  if (!open || !digest) return null

  const view = () => {
    queueStoryEvent({ type: "popup_view", storyId: "digest", kind: "digest" })
    setOpen(false)
    openStoryViewer("digest", "popup")
  }

  const dismiss = () => {
    queueStoryEvent({ type: "popup_dismiss", storyId: "digest", kind: "digest" })
    flushStoryEvents()
    setOpen(false)
  }

  const closing = digest.items.filter((i) => i.closes !== null && i.closes - Date.now() <= 3 * 24 * 3600 * 1000).length

  return (
    <Dialog open onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="max-w-[400px] gap-0 overflow-hidden p-0">
        <div className="relative bg-up-navy px-6 pb-6 pt-7 text-up-on-navy">
          <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-36 -rotate-[8deg] rounded-up-xl bg-up-orange" />
          <span aria-hidden className="pointer-events-none absolute -right-2 top-8 h-16 w-20 rotate-[6deg] rounded-up-md bg-up-lime" />
          <DialogHeader className="relative text-left">
            <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-up-orange text-white">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <DialogTitle className="font-display text-2xl font-extrabold text-up-on-navy">Your Monday digest</DialogTitle>
            <DialogDescription className="text-up-on-navy-muted">
              {digest.items.length} picked for you
              {closing ? `, ${closing} closing within 3 days` : ", closing soon"}. Tap through in under a minute.
            </DialogDescription>
          </DialogHeader>
        </div>
        <ul className="space-y-1 px-6 pt-4">
          {digest.items.slice(0, 3).map((item) => (
            <li key={item.id} className="truncate text-sm font-medium text-foreground">
              · {item.title}
            </li>
          ))}
        </ul>
        <div className="flex gap-2 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:pb-6">
          <Button variant="outline" className="h-11 flex-1" onClick={dismiss}>
            Later
          </Button>
          <Button className="h-11 flex-1" onClick={view}>
            View
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
