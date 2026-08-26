'use client'

/**
 * Where the user is — the single most load-bearing answer in onboarding, since location is the
 * second-heaviest signal in the ranking layer.
 *
 * The country picker offers only `SUPPORTED_COUNTRIES`, not every country on earth. Someone
 * outside our coverage picking their real country used to produce a profile we have nothing to
 * rank for; restricting the list makes the platform's actual reach honest at the point of asking.
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SUPPORTED_GROUPS, type SupportedRegion } from '@/lib/geo/supported'
import { lookupCountry } from '@/lib/geo/countries'
import { flagEmoji } from '@/lib/geo/dial-codes'
import { StepField, StepHeader, StepPayoff, stepInputClass } from './step-shell'

const REGION_LABELS: Record<SupportedRegion, string> = {
  'west-africa': 'West Africa',
  'east-africa': 'East Africa',
  'southern-africa': 'Southern Africa',
  'central-africa': 'Central Africa',
}

interface LocationStepProps {
  onSubmit: (data: { country: string; countryCode: string; province: string; city?: string }) => void
  initialData?: any
  onValidityChange?: (valid: boolean) => void
}

const LocationStep = forwardRef<any, LocationStepProps>(({ onSubmit, initialData, onValidityChange }, ref) => {
  // Old cached answers arrived as free text ("nigeria", "NGA"), so normalise to a code first.
  const initialCode =
    initialData?.countryCode || lookupCountry(initialData?.country)?.code || ''

  const [countryCode, setCountryCode] = useState<string>(initialCode)
  const [province, setProvince] = useState<string>(initialData?.province || '')
  const [city, setCity] = useState<string>(initialData?.city || '')
  const [touched, setTouched] = useState(false)

  const country = countryCode ? lookupCountry(countryCode) : null
  const isValid = Boolean(countryCode) && province.trim().length >= 2

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  useImperativeHandle(ref, () => ({
    submit: () => {
      setTouched(true)
      if (!isValid || !country) return
      onSubmit({
        country: country.name,
        countryCode: country.code,
        province: province.trim(),
        city: city.trim() || undefined,
      })
    },
  }))

  return (
    <div>
      <StepHeader
        title="Where are you based?"
        description="Geo-locked opportunities are the biggest chunk of what we index."
      />

      <div className="space-y-5">
        <StepField label="Country" error={touched && !countryCode ? 'Pick your country to continue' : undefined}>
          <Select value={countryCode} onValueChange={(value) => { setCountryCode(value); setTouched(false) }}>
            <SelectTrigger className={stepInputClass}>
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent className="max-h-[18rem]">
              {SUPPORTED_GROUPS.map((group) => (
                <SelectGroup key={group.region}>
                  <SelectLabel className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {REGION_LABELS[group.region]}
                  </SelectLabel>
                  {group.countries.map((entry) => (
                    <SelectItem key={entry.code} value={entry.code}>
                      <span className="mr-2" aria-hidden>{flagEmoji(entry.code)}</span>
                      {entry.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </StepField>

        <StepField
          label="State"
          htmlFor="province"
          error={touched && province.trim().length < 2 ? 'Tell us which state or province' : undefined}
        >
          <Input
            id="province"
            value={province}
            onChange={(e) => { setProvince(e.target.value); setTouched(false) }}
            placeholder="Lagos"
            className={stepInputClass}
          />
        </StepField>

        <StepField label="City" htmlFor="city" optional>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Yaba, Surulere…"
            className={stepInputClass}
          />
        </StepField>

        {country ? (
          <StepPayoff>
            <strong className="font-semibold">{country.name}</strong> listings unlock the moment you
            answer this, and everything else gets ranked against where you are.
          </StepPayoff>
        ) : null}
      </div>
    </div>
  )
})

LocationStep.displayName = 'LocationStep'

export default LocationStep
