"use client"

/**
 * The row of story rings at the top of the home feed.
 *
 * Unseen stories wear the orange ring, seen ones a grey hairline, and a story
 * with something closing within 24 hours pulses until it is seen. Unseen
 * stories sort first so the next thing to watch is always on the left.
 */

import { useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { openStoryViewer, useRingImpression, useStories } from "@/lib/stories/store"
import type { Story } from "@/lib/stories/api"
import { storyDisc, storyIcon } from "@/components/stories/story-look"
import { cn } from "@/lib/utils"

export function useStoriesKey(): string | null {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  const id = isAuthenticated ? user?._id || user?.id : null
  return id ? `user:${id}` : "guest"
}

/** Unseen first, keeping the server's order inside each half. */
export function orderStories(stories: Story[]): Story[] {
  return [...stories.filter((s) => !s.seen), ...stories.filter((s) => s.seen)]
}

function Ring({ story, onOpen }: { story: Story; onOpen: () => void }) {
  const Icon = storyIcon(story)
  return (
    <li className="w-[72px] shrink-0">
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full flex-col items-center gap-1.5 rounded-up-md outline-none focus-visible:ring-2 focus-visible:ring-up-orange"
        aria-label={`${story.title}${story.seen ? ", seen" : ""}${story.urgent && !story.seen ? ", closing within a day" : ""}`}
      >
        <span
          className={cn(
            "relative grid h-[66px] w-[66px] place-items-center rounded-full p-[3px] transition-transform duration-200 group-active:scale-95",
            story.seen
              ? "bg-up-sep"
              : "bg-[conic-gradient(from_210deg,#FF6A00,#FF8A3D,#D6FF3F,#FF6A00)]",
            story.urgent && !story.seen && "motion-safe:animate-[story-pulse_1.8s_ease-in-out_infinite]",
          )}
        >
          <span className="grid h-full w-full place-items-center rounded-full bg-background p-[2px]">
            <span className={cn("grid h-full w-full place-items-center rounded-full", storyDisc(story), story.seen && "opacity-70")}>
              <Icon className="h-6 w-6" aria-hidden />
            </span>
          </span>
          {story.urgent && !story.seen ? (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border-2 border-background bg-up-orange px-1.5 text-[9px] font-bold uppercase leading-[14px] tracking-wide text-white">
              Today
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "line-clamp-2 w-full text-center text-[11px] leading-tight",
            story.seen ? "text-muted-foreground" : "font-semibold text-foreground",
          )}
        >
          {story.title}
        </span>
      </button>
    </li>
  )
}

export function StoriesRail({ className }: { className?: string }) {
  const key = useStoriesKey()
  const { data, loading } = useStories(key)
  const stories = useMemo(() => orderStories(data?.stories ?? []), [data?.stories])
  const ids = useMemo(() => stories.map((s) => s.id), [stories])
  useRingImpression(ids)

  if (loading && !data) {
    return (
      <div className={cn("-mx-4 flex gap-3 overflow-hidden px-4 sm:mx-0 sm:px-0", className)} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
            <div className="h-[66px] w-[66px] animate-pulse rounded-full bg-up-fill" />
            <div className="h-2.5 w-12 animate-pulse rounded-full bg-up-hairline" />
          </div>
        ))}
      </div>
    )
  }
  if (stories.length === 0) return null

  return (
    <nav aria-label="Stories" className={className}>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 pt-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {stories.map((story) => (
          <Ring key={story.id} story={story} onOpen={() => openStoryViewer(story.id, "rail")} />
        ))}
      </ul>
    </nav>
  )
}
