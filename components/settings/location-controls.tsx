"use client"

/**
 * "Use my location" and "Clear my saved location", for settings.
 *
 * The profile fields beside this are what the user typed; this is the device
 * side — the GPS or connection reading that ranks the feed and is saved (to
 * about a kilometre) on the account. Clearing removes it from this browser and
 * from the server.
 */

import * as React from "react"
import { MapPin } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useUserLocation } from "@/hooks/use-user-location"
import { useLocale } from "@/lib/i18n/context"

export function LocationControls() {
  const { t } = useLocale()
  const { location, permission, requestPrecise, clearPrecise } = useUserLocation()
  const [busy, setBusy] = React.useState(false)

  const place = [location.city, location.region, location.country].filter(Boolean).join(", ")

  return (
    <div className="space-y-2 rounded-up-lg border border-border bg-up-fill/40 p-3">
      <p className="flex items-center gap-2 text-sm text-foreground">
        <MapPin className="h-4 w-4 text-primary" aria-hidden />
        {place ? t("location.detected", { place }) : t("location.unknown")}
      </p>
      <p className="text-xs text-muted-foreground">{t("location.accuracyNote")}</p>

      {permission === "denied" ? (
        <div className="text-xs text-muted-foreground">
          <p>{t("location.permissionDenied")}</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            <li>{t("location.blockedStep1")}</li>
            <li>{t("location.blockedStep2")}</li>
            <li>{t("location.blockedStep3")}</li>
          </ol>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {permission !== "granted" && permission !== "denied" && permission !== "unsupported" ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="rounded-xl"
            onClick={async () => {
              setBusy(true)
              try {
                await requestPrecise()
              } finally {
                setBusy(false)
              }
            }}
          >
            {t("location.useMyLocation")}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={() => {
            clearPrecise()
            toast.success(t("location.cleared"))
          }}
        >
          {t("location.clearSaved")}
        </Button>
      </div>
    </div>
  )
}

export default LocationControls
