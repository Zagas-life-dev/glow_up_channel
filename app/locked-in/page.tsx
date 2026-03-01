"use client"

import { useState, useEffect, useCallback } from "react"
import { useLockedIn, type LockedInTodoItem } from "@/contexts/locked-in-context"
import AuthGuard from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import ApiClient from "@/lib/api-client"
import FeedSponsoredSlot, { type PromotedContentItem } from "@/components/feed-sponsored-slot"
import FeedAd from "@/components/feed-ad"

const ADSENSE_FEED_SLOT = process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT || ""
const PROMOTED_REFRESH_MS = 20000

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

function LockedInWithStats() {
  const { statsInvalidatedAt } = useLockedIn()
  const [stats, setStats] = useState<{ liveCount: number; totalToday: number }>({ liveCount: 0, totalToday: 0 })

  const fetchStats = useCallback(() => {
    ApiClient.getLockedInDailyStats()
      .then((data) => setStats({ liveCount: data.liveCount, totalToday: data.totalToday }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  useEffect(() => {
    if (statsInvalidatedAt > 0) fetchStats()
  }, [statsInvalidatedAt, fetchStats])

  return (
    <div className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-white/60">Locked in with</p>
      <div className="mt-1 flex items-center justify-center gap-6">
        <span className="text-2xl font-bold tabular-nums text-white">{stats.liveCount}</span>
        <span className="text-white/50">live now</span>
        <span className="text-white/30">·</span>
        <span className="text-2xl font-bold tabular-nums text-white">{stats.totalToday}</span>
        <span className="text-white/50">today</span>
      </div>
    </div>
  )
}

function formatDurationForSummary(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function LockedInPageContent() {
  const { state, elapsedSeconds, isActive, startSession, pauseSession, resumeSession, endSession, updateSession, statsInvalidatedAt } = useLockedIn()
  const [intentionInput, setIntentionInput] = useState("")
  const [todoInput, setTodoInput] = useState("")
  const [pendingTodos, setPendingTodos] = useState<LockedInTodoItem[]>([])
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summary, setSummary] = useState<{
    durationSeconds: number
    intention: string
    completedCount: number
    totalTodos: number
    todos: LockedInTodoItem[]
  } | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [promotedFeed, setPromotedFeed] = useState<PromotedContentItem[]>([])
  const [liveStats, setLiveStats] = useState<{ liveCount: number; totalToday: number }>({ liveCount: 0, totalToday: 0 })

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL

  const fetchPromotedFeed = useCallback(() => {
    if (!backendUrl) return
    fetch(`${backendUrl}/api/promoted/feed?limit=10`)
      .then((res) => (res.ok ? res.json() : { success: false, data: {} }))
      .then((data) => {
        const raw = data?.data?.feed ?? data?.data?.recommendations ?? []
        const list = Array.isArray(raw) ? raw : []
        const normalized = list
          .filter((item: Record<string, unknown>) => item && (item._id ?? item.id) && (item.title ?? item.name))
          .map((item: Record<string, unknown>) => ({
            ...item,
            _id: String(item._id ?? item.id),
            title: String(item.title ?? item.name ?? ""),
            type: (item.type ?? item.contentType ?? "opportunity") as PromotedContentItem["type"],
          })) as PromotedContentItem[]
        setPromotedFeed(normalized)
      })
      .catch(() => setPromotedFeed([]))
  }, [backendUrl])

  const fetchLiveStats = useCallback(() => {
    ApiClient.getLockedInDailyStats()
      .then((data) => setLiveStats({ liveCount: data.liveCount, totalToday: data.totalToday }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isActive) return
    fetchPromotedFeed()
    const interval = setInterval(fetchPromotedFeed, PROMOTED_REFRESH_MS)
    return () => clearInterval(interval)
  }, [isActive, fetchPromotedFeed])

  useEffect(() => {
    if (!isActive) return
    fetchLiveStats()
    const interval = setInterval(fetchLiveStats, 30000)
    return () => clearInterval(interval)
  }, [isActive, fetchLiveStats])

  useEffect(() => {
    if (isActive && statsInvalidatedAt > 0) fetchLiveStats()
  }, [isActive, statsInvalidatedAt, fetchLiveStats])

  const handleStart = async () => {
    const intention = intentionInput.trim()
    if (!intention) return
    setStartError(null)
    setStarting(true)
    try {
      const todoList = pendingTodos.length ? pendingTodos : undefined
      await startSession({ intention, todoList: todoList ?? undefined })
      setIntentionInput("")
      setPendingTodos([])
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start session")
    } finally {
      setStarting(false)
    }
  }

  const handleEndSession = async () => {
    const intention = state.intention ?? ""
    const completedCount = state.todoList.filter((t) => t.done).length
    const totalTodos = state.todoList.length
     const todosSnapshot = state.todoList
    const endMs = state.isPaused && state.pausedAt != null ? state.pausedAt : Date.now()
    const durationMs = state.startedAt != null
      ? Math.max(0, endMs - state.startedAt - state.totalPausedMs)
      : 0
    const durationSeconds = Math.floor(durationMs / 1000)
    await endSession()
    setSummary({ durationSeconds, intention, completedCount, totalTodos, todos: todosSnapshot })
    setSummaryOpen(true)
  }

  const addPendingTodo = () => {
    const text = todoInput.trim()
    if (!text) return
    setPendingTodos((prev) => [...prev, { id: `t-${Date.now()}`, text, done: false }])
    setTodoInput("")
  }

  const removePendingTodo = (id: string) => {
    setPendingTodos((prev) => prev.filter((t) => t.id !== id))
  }

  const addActiveTodo = async () => {
    const text = todoInput.trim()
    if (!text || !state.sessionId) return
    const newItem: LockedInTodoItem = { id: `t-${Date.now()}`, text, done: false }
    const nextList = [...state.todoList, newItem]
    setTodoInput("")
    await updateSession({ todoList: nextList })
  }

  const toggleTodo = async (id: string) => {
    const nextList = state.todoList.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    await updateSession({ todoList: nextList })
  }

  const removeActiveTodo = async (id: string) => {
    const nextList = state.todoList.filter((t) => t.id !== id)
    await updateSession({ todoList: nextList })
  }

  const canStart = intentionInput.trim().length > 0

  if (isActive) {
    const promoted0 = promotedFeed[0]
    const promoted1 = promotedFeed[1]
    return (
      <div className="min-h-screen bg-page relative overflow-hidden px-4 py-6 flex flex-col items-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_60%)]" />
        <div className="relative w-full flex flex-col items-center flex-1">
          {/* Center: small circle + live counter + minimal controls */}
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-28 h-28 rounded-full border-2 border-primary/50 bg-card/80 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-mono font-semibold tabular-nums text-foreground">
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Locked in with</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {liveStats.liveCount} live now · {liveStats.totalToday} today
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {state.isPaused ? (
                <Button size="sm" onClick={resumeSession} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Resume
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={pauseSession} className="rounded-full">
                  Pause
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleEndSession} className="rounded-full border-red-500/80 text-red-500 hover:bg-red-500/10">
                End session
              </Button>
            </div>
          </div>
          {/* Ad slots: 4 on desktop, 2 on mobile */}
          <div className="w-full max-w-4xl flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
            {/* Mobile: 2 slots — ad only, sponsored+ads */}
            <div className="lg:hidden space-y-4">
              {ADSENSE_FEED_SLOT && <FeedAd slotId={ADSENSE_FEED_SLOT} className="min-h-[100px]" />}
              <FeedSponsoredSlot
                kind={promoted1 ? "promoted" : "ad"}
                content={promoted1 ?? undefined}
                slotId={ADSENSE_FEED_SLOT}
                showAdBelow={!!ADSENSE_FEED_SLOT}
                adSlotId={ADSENSE_FEED_SLOT}
              />
            </div>
            {/* Desktop: 4 slots — sponsored, sponsored+ads, ad, ad */}
            <div className="hidden lg:contents">
              <FeedSponsoredSlot
                kind={promoted0 ? "promoted" : "ad"}
                content={promoted0 ?? undefined}
                slotId={ADSENSE_FEED_SLOT}
              />
              <FeedSponsoredSlot
                kind={promoted1 ? "promoted" : "ad"}
                content={promoted1 ?? undefined}
                slotId={ADSENSE_FEED_SLOT}
                showAdBelow={!!ADSENSE_FEED_SLOT}
                adSlotId={ADSENSE_FEED_SLOT}
              />
              {ADSENSE_FEED_SLOT && <FeedAd slotId={ADSENSE_FEED_SLOT} className="min-h-[100px]" />}
              {ADSENSE_FEED_SLOT && <FeedAd slotId={ADSENSE_FEED_SLOT} className="min-h-[100px]" />}
            </div>
          </div>
        </div>
        <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Session complete</DialogTitle>
            </DialogHeader>
            {summary && (
              <div className="space-y-4 py-2">
                <p className="text-center text-muted-foreground">
                  You were locked in for <strong className="text-foreground">{formatDurationForSummary(summary.durationSeconds)}</strong>.
                </p>
                {summary.intention && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Intention</p>
                    <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm">{summary.intention}</p>
                  </div>
                )}
                {summary.todos.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">To-do summary</p>
                    <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {summary.todos.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 rounded bg-muted px-3 py-2 text-sm">
                          <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.text}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{t.done ? "Done" : "Pending"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {summary.totalTodos > 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    You completed <strong className="text-foreground">{summary.completedCount}</strong> of {summary.totalTodos} to-do{summary.totalTodos !== 1 ? "s" : ""}.
                  </p>
                )}
                <div className="flex justify-center pt-2">
                  <Button onClick={() => setSummaryOpen(false)}>Done</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page relative overflow-hidden px-4 py-10 flex items-center justify-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_60%)]" />
      <div className="relative w-full max-w-5xl grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] items-start">
        {/* Focus card */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/70 border border-border/70 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Locked In session
            </span>
          </div>

          <div className="rounded-2xl bg-card/90 border border-border/80 shadow-xl p-6 sm:p-7 flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                  Stay locked in on one thing
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xs">
                  Set your intention, break it into a few to-dos, and let the timer keep you honest.
                </p>
              </div>
              <div className="hidden sm:block rounded-xl px-3 py-2 bg-primary/10 border border-primary/30 text-xs text-primary">
                Session timer
              </div>
            </div>

            <div className="rounded-2xl bg-background/60 border border-border/70 px-5 py-6 flex flex-col items-center gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Elapsed
              </span>
              <div className="text-5xl sm:text-6xl md:text-7xl font-mono tabular-nums text-foreground">
                {formatElapsed(elapsedSeconds)}
              </div>
            </div>

            {!isActive && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Intention
                  </label>
                  <Textarea
                    placeholder="What are you locking in on for this session?"
                    value={intentionInput}
                    onChange={(e) => setIntentionInput(e.target.value)}
                    className="min-h-[90px] resize-none rounded-xl border-border bg-muted/60 text-foreground placeholder:text-muted-foreground"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    To-do list
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add one small task"
                      value={todoInput}
                      onChange={(e) => setTodoInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPendingTodo()}
                      className="rounded-xl border-border bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPendingTodo}
                      className="rounded-xl border-border text-foreground hover:bg-muted"
                    >
                      Add
                    </Button>
                  </div>
                  {pendingTodos.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {pendingTodos.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2 text-xs sm:text-sm text-foreground"
                        >
                          <span className="line-clamp-2">{t.text}</span>
                          <button
                            type="button"
                            onClick={() => removePendingTodo(t.id)}
                            className="ml-3 text-muted-foreground hover:text-foreground text-xs"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {startError && (
                  <p className="text-sm text-red-400 text-center">{startError}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <p className="text-[11px] text-muted-foreground max-w-xs">
                    Sessions auto-save to your history when you end them, so you can see how often you’re really locked in.
                  </p>
                  <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={!canStart || starting}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-foreground rounded-full px-8"
                  >
                    {starting ? "Starting…" : "Start session"}
                  </Button>
                </div>
              </>
            )}

            {isActive && (
              <>
                {state.intention != null && state.intention !== "" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Intention
                    </label>
                    <p className="rounded-xl bg-muted/70 px-3 py-2 text-sm text-foreground">
                      {state.intention}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    To-do list
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add task"
                      value={todoInput}
                      onChange={(e) => setTodoInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addActiveTodo()}
                      className="rounded-xl border-border bg-muted/60 text-foreground placeholder:text-muted-foreground text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addActiveTodo}
                      className="rounded-xl border-border text-foreground hover:bg-muted"
                    >
                      Add
                    </Button>
                  </div>
                  {state.todoList.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {state.todoList.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2 text-xs sm:text-sm"
                        >
                          <Checkbox
                            checked={t.done}
                            onCheckedChange={() => toggleTodo(t.id)}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                          <span className={t.done ? "text-muted-foreground line-through" : "text-foreground"}>
                            {t.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeActiveTodo(t.id)}
                            className="ml-auto text-muted-foreground hover:text-foreground text-[11px]"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {state.isPaused ? (
                      <Button
                        size="lg"
                        onClick={resumeSession}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-foreground rounded-full px-6"
                      >
                        Resume
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={pauseSession}
                        className="border-border text-foreground hover:bg-muted rounded-full px-6"
                      >
                        Pause
                      </Button>
                    )}
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleEndSession}
                      className="border-red-500/80 text-red-400 hover:bg-red-500/10 rounded-full px-6"
                    >
                      End session
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground max-w-[220px]">
                    You can browse anywhere in GlowUp while this runs. If you close the app or browser, we&apos;ll pause the timer and resume when you return—use “End session” to save it to your history.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right column: stats + helpers */}
        <div className="space-y-4">
          <LockedInWithStats />
          <div className="rounded-2xl bg-card/90 border border-border/80 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Why “Locked In” matters
            </h2>
            <p className="text-xs text-muted-foreground">
              GlowUp sessions are built for deep focus. Every minute you log helps you see
              how often you’re really showing up for your goals.
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>• Set one clear intention per session.</li>
              <li>• Keep tasks small and specific.</li>
              <li>• End sessions to log real progress.</li>
            </ul>
            <div className="pt-2 border-t border-border/60 flex flex-col gap-1">
              <Link
                href="/locked-in/history"
                className="text-xs text-primary hover:underline"
              >
                View session history
              </Link>
              <span className="text-[11px] text-muted-foreground">
                Your history is private to you and helps you track consistency over time.
              </span>
            </div>
          </div>
        </div>

        <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Session complete</DialogTitle>
            </DialogHeader>
            {summary && (
              <div className="space-y-4 py-2">
                <p className="text-center text-muted-foreground">
                  You were locked in for <strong className="text-foreground">{formatDurationForSummary(summary.durationSeconds)}</strong>.
                </p>
                {summary.intention && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Intention</p>
                    <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm">{summary.intention}</p>
                  </div>
                )}
                {summary.todos.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">To-do summary</p>
                    <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {summary.todos.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center gap-2 rounded bg-muted px-3 py-2 text-sm"
                        >
                          <span className={t.done ? "line-through text-muted-foreground" : ""}>
                            {t.text}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {t.done ? "Done" : "Pending"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {summary.totalTodos > 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    You completed <strong className="text-foreground">{summary.completedCount}</strong> of {summary.totalTodos} to-do{summary.totalTodos !== 1 ? "s" : ""}.
                  </p>
                )}
                <div className="flex justify-center pt-2">
                  <Button onClick={() => setSummaryOpen(false)}>Done</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <p className="text-sm text-white/50 text-center max-w-xs">
          You can leave this page and keep using GlowUp; the timer will keep running. If you close the app or browser, we&apos;ll pause your session and resume it when you come back. Only ending the session will save it to your history.
        </p>
        <Link href="/locked-in/history" className="text-sm text-white/70 hover:text-white underline">
          View session history
        </Link>
      </div>
    </div>
  )
}

/** Locked In is available to all authenticated users (not premium-only). */
export default function LockedInPage() {
  return (
    <AuthGuard>
      <LockedInPageContent />
    </AuthGuard>
  )
}
