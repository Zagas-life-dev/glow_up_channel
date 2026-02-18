"use client"

import Link from "next/link"
import { useLockedIn } from "@/contexts/locked-in-context"

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function LockedInIndicator() {
  const { isActive, elapsedSeconds } = useLockedIn()
  if (!isActive) return null
  return (
    <Link
      href="/locked-in"
      className="fixed bottom-20 right-4 lg:bottom-6 z-50 flex items-center gap-2 rounded-full bg-black text-white px-4 py-2 text-sm font-medium shadow-lg border border-white/20 hover:bg-white/10 transition-colors"
    >
      <span className="text-white/80">Locked in</span>
      <span className="font-mono tabular-nums">{formatElapsed(elapsedSeconds)}</span>
    </Link>
  )
}
