"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { X, Sparkles } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"

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

  if (!show || isAuthenticated) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-labelledby="signup-better-title"
      aria-describedby="signup-better-desc"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden
        onClick={handleDismiss}
      />
      <div className="relative w-full max-w-sm glass-surface p-6 animate-in zoom-in-95 duration-200">
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-3 top-3 h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 ring-2 ring-primary/20">
            <Sparkles className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <h2 id="signup-better-title" className="mt-4 text-xl font-bold text-foreground">
            Sign up for a better experience
          </h2>
          <p id="signup-better-desc" className="mt-1 text-sm text-muted-foreground">
            Create a free account to save content, get personalized recommendations, and never miss a deadline.
          </p>

          <Button
            size="lg"
            asChild
            className="mt-6 w-full gap-2 rounded-xl bg-primary hover:bg-primary/90 font-semibold"
          >
            <Link href="/signup" onClick={handleDismiss}>
              Sign up free
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  )
}
