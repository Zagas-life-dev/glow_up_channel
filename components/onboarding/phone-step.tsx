'use client'

/**
 * Phone number, stored E.164-style.
 *
 * The dial code defaults to whatever country was chosen on the previous step — for almost
 * everyone that is already right, so the field starts one tap from done. It stays changeable
 * because plenty of people carry a number from a country they no longer live in.
 *
 * The picker offers only countries we cover, matching the country step. A leading zero is
 * stripped on submit: locally people write 0801…, but E.164 has no trunk prefix.
 */

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DIAL_OPTIONS,
  buildPhoneNumber,
  dialOptionFor,
  flagEmoji,
  isValidNationalNumber,
  normalizeNationalNumber,
} from '@/lib/geo/dial-codes'
import { StepField, StepHeader, StepPayoff, stepInputClass } from './step-shell'

interface PhoneStepProps {
  onSubmit: (data: { phoneNumber: string; phoneCountryCode: string }) => void
  initialData?: any
  onValidityChange?: (valid: boolean) => void
}

/** Split a stored E.164 number back into a dial code and the national part. */
function splitStoredNumber(stored: string | undefined): { code: string; national: string } | null {
  if (!stored) return null
  const trimmed = stored.trim()
  // Longest dial code first, so +234 is not matched as +23.
  const match = [...DIAL_OPTIONS]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((option) => trimmed.startsWith(option.dial))
  if (!match) return null
  return { code: match.code, national: trimmed.slice(match.dial.length) }
}

const PhoneStep = forwardRef<any, PhoneStepProps>(({ onSubmit, initialData, onValidityChange }, ref) => {
  const stored = useMemo(() => splitStoredNumber(initialData?.phoneNumber), [initialData?.phoneNumber])

  const [dialCountry, setDialCountry] = useState<string>(
    stored?.code || initialData?.phoneCountryCode || initialData?.countryCode || '',
  )
  const [national, setNational] = useState<string>(stored?.national || '')
  const [touched, setTouched] = useState(false)

  // Follow the country step until the user overrides the dial code themselves.
  const [dialTouched, setDialTouched] = useState(Boolean(stored?.code))
  useEffect(() => {
    if (dialTouched) return
    if (initialData?.countryCode && dialOptionFor(initialData.countryCode)) {
      setDialCountry(initialData.countryCode)
    }
  }, [initialData?.countryCode, dialTouched])

  const option = dialOptionFor(dialCountry)
  const isValid = Boolean(option) && isValidNationalNumber(national)

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  useImperativeHandle(ref, () => ({
    submit: () => {
      setTouched(true)
      if (!isValid || !option) return
      onSubmit({
        phoneNumber: buildPhoneNumber(option.dial, national),
        phoneCountryCode: option.code,
      })
    },
  }))

  const digits = normalizeNationalNumber(national)
  const error = !touched
    ? undefined
    : !option
      ? 'Pick the country your number is registered in'
      : digits.length === 0
        ? 'Enter your phone number'
        : !isValidNationalNumber(national)
          ? 'That does not look like a complete number'
          : undefined

  return (
    <div>
      <StepHeader
        title="What's your number?"
        description="Providers reach shortlisted applicants by phone more often than by email."
      />

      <div className="space-y-5">
        <StepField label="Phone number" htmlFor="phone" error={error}>
          <div className="flex gap-2">
            <Select
              value={dialCountry}
              onValueChange={(value) => { setDialCountry(value); setDialTouched(true); setTouched(false) }}
            >
              <SelectTrigger className={`${stepInputClass} w-[7.5rem] shrink-0`} aria-label="Country dialling code">
                <SelectValue placeholder="Code">
                  {option ? (
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden>{flagEmoji(option.code)}</span>
                      <span className="tabular-nums">{option.dial}</span>
                    </span>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[18rem]">
                {DIAL_OPTIONS.map((entry) => (
                  <SelectItem key={entry.code} value={entry.code}>
                    <span className="mr-2" aria-hidden>{flagEmoji(entry.code)}</span>
                    <span className="tabular-nums">{entry.dial}</span>
                    <span className="ml-2 text-muted-foreground">{entry.country.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={national}
              onChange={(e) => { setNational(e.target.value); setTouched(false) }}
              placeholder={option?.example || '801 234 5678'}
              className={`${stepInputClass} min-w-0 flex-1`}
            />
          </div>
        </StepField>

        {option && isValid ? (
          <StepPayoff>
            We will save this as{' '}
            <strong className="font-semibold tabular-nums">{buildPhoneNumber(option.dial, national)}</strong>. Only
            providers you apply to can see it.
          </StepPayoff>
        ) : (
          <StepPayoff>
            Your number is never shown on your profile, and never shared with anyone you have not
            applied to.
          </StepPayoff>
        )}
      </div>
    </div>
  )
})

PhoneStep.displayName = 'PhoneStep'

export default PhoneStep
