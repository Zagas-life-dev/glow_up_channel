"use client"

/**
 * "Congratulations, you're invited to the UP Creators Program" (spec: invite = email +
 * in-app popup). Checks the signed-in user's program status once per page load, shows
 * while they are invited and have not joined, at most once a day, never on /creator
 * itself (the Earnings tab already shows the invite there).
 */

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { RiTrophyLine, RiCloseLine } from "react-icons/ri"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { getMyProgram, naira } from "@/lib/creator"

const SEEN_KEY = "up_program_invite_seen"

export default function ProgramInvitePopup() {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [held, setHeld] = useState<number | null>(null)
  const [blockSize, setBlockSize] = useState(1000)

  useEffect(() => {
    if (!isAuthenticated || pathname?.startsWith("/creator")) return
    try {
      if (localStorage.getItem(SEEN_KEY) === new Date().toISOString().slice(0, 10)) return
    } catch {
      return
    }
    let live = true
    getMyProgram()
      .then((p) => {
        if (live && p.status === "invited") {
          setHeld(p.balances.held)
          setBlockSize(p.rates.blockSize)
        }
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [isAuthenticated, pathname])

  if (held === null) return null

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString().slice(0, 10))
    } catch {
      // ignore
    }
    setHeld(null)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="program-invite-title">
      <div className="relative w-full max-w-sm rounded-up-xl bg-up-navy p-5 text-white shadow-xl">
        <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10">
          <RiCloseLine className="h-5 w-5" />
        </button>
        <RiTrophyLine className="h-9 w-9 text-up-orange" aria-hidden />
        <h2 id="program-invite-title" className="mt-3 font-display text-xl font-bold">Congratulations, you're invited to the UP Creators Program</h2>
        <p className="mt-2 text-sm text-white/80">
          Your playlist reached {blockSize.toLocaleString("en")} unique viewers. {held > 0 ? `${naira(held)} is waiting for you.` : ""} Accept the terms to unlock it and start earning.
        </p>
        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            className="h-11 flex-1 bg-up-orange text-white hover:bg-up-orange"
            onClick={() => {
              close()
              router.push("/creator?tab=earnings")
            }}
          >
            See the terms
          </Button>
          <Button type="button" variant="outline" className="h-11 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={close}>
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}
