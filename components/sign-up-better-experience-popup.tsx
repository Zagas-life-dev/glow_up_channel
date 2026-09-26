"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Bookmark, Clock, Sparkles, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { UpLogo } from "@/components/up/up-logo"

/** The reasons from the old one-line copy: save content, personal picks, deadlines. */
const PERKS = [
  { icon: Bookmark, text: "Save listings and build playlists" },
  { icon: Sparkles, text: "A feed picked for your profile" },
  { icon: Clock, text: "Deadline reminders so nothing slips" },
]

const STORAGE_KEY = "glowup-signup-better-experience-dismissed"
const ENGAGEMENT_EVENT = "glowup-guest-engaged"

export function dispatchGuestEngaged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(ENGAGEMENT_EVENT))
}

function wasDismissed(): boolean {
  if (typeof window === "undefined") return true
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

function setDismissed() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "true")
  } catch {
    // ignore
  }
}

export default function SignUpBetterExperiencePopup() {
  const { isAuthenticated } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isAuthenticated) return

    const handleEngaged = () => {
      if (wasDismissed()) return
      setShow(true)
    }

    window.addEventListener(ENGAGEMENT_EVENT, handleEngaged)
    return () => window.removeEventListener(ENGAGEMENT_EVENT, handleEngaged)
  }, [isAuthenticated])

  const handleDismiss = () => {
    setDismissed()
    setShow(false)
  }

  if (isAuthenticated) return null

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-[420px] gap-0 overflow-hidden p-0 sm:p-0 [&>button:last-child]:hidden">
        {/* Navy hero with the tile stack, matching the sign-up page it leads to. */}
        <div className="relative overflow-hidden bg-up-navy px-6 pb-6 pt-7 text-up-on-navy dark:bg-up-lead">
          <span aria-hidden className="absolute -right-10 -top-12 h-[140px] w-[190px] -rotate-[8deg] rounded-[24px] bg-up-orange" />
          <span aria-hidden className="absolute -top-6 right-14 h-[76px] w-[100px] rotate-[7deg] rounded-[18px] bg-up-lime" />
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-[rgba(11,18,51,0.55)] text-up-on-navy transition-colors hover:bg-[rgba(11,18,51,0.75)]"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative">
            <span className="grid h-10 w-10 place-items-center rounded-up-sm bg-up-orange">
              <UpLogo tone="navy" height={24} alt="" className="w-[74%]" />
            </span>
            <DialogTitle className="mt-7 max-w-[80%] pr-0 text-2xl leading-tight text-up-on-navy">
              Sign up for a better <span className="text-up-orange">experience</span>
            </DialogTitle>
          </div>
        </div>

        {/* The three reasons, one row each. */}
        <DialogDescription asChild>
          <ul className="space-y-2.5 px-6 pt-5">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-semibold text-foreground">
                <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-up-sm bg-up-fill">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </DialogDescription>

        <div className="grid gap-2 px-6 pb-6 pt-5">
          <Button asChild className="h-11 w-full">
            <Link href="/signup" onClick={handleDismiss}>
              Sign up free
            </Link>
          </Button>
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-muted-foreground">
              Already on UP?{" "}
              <Link href="/login" onClick={handleDismiss} className="font-bold text-foreground hover:underline">
                Sign in
              </Link>
            </span>
            <button type="button" onClick={handleDismiss} className="font-bold text-muted-foreground hover:text-foreground">
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
