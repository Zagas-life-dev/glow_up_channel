"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useInterruption } from "@/lib/interruptions"
import { PWA_DISMISSED_EVENT, PWA_SETTLED_EVENT, PWA_SETTLED_KEY } from "@/components/pwa-install-banner"
import { trackPushEnable } from '@/lib/tracking'
import { isPromptDue, snoozePrompt } from "@/lib/prompt-cadence"

/** Lets the page, and the install prompt ahead of it, settle first. */
const SETTLE_MS = 3000

function isStandalone() {
  if (typeof window === "undefined") return false
  return (
    (window as Window & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  )
}

/** The install prompt has had its turn this visit (shown and closed, or not showing). */
function wasPwaSettled() {
  if (typeof window === "undefined") return false
  try {
    return (
      sessionStorage.getItem("glowup-pwa-prompt-dismissed") === "true" ||
      sessionStorage.getItem(PWA_SETTLED_KEY) === "true"
    )
  } catch {
    return false
  }
}

/**
 * On hold while notifications are rebuilt: the pre-ask stays drawn in the new
 * frame for the rebuild to reuse, but does not open. Settings still subscribes.
 */
const PROMPT_ON_HOLD = false

export default function PushPromptBanner() {
  const { user } = useAuth()
  const push = usePushNotifications()
  /** "Later" this visit. lib/prompt-cadence.ts decides when it asks again. */
  const [dismissed, setDismissed] = useState(false)
  /** Not snoozed: never asked, or the "Later" wait has passed. */
  const [due, setDue] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [allowAfterDelay, setAllowAfterDelay] = useState(false)
  const [pwaDismissed, setPwaDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Signed-in readers only: a subscription is saved against the account.
  useEffect(() => {
    if (!mounted || !user) return
    setDue(isPromptDue("push"))
  }, [mounted, user])

  useEffect(() => {
    if (!user) return
    const t = setTimeout(() => setAllowAfterDelay(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [user])

  // After the install prompt has had its turn this visit, never on top of it.
  useEffect(() => {
    if (!mounted) return
    setPwaDismissed(wasPwaSettled() || isStandalone())
    const onSettled = () => setPwaDismissed(true)
    window.addEventListener(PWA_DISMISSED_EVENT, onSettled)
    window.addEventListener(PWA_SETTLED_EVENT, onSettled)
    return () => {
      window.removeEventListener(PWA_DISMISSED_EVENT, onSettled)
      window.removeEventListener(PWA_SETTLED_EVENT, onSettled)
    }
  }, [mounted])

  const wantsToShow =
    !PROMPT_ON_HOLD &&
    mounted &&
    !!user &&
    allowAfterDelay &&
    due &&
    pwaDismissed &&
    push.isSupported &&
    // iPhone in the browser cannot receive push; the install prompt covers it.
    !push.needsInstall &&
    !push.isSubscribed &&
    !push.isLoading &&
    !dismissed
  const shouldShow = useInterruption("push", wantsToShow)

  /** "Later": next day, next day, then every other day. */
  const handleDismiss = () => {
    snoozePrompt("push")
    setDismissed(true)
  }
  const blocked = push.permission === "denied"

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
            {blocked
              ? "Notifications are blocked for UP. Turn them on in your browser's site settings (the icon left of the address bar), then come back."
              : "Allow notifications for deadline reminders and the occasional nudge."}
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
              Later
            </Button>
            {!blocked && (
              <Button onClick={handleAllow} className="h-11 px-6">
                Allow notifications
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
