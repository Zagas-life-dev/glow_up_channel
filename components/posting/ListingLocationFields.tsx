"use client"

/**
 * Where a listing is — picked, not typed.
 *
 * A reader's position comes from their device, so a listing is matched as
 * precisely as it allows: the country is required (unless remote), while the
 * state/region/county and city are optional — many ads name only the country
 * and never say whether they are remote, and they still go up. For the four focus
 * countries (NG, GH, KE, ET) states and cities come from the shared places
 * table, so "Ikeja" and "Lagos" can never be two places again; elsewhere they
 * are free text. A remote listing says who may apply — anyone, or only people
 * in the countries chosen.
 */

import * as React from "react"
import { Plus, X } from "lucide-react"

import { CountryField, type CountryValue } from "@/components/posting/CountryField"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { countryByCode } from "@/lib/geo/countries"
import { citiesOf, hasRegions, regionLabel, regionsOf } from "@/lib/geo/places"
import { useLocale } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"

/** One more place the listing is offered in. */
export type ExtraPlaceValue = {
  country: CountryValue
  province: string
  city: string
}

export type ListingLocationValue = {
  country: CountryValue
  province: string
  city: string
  isRemote: boolean
  /** ISO codes. Empty = open to anyone, anywhere. */
  remoteCountries: string[]
  /**
   * Other places the listing is offered in. The backend posts another country
   * as its own copy of the listing; more states of the same country stay one
   * listing, shown at whichever place is nearest the reader.
   */
  places: ExtraPlaceValue[]
}

export const EMPTY_LISTING_LOCATION: ListingLocationValue = {
  country: null,
  province: "",
  city: "",
  isRemote: false,
  remoteCountries: [],
  places: [],
}

/** An extra place is usable once it has a country; state and city are optional. */
function isPlaceComplete(place: ExtraPlaceValue): boolean {
  return Boolean(place.country?.code)
}

/** The extra places as the listing payload wants them; incomplete rows are left out. */
export function extraPlacesPayload(places: ExtraPlaceValue[]) {
  return places.filter(isPlaceComplete).map((place) => ({
    country: place.country?.name,
    countryCode: place.country?.code,
    province: place.province.trim() || undefined,
    city: place.city.trim() || undefined,
  }))
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
  // A half-filled extra row would be silently dropped — make them finish or remove it.
  if (!(value.places ?? []).every(isPlaceComplete)) return false
  if (value.isRemote) return true
  return Boolean(value.country?.code)
}

const OTHER = "__other__"

/**
 * State/region and city for one country: a picker for the focus countries,
 * free text elsewhere. Shared by the listing's main place and each extra one.
 */
function RegionCityFields({
  countryCode,
  province,
  city,
  onChange,
}: {
  countryCode: string | undefined
  province: string
  city: string
  onChange: (patch: { province?: string; city?: string }) => void
}) {
  const { t } = useLocale()
  const structured = hasRegions(countryCode)
  const optional = ` (${t("common.optional").toLowerCase()})`
  const regionName = t(regionKey(countryCode))
  const cities = citiesOf(countryCode, province)
  const [cityIsFree, setCityIsFree] = React.useState(false)

  // A new country starts the city picker over.
  React.useEffect(() => setCityIsFree(false), [countryCode])

  return (
    <>
      {structured ? (
        <Select value={province || undefined} onValueChange={(next) => onChange({ province: next, city: "" })}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder={t("location.selectRegion", { label: regionName }) + optional} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {regionsOf(countryCode).map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={province}
          onChange={(event) => onChange({ province: event.target.value })}
          placeholder={regionName + optional}
          className="h-10 text-sm"
        />
      )}

      {structured && cities.length > 0 && !cityIsFree ? (
        <Select
          value={city || undefined}
          onValueChange={(next) => {
            if (next === OTHER) {
              setCityIsFree(true)
              onChange({ city: "" })
            } else {
              onChange({ city: next })
            }
          }}
        >
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder={t("location.selectCity") + optional} />
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
          value={city}
          onChange={(event) => onChange({ city: event.target.value })}
          placeholder={t("location.city") + optional}
          className="h-10 text-sm"
        />
      )}
    </>
  )
}

/**
 * The listing's other places. New rows start in the main place's country,
 * since "same listing, more states" is the common case.
 */
export function ExtraPlacesField({
  places,
  defaultCountry,
  onChange,
}: {
  places: ExtraPlaceValue[]
  defaultCountry: CountryValue
  onChange: (next: ExtraPlaceValue[]) => void
}) {
  const { t } = useLocale()
  const update = (index: number, patch: Partial<ExtraPlaceValue>) =>
    onChange(places.map((place, i) => (i === index ? { ...place, ...patch } : place)))

  return (
    <div className="space-y-2">
      {places.length > 0 ? (
        <div className="space-y-2 rounded-up-xl border border-border bg-card p-3">
          <p className="text-[13px] font-bold text-foreground">{t("location.otherPlaces")}</p>
          <p className="text-xs text-muted-foreground">{t("location.otherPlacesHint")}</p>
          {places.map((place, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                <CountryField
                  value={place.country}
                  placeholder={t("location.selectCountry")}
                  onChange={(country) => update(index, { country, province: "", city: "" })}
                />
                <RegionCityFields
                  countryCode={place.country?.code}
                  province={place.province}
                  city={place.city}
                  onChange={(patch) => update(index, patch)}
                />
              </div>
              <button
                type="button"
                aria-label={t("location.removePlace")}
                title={t("location.removePlace")}
                onClick={() => onChange(places.filter((_, i) => i !== index))}
                className="mt-2.5 shrink-0 rounded-full p-1 text-muted-foreground hover:bg-up-fill hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onChange([...places, { country: defaultCountry, province: "", city: "" }])}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {t("location.addPlace")}
      </button>
    </div>
  )
}

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
          onChange={(country) => set({ country, province: "", city: "" })}
        />
        <RegionCityFields
          countryCode={code}
          province={value.province}
          city={value.city}
          onChange={(patch) => set(patch)}
        />
      </div>

      <ExtraPlacesField
        places={value.places ?? []}
        defaultCountry={value.country}
        onChange={(places) => set({ places })}
      />

      {!isListingLocationComplete(value) ? (
        <p className="text-xs text-muted-foreground">{t("location.required")}</p>
      ) : null}
    </div>
  )
}

export default ListingLocationFields
