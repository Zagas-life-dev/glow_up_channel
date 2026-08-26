'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

import { OptionGrid, StepHeader, StepPayoff } from './step-shell'

const OPTIONS = [
  { value: "Access to career opportunities", label: "Access to career opportunities" },
  { value: "Mentorship & guidance", label: "Mentorship & guidance" },
  { value: "Networking & professional connections", label: "Networking & professional connections" },
  { value: "Skill development", label: "Skill development" },
  { value: "Entrepreneurship support", label: "Entrepreneurship support" },
] as const

interface Props {
  onSubmit: (data: { aspirations: string[] }) => void
  initialData?: any
  onValidityChange?: (valid: boolean) => void
}

const AspirationsStep = forwardRef<any, Props>(({ onSubmit, initialData, onValidityChange }, ref) => {
  const [selected, setSelected] = useState<string[]>(initialData?.aspirations || [])

  const isValid = selected.length >= 1

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (!isValid) return
      onSubmit({ aspirations: selected })
    },
  }))

  const toggle = (value: string) =>
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  return (
    <div>
      <StepHeader title={'What do you want out of this?'} description={'The last question. This shapes what we push to you, not just what we show.'} />

      <div className="space-y-5">
        <OptionGrid options={OPTIONS} selected={selected} onToggle={toggle} columns={1} />

        <StepPayoff value={selected.length ? String(selected.length) : undefined}>
          {selected.length ? 'goals set. You can change any of this later in Settings.' : 'Pick at least one to continue.'}
        </StepPayoff>
      </div>
    </div>
  )
})

AspirationsStep.displayName = 'AspirationsStep'

export default AspirationsStep
