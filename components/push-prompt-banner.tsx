"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, Bell } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "glowup-push-prompt-dismissed"

export default function PushPromptBanner() {
  const { user } = useAuth()
  const push = usePushNotifications()
  const [dismissed, setDismissed] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return
    const wasDismissed = localStorage.getItem(STORAGE_KEY) === "true"
    setDismissed(wasDismissed)
  }, [mounted])

  const shouldShow =
    mounted &&
    !!user &&
    push.isSupported &&
    !push.isSubscribed &&
    !push.isLoading &&
    !dismissed

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "true")
  }

  const handleAllow = async () => {
    const ok = await push.subscribe()
    if (ok) handleDismiss()
  }

  if (!shouldShow) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-labelledby="push-prompt-title"
      aria-describedby="push-prompt-desc"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden
        onClick={handleDismiss}
      />
      {/* Card at center (same style as PWA install interrupt) */}
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
            <Bell className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <h2 id="push-prompt-title" className="mt-4 text-xl font-bold text-foreground">
            Get the best experience
          </h2>
          <p id="push-prompt-desc" className="mt-1 text-sm text-muted-foreground">
            For the best experience, allow notifications. You&apos;ll get reminders for
            deadlines, Locked In, and occasional motivation.
          </p>

          <Button
            size="lg"
            onClick={handleAllow}
            className="mt-6 w-full gap-2 rounded-xl bg-primary hover:bg-primary/90 font-semibold"
          >
            <Bell className="h-5 w-5" />
            Allow notifications
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            Not now
          </Button>

          <Link
            href="/profile/settings?tab=notifications"
            className="mt-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            onClick={handleDismiss}
          >
            Manage in Settings
          </Link>
        </div>
      </div>
    </div>
  )
}
