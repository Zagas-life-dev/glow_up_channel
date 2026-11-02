"use client"

/**
 * Mounts the one story viewer, in the app layout, so a story can open from the
 * rail, the Monday pop-up or a link (`?story=<id>`, and `?digest=open` from
 * digest pushes sent before Stories replaced the digest) on any page.
 *
 * The story order is frozen when the viewer opens: the rail sorts seen stories
 * last, and re-sorting mid-viewing would move the story under the user's thumb.
 */

import { useEffect, useRef, useState } from "react"
import { closeStoryViewer, openStoryViewer, useStories, useStoryViewer } from "@/lib/stories/store"
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

export default function StoryViewerHost() {
  const key = useStoriesKey()
  const { data } = useStories(key)
  const viewer = useStoryViewer()
  const pending = useRef<string | null | undefined>(undefined)
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

  useEffect(() => {
    if (!viewer) setFrozen(null)
    else if (!frozen && data) setFrozen(orderStories(data.stories))
  }, [viewer, data, frozen])

  if (!viewer || !frozen || !data) return null
  const startIndex = frozen.findIndex((s) => s.id === viewer.storyId)
  if (startIndex === -1) return null

  // Saved playlists and seen ids change while it is open; take them from the live copy.
  const live = new Map(data.stories.map((s) => [s.id, s]))
  const stories = frozen.map((s) => ({ ...s, savedPlaylistId: live.get(s.id)?.savedPlaylistId ?? s.savedPlaylistId }))

  return (
    <StoryViewer
      key={`${viewer.storyId}:${viewer.source}`}
      stories={stories}
      startIndex={startIndex}
      source={viewer.source}
      showTutorial={!data.tutorialDone}
      onClose={closeStoryViewer}
    />
  )
}
