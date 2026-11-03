"use client"

/**
 * Mounts the one story viewer, in the app layout, so a story can open from the
 * rail, the Monday pop-up or a link (`?story=<id>`, and `?digest=open` from
 * digest pushes sent before Stories replaced the digest) on any page.
 *
 * The story order is frozen when the viewer opens: the rail sorts seen stories
 * last, and re-sorting mid-viewing would move the story under the user's thumb.
 *
 * Coming back from a listing a story opened puts the user back in that story,
 * on that slide, in the same order (lib/stories/store `rememberStoryReturn`).
 */

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import {
  clearStoryReturn,
  closeStoryViewer,
  openStoryViewer,
  peekStoryReturn,
  useStories,
  useStoryViewer,
} from "@/lib/stories/store"
import type { Story } from "@/lib/stories/api"
import { StoryViewer } from "@/components/stories/story-viewer"
import { orderStories, useStoriesKey } from "@/components/stories/stories-rail"

/** `?story=` or `?digest=open`, read once and removed from the address bar. */
function takeStoryParam(): string | null {
  if (typeof window === "undefined") return null
  const url = new URL(window.location.href)
  const story = url.searchParams.get("story") || (url.searchParams.get("digest") === "open" ? "digest" : null)
  if (!story) return null
  url.searchParams.delete("story")
  url.searchParams.delete("digest")
  url.searchParams.delete("src")
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
  return story
}

/** `stories` in the order of `ids`, anything new after. */
function inOrder(stories: Story[], ids: string[]): Story[] {
  const rank = new Map(ids.map((id, i) => [id, i]))
  return [...stories].sort((a, b) => (rank.get(a.id) ?? ids.length) - (rank.get(b.id) ?? ids.length))
}

export default function StoryViewerHost() {
  const key = useStoriesKey()
  const { data } = useStories(key)
  const viewer = useStoryViewer()
  const pathname = usePathname()
  const pending = useRef<string | null | undefined>(undefined)
  const previousPath = useRef<string | null>(null)
  const returnOrder = useRef<string[] | null>(null)
  const [frozen, setFrozen] = useState<Story[] | null>(null)

  useEffect(() => {
    if (pending.current === undefined) pending.current = takeStoryParam()
  }, [])

  // A story asked for by link opens once the stories are in.
  useEffect(() => {
    const wanted = pending.current
    if (!wanted || !data) return
    pending.current = null
    if (data.stories.some((s) => s.id === wanted)) openStoryViewer(wanted, "link")
  }, [data])

  // Back from the listing a story opened, onto the page the story was open on:
  // reopen it where they left. Any other move away from the listing drops it.
  useEffect(() => {
    const from = previousPath.current
    previousPath.current = pathname
    const trip = peekStoryReturn()
    if (!trip || !from || from === pathname) return
    if (from === trip.to && pathname === trip.from && data) {
      clearStoryReturn()
      if (!data.stories.some((s) => s.id === trip.storyId)) return
      returnOrder.current = trip.order
      openStoryViewer(trip.storyId, "return", trip.frame)
    } else if (pathname !== trip.to) {
      clearStoryReturn()
    }
  }, [pathname, data])

  useEffect(() => {
    if (!viewer) {
      setFrozen(null)
      returnOrder.current = null
    } else if (!frozen && data) {
      setFrozen(returnOrder.current ? inOrder(data.stories, returnOrder.current) : orderStories(data.stories))
    }
  }, [viewer, data, frozen])

  if (!viewer || !frozen || !data) return null
  const startIndex = frozen.findIndex((s) => s.id === viewer.storyId)
  if (startIndex === -1) return null

  // Saved playlists and seen ids change while it is open; take them from the live copy.
  const live = new Map(data.stories.map((s) => [s.id, s]))
  const stories = frozen.map((s) => ({ ...s, savedPlaylistId: live.get(s.id)?.savedPlaylistId ?? s.savedPlaylistId }))

  return (
    <StoryViewer
      key={`${viewer.storyId}:${viewer.source}:${viewer.frame ?? ""}`}
      stories={stories}
      startIndex={startIndex}
      startFrame={viewer.frame}
      source={viewer.source}
      showTutorial={!data.tutorialDone}
      onClose={closeStoryViewer}
    />
  )
}
