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
  const { state, elapsedSeconds, isActive, startSession, pauseSession, resumeSession, endSession, updateSession } = useLockedIn()
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

  return (
    <div className="min-h-screen bg-black flex flex-col items-center text-white p-6">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <h1 className="text-xl font-semibold text-white/80 uppercase tracking-wider">
          Locked In
        </h1>

        <LockedInWithStats />

        <div className="text-6xl md:text-7xl font-mono tabular-nums">
          {formatElapsed(elapsedSeconds)}
        </div>

        {!isActive && (
          <>
            <div className="w-full space-y-2">
              <label className="text-xs font-medium text-white/60">Intention</label>
              <Textarea
                placeholder="What do you want to focus on?"
                value={intentionInput}
                onChange={(e) => setIntentionInput(e.target.value)}
                className="min-h-[80px] resize-none rounded-lg border-white/20 bg-white/5 text-white placeholder:text-white/40"
                maxLength={500}
              />
            </div>
            <div className="w-full space-y-2">
              <label className="text-xs font-medium text-white/60">To-do</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a task"
                  value={todoInput}
                  onChange={(e) => setTodoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPendingTodo()}
                  className="rounded-lg border-white/20 bg-white/5 text-white placeholder:text-white/40"
                />
                <Button type="button" variant="outline" size="sm" onClick={addPendingTodo} className="rounded-lg border-white/20 text-white hover:bg-white/10">
                  Add
                </Button>
              </div>
              {pendingTodos.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {pendingTodos.map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded bg-white/5 px-3 py-2 text-sm">
                      <span>{t.text}</span>
                      <button type="button" onClick={() => removePendingTodo(t.id)} className="text-white/60 hover:text-white">
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
            <Button
              size="lg"
              onClick={handleStart}
              disabled={!canStart || starting}
              className="bg-white text-black hover:bg-white/90 rounded-full px-8 disabled:opacity-50 disabled:pointer-events-none"
            >
              {starting ? "Starting…" : "Start"}
            </Button>
          </>
        )}

        {isActive && (
          <>
            {state.intention != null && state.intention !== "" && (
              <div className="w-full space-y-1">
                <label className="text-xs font-medium text-white/60">Intention</label>
                <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/90">{state.intention}</p>
              </div>
            )}

            <div className="w-full space-y-2">
              <label className="text-xs font-medium text-white/60">To-do</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add task"
                  value={todoInput}
                  onChange={(e) => setTodoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addActiveTodo()}
                  className="rounded-lg border-white/20 bg-white/5 text-white placeholder:text-white/40 text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={addActiveTodo} className="rounded-lg border-white/20 text-white hover:bg-white/10">
                  Add
                </Button>
              </div>
              {state.todoList.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {state.todoList.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 rounded bg-white/5 px-3 py-2 text-sm">
                      <Checkbox
                        checked={t.done}
                        onCheckedChange={() => toggleTodo(t.id)}
                        className="border-white/40 data-[state=checked]:bg-white data-[state=checked]:text-black"
                      />
                      <span className={t.done ? "text-white/50 line-through" : ""}>{t.text}</span>
                      <button type="button" onClick={() => removeActiveTodo(t.id)} className="ml-auto text-white/50 hover:text-white text-xs">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {state.isPaused ? (
                <Button size="lg" onClick={resumeSession} className="bg-white text-black hover:bg-white/90 rounded-full px-8">
                  Resume
                </Button>
              ) : (
                <Button size="lg" variant="outline" onClick={pauseSession} className="border-white text-white hover:bg-white/10 rounded-full px-8">
                  Pause
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={handleEndSession}
                className="border-red-500/80 text-red-400 hover:bg-red-500/20 rounded-full px-8"
              >
                End session
              </Button>
            </div>
          </>
        )}

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
          You can leave this page and browse the site; the timer will keep running. Closing the tab or leaving the site will end and save this session.
        </p>
        <Link href="/locked-in/history" className="text-sm text-white/70 hover:text-white underline">
          View session history
        </Link>
      </div>
    </div>
  )
}

export default function LockedInPage() {
  return (
    <AuthGuard>
      <LockedInPageContent />
    </AuthGuard>
  )
}
