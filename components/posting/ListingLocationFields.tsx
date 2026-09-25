"use client"

/**
 * Where a listing is — picked, not typed.
 *
 * A reader's position comes from their device, so a listing needs a precise
 * place to be matched against it: country always, the state/region/county
 * unless the listing is remote, and optionally the city. For the four focus
 * countries (NG, GH, KE, ET) states and cities come from the shared places
 * table, so "Ikeja" and "Lagos" can never be two places again; elsewhere they
 * are free text. A remote listing says who may apply — anyone, or only people
 * in the countries chosen.
 */

import * as React from "react"
import { X } from "lucide-react"

import { CountryField, type CountryValue } from "@/components/posting/CountryField"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { countryByCode } from "@/lib/geo/countries"
import { citiesOf, hasRegions, regionLabel, regionsOf } from "@/lib/geo/places"
import { useLocale } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"

export type ListingLocationValue = {
  country: CountryValue
  province: string
  city: string
  isRemote: boolean
  /** ISO codes. Empty = open to anyone, anywhere. */
  remoteCountries: string[]
}

export const EMPTY_LISTING_LOCATION: ListingLocationValue = {
  country: null,
  province: "",
  city: "",
  isRemote: false,
  remoteCountries: [],
}

/** The i18n key for a country's first-level division. */
function regionKey(countryCode: string | undefined) {
  const label = regionLabel(countryCode)
  if (label === "County") return "location.regionCounty" as const
  if (label === "Region") return "location.regionRegion" as const
  return "location.regionState" as const
}

/** True when the form has what the backend requires. */
export function isListingLocationComplete(value: ListingLocationValue): boolean {
  if (value.isRemote) return true
  return Boolean(value.country?.code && value.province.trim())
}

const OTHER = "__other__"

export function ListingLocationFields({
  value,
  onChange,
  className,
}: {
  value: ListingLocationValue
  onChange: (next: ListingLocationValue) => void
  className?: string
}) {
  const { t } = useLocale()
  const code = value.country?.code
  const structured = hasRegions(code)
  const regionName = t(regionKey(code))
  const cities = citiesOf(code, value.province)
  const [cityIsFree, setCityIsFree] = React.useState(false)
  const [remoteMode, setRemoteMode] = React.useState<"anywhere" | "countries">(
    value.remoteCountries.length ? "countries" : "anywhere",
  )

  const set = (patch: Partial<ListingLocationValue>) => onChange({ ...value, ...patch })

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[13px] font-bold text-foreground">{t("location.isRemote")}</Label>
        <Switch checked={value.isRemote} onCheckedChange={(isRemote) => set({ isRemote })} />
      </div>

      {value.isRemote ? (
        <div className="space-y-2 rounded-up-xl border border-border bg-card p-3">
          <p className="text-[13px] font-bold text-foreground">{t("location.remoteWho")}</p>
          <div className="flex flex-wrap gap-2">
            {(["anywhere", "countries"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={remoteMode === mode}
                onClick={() => {
                  setRemoteMode(mode)
                  if (mode === "anywhere") set({ remoteCountries: [] })
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  remoteMode === mode
                    ? "border-primary bg-up-orange-tint text-up-orange-ink"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {mode === "anywhere" ? t("location.remoteAnywhere") : t("location.remoteCountries")}
              </button>
            ))}
          </div>
          {remoteMode === "countries" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t("location.remoteCountriesHint")}</p>
              <CountryField
                value={null}
                placeholder={t("location.selectCountry")}
                onChange={(next) => {
                  if (next && !value.remoteCountries.includes(next.code)) {
                    set({ remoteCountries: [...value.remoteCountries, next.code] })
                  }
                }}
              />
              <div className="flex flex-wrap gap-1.5">
                {value.remoteCountries.map((remoteCode) => (
                  <span
                    key={remoteCode}
                    className="inline-flex items-center gap-1 rounded-full border border-primary bg-up-orange-tint px-3 py-1 text-xs font-medium text-up-orange-ink"
                  >
                    {countryByCode(remoteCode)?.name ?? remoteCode}
                    <button
                      type="button"
                      aria-label={t("tags.remove", { tag: countryByCode(remoteCode)?.name ?? remoteCode })}
                      onClick={() => set({ remoteCountries: value.remoteCountries.filter((c) => c !== remoteCode) })}
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Country (and state/city) still apply to a remote listing that has a
          base — they are just optional then. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CountryField
          value={value.country}
          placeholder={t("location.selectCountry")}
          onChange={(country) => {
            setCityIsFree(false)
            set({ country, province: "", city: "" })
          }}
        />

        {structured ? (
          <Select value={value.province || undefined} onValueChange={(province) => set({ province, city: "" })}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder={t("location.selectRegion", { label: regionName })} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {regionsOf(code).map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={value.province}
            onChange={(event) => set({ province: event.target.value })}
            placeholder={regionName}
            className="h-10 text-sm"
          />
        )}

        {structured && cities.length > 0 && !cityIsFree ? (
          <Select
            value={value.city || undefined}
            onValueChange={(city) => {
              if (city === OTHER) {
                setCityIsFree(true)
                set({ city: "" })
              } else {
                set({ city })
              }
            }}
          >
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder={`${t("location.selectCity")} (${t("common.optional").toLowerCase()})`} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {cities.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
              <SelectItem value={OTHER}>{t("location.cityNotListed")}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={value.city}
            onChange={(event) => set({ city: event.target.value })}
            placeholder={`${t("location.city")} (${t("common.optional").toLowerCase()})`}
            className="h-10 text-sm"
          />
        )}
      </div>

      {!isListingLocationComplete(value) ? (
        <p className="text-xs text-muted-foreground">{t("location.required", { label: regionName.toLowerCase() })}</p>
      ) : null}
    </div>
  )
}

export default ListingLocationFields
