'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

import { OptionGrid, StepHeader, StepPayoff } from './step-shell'

const OPTIONS = [
  { value: "Technology", label: "Technology" },
  { value: "Creative Arts & Media", label: "Creative Arts & Media" },
  { value: "Business & Finance", label: "Business & Finance" },
  { value: "Healthcare & Sciences", label: "Healthcare & Sciences" },
  { value: "Education & Training", label: "Education & Training" },
  { value: "Government & Public Service", label: "Government & Public Service" },
] as const

interface Props {
  onSubmit: (data: { industrySectors: string[] }) => void
  initialData?: any
  onValidityChange?: (valid: boolean) => void
}

const IndustryStep = forwardRef<any, Props>(({ onSubmit, initialData, onValidityChange }, ref) => {
  const [selected, setSelected] = useState<string[]>(initialData?.industrySectors || [])

  const isValid = selected.length >= 1

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (!isValid) return
      onSubmit({ industrySectors: selected })
    },
  }))

  const toggle = (value: string) =>
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  return (
    <div>
      <StepHeader title={'Which industries?'} description={'We use this to filter out the listings that were never meant for you.'} />

      <div className="space-y-5">
        <OptionGrid options={OPTIONS} selected={selected} onToggle={toggle} columns={2} />

        <StepPayoff value={selected.length ? String(selected.length) : undefined}>
          {selected.length ? 'sectors selected. Everything else drops down your feed.' : 'Pick at least one to continue.'}
        </StepPayoff>
      </div>
    </div>
  )
})

IndustryStep.displayName = 'IndustryStep'

export default IndustryStep
