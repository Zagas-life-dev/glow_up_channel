"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { markAsked, mayAsk, VALUE_EVENT, type ValueMoment } from "@/lib/push-ask"
import { trackPushEnable } from "@/lib/tracking"

/**
 * Offers deadline reminders right after a save or an apply (lib/push-ask), to
 * signed-in readers whose browser can take push and who have not been asked in two
 * weeks. Not a modal: a toast with one button, so it never blocks the page.
 * On iPhone Safari outside the installed app push cannot work, so it explains how
 * to install instead.
 */
export default function PushAfterValue() {
  const { isAuthenticated } = useAuth()
  const push = usePushNotifications()
  const pushRef = useRef(push)
  useEffect(() => {
    pushRef.current = push
  }, [push])

  useEffect(() => {
    if (!isAuthenticated) return
    const onValue = (e: Event) => {
      const p = pushRef.current
      if (p.isSubscribed || p.permission === "denied" || p.permission === "granted" || !mayAsk()) return
      const kind = ((e as CustomEvent).detail?.kind ?? "save") as ValueMoment
      if (p.needsInstall) {
        markAsked()
        toast("Want a reminder before it closes?", {
          description: "On iPhone, add UP to your Home Screen (Share, then Add to Home Screen) to get deadline reminders.",
          duration: 12000,
        })
        return
      }
      if (!p.isSupported) return
      markAsked()
      toast(kind === "apply" ? "Get a reminder for the ones you apply to?" : "Remind you before it closes?", {
        description: "We'll nudge you 4 days and 1 day before the deadline. Nothing else, and you can turn it off any time.",
        duration: 12000,
        action: {
          label: "Remind me",
          onClick: async () => {
            const ok = await pushRef.current.subscribe()
            if (ok) {
              trackPushEnable(`after_${kind}`)
              toast.success("Reminders on.")
            }
          },
        },
      })
    }
    window.addEventListener(VALUE_EVENT, onValue)
    return () => window.removeEventListener(VALUE_EVENT, onValue)
  }, [isAuthenticated])

  return null
}
