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
import { MapPin } from "lucide-react"

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
    const timer = window.setTimeout(() => setOpen(true), SHOW_AFTER_MS)
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
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <DialogTitle>{t("location.permissionTitle")}</DialogTitle>
          <DialogDescription className="leading-relaxed">{t("location.permissionBody")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={decline} className="rounded-xl">
            {t("common.notNow")}
          </Button>
          <Button type="button" onClick={allow} disabled={requesting} className="rounded-xl">
            {requesting ? t("common.loading") : t("location.permissionAllow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LocationConsent
