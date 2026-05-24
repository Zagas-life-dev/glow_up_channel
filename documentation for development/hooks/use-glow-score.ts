"use client"

import { useCallback, useEffect, useState } from "react"

import ApiClient, { GlowScoreResponse } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"

export interface GlowScore {
  xpTotal: number
  level: number
  currentStreak: number
  xpToNextLevel?: number
}

interface UseGlowScoreOptions {
  enabled?: boolean
}

export function useGlowScore(options: UseGlowScoreOptions = {}): {
  glow: GlowScore | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const { isAuthenticated } = useAuth()
  const enabled = options.enabled ?? true

  const [glow, setGlow] = useState<GlowScore | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGlow = useCallback(async () => {
    if (!enabled || !isAuthenticated) return

    setIsLoading(true)
    setError(null)

    try {
      const res: GlowScoreResponse = await ApiClient.getGlowScore()
      setGlow({
        xpTotal: typeof res.xp_total === "number" ? res.xp_total : 0,
        level: typeof res.level === "number" ? res.level : 1,
        currentStreak: typeof res.current_streak === "number" ? res.current_streak : 0,
        xpToNextLevel: res.xp_to_next_level,
      })
    } catch (err: any) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to load Glow Score:", err)
      }
      setError(err?.message ?? "Failed to load Glow Score")
    } finally {
      setIsLoading(false)
    }
  }, [enabled, isAuthenticated])

  useEffect(() => {
    void fetchGlow()
  }, [fetchGlow])

  return {
    glow,
    isLoading,
    error,
    refetch: fetchGlow,
  }
}

