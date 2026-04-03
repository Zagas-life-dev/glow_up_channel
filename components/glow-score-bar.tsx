"use client"

import { motion } from "framer-motion"
import { Flame } from "lucide-react"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import type { GlowScore } from "@/hooks/use-glow-score"

interface GlowScoreBarProps {
  glow: GlowScore
  isLoading?: boolean
  className?: string
}

function getLevelProgress(xpTotal: number, level: number): { percentage: number; label: string } {
  // Backend: Level = floor(0.1 * sqrt(XP)).
  // For Level 1, we treat the range as 0 → 400 XP so early progress isn't stuck at 0%.
  const safeXp = Math.max(0, xpTotal)
  const currentLevel = Math.max(level || 1, 1)

  let xpForLevelStart: number
  let xpForNextLevelStart: number

  if (currentLevel <= 1) {
    xpForLevelStart = 0
    xpForNextLevelStart = Math.pow((1 + 1) / 0.1, 2) // 400 XP
  } else {
    xpForLevelStart = Math.pow(currentLevel / 0.1, 2)
    xpForNextLevelStart = Math.pow((currentLevel + 1) / 0.1, 2)
  }

  const span = xpForNextLevelStart - xpForLevelStart || 1
  const progress = Math.min(
    100,
    Math.max(0, ((safeXp - xpForLevelStart) / span) * 100)
  )

  return {
    percentage: progress,
    label: `Level ${currentLevel}`,
  }
}

export function GlowScoreBar({ glow, isLoading, className }: GlowScoreBarProps) {
  const { xpTotal, level, currentStreak } = glow
  const { percentage, label } = getLevelProgress(xpTotal, level)
  const showStreak = currentStreak >= 3

  return (
    <motion.div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm px-4 py-3 sm:px-5 sm:py-4 shadow-sm",
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Glow Score
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-semibold text-foreground">
              {label}
            </p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Updating…" : `${xpTotal.toLocaleString()} XP`}
            </p>
          </div>
        </div>
        {showStreak && (
          <motion.div
            className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 border border-orange-500/40"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden />
            <span className="text-[11px] font-medium text-orange-100">
              {currentStreak}-day streak
            </span>
          </motion.div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Next level</span>
          <span>{Math.round(percentage)}%</span>
        </div>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ transformOrigin: "left center" }}
        >
          <Progress value={percentage} className="h-2.5 bg-muted" />
        </motion.div>
      </div>
    </motion.div>
  )
}

