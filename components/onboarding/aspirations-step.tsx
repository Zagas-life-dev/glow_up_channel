'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const aspirationsList = [
  "Access to career opportunities",
  "Mentorship & guidance",
  "Networking & professional connections",
  "Skill development",
  "Entrepreneurship support"
]

interface AspirationsStepProps {
  onSubmit: (data: { aspirations: string[] }) => void
  initialData?: any
}

const AspirationsStep = forwardRef<any, AspirationsStepProps>(({ onSubmit, initialData }, ref) => {
  const [selectedAspirations, setSelectedAspirations] = useState<string[]>(initialData?.aspirations || [])

  const toggleAspiration = (aspiration: string) => {
    setSelectedAspirations(prev =>
      prev.includes(aspiration)
        ? prev.filter(item => item !== aspiration)
        : [...prev, aspiration]
    )
  }

  useImperativeHandle(ref, () => ({
    submit: () => {
      onSubmit({ aspirations: selectedAspirations })
    }
  }))

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-gray-900">What do you want to gain from GlowUp Channel?</h3>
        <p className="mt-2 text-gray-600">Select all that apply. This helps us align with your goals.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {aspirationsList.map(aspiration => (
          <button
            key={aspiration}
            onClick={() => toggleAspiration(aspiration)}
            className={cn(
              "relative flex items-center justify-center p-4 h-24 text-center rounded-xl border-2 transition-all duration-200",
              selectedAspirations.includes(aspiration)
                ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
            )}
          >
            {selectedAspirations.includes(aspiration) && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center">
                <Check className="h-3 w-3" />
              </div>
            )}
            {aspiration}
          </button>
        ))}
      </div>
    </div>
  )
})

AspirationsStep.displayName = 'AspirationsStep'

export default AspirationsStep 