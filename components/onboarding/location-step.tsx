'use client'

/**
 * Where the user is — the single most load-bearing answer in onboarding, since
 * location is the second-heaviest signal in the ranking layer.
 *
 * Three changes from the plain text version this replaces:
 *
 *   1. Country is a picker backed by the real ISO list, so profiles stop
 *      arriving as "nigeria", "Nigeria ", and "NGA" — all of which used to be
 *      three different countries as far as filtering was concerned.
 *   2. Whatever the CDN already knows is offered as a one-tap prefill.
 *   3. Precise location is offered, explained, and entirely optional. Declining
 *      costs nothing here — the typed country still drives ranking.
 */

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LocationPermissionCard from '@/components/location-permission-card'
import { countryNames, lookupCountry } from '@/lib/geo/countries'
import { useUserLocation } from '@/hooks/use-user-location'
import { useLocale } from '@/lib/i18n/context'

const locationSchema = z.object({
  country: z.string().min(2, 'Country is required'),
  province: z.string().min(2, 'Province/State is required'),
  city: z.string().optional(),
  /** Captured only if the user opts in; sent to the backend for distance ranking. */
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

type LocationFormValues = z.infer<typeof locationSchema>

interface LocationStepProps {
  onSubmit: (data: LocationFormValues) => void
  initialData?: any
}

const LocationStep = forwardRef<any, LocationStepProps>(({ onSubmit, initialData }, ref) => {
  const { t } = useLocale()
  const { location, loading, permission, requestPrecise } = useUserLocation()
  const [prefilled, setPrefilled] = useState(false)

  const countries = useMemo(() => countryNames(), [])

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      // Normalize whatever was cached from a previous attempt, so an old
      // free-text answer still matches an option in the picker.
      country: lookupCountry(initialData?.country)?.name || initialData?.country || '',
      province: initialData?.province || '',
      city: initialData?.city || '',
      latitude: initialData?.latitude,
      longitude: initialData?.longitude,
    },
  })

  const country = watch('country')

  // Offer the detected place once, and only into empty fields — never overwrite
  // something the user has typed.
  const detectedName = location.country
  const canPrefill = !prefilled && !loading && Boolean(detectedName) && !country

  useEffect(() => {
    if (location.coordinates) {
      setValue('latitude', location.coordinates.lat)
      setValue('longitude', location.coordinates.lng)
    }
  }, [location.coordinates, setValue])

  const applyDetected = () => {
    if (detectedName) setValue('country', detectedName, { shouldValidate: true })
    if (location.region) setValue('province', location.region, { shouldValidate: true })
    if (location.city) setValue('city', location.city)
    setPrefilled(true)
  }

  useImperativeHandle(ref, () => ({
    submit: () => {
      handleSubmit(onSubmit)()
    }
  }))

  const detectedLabel = [location.city, location.region, location.country]
    .filter(Boolean)
    .join(', ')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-foreground">{t('location.title')}</h3>
        <p className="mt-2 text-muted-foreground">{t('location.subtitle')}</p>
      </div>

      {canPrefill && (
        <button
          type="button"
          onClick={applyDetected}
          className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-3 text-left transition-colors hover:border-primary/60"
        >
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="flex-1 text-sm">
            {t('location.detected', { place: detectedLabel })}
          </span>
          <span className="text-xs font-medium text-primary">
            {t('location.useDetected')}
          </span>
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="country">{t('location.country')}</Label>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <>
                {/* A datalist keeps this a plain text input — free-text answers
                    still work for anywhere the list misses — while steering the
                    common case onto a canonical spelling. */}
                <Input
                  id="country"
                  list="glowup-country-list"
                  placeholder={t('location.countryPlaceholder')}
                  autoComplete="country-name"
                  {...field}
                  onBlur={(event) => {
                    field.onBlur()
                    const match = lookupCountry(event.target.value)
                    if (match) field.onChange(match.name)
                  }}
                />
                <datalist id="glowup-country-list">
                  {countries.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </>
            )}
          />
          {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="province">{t('location.province')}</Label>
          <Controller
            name="province"
            control={control}
            render={({ field }) => (
              <Input
                id="province"
                placeholder={t('location.provincePlaceholder')}
                autoComplete="address-level1"
                {...field}
              />
            )}
          />
          {errors.province && <p className="text-sm text-destructive">{errors.province.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">
          {t('location.city')}{' '}
          <span className="text-muted-foreground">({t('common.optional')})</span>
        </Label>
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <Input
              id="city"
              placeholder={t('location.cityPlaceholder')}
              autoComplete="address-level2"
              {...field}
            />
          )}
        />
      </div>

      <LocationPermissionCard permission={permission} onRequest={requestPrecise} />
    </form>
  )
})

LocationStep.displayName = 'LocationStep'

export default LocationStep
