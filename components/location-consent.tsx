"use client"

/**
 * Asks for location on a visitor's first load — our explanation first, the
 * browser's prompt second.
 *
 * Browsers show their own permission prompt once per site; if someone presses
 * "Block" there, only they can undo it in their browser settings. So the
 * browser prompt is only ever triggered from "Allow location" here, after the
 * reader knows why we are asking. "Not now" leaves the browser prompt unused,
 * which is what lets the "Use my location" button in the feed ask properly
 * later. Either way the screen is shown once; it never re-appears by itself.
 *
 * Mounted app-wide, which also makes it the one place `useUserLocation` always
 * runs — so the reader's place reaches the server on every page, not only on
 * pages that happen to rank something.
 */

import * as React from "react"
import { MapPin, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUserLocation } from "@/hooks/use-user-location"
import { useLocale } from "@/lib/i18n/context"
import { claimInterruption } from "@/lib/interruptions"

const ASKED_KEY = "glowup-location-consent"

/** Let the page settle first; a dialog before first paint reads as a pop-up ad. */
const SHOW_AFTER_MS = 2500

/** Routes where an interruption would be wrong: sign-in flows and the admin side. */
const QUIET_PREFIXES = ["/login", "/signup", "/register", "/auth", "/admin", "/onboarding"]

function alreadyAsked(): boolean {
  try {
    return Boolean(localStorage.getItem(ASKED_KEY))
  } catch {
    // Storage blocked: never nag someone we cannot remember asking.
    return true
  }
}

function rememberAnswer(answer: "allowed" | "declined"): void {
  try {
    localStorage.setItem(ASKED_KEY, answer)
  } catch {
    // ignore
  }
}

export function LocationConsent() {
  const { t } = useLocale()
  const { permission, requestPrecise } = useUserLocation()
  const [open, setOpen] = React.useState(false)
  const [requesting, setRequesting] = React.useState(false)

  React.useEffect(() => {
    // Only a browser that would actually show a prompt, and only once.
    if (permission !== "prompt" || alreadyAsked()) return
    if (QUIET_PREFIXES.some((prefix) => window.location.pathname.startsWith(prefix))) return
    const timer = window.setTimeout(() => {
      // One unrequested pop-up per visit; if another took it, ask next visit.
      if (claimInterruption("location-consent")) setOpen(true)
    }, SHOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [permission])

  const allow = async () => {
    setRequesting(true)
    rememberAnswer("allowed")
    try {
      await requestPrecise()
    } finally {
      setRequesting(false)
      setOpen(false)
    }
  }

  const decline = () => {
    rememberAnswer("declined")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : decline())}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          {/* Pin in a lime tile: location is good news, not a warning. */}
          <span className="mb-2 grid h-11 w-11 place-items-center rounded-up-md bg-up-lime text-up-navy">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <DialogTitle>{t("location.permissionTitle")}</DialogTitle>
          <DialogDescription>{t("location.permissionBody")}</DialogDescription>
        </DialogHeader>
        {/* The privacy promise gets its own row so it isn't buried in the paragraph. */}
        <p className="flex items-start gap-2.5 rounded-up-md bg-up-lime-tint px-3.5 py-3 text-[13px] font-medium leading-relaxed text-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t("location.permissionPrivacy")}
        </p>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={decline} className="h-11">
            {t("common.notNow")}
          </Button>
          <Button type="button" onClick={allow} disabled={requesting} className="h-11 px-6">
            {requesting ? t("common.loading") : t("location.permissionAllow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LocationConsent
