'use client'

/**
 * Skills, picked from the official list.
 *
 * Free typing produced 1,670 distinct profile skills — "graphic design",
 * "graphics design", "graphicdesign" — none of which reliably matched a
 * listing. Picking from the tag list means a skill here is the same id a
 * listing is tagged with. See components/tags/skill-picker.tsx.
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

import { SkillPicker } from '@/components/tags/skill-picker'
import { useLocale } from '@/lib/i18n/context'
import { TAG_BY_ID } from '@/lib/nlp/taxonomy'
import { labelFor } from '@/lib/taxonomy'
import { StepField, StepHeader, StepPayoff } from './step-shell'

const MAX_SKILLS = 15

/** Shown alongside the search: the skills most profiles already hold. */
const POPULAR = [
  'skill:communication',
  'skill:leadership',
  'skill:project-management',
  'skill:copywriting',
  'skill:python',
  'skill:graphic-design',
  'skill:data-analysis',
  'skill:customer-service',
]

interface SkillsStepProps {
  onSubmit: (data: { skills: string[] }) => void
  initialData?: any
  onValidityChange?: (valid: boolean) => void
}

const SkillsStep = forwardRef<any, SkillsStepProps>(({ onSubmit, initialData, onValidityChange }, ref) => {
  const { t, locale } = useLocale()
  const [skills, setSkills] = useState<string[]>(Array.isArray(initialData?.skills) ? initialData.skills : [])

  const isValid = skills.length >= 1

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (!isValid) return
      onSubmit({ skills })
    },
  }))

  const popular = POPULAR.map((id) => TAG_BY_ID.get(id)?.label).filter(
    (label): label is string => Boolean(label) && !skills.includes(label as string),
  )

  return (
    <div>
      <StepHeader title="What can you do?" description={t('onboarding.skillsHelp')} />

      <div className="space-y-5">
        <StepField label="Your skills">
          <SkillPicker value={skills} onChange={setSkills} max={MAX_SKILLS} />
        </StepField>

        {skills.length < MAX_SKILLS && popular.length > 0 && (
          <StepField label="Common ones" optional>
            <div className="flex flex-wrap gap-2">
              {POPULAR.filter((id) => popular.includes(TAG_BY_ID.get(id)?.label ?? '')).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSkills((prev) => [...prev, TAG_BY_ID.get(id)!.label])}
                  className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-up-border-hover hover:text-foreground"
                >
                  + {labelFor(id, locale)}
                </button>
              ))}
            </div>
          </StepField>
        )}

        <StepPayoff value={skills.length ? String(skills.length) : undefined}>
          {skills.length
            ? 'skills on file. Listings that ask for them will rank higher for you.'
            : 'Add at least one skill to continue.'}
        </StepPayoff>
      </div>
    </div>
  )
})

SkillsStep.displayName = 'SkillsStep'

export default SkillsStep
