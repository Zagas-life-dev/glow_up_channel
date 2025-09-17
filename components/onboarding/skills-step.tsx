'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import SkillsInput from '@/components/ui/skills-input'
import { Star, Lightbulb } from 'lucide-react'

interface SkillsStepProps {
  onSubmit: (data: { skills: string[] }) => void
  initialData?: any
}

const SkillsStep = forwardRef<any, SkillsStepProps>(({ onSubmit, initialData }, ref) => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialData?.skills || [])

  useImperativeHandle(ref, () => ({
    submit: () => {
      onSubmit({ skills: selectedSkills })
    }
  }))

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Star className="h-8 w-8 text-orange-500 mr-2" />
          <h3 className="text-2xl font-semibold text-gray-900">What are your current skills?</h3>
        </div>
        <p className="text-gray-600 mb-2">Type your skills and we'll help you find the right ones.</p>
        <div className="flex items-center justify-center text-sm text-gray-500">
          <Lightbulb className="h-4 w-4 mr-1" />
          <span>Press Enter to add a skill, or click on suggestions</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <SkillsInput
          value={selectedSkills}
          onChange={setSelectedSkills}
          placeholder="Start typing your skills..."
          maxSkills={15}
        />
      </div>

      {/* Popular Skills Quick Add */}
      {selectedSkills.length === 0 && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-500 mb-3">Popular skills to get you started:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["JavaScript", "Python", "React", "Project Management", "Communication", "Leadership"].map(skill => (
                <button
                  key={skill}
                  onClick={() => setSelectedSkills(prev => [...prev, skill])}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700 rounded-full transition-colors"
                >
                  + {skill}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

SkillsStep.displayName = 'SkillsStep'

export default SkillsStep