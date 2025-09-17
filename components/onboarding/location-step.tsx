'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forwardRef, useImperativeHandle } from 'react'

const locationSchema = z.object({
  country: z.string().min(2, 'Country is required'),
  province: z.string().min(2, 'Province/State is required'),
  city: z.string().optional(),
})

type LocationFormValues = z.infer<typeof locationSchema>

interface LocationStepProps {
  onSubmit: (data: LocationFormValues) => void
  initialData?: any
}

const LocationStep = forwardRef<any, LocationStepProps>(({ onSubmit, initialData }, ref) => {
  const { control, handleSubmit, formState: { errors } } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      country: initialData?.country || '',
      province: initialData?.province || '',
      city: initialData?.city || '',
    },
  })

  useImperativeHandle(ref, () => ({
    submit: () => {
      handleSubmit(onSubmit)()
    }
  }))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-gray-900">Where are you located?</h3>
        <p className="mt-2 text-gray-600">This helps us find opportunities near you.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Controller
            name="country"
            control={control}
            render={({ field }) => <Input id="country" placeholder="e.g., Nigeria" {...field} />}
          />
          {errors.country && <p className="text-sm text-red-600">{errors.country.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="province">Province/State</Label>
          <Controller
            name="province"
            control={control}
            render={({ field }) => <Input id="province" placeholder="e.g., Lagos" {...field} />}
          />
          {errors.province && <p className="text-sm text-red-600">{errors.province.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City/Town (Optional)</Label>
        <Controller
          name="city"
          control={control}
          render={({ field }) => <Input id="city" placeholder="e.g., Ikeja" {...field} />}
        />
      </div>
    </form>
  )
})

LocationStep.displayName = 'LocationStep'

export default LocationStep 