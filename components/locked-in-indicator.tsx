"use client"

import Link from "next/link"
import { Lock, LockOpen } from "lucide-react"
import { useLockedIn } from "@/contexts/locked-in-context"

const baseClasses =
  "fixed bottom-20 right-4 lg:bottom-6 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-black text-white shadow-lg border border-white/20 hover:bg-white/10 transition-colors"

const activeClasses = "border-orange-500/50 shadow-[0_0_16px_rgba(255,103,0,0.5)]"

export default function LockedInIndicator() {
  const { isActive } = useLockedIn()

  return (
    <>
      {/* Mobile: always visible as access point to locked-in page */}
      <Link
        href="/locked-in"
        className={`${baseClasses} lg:hidden ${isActive ? activeClasses : ""}`}
        aria-label={isActive ? "Locked in session in progress" : "Open Locked in"}
      >
        {isActive ? (
          <Lock className="w-5 h-5 text-orange-400 drop-shadow-[0_0_6px_rgba(255,103,0,0.8)]" aria-hidden />
        ) : (
          <LockOpen className="w-5 h-5 text-white/90" aria-hidden />
        )}
      </Link>
      {/* Desktop: only when session is active */}
      {isActive && (
        <Link
          href="/locked-in"
          className={`${baseClasses} ${activeClasses} hidden lg:flex`}
          aria-label="Locked in session in progress"
        >
          <Lock className="w-5 h-5 text-orange-400 drop-shadow-[0_0_6px_rgba(255,103,0,0.8)]" aria-hidden />
        </Link>
      )}
    </>
  )
}
