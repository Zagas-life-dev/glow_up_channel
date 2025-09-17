'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const interestsList = [
  "Jobs & Career Opportunities",
  "Scholarships & Grants",
  "Training & Workshops",
  "Networking Events",
  "Volunteering & Community Service",
  "Entrepreneurship & Funding",
  "Remote Work & Digital Skills",
]

interface InterestsStepProps {
  onSubmit: (data: { interests: string[] }) => void
  initialData?: any
}

const InterestsStep = forwardRef<any, InterestsStepProps>(({ onSubmit, initialData }, ref) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(initialData?.interests || [])

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(item => item !== interest)
        : [...prev, interest]
    )
  }

  useImperativeHandle(ref, () => ({
    submit: () => {
      onSubmit({ interests: selectedInterests })
    }
  }))

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-gray-900">What are you looking for?</h3>
        <p className="mt-2 text-gray-600">Select all that apply. This will help us tailor content for you.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {interestsList.map(interest => (
          <button
            key={interest}
            onClick={() => toggleInterest(interest)}
            className={cn(
              "relative flex items-center justify-center p-4 h-24 text-center rounded-xl border-2 transition-all duration-200",
              selectedInterests.includes(interest)
                ? "bg-orange-50 border-orange-500 text-orange-700 font-semibold"
                : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
            )}
          >
            {selectedInterests.includes(interest) && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center">
                <Check className="h-3 w-3" />
              </div>
            )}
            {interest}
          </button>
        ))}
      </div>
    </div>
  )
})

InterestsStep.displayName = 'InterestsStep'

export default InterestsStep 