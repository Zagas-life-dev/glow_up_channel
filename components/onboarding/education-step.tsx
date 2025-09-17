'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { forwardRef, useImperativeHandle } from 'react'

const educationSchema = z.object({
  educationLevel: z.string().min(1, 'Please select your highest level of education'),
  fieldOfStudy: z.string().min(1, 'Please select your field of study'),
  institution: z.string().optional(),
})

type EducationFormValues = z.infer<typeof educationSchema>

interface EducationStepProps {
  onSubmit: (data: EducationFormValues) => void
  initialData?: any
}

const educationLevels = ["High School", "Undergraduate", "Graduate", "Professional"]
const fieldsOfStudy = ["Business", "Engineering", "Arts", "Medicine", "Technology", "Other"]

const EducationStep = forwardRef<any, EducationStepProps>(({ onSubmit, initialData }, ref) => {
  const { control, handleSubmit, formState: { errors } } = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      educationLevel: initialData?.educationLevel || '',
      fieldOfStudy: initialData?.fieldOfStudy || '',
      institution: initialData?.institution || '',
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
        <h3 className="text-2xl font-semibold text-gray-900">Educational Background</h3>
        <p className="mt-2 text-gray-600">This information is optional but highly recommended.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Highest Level Completed</Label>
          <Controller
            name="educationLevel"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {educationLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.educationLevel && <p className="text-sm text-red-600">{errors.educationLevel.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Field of Study</Label>
          <Controller
            name="fieldOfStudy"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {fieldsOfStudy.map(field => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.fieldOfStudy && <p className="text-sm text-red-600">{errors.fieldOfStudy.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="institution">Institution Name (Optional)</Label>
          <Controller
            name="institution"
            control={control}
            render={({ field }) => <Input id="institution" placeholder="e.g., University of Example" {...field} />}
          />
        </div>
      </div>
    </form>
  )
})

EducationStep.displayName = 'EducationStep'

export default EducationStep 