'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

import { OptionGrid, StepHeader, StepPayoff } from './step-shell'

const OPTIONS = [
  { value: "Jobs & Career Opportunities", label: "Jobs & Career Opportunities" },
  { value: "Scholarships & Grants", label: "Scholarships & Grants" },
  { value: "Training & Workshops", label: "Training & Workshops" },
  { value: "Networking Events", label: "Networking Events" },
  { value: "Volunteering & Community Service", label: "Volunteering & Community Service" },
  { value: "Entrepreneurship & Funding", label: "Entrepreneurship & Funding" },
  { value: "Remote Work & Digital Skills", label: "Remote Work & Digital Skills" },
] as const

interface Props {
  onSubmit: (data: { interests: string[] }) => void
  initialData?: any
  onValidityChange?: (valid: boolean) => void
}

const InterestsStep = forwardRef<any, Props>(({ onSubmit, initialData, onValidityChange }, ref) => {
  const [selected, setSelected] = useState<string[]>(initialData?.interests || [])

  const isValid = selected.length >= 1

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (!isValid) return
      onSubmit({ interests: selected })
    },
  }))

  const toggle = (value: string) =>
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  return (
    <div>
      <StepHeader title={'What are you here for?'} description={'Pick everything that applies. This is the strongest signal in your feed ranking.'} />

      <div className="space-y-5">
        <OptionGrid options={OPTIONS} selected={selected} onToggle={toggle} columns={1} />

        <StepPayoff value={selected.length ? String(selected.length) : undefined}>
          {selected.length ? 'categories selected. Your feed is built from these first.' : 'Pick at least one to continue.'}
        </StepPayoff>
      </div>
    </div>
  )
})

InterestsStep.displayName = 'InterestsStep'

export default InterestsStep
