"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import { trackSave } from "@/lib/tracking"
import { takePendingAction, type IntentKind } from "@/lib/pending-intent"

const PLURAL: Record<IntentKind, "jobs" | "opportunities" | "events" | "resources"> = {
  job: "jobs",
  opportunity: "opportunities",
  event: "events",
  resource: "resources",
}

/**
 * Finishes what a guest started before signing up: the save they tapped is made
 * once they are signed in, wherever they land. Runs once per sign-in; the intent
 * is consumed before the request so a reload cannot save twice.
 */
export default function PendingIntentRunner() {
  const { isAuthenticated } = useAuth()
  const ran = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || ran.current) return
    ran.current = true
    const intent = takePendingAction()
    if (!intent?.kind || !intent.id) return

    if (intent.action === "save") {
      ApiClient.saveItem(PLURAL[intent.kind], intent.id)
        .then(() => {
          trackSave(intent.kind!, intent.id!)
          toast.success("Saved. It's in your Saved list.")
        })
        .catch(() => {
          // Closed or removed since the tap: nothing to save, nothing to tell.
        })
    } else if (intent.action === "playlist") {
      toast("You're in. Tap + on the listing to add it to a playlist.")
    }
  }, [isAuthenticated])

  return null
}
