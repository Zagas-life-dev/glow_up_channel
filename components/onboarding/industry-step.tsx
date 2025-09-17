'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const industriesList = [
  "Technology",
  "Creative Arts & Media",
  "Business & Finance",
  "Healthcare & Sciences",
  "Education & Training",
  "Government & Public Service"
]

interface IndustryStepProps {
  onSubmit: (data: { industrySectors: string[] }) => void
  initialData?: any
}

const IndustryStep = forwardRef<any, IndustryStepProps>(({ onSubmit, initialData }, ref) => {
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(initialData?.industrySectors || [])

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries(prev =>
      prev.includes(industry)
        ? prev.filter(item => item !== industry)
        : [...prev, industry]
    )
  }

  useImperativeHandle(ref, () => ({
    submit: () => {
      onSubmit({ industrySectors: selectedIndustries })
    }
  }))

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-gray-900">What industry are you in or interested in?</h3>
        <p className="mt-2 text-gray-600">This helps us recommend relevant content.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {industriesList.map(industry => (
          <button
            key={industry}
            onClick={() => toggleIndustry(industry)}
            className={cn(
              "relative flex items-center justify-center p-4 h-24 text-center rounded-xl border-2 transition-all duration-200",
              selectedIndustries.includes(industry)
                ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
            )}
          >
            {selectedIndustries.includes(industry) && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center">
                <Check className="h-3 w-3" />
              </div>
            )}
            {industry}
          </button>
        ))}
      </div>
    </div>
  )
})

IndustryStep.displayName = 'IndustryStep'

export default IndustryStep 