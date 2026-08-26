'use client'

/**
 * Education and career stage in one step.
 *
 * They were two screens asking four short questions between them, which is a lot of Continue
 * taps for very little on each. Career stage in particular is a single tap.
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

import { Input } from '@/components/ui/input'
import { OptionGrid, StepField, StepHeader, StepPayoff, stepInputClass } from './step-shell'

const EDUCATION_LEVELS = [
  { value: 'High School', label: 'High School' },
  { value: 'Undergraduate', label: 'Undergraduate' },
  { value: 'Graduate', label: 'Graduate' },
  { value: 'Professional', label: 'Professional' },
] as const

const CAREER_STAGES = [
  { value: 'Student', label: 'Student' },
  { value: 'Entry-Level (0-2 years)', label: 'Entry level', hint: '0–2 years' },
  { value: 'Mid-Career (3-7 years)', label: 'Mid career', hint: '3–7 years' },
  { value: 'Senior/Executive (8+ years)', label: 'Senior or executive', hint: '8+ years' },
] as const

const FIELDS_OF_STUDY = [
  'Business',
  'Engineering',
  'Arts',
  'Medicine',
  'Technology',
  'Other',
]

interface EducationStepProps {
  onSubmit: (data: {
    educationLevel: string
    careerStage: string
    fieldOfStudy: string
    institution?: string
  }) => void
  initialData?: any
  onValidityChange?: (valid: boolean) => void
}

const EducationStep = forwardRef<any, EducationStepProps>(
  ({ onSubmit, initialData, onValidityChange }, ref) => {
    const [educationLevel, setEducationLevel] = useState<string>(initialData?.educationLevel || '')
    const [careerStage, setCareerStage] = useState<string>(initialData?.careerStage || '')
    const [fieldOfStudy, setFieldOfStudy] = useState<string>(initialData?.fieldOfStudy || '')
    const [institution, setInstitution] = useState<string>(initialData?.institution || '')
    const [touched, setTouched] = useState(false)

    const isValid = Boolean(educationLevel && careerStage && fieldOfStudy)

    useEffect(() => {
      onValidityChange?.(isValid)
    }, [isValid, onValidityChange])

    useImperativeHandle(ref, () => ({
      submit: () => {
        setTouched(true)
        if (!isValid) return
        onSubmit({
          educationLevel,
          careerStage,
          fieldOfStudy,
          institution: institution.trim() || undefined,
        })
      },
    }))

    return (
      <div>
        <StepHeader
          title="Where are you in your journey?"
          description="Half of what we index has an eligibility bar. This is how we clear you for it."
        />

        <div className="space-y-6">
          <StepField
            label="Highest education"
            error={touched && !educationLevel ? 'Pick your highest level' : undefined}
          >
            <OptionGrid
              options={EDUCATION_LEVELS}
              selected={educationLevel ? [educationLevel] : []}
              onToggle={(value) => { setEducationLevel(value); setTouched(false) }}
              columns={2}
            />
          </StepField>

          <StepField
            label="Career stage"
            error={touched && !careerStage ? 'Pick where you are right now' : undefined}
          >
            <OptionGrid
              options={CAREER_STAGES}
              selected={careerStage ? [careerStage] : []}
              onToggle={(value) => { setCareerStage(value); setTouched(false) }}
              columns={2}
            />
          </StepField>

          <StepField
            label="Field of study"
            error={touched && !fieldOfStudy ? 'Pick the closest match' : undefined}
          >
            <div className="flex flex-wrap gap-2">
              {FIELDS_OF_STUDY.map((field) => {
                const active = fieldOfStudy === field
                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => { setFieldOfStudy(field); setTouched(false) }}
                    aria-pressed={active}
                    className={
                      active
                        ? 'rounded-xl border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary'
                        : 'rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/90 transition-colors hover:bg-muted/50'
                    }
                  >
                    {field}
                  </button>
                )
              })}
            </div>
          </StepField>

          <StepField label="Institution" htmlFor="institution" optional>
            <Input
              id="institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="University of Lagos"
              className={stepInputClass}
            />
          </StepField>

          <StepPayoff>
            Scholarships and graduate programmes are gated on exactly these three answers.
          </StepPayoff>
        </div>
      </div>
    )
  },
)

EducationStep.displayName = 'EducationStep'

export default EducationStep
