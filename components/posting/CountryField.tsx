"use client"

/**
 * The country a listing is for.
 *
 * Distinct from `components/country-selector.tsx`, which drives the *viewing*
 * country through the `useViewingCountry` context. This is a plain form field:
 * it owns nothing global and reports both the display name and the ISO code.
 *
 * It replaces a free-text `<Input name="country" />`. That input is why the
 * location ranker so rarely fires — "nigeria", "Nigeria " and "NGA" are three
 * different strings to a matcher, and none of them equal the "NG" that a
 * user's normalised profile carries. Picking from the supported list also
 * settles which currency to preselect, which is the other half of this change.
 */

import * as React from "react"
import { Check, ChevronsUpDown, Globe2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SUPPORTED_GROUPS, type SupportedRegion } from "@/lib/geo/supported"
import { cn } from "@/lib/utils"

const REGION_LABEL: Record<SupportedRegion, string> = {
  "west-africa": "West Africa",
  "east-africa": "East Africa",
  "southern-africa": "Southern Africa",
  "central-africa": "Central Africa",
}

export type CountryValue = { code: string; name: string } | null

export function CountryField({
  value,
  onChange,
  placeholder = "Select country",
  className,
  disabled,
}: {
  value: CountryValue
  onChange: (next: CountryValue) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between rounded-lg border-border bg-muted/60 px-3 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Globe2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value ? value.name : placeholder}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search countries…" />
          <CommandList className="max-h-64">
            <CommandEmpty>
              No match. We currently cover 33 countries across Africa.
            </CommandEmpty>
            {SUPPORTED_GROUPS.map((group) => (
              <CommandGroup key={group.region} heading={REGION_LABEL[group.region]}>
                {group.countries.map((country) => (
                  <CommandItem
                    key={country.code}
                    // Searching by code as well as name: posters type "GH" as
                    // readily as "Ghana".
                    value={`${country.name} ${country.code}`}
                    onSelect={() => {
                      onChange(
                        value?.code === country.code
                          ? null
                          : { code: country.code, name: country.name },
                      )
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.code === country.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {country.name}
                    <span className="ml-auto text-xs text-muted-foreground">{country.code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
