"use client"

/**
 * Asks for location before the browser does.
 *
 * The browser's own prompt gives no context and a denial is permanent for the
 * origin — one cold `getCurrentPosition()` can cost that user's precise
 * location forever. So we explain first, and only call the browser API when
 * they press the button here.
 *
 * Dismissal is remembered. Someone who said "not now" should not be asked again
 * on the next page load, or the pattern is just the browser prompt with extra
 * steps.
 */

import * as React from "react"
import { MapPin, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/i18n/context"
import type { GeolocationPermission } from "@/lib/geo/types"
import { cn } from "@/lib/utils"

const DISMISS_KEY = "glowup-location-prompt-dismissed"
/** Ask again after a fortnight — circumstances change, nagging does not help. */
const DISMISS_DAYS = 14

function dismissedRecently(): boolean {
  if (typeof window === "undefined") return true
  try {
    const stored = localStorage.getItem(DISMISS_KEY)
    if (!stored) return false
    const age = Date.now() - Number(stored)
    return Number.isFinite(age) && age < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function rememberDismissal(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // Private browsing — worst case they see the card again next session.
  }
}

export function LocationPermissionCard({
  permission,
  onRequest,
  className,
}: {
  permission: GeolocationPermission
  onRequest: () => Promise<unknown>
  className?: string
}) {
  const { t } = useLocale()
  const [dismissed, setDismissed] = React.useState(true)
  const [requesting, setRequesting] = React.useState(false)

  // Read localStorage in an effect, not during render — otherwise the server
  // and client disagree and React logs a hydration mismatch.
  React.useEffect(() => {
    setDismissed(dismissedRecently())
  }, [])

  const handleRequest = async () => {
    setRequesting(true)
    try {
      await onRequest()
    } finally {
      setRequesting(false)
    }
  }

  const handleDismiss = () => {
    rememberDismissal()
    setDismissed(true)
  }

  // Nothing useful to say once they have decided, or if the browser cannot.
  if (permission === "granted" || permission === "unsupported") return null

  if (permission === "denied") {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {t("location.permissionDenied")}
      </p>
    )
  }

  if (dismissed || permission === "unknown") return null

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border/70 bg-card/70 p-4",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        aria-label={t("common.close")}
        className="absolute right-2 top-2 h-7 w-7 text-muted-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </Button>

      <div className="flex gap-3 pr-8">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <MapPin className="h-4.5 w-4.5 text-primary" aria-hidden />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("location.permissionTitle")}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("location.permissionBody")}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleRequest}
              disabled={requesting}
              className="rounded-xl"
            >
              {requesting ? t("common.loading") : t("location.permissionAllow")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="rounded-xl text-muted-foreground"
            >
              {t("common.notNow")}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            {t("location.accuracyNote")}
          </p>
        </div>
      </div>
    </div>
  )
}

export default LocationPermissionCard
