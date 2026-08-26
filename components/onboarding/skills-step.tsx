'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { RiCloseLine } from 'react-icons/ri'

import SkillsInput from '@/components/ui/skills-input'
import { StepField, StepHeader, StepPayoff } from './step-shell'

const POPULAR = ['JavaScript', 'Python', 'React', 'Project Management', 'Communication', 'Leadership']

interface SkillsStepProps {
  onSubmit: (data: { skills: string[] }) => void
  initialData?: any
  onValidityChange?: (valid: boolean) => void
}

const SkillsStep = forwardRef<any, SkillsStepProps>(({ onSubmit, initialData, onValidityChange }, ref) => {
  const [skills, setSkills] = useState<string[]>(initialData?.skills || [])

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

  const addSkill = (skill: string) => {
    setSkills((prev) => (prev.includes(skill) ? prev : [...prev, skill]))
  }

  return (
    <div>
      <StepHeader
        title="What can you do?"
        description="Skills are matched against listing requirements directly. Add at least one."
      />

      <div className="space-y-5">
        <StepField label="Your skills">
          <SkillsInput
            value={skills}
            onChange={setSkills}
            placeholder="Start typing a skill…"
            maxSkills={15}
          />
        </StepField>

        {/* Suggestions stay available after the first skill — the old step hid them once you
            had one, which is exactly when people are still thinking of more. */}
        {skills.length < 15 && (
          <StepField label="Common ones" optional>
            <div className="flex flex-wrap gap-2">
              {POPULAR.filter((skill) => !skills.includes(skill)).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => addSkill(skill)}
                  className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  + {skill}
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
