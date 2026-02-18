"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"

export interface LockedInTodoItem {
  id: string
  text: string
  done: boolean
}

export interface LockedInState {
  sessionId: string | null
  startedAt: number | null
  isPaused: boolean
  pausedAt: number | null
  totalPausedMs: number
  intention: string | null
  todoList: LockedInTodoItem[]
}

const START_CONFIRMATION_TIMEOUT_MS = 10000

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/** Stats refetch marks: 1 min, 5 min, 15 min, then every 15 min. */
function getNextStatsMark(lastTriggeredSeconds: number): number | null {
  if (lastTriggeredSeconds < 60) return 60
  if (lastTriggeredSeconds < 300) return 300
  if (lastTriggeredSeconds < 900) return 900
  return lastTriggeredSeconds + 900
}

interface LockedInContextType {
  state: LockedInState
  elapsedSeconds: number
  isActive: boolean
  startSession: (options?: { intention?: string; todoList?: LockedInTodoItem[] }) => Promise<void>
  pauseSession: () => void
  resumeSession: () => void
  endSession: () => Promise<void>
  updateSession: (payload: { intention?: string; todoList?: LockedInTodoItem[] }) => Promise<void>
  tick: number
  /** Timestamp when live stats were invalidated (session start/end). Use in useEffect to refetch stats. */
  statsInvalidatedAt: number
}

const defaultState: LockedInState = {
  sessionId: null,
  startedAt: null,
  isPaused: false,
  pausedAt: null,
  totalPausedMs: 0,
  intention: null,
  todoList: [],
}

const LockedInContext = createContext<LockedInContextType | null>(null)

function computeElapsed(state: LockedInState, nowMs: number): number {
  if (!state.sessionId || state.startedAt == null) return 0
  const endMs = state.isPaused && state.pausedAt != null ? state.pausedAt : nowMs
  const elapsedMs = Math.max(0, endMs - state.startedAt - state.totalPausedMs)
  return Math.floor(elapsedMs / 1000)
}

export function LockedInProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<LockedInState>(defaultState)
  const [tick, setTick] = useState(0)
  const [statsInvalidatedAt, setStatsInvalidatedAt] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastStatsMarkRef = useRef(0)
  const visibilityPausedRef = useRef(false)

  const isActive = !!state.sessionId && !!state.startedAt
  const nowMs = Date.now()
  const elapsedSeconds = computeElapsed(state, nowMs)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isActive || state.isPaused) {
      clearTimer()
      return
    }
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000)
    return clearTimer
  }, [isActive, state.isPaused, clearTimer])

  useEffect(() => {
    if (!isActive || state.isPaused) return
    const next = getNextStatsMark(lastStatsMarkRef.current)
    if (next !== null && elapsedSeconds >= next) {
      lastStatsMarkRef.current = next
      setStatsInvalidatedAt(Date.now())
    }
  }, [isActive, state.isPaused, elapsedSeconds])

  const startSession = useCallback(async (options?: { intention?: string; todoList?: LockedInTodoItem[] }) => {
    if (!user) return
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), START_CONFIRMATION_TIMEOUT_MS)
    try {
      const data = await ApiClient.createLockedInSession({
        intention: options?.intention,
        todoList: options?.todoList,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!data?.sessionId) return
      const startedAtMs = data.startedAt ? new Date(data.startedAt).getTime() : Date.now()
      if (isNaN(startedAtMs)) return
      lastStatsMarkRef.current = 0
      setState({
        sessionId: data.sessionId,
        startedAt: startedAtMs,
        isPaused: false,
        pausedAt: null,
        totalPausedMs: 0,
        intention: data.intention ?? null,
        todoList: Array.isArray(data.todoList) ? data.todoList : [],
      })
      setTick(0)
      setStatsInvalidatedAt(Date.now())
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Session start timed out (10s). Please try again.")
      }
      throw err
    }
  }, [user])

  const updateSession = useCallback(async (payload: { intention?: string; todoList?: LockedInTodoItem[] }) => {
    if (!state.sessionId) return
    const data = await ApiClient.updateLockedInSession(state.sessionId, payload)
    setState((prev) => ({
      ...prev,
      intention: data.intention ?? prev.intention,
      todoList: data.todoList ?? prev.todoList,
    }))
  }, [state.sessionId])

  const pauseSession = useCallback(() => {
    if (!state.sessionId || state.isPaused) return
    setState((prev) => ({
      ...prev,
      isPaused: true,
      pausedAt: Date.now(),
    }))
  }, [state.sessionId, state.isPaused])

  const resumeSession = useCallback(() => {
    if (!state.sessionId || !state.isPaused || state.pausedAt == null) return
    const now = Date.now()
    setState((prev) => ({
      ...prev,
      isPaused: false,
      pausedAt: null,
      totalPausedMs: prev.totalPausedMs + (now - prev.pausedAt!),
    }))
  }, [state.sessionId, state.isPaused, state.pausedAt])

  const endSession = useCallback(async () => {
    if (!state.sessionId) return
    const now = Date.now()
    const endMs = state.isPaused && state.pausedAt != null ? state.pausedAt : now
    const durationMs = state.startedAt != null
      ? Math.max(0, endMs - state.startedAt - state.totalPausedMs)
      : 0
    const durationSeconds = Math.floor(durationMs / 1000)
    try {
      await ApiClient.endLockedInSession(state.sessionId, {
        endedAt: new Date().toISOString(),
        durationSeconds,
        endReason: "user_ended",
      })
    } finally {
      lastStatsMarkRef.current = 0
      setState({ ...defaultState })
      clearTimer()
      setStatsInvalidatedAt(Date.now())
    }
  }, [state.sessionId, state.startedAt, state.totalPausedMs, state.isPaused, state.pausedAt, clearTimer])

  useEffect(() => {
    if (!user) {
      setState(defaultState)
      clearTimer()
      return
    }
    ApiClient.getActiveLockedInSession()
      .then((active) => {
        if (active) {
          const baseSeconds = typeof active.elapsedSeconds === "number" && active.elapsedSeconds >= 0
            ? active.elapsedSeconds
            : Math.max(0, Math.floor((new Date().getTime() - new Date(active.startedAt).getTime()) / 1000))
          const startedAtMs = Date.now() - baseSeconds * 1000
          setState({
            sessionId: active.sessionId,
            startedAt: startedAtMs,
            isPaused: false,
            pausedAt: null,
            totalPausedMs: 0,
            intention: active.intention ?? null,
            todoList: Array.isArray(active.todoList) ? active.todoList : [],
          })
        }
      })
      .catch(() => {})
  }, [user?._id])

  useEffect(() => {
    if (typeof document === "undefined" || !state.sessionId) return
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (isMobileDevice()) {
          visibilityPausedRef.current = true
          const now = Date.now()
          const elapsed = computeElapsed(state, now)
          ApiClient.pauseLockedInSession(state.sessionId!, elapsed)
          setState((prev) => ({
            ...prev,
            isPaused: true,
            pausedAt: now,
          }))
        }
      } else {
        if (visibilityPausedRef.current) {
          visibilityPausedRef.current = false
          setState((prev) => {
            if (!prev.isPaused || prev.pausedAt == null) return prev
            const now = Date.now()
            return {
              ...prev,
              isPaused: false,
              pausedAt: null,
              totalPausedMs: prev.totalPausedMs + (now - prev.pausedAt),
            }
          })
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [state.sessionId, state])

  // On tab/window close (both mobile & desktop), persist a pause snapshot in seconds.
  useEffect(() => {
    if (typeof window === "undefined" || !state.sessionId) return
    const handleBeforeUnload = () => {
      const now = Date.now()
      const elapsed = computeElapsed(state, now)
      ApiClient.pauseLockedInSession(state.sessionId!, elapsed, { keepalive: true })
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [state.sessionId, state.startedAt, state.totalPausedMs, state.isPaused, state.pausedAt])

  const value: LockedInContextType = {
    state,
    elapsedSeconds,
    isActive,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    updateSession,
    tick,
    statsInvalidatedAt,
  }

  return (
    <LockedInContext.Provider value={value}>
      {children}
    </LockedInContext.Provider>
  )
}

export function useLockedIn() {
  const ctx = useContext(LockedInContext)
  if (!ctx) throw new Error("useLockedIn must be used within LockedInProvider")
  return ctx
}
