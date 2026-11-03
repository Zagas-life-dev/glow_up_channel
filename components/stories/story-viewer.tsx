"use client"

/**
 * The full-screen story viewer.
 *
 * Tap the right of a slide for the next one, the left to go back; hold to
 * pause; swipe sideways for the next or previous story; swipe down to close.
 * Each story is at most 5 listings and an end card, where "Save all to
 * playlist" sits next to what they did in it.
 *
 * Everything is reported through the story event queue (lib/stories/store),
 * sent in one batch when the viewer closes. Going past the first slide counts
 * as engagement (`story_engaged`); opening and leaving on slide one does not.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Bookmark, BookmarkCheck, ChevronRight, ExternalLink, ListPlus, Pause, X, Check } from "lucide-react"
import ApiClient from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useOptionalTracker } from "@/contexts/tracker-context"
import { cleanUrl } from "@/lib/url-utils"
import { setTrackingSurface, trackApply, trackSave, trackStoryEngaged } from "@/lib/tracking"
import { saveStoryToPlaylist, type Story, type StoryItem } from "@/lib/stories/api"
import {
  closeStoryViewer,
  flushStoryEvents,
  markSeen,
  newSessionId,
  patchStories,
  queueStoryEvent,
  rememberStoryReturn,
  setSavedPlaylist,
  type ViewerSource,
} from "@/lib/stories/store"
import { storyDisc, storyIcon, storySlide } from "@/components/stories/story-look"
import { cn } from "@/lib/utils"

const SLIDE_MS = 7000
const HOLD_MS = 220
/** Movement before a press becomes a drag rather than a tap. */
const DRAG_START_PX = 8
/** A drag commits past a quarter of the width, or on a flick faster than this (px/ms). */
const COMMIT_SHARE = 0.25
const FLICK_SPEED = 0.45
const CLOSE_PX = 110
const SLIDE_EASE = "cubic-bezier(0.22, 0.8, 0.24, 1)"
const SLIDE_TIME_MS = 320

const PLURAL = { opportunity: "opportunities", job: "jobs", event: "events" } as const
const KIND_LABEL = { opportunity: "Opportunity", job: "Job", event: "Event" } as const

/** "Closes in 14h 22m" inside 48 hours, ticking; the day label beyond that. */
function useCountdown(item: StoryItem | undefined): string | null {
  const [now, setNow] = useState(() => Date.now())
  const closes = item?.closes ?? null
  const near = closes !== null && closes - now <= 48 * 3600 * 1000
  useEffect(() => {
    if (!near) return
    const t = setInterval(() => setNow(Date.now()), 30 * 1000)
    return () => clearInterval(t)
  }, [near])
  if (!item) return null
  if (closes === null) return null
  const left = closes - now
  if (left <= 0) return "Closed"
  if (!near) return item.closesLabel ? item.closesLabel.replace(/^closes/, "Closes") : null
  const h = Math.floor(left / 3600000)
  const m = Math.floor((left % 3600000) / 60000)
  const verb = item.type === "event" ? "Starts" : "Closes"
  return h > 0 ? `${verb} in ${h}h ${m}m` : `${verb} in ${m}m`
}

function Tutorial({ onDone }: { onDone: () => void }) {
  const tips = [
    { title: "Tap right", body: "for the next listing" },
    { title: "Tap left", body: "to go back" },
    { title: "Swipe", body: "to jump to the next story" },
    { title: "Hold", body: "to pause and read" },
  ]
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-[rgba(11,18,51,0.92)] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white backdrop-blur-[2px]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[30%] border-r border-dashed border-white/30" aria-hidden />
      <p className="font-display text-2xl font-bold leading-tight">How stories work</p>
      <ul className="mt-4 space-y-2.5">
        {tips.map((tip) => (
          <li key={tip.title} className="flex items-baseline gap-2 text-[15px]">
            <span className="font-bold text-white underline decoration-up-orange decoration-2 underline-offset-4">{tip.title}</span>
            <span className="text-white/85">{tip.body}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onDone}
        className="mt-6 h-12 w-full rounded-full bg-white text-[15px] font-bold text-up-navy active:scale-[0.98]"
      >
        Got it
      </button>
    </div>
  )
}

/**
 * A neighbouring story as it will look when it arrives: its colours, header
 * and the listing it will open on. Drawn beside the current story so a swipe
 * shows the next one sliding in, not a jump.
 */
function StoryCover({ story, first, side }: { story: Story; first: number; side: -1 | 1 }) {
  const look = storySlide(story)
  const Icon = storyIcon(story)
  const item = story.items[first]
  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 flex flex-col overflow-hidden sm:rounded-[28px]", look.bg)}
      style={{ transform: `translateX(${side * 100}%)` }}
    >
      <div className="flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {[...story.items, null].map((_, i) => (
          <div key={i} className="h-[3px] flex-1 rounded-full bg-white/25" />
        ))}
      </div>
      <div className="flex items-center gap-2.5 px-4 pt-3">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full ring-2 ring-white/20", storyDisc(story))}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">{story.title}</p>
          <p className="truncate text-xs leading-tight text-white/70">{story.reason || story.subtitle}</p>
        </div>
      </div>
      {item ? (
        <div className="px-6 pt-6">
          <p className={cn("text-xs font-bold uppercase tracking-[0.14em]", look.accent)}>{KIND_LABEL[item.type]}</p>
          {item.org ? <p className="mt-3 truncate text-base font-semibold text-white/75">{item.org}</p> : null}
          <p className="mt-1 line-clamp-4 font-display text-[clamp(1.75rem,7.5vw,2.25rem)] font-extrabold leading-[1.06]">{item.title}</p>
        </div>
      ) : null}
    </div>
  )
}

export function StoryViewer({
  stories,
  startIndex,
  startFrame,
  source,
  showTutorial,
  onClose,
}: {
  stories: Story[]
  startIndex: number
  /** Open on this slide (coming back from a listing) instead of the first unseen. */
  startFrame?: number
  source: ViewerSource
  showTutorial: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const tracker = useOptionalTracker()

  const firstFrame = useCallback((story: Story) => {
    const i = story.items.findIndex((item) => !story.seenIds.includes(item.id))
    return i === -1 ? 0 : i
  }, [])

  const [storyIdx, setStoryIdx] = useState(startIndex)
  const [frame, setFrame] = useState(() =>
    startFrame !== undefined ? Math.min(startFrame, stories[startIndex].items.length) : firstFrame(stories[startIndex]),
  )
  const [held, setHeld] = useState(false)
  const [tutorial, setTutorial] = useState(showTutorial)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [savingAll, setSavingAll] = useState(false)

  const story = stories[storyIdx]
  const isEnd = frame >= story.items.length
  const item = isEnd ? undefined : story.items[frame]
  const paused = held || tutorial
  const look = storySlide(story)
  const Icon = storyIcon(story)
  const countdown = useCountdown(item)

  /* ---------------------------------------------------------- session + events */

  const session = useRef({ id: newSessionId(), frames: new Set<number>(), engaged: false, storyId: story.id })
  const frameStart = useRef(Date.now())
  const how = useRef<"open" | "swipe" | "auto">("open")
  /** Bumped on every move to another story; an open is logged once per visit. */
  const visit = useRef(0)
  const openedVisit = useRef(-1)

  // A new session each time a story opens. Keyed on the visit, not the effect
  // run, so React's dev double-mount does not log two opens.
  useEffect(() => {
    if (openedVisit.current === visit.current) return
    openedVisit.current = visit.current
    session.current = { id: newSessionId(), frames: new Set<number>(), engaged: false, storyId: story.id }
    queueStoryEvent({
      type: "open",
      storyId: story.id,
      kind: story.kind,
      session: session.current.id,
      source: how.current === "open" ? source : how.current,
    })
  }, [story.id, story.kind, source])

  // Each listing slide: mark seen now, report the dwell when it is left.
  // Frames are counted as a set, and a slide left within 100ms is not reported:
  // both keep React's dev double-mount and a doubled tap from inflating counts.
  useEffect(() => {
    if (!item) return
    frameStart.current = Date.now()
    markSeen(story.id, item.id)
    const s = session.current
    s.frames.add(frame)
    if (s.frames.size >= 2 && !s.engaged) {
      s.engaged = true
      trackStoryEngaged(story.id)
    }
    const sessionId = s.id
    return () => {
      const dwellMs = Date.now() - frameStart.current
      if (dwellMs < 100) return
      queueStoryEvent({
        type: "frame_view",
        storyId: story.id,
        kind: story.kind,
        listingId: item.id,
        frame,
        dwellMs,
        session: sessionId,
      })
    }
  }, [item, story.id, story.kind, frame])

  // Actions taken in here are story actions, wherever the helper reports them from.
  useEffect(() => {
    setTrackingSurface("story")
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    return () => {
      setTrackingSurface(null)
      document.body.style.overflow = overflow
      flushStoryEvents()
    }
  }, [])

  const log = useCallback(
    (type: Parameters<typeof queueStoryEvent>[0]["type"], extra: Partial<Parameters<typeof queueStoryEvent>[0]> = {}) =>
      queueStoryEvent({ type, storyId: story.id, kind: story.kind, session: session.current.id, frame, ...extra }),
    [story.id, story.kind, frame],
  )

  /* ---------------------------------------------------------- navigation */

  const close = useCallback(() => {
    if (!isEnd) log("exit")
    onClose()
  }, [isEnd, log, onClose])

  /* ---------------------------------------------------------- motion */

  // Drag and slide are written straight to the DOM, never through state: a
  // re-render per pointer move is what makes a swipe feel stiff.
  const trackRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const sliding = useRef(false)

  // A swipe is motion the user starts and steers, so it always animates. With
  // reduced motion asked for, it is shorter rather than gone: snapping with no
  // movement at all reads as broken (Windows turns this on with "Animation
  // effects" off, which many people never chose).
  const reducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  const duration = (ms: number) => (reducedMotion() ? Math.min(ms, 200) : ms)

  /** Place the track at (x, y). The current story shrinks a little as it leaves. */
  const setTrack = useCallback((x: number, y: number, ms = 0) => {
    const track = trackRef.current
    const pane = paneRef.current
    if (!track || !pane) return
    const w = track.offsetWidth || 1
    const h = track.offsetHeight || 1
    const across = Math.min(1, Math.abs(x) / w)
    const down = Math.max(0, y)
    const t = ms > 0 ? `${duration(ms)}ms ${SLIDE_EASE}` : null
    track.style.transition = t ? `transform ${t}, opacity ${t}` : "none"
    pane.style.transition = t ? `transform ${t}, border-radius ${t}` : "none"
    track.style.transform = `translate3d(${x}px, ${down}px, 0)`
    track.style.opacity = String(1 - Math.min(0.6, down / h))
    pane.style.transform = `scale(${1 - across * 0.07 - Math.min(0.12, down / 1500)})`
    pane.style.borderRadius = x || down ? "28px" : ""
  }, [])

  // A new story arrives centred, before paint, whatever the track was doing.
  useLayoutEffect(() => {
    setTrack(0, 0)
  }, [storyIdx, setTrack])

  /** Slide the track one story over, then switch to it. */
  const slide = useCallback(
    (dir: 1 | -1, then: () => void) => {
      if (sliding.current) return
      const w = trackRef.current?.offsetWidth || 0
      if (!w) return then()
      sliding.current = true
      setTrack(-dir * w, 0, SLIDE_TIME_MS)
      setTimeout(() => {
        sliding.current = false
        then()
      }, duration(SLIDE_TIME_MS))
    },
    [setTrack],
  )

  const goStory = useCallback(
    (to: number, via: "swipe" | "auto") => {
      if (to < 0) {
        setTrack(0, 0, 260)
        setFrame(0)
        return
      }
      if (to >= stories.length) {
        // Past the last story: it slides away and the viewer closes.
        slide(1, onClose)
        return
      }
      slide(to > storyIdx ? 1 : -1, () => {
        how.current = via
        visit.current++
        setStoryIdx(to)
        setFrame(firstFrame(stories[to]))
      })
    },
    [stories, storyIdx, onClose, firstFrame, slide, setTrack],
  )

  const next = useCallback(
    (via: "tap" | "auto") => {
      if (via === "tap") log("tap_next")
      if (frame < story.items.length) {
        if (frame === story.items.length - 1) log("complete")
        setFrame(frame + 1)
      } else {
        goStory(storyIdx + 1, "auto")
      }
    },
    [frame, story.items.length, storyIdx, goStory, log],
  )

  const back = useCallback(() => {
    log("tap_back")
    if (frame > 0) setFrame(frame - 1)
    else if (storyIdx > 0) {
      slide(-1, () => {
        how.current = "swipe"
        visit.current++
        const prev = stories[storyIdx - 1]
        setStoryIdx(storyIdx - 1)
        setFrame(prev.items.length)
      })
    }
  }, [frame, storyIdx, stories, log, slide])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      else if (e.key === "ArrowRight") next("tap")
      else if (e.key === "ArrowLeft") back()
      else if (e.key === " ") {
        e.preventDefault()
        setHeld((h) => !h)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close, next, back])

  /* ---------------------------------------------------------- gestures */

  type Press = {
    x: number
    y: number
    t: number
    timer: ReturnType<typeof setTimeout> | null
    held: boolean
    /** Locked once the finger has moved: sideways swipes stories, down closes. */
    axis: "x" | "y" | null
  }
  const press = useRef<Press | null>(null)
  /** No finger taps twice inside 120ms: a second press that fast is a doubled event. */
  const lastPress = useRef(0)

  /** The drag distance after the edges resist: nothing before the first story. */
  const resist = (dx: number) => (dx > 0 && storyIdx === 0 ? dx * 0.3 : dx)

  const onPointerDown = (e: React.PointerEvent) => {
    if (tutorial || sliding.current) return
    if (Date.now() - lastPress.current < 120) return
    lastPress.current = Date.now()
    // Keeps the drag ours when the finger leaves the slide. It throws for a
    // pointer the browser no longer tracks; the drag still works without it.
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    } catch {}
    const p: Press = { x: e.clientX, y: e.clientY, t: Date.now(), timer: null, held: false, axis: null }
    p.timer = setTimeout(() => {
      p.held = true
      setHeld(true)
      log("pause")
    }, HOLD_MS)
    press.current = p
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.held) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    if (!p.axis) {
      if (Math.hypot(dx, dy) < DRAG_START_PX) return
      p.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
      if (p.timer) clearTimeout(p.timer)
      // A drag pauses the slide timer the same way holding does.
      setHeld(true)
    }
    if (p.axis === "x") setTrack(resist(dx), 0)
    else setTrack(0, dy)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const p = press.current
    press.current = null
    if (!p) return
    if (p.timer) clearTimeout(p.timer)
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    const speed = Math.abs(dx) / Math.max(1, Date.now() - p.t)

    if (p.axis === "x") {
      setHeld(false)
      const w = trackRef.current?.offsetWidth || 1
      const commit = Math.abs(dx) > w * COMMIT_SHARE || speed > FLICK_SPEED
      if (commit && dx < 0) {
        log("swipe_next")
        if (!isEnd) log("exit")
        goStory(storyIdx + 1, "swipe")
      } else if (commit && dx > 0 && storyIdx > 0) {
        log("swipe_prev")
        if (!isEnd) log("exit")
        goStory(storyIdx - 1, "swipe")
      } else {
        setTrack(0, 0, 260)
      }
      return
    }
    if (p.axis === "y") {
      setHeld(false)
      if (dy > CLOSE_PX) {
        if (!isEnd) log("exit")
        setTrack(0, trackRef.current?.offsetHeight || 800, 260)
        setTimeout(onClose, duration(240))
      } else {
        setTrack(0, 0, 260)
      }
      return
    }
    if (p.held) {
      setHeld(false)
      return
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (e.clientX - rect.left < rect.width * 0.3) back()
    else next("tap")
  }

  const onPointerCancel = () => {
    const p = press.current
    press.current = null
    if (!p) return
    if (p.timer) clearTimeout(p.timer)
    if (p.held || p.axis) setHeld(false)
    if (p.axis) setTrack(0, 0, 260)
  }

  /* ---------------------------------------------------------- actions */

  /**
   * Go to another page. The viewer lives in the app layout and outlives the
   * route, so it has to close first or it keeps covering the page it opened.
   *
   * `comeBack` is for a listing: coming back from it reopens this story on
   * this slide (story-viewer-host), the way back works in other story apps.
   */
  const leaveTo = (path: string, comeBack = false) => {
    if (!isEnd) log("exit")
    if (comeBack) {
      rememberStoryReturn({
        storyId: story.id,
        frame,
        order: stories.map((s) => s.id),
        from: window.location.pathname,
        to: path.split("?")[0],
      })
    }
    onClose()
    router.push(path)
  }

  const toSignIn = (path: string) => leaveTo(`/login?callbackUrl=${encodeURIComponent(path)}`)

  const onSave = async (it: StoryItem) => {
    if (!isAuthenticated) return toSignIn(it.url)
    const was = saved.has(it.id)
    setSaved((s) => {
      const n = new Set(s)
      if (was) n.delete(it.id)
      else n.add(it.id)
      return n
    })
    try {
      if (was) await ApiClient.unsaveItem(PLURAL[it.type], it.id)
      else {
        await ApiClient.saveItem(PLURAL[it.type], it.id)
        trackSave(it.type, it.id)
        log("save", { listingId: it.id })
        toast.success("Saved")
      }
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase()
      // Already saved elsewhere: keep it shown as saved.
      if (!was && msg.includes("already")) return
      setSaved((s) => {
        const n = new Set(s)
        if (was) n.add(it.id)
        else n.delete(it.id)
        return n
      })
      toast.error("Couldn't save that. Try again.")
    }
  }

  const onApply = (it: StoryItem) => {
    if (!isAuthenticated) return toSignIn(it.url)
    log("apply", { listingId: it.id })
    if (!it.applyUrl) {
      leaveTo(`${it.url}?src=story`, true)
      return
    }
    setApplied((s) => new Set(s).add(it.id))
    ApiClient.recordApply(it.type, it.id).catch(() => {})
    trackApply(it.type, it.id)
    void tracker?.startTracking(it.type, it.id, "story")
    window.open(cleanUrl(it.applyUrl), "_blank", "noopener,noreferrer")
  }

  const onSaveAll = async () => {
    if (!isAuthenticated) return toSignIn("/")
    if (story.savedPlaylistId) return leaveTo(`/playlists/${story.savedPlaylistId}`)
    setSavingAll(true)
    const r = await saveStoryToPlaylist(story.id)
    setSavingAll(false)
    if (!r?.ok || !r.playlistId) return toast.error("Couldn't save this story. Try again.")
    log("save_all")
    setSavedPlaylist(story.id, r.playlistId)
    const playlistId = r.playlistId
    // The toast can outlive the viewer, so it closes it through the store.
    toast.success("Saved to your playlists", {
      action: {
        label: "Open",
        onClick: () => {
          closeStoryViewer()
          router.push(`/playlists/${playlistId}`)
        },
      },
    })
  }

  const finishTutorial = () => {
    setTutorial(false)
    patchStories({ tutorialDone: true })
    queueStoryEvent({ type: "tutorial_done" })
    try {
      localStorage.setItem("up-stories-tutorial", "1")
    } catch {
      // Signed-in users have it stored server-side anyway.
    }
  }

  const sessionSaved = story.items.filter((i) => saved.has(i.id)).length
  const sessionApplied = story.items.filter((i) => applied.has(i.id)).length
  const segments = useMemo(() => [...story.items.map((i) => i.id), "end"], [story.items])

  /* ---------------------------------------------------------- render */

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${story.title} story`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black sm:bg-up-scrim sm:backdrop-blur-md"
    >
      {/* Stage: a window onto a track of three panes — the previous story's
          cover, this story, the next story's cover. Dragging moves the track
          under the finger, so the next story slides in beside this one. */}
      <div className="relative h-[100dvh] w-full select-none overflow-hidden bg-black text-white sm:h-[min(860px,94dvh)] sm:max-w-[440px] sm:rounded-[28px] sm:shadow-up-pop">
      <div ref={trackRef} className="absolute inset-0 will-change-transform">
        {stories[storyIdx - 1] ? <StoryCover story={stories[storyIdx - 1]} first={firstFrame(stories[storyIdx - 1])} side={-1} /> : null}
        {stories[storyIdx + 1] ? <StoryCover story={stories[storyIdx + 1]} first={firstFrame(stories[storyIdx + 1])} side={1} /> : null}
      <div
        ref={paneRef}
        className={cn("absolute inset-0 flex flex-col overflow-hidden will-change-transform sm:rounded-[28px]", look.bg)}
      >
        {/* Progress: one segment per listing, then the end card. */}
        <div className="relative z-20 flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {segments.map((id, i) => (
            <div key={id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              {i < frame ? (
                <div className="h-full w-full bg-white" />
              ) : i === frame && !isEnd ? (
                <div
                  key={`${story.id}:${frame}`}
                  className="h-full w-full origin-left bg-white"
                  style={{
                    animation: `story-fill ${SLIDE_MS}ms linear forwards`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                  onAnimationEnd={() => next("auto")}
                />
              ) : i === frame && isEnd ? (
                <div className="h-full w-full bg-white" />
              ) : null}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="relative z-20 flex items-center gap-2.5 px-4 pt-3">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full ring-2 ring-white/20", storyDisc(story))}>
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{story.title}</p>
            <p className="truncate text-xs leading-tight text-white/70">{story.reason || story.subtitle}</p>
          </div>
          {paused && !tutorial ? <Pause className="h-4 w-4 text-white/80" aria-label="Paused" /> : null}
          <button
            type="button"
            onClick={close}
            aria-label="Close stories"
            className="grid h-10 w-10 place-items-center rounded-full text-white/90 hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Slide: the gesture surface. Buttons below sit outside it. */}
        <div
          className="relative z-10 flex min-h-0 flex-1 touch-none flex-col px-6 pb-4 pt-6"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          {item ? (
            <div key={item.id} className="flex min-h-0 flex-1 flex-col motion-safe:animate-[story-in_260ms_ease-out]">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt=""
                  draggable={false}
                  className="mb-5 h-36 w-full shrink-0 rounded-[20px] object-cover ring-1 ring-white/10"
                />
              ) : null}
              <p className={cn("text-xs font-bold uppercase tracking-[0.14em]", look.accent)}>
                {KIND_LABEL[item.type]}
                {item.place ? <span className="text-white/60"> · {item.place}</span> : null}
              </p>
              {item.org ? <p className="mt-3 truncate text-base font-semibold text-white/75">{item.org}</p> : null}
              <h2 className="mt-1 line-clamp-4 font-display text-[clamp(1.75rem,7.5vw,2.25rem)] font-extrabold leading-[1.06] tracking-[-0.01em]">
                {item.title}
              </h2>
              {item.blurb ? <p className="mt-4 line-clamp-3 text-[15px] leading-snug text-white/75">{item.blurb}</p> : null}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                {countdown ? (
                  <span className={cn("rounded-full px-3 py-1.5 text-sm font-bold tabular-nums", look.pill)}>{countdown}</span>
                ) : null}
                {item.carry > 0 ? (
                  <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/85">Still open since yesterday</span>
                ) : null}
              </div>
            </div>
          ) : (
            <div key="end" className="flex flex-1 flex-col motion-safe:animate-[story-in_260ms_ease-out]">
              <p className={cn("text-xs font-bold uppercase tracking-[0.14em]", look.accent)}>That&apos;s the story</p>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,8vw,2.5rem)] font-extrabold leading-[1.04]">{story.title}</h2>
              <dl className="mt-8 grid grid-cols-3 gap-2">
                {[
                  { n: story.items.length, label: "seen" },
                  { n: sessionSaved, label: "saved" },
                  { n: sessionApplied, label: "applied" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[18px] bg-white/10 px-3 py-4">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd className="font-display text-4xl font-extrabold tabular-nums leading-none">{stat.n}</dd>
                    <dd className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-white/65">{stat.label}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-auto pt-6 text-sm text-white/60">
                {storyIdx < stories.length - 1 ? "Tap for the next story" : "Fresh stories tomorrow"}
              </p>
            </div>
          )}
          {tutorial ? <Tutorial onDone={finishTutorial} /> : null}
        </div>

        {/* Actions */}
        <div className="relative z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
          {item ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSave(item)}
                  aria-pressed={saved.has(item.id)}
                  className="flex h-12 items-center gap-2 rounded-full bg-white/15 px-5 text-[15px] font-semibold backdrop-blur active:scale-[0.97]"
                >
                  {saved.has(item.id) ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                  {saved.has(item.id) ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => onApply(item)}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white text-[15px] font-bold text-up-navy active:scale-[0.98]"
                >
                  {applied.has(item.id) ? <Check className="h-5 w-5" /> : null}
                  {applied.has(item.id) ? "On your tracker" : item.type === "event" ? "Register" : "Apply"}
                  {!applied.has(item.id) ? (item.applyUrl ? <ExternalLink className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />) : null}
                </button>
              </div>
              <Link
                href={`${item.url}?src=story`}
                onClick={(e) => {
                  log("open_listing", { listingId: item.id })
                  // A new tab (ctrl/cmd/middle click) keeps the story open here.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                  e.preventDefault()
                  leaveTo(`${item.url}?src=story`, true)
                }}
                className="mx-auto mt-2 flex w-fit items-center gap-0.5 px-3 py-1.5 text-[13px] font-medium text-white/75 hover:text-white"
              >
                See full details <ChevronRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onSaveAll}
                disabled={savingAll}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-white text-[15px] font-bold text-up-navy active:scale-[0.98] disabled:opacity-70"
              >
                {story.savedPlaylistId ? <Check className="h-5 w-5" /> : <ListPlus className="h-5 w-5" />}
                {story.savedPlaylistId ? "Saved · open playlist" : savingAll ? "Saving…" : "Save all to playlist"}
              </button>
              <button
                type="button"
                onClick={() => goStory(storyIdx + 1, "auto")}
                className="flex h-12 items-center justify-center gap-1 rounded-full bg-white/15 text-[15px] font-semibold"
              >
                {storyIdx < stories.length - 1 ? (
                  <>
                    Next story <ChevronRight className="h-5 w-5" />
                  </>
                ) : (
                  "Done"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}
