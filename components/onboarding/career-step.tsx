'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { FlaticonIcon } from '@/components/ui/flaticon-icon'
import { cn } from '@/lib/utils'

const careerStages = [
  "Student",
  "Entry-Level (0-2 years)",
  "Mid-Career (3-7 years)",
  "Senior/Executive (8+ years)",
]

interface CareerStepProps {
  onSubmit: (data: { careerStage: string }) => void
  initialData?: any
}

const CareerStep = forwardRef<any, CareerStepProps>(({ onSubmit, initialData }, ref) => {
  const [selectedStage, setSelectedStage] = useState<string>(initialData?.careerStage || '')

  const handleSelectStage = (stage: string) => {
    setSelectedStage(stage)
  }

  useImperativeHandle(ref, () => ({
    submit: () => {
      if (selectedStage) {
        onSubmit({ careerStage: selectedStage })
      }
    }
  }))

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-foreground">What's your current career stage?</h3>
        <p className="mt-2 text-gray-600">This helps us understand your experience level.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {careerStages.map(stage => (
          <button
            key={stage}
            onClick={() => handleSelectStage(stage)}
            className={cn(
              "relative flex items-center justify-center p-4 h-20 text-center rounded-xl border-2 transition-all duration-200",
              selectedStage === stage
                ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                : "bg-card hover:bg-gray-50 border-gray-200 text-gray-700"
            )}
          >
            {selectedStage === stage && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-foreground rounded-full flex items-center justify-center">
                <FlaticonIcon name="check" className="h-3 w-3" aria-hidden />
              </div>
            )}
            {stage}
          </button>
        ))}
      </div>
    </div>
  )
})

CareerStep.displayName = 'CareerStep'

export default CareerStep 