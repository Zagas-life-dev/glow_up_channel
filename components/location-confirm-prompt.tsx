"use client"

/**
 * "Is this where you are?" — once, for existing users whose saved location was
 * typed freely and could not be read cleanly.
 *
 * The cleanup fixed what it could automatically ("nigerai" → Nigeria, "Ikeja"
 * → Lagos). This asks about the rest, with the pickers pre-filled from the
 * best guess, so a single tap confirms it. A profile that already reads cleanly
 * is never asked; one that has been confirmed is never asked again.
 */

import * as React from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { MapPin } from "lucide-react"
import { claimInterruption } from "@/lib/interruptions"

import { CountryField, type CountryValue } from "@/components/posting/CountryField"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ApiClient from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { lookupCountry } from "@/lib/geo/countries"
import { citiesOf, hasRegions, regionLabel, regionsOf, resolveRegionCity } from "@/lib/geo/places"
import { useLocale } from "@/lib/i18n/context"

const DISMISSED_KEY = "glowup-location-confirm-dismissed"
/** After the first-load location question has had its turn. */
const SHOW_AFTER_MS = 8000
const QUIET_PREFIXES = ["/login", "/signup", "/register", "/auth", "/admin", "/onboarding", "/dashboard/admin"]

type ProfileLocation = {
  country?: string | null
  province?: string | null
  city?: string | null
  locationConfirmedAt?: string | null
}

/** True when the saved location cannot be read as a clean country / state / city. */
export function needsConfirmation(profile: ProfileLocation): boolean {
  if (profile.locationConfirmedAt) return false
  const raw = (profile.country ?? "").trim()
  const country = lookupCountry(raw)
  if (!country) return true
  if (raw.toLowerCase() === "niger") return true // also a common typo for Nigeria
  if (raw !== country.name) return true
  if (!hasRegions(country.code)) return false
  if (!regionsOf(country.code).includes((profile.province ?? "").trim())) return true
  const city = (profile.city ?? "").trim()
  return Boolean(city) && !citiesOf(country.code, profile.province).includes(city)
}

export function LocationConfirmPrompt() {
  const { t } = useLocale()
  const pathname = usePathname()
  const { profile, isAuthenticated, refreshUser } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [country, setCountry] = React.useState<CountryValue>(null)
  const [state, setState] = React.useState("")
  const [city, setCity] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const saved = profile as unknown as ProfileLocation | null

  React.useEffect(() => {
    if (!isAuthenticated || !saved || !(profile as { onboardingCompleted?: boolean })?.onboardingCompleted) return
    if (QUIET_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) return
    if (!needsConfirmation(saved)) return
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return
    } catch {
      return
    }

    // Pre-fill from the best guess, so a correct guess is one tap.
    const guess = lookupCountry(saved.country ?? "")
    const regionCity = resolveRegionCity(guess?.code, saved.province, saved.city)
    setCountry(guess ? { code: guess.code, name: guess.name } : null)
    setState(regionCity.state ?? (guess && !hasRegions(guess.code) ? saved.province ?? "" : ""))
    setCity(regionCity.city ?? (guess && !hasRegions(guess.code) ? saved.city ?? "" : ""))

    const timer = window.setTimeout(() => {
      // Never on top of another dialog (the location question, a gift).
      if (!document.querySelector('[role="dialog"]') && claimInterruption("location-confirm")) setOpen(true)
    }, SHOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [isAuthenticated, saved, profile, pathname])

  const later = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {
      // ignore
    }
    setOpen(false)
  }

  const confirm = async () => {
    if (!country || !state.trim()) return
    setSaving(true)
    try {
      const response = await ApiClient.makeAuthenticatedRequest(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/location/profile`, {
        method: "PUT",
        body: JSON.stringify({ countryCode: country.code, state: state.trim(), city: city.trim() || undefined }),
      })
      const json = await response.json()
      if (!response.ok || !json?.success) throw new Error(json?.message || "Failed to save")
      setOpen(false)
      await refreshUser()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const structured = hasRegions(country?.code)
  const label = regionLabel(country?.code)

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : later())}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          {/* Neutral pin tile: this is housekeeping, not news. */}
          <span className="mb-2 grid h-11 w-11 place-items-center rounded-up-md bg-up-fill text-foreground">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <DialogTitle>{t("onboarding.locationConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("onboarding.locationConfirmBody")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <CountryField
            value={country}
            placeholder={t("location.selectCountry")}
            onChange={(next) => {
              setCountry(next)
              setState("")
              setCity("")
            }}
          />
          {structured ? (
            <Select value={state || undefined} onValueChange={(value) => { setState(value); setCity("") }}>
              <SelectTrigger className="h-[46px] text-[15px]">
                <SelectValue placeholder={t("location.selectRegion", { label })} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {regionsOf(country?.code).map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={state} onChange={(e) => setState(e.target.value)} placeholder={label} className="h-[46px] text-[15px]" />
          )}
          {structured && citiesOf(country?.code, state).length > 0 ? (
            <Select value={city || undefined} onValueChange={setCity}>
              <SelectTrigger className="h-[46px] text-[15px]">
                <SelectValue placeholder={t("location.selectCity")} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {citiesOf(country?.code, state).map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("location.city")} className="h-[46px] text-[15px]" />
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={later} className="h-11">
            {t("common.notNow")}
          </Button>
          <Button type="button" onClick={confirm} disabled={saving || !country || !state.trim()} className="h-11 px-6">
            {t("onboarding.locationConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LocationConfirmPrompt
