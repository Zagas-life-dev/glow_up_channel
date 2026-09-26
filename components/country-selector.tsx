"use client"

/**
 * "Show me opportunities in…" — the country the feed is ranked for.
 *
 * Offers exactly the countries the platform covers (`lib/geo/supported.ts`),
 * grouped by region and in coverage-priority order rather than alphabetically,
 * so the focus countries lead. It no longer reads the search facets: the
 * supported list is the platform's own commitment, so a covered country with a
 * thin week of listings should still be offered rather than silently vanishing
 * from the menu.
 *
 * Defaults to wherever the user actually is and says so, rather than silently
 * pre-filtering — someone looking at a feed full of Ghanaian listings should be
 * able to see why in one glance, and change it in one tap.
 */

import * as React from "react"
import { Check, ChevronDown, Globe2, MapPin, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUserLocation } from "@/hooks/use-user-location"
import { countryByCode } from "@/lib/geo/countries"
import { isSupportedCountry, SUPPORTED_GROUPS } from "@/lib/geo/supported"
import { useViewingCountry, type ViewingSelection } from "@/lib/geo/viewing-country"
import { useLocale } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"

const REGION_LABEL_KEY = {
  "west-africa": "location.regionWestAfrica",
  "east-africa": "location.regionEastAfrica",
  "southern-africa": "location.regionSouthernAfrica",
  "central-africa": "location.regionCentralAfrica",
} as const

export function CountrySelector({
  className,
  align = "start",
}: {
  className?: string
  /** Menu alignment — "end" when the trigger sits at the right of a bar. */
  align?: "start" | "end" | "center"
}) {
  const { t } = useLocale()
  const { selection, setSelection } = useViewingCountry()
  const { location, loading } = useUserLocation()
  const [query, setQuery] = React.useState("")
  const q = query.trim().toLowerCase()

  const detected = countryByCode(location.countryCode)
  // Someone browsing from outside the covered region still gets a working feed,
  // but "your location" is not a useful filter for them — say so rather than
  // offering a country we have nothing for.
  const detectedIsCovered = isSupportedCountry(detected?.code)

  const activeLabel =
    selection.mode === "anywhere"
      ? t("location.anywhere")
      : selection.mode === "country"
        ? (countryByCode(selection.countryCode)?.name ?? selection.countryCode)
        : detected && detectedIsCovered
          ? detected.name
          : loading
            ? t("location.detecting")
            : t("location.chooseCountry")

  const isActive = (option: ViewingSelection): boolean => {
    if (option.mode !== selection.mode) return false
    if (option.mode === "country" && selection.mode === "country") {
      return option.countryCode === selection.countryCode
    }
    return true
  }

  // What the "your location" row says on the right.
  const detectedNote = loading
    ? "…"
    : !detected
      ? `(${t("location.unknown")})`
      : detectedIsCovered
        ? `(${detected.name})`
        : `(${detected.name} — ${t("location.notCovered")})`

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-[38px] max-w-[13rem] gap-1.5 rounded-full px-[13px]", className)}
          aria-label={t("location.chooseCountry")}
        >
          {selection.mode === "anywhere" ? (
            <Globe2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          ) : (
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          )}
          <span className="truncate text-[13px] font-semibold">{activeLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="max-h-[60vh] w-[280px] overflow-y-auto">
        {/* Search: typing here must not trigger the menu's own typeahead. */}
        <div className="relative mx-0.5 mb-1.5 mt-0.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={t("location.searchCountries")}
            aria-label={t("location.searchCountries")}
            className="h-10 w-full rounded-up-sm border-[1.5px] border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-up-orange focus:shadow-[0_0_0_4px_var(--up-orange-tint)]"
          />
        </div>

        <DropdownMenuLabel>{t("location.chooseCountry")}</DropdownMenuLabel>

        {/* The chosen country is pinned first, with a tick. */}
        {selection.mode === "country" && !q ? (
          <DropdownMenuItem onSelect={() => setSelection(selection)} className="flex items-center justify-between gap-2 bg-up-fill">
            <span className="truncate">{countryByCode(selection.countryCode)?.name ?? selection.countryCode}</span>
            <Check className="h-4 w-4 shrink-0 text-up-orange-ink" aria-hidden />
          </DropdownMenuItem>
        ) : null}

        {!q && (
          <>
            <DropdownMenuItem
              onSelect={() => setSelection({ mode: "auto" })}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="truncate">
                  {t("location.yourCountry")}
                  <span className="ml-1 font-medium text-muted-foreground">{detectedNote}</span>
                </span>
              </span>
              {isActive({ mode: "auto" }) && <Check className="h-4 w-4 shrink-0 text-up-orange-ink" aria-hidden />}
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => setSelection({ mode: "anywhere" })}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <Globe2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                {t("location.anywhere")}
              </span>
              {isActive({ mode: "anywhere" }) && <Check className="h-4 w-4 shrink-0 text-up-orange-ink" aria-hidden />}
            </DropdownMenuItem>
          </>
        )}

        {SUPPORTED_GROUPS.map((group) => {
          const countries = group.countries.filter(
            (country) => !q || country.name.toLowerCase().includes(q) || country.code.toLowerCase() === q,
          )
          if (!countries.length) return null
          return (
            <React.Fragment key={group.region}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t(REGION_LABEL_KEY[group.region])}</DropdownMenuLabel>
              {countries.map((country) => (
                <DropdownMenuItem
                  key={country.code}
                  onSelect={() => setSelection({ mode: "country", countryCode: country.code })}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">{country.name}</span>
                  {isActive({ mode: "country", countryCode: country.code }) && <Check className="h-4 w-4 shrink-0 text-up-orange-ink" aria-hidden />}
                </DropdownMenuItem>
              ))}
            </React.Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default CountrySelector
