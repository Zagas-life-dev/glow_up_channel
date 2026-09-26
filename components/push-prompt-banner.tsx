"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useInterruption } from "@/lib/interruptions"
import { PWA_DISMISSED_EVENT } from "@/components/pwa-install-banner"
import { trackPushEnable } from '@/lib/tracking'

const STORAGE_KEY = "glowup-push-prompt-dismissed"
const AUTH_DELAY_MS = 5 * 60 * 1000 // 5 minutes

function isStandalone() {
  if (typeof window === "undefined") return false
  return (
    (window as Window & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  )
}

function wasPwaDismissed() {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem("glowup-pwa-prompt-dismissed") === "true"
}

/**
 * On hold while notifications are rebuilt: the pre-ask stays drawn in the new
 * frame for the rebuild to reuse, but does not open. Settings still subscribes.
 */
const PROMPT_ON_HOLD = true

export default function PushPromptBanner() {
  const { user } = useAuth()
  const push = usePushNotifications()
  const [dismissed, setDismissed] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [allowAfterDelay, setAllowAfterDelay] = useState(false)
  const [pwaDismissed, setPwaDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return
    const wasDismissed = localStorage.getItem(STORAGE_KEY) === "true"
    setDismissed(wasDismissed)
  }, [mounted])

  // Only allow push prompt 5 min after user is authenticated
  useEffect(() => {
    if (!user) return
    const t = setTimeout(() => setAllowAfterDelay(true), AUTH_DELAY_MS)
    return () => clearTimeout(t)
  }, [user])

  // Show push only after PWA was dismissed (or PWA not applicable e.g. standalone)
  useEffect(() => {
    if (!mounted) return
    setPwaDismissed(wasPwaDismissed() || isStandalone())
    const onPwaDismissed = () => setPwaDismissed(true)
    window.addEventListener(PWA_DISMISSED_EVENT, onPwaDismissed)
    return () => window.removeEventListener(PWA_DISMISSED_EVENT, onPwaDismissed)
  }, [mounted])

  const wantsToShow =
    !PROMPT_ON_HOLD &&
    mounted &&
    !!user &&
    allowAfterDelay &&
    pwaDismissed &&
    push.isSupported &&
    !push.isSubscribed &&
    !push.isLoading &&
    !dismissed
  const shouldShow = useInterruption("push", wantsToShow)

  const handleDismiss = () => {
    setDismissed(true)
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "true")
  }

  const handleAllow = async () => {
    const ok = await push.subscribe()
    if (ok) {
      trackPushEnable()
      handleDismiss()
    }
  }

  if (!shouldShow) return null

  // The same small dialog as the location question, bell in an orange-tint tile.
  return (
    <Dialog open onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <span className="mb-2 grid h-11 w-11 place-items-center rounded-up-md bg-up-orange-tint text-up-orange-ink">
            <Bell className="h-5 w-5" aria-hidden />
          </span>
          <DialogTitle>Get the best experience</DialogTitle>
          <DialogDescription>
            Allow notifications for deadline reminders and the occasional nudge.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <Link
            href="/profile/settings?tab=notifications"
            className="text-center text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:text-left"
            onClick={handleDismiss}
          >
            Manage in Settings
          </Link>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="ghost" className="h-11" onClick={handleDismiss}>
              Not now
            </Button>
            <Button onClick={handleAllow} className="h-11 px-6">
              Allow notifications
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
