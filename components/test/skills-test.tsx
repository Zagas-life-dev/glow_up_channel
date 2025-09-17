"use client"

import React, { useState } from 'react'
import SkillsInput from '@/components/ui/skills-input'

const SkillsTest: React.FC = () => {
  const [skills, setSkills] = useState<string[]>([])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Skills Input Test</h1>
      <p className="text-gray-600 mb-6">Test the skills input component to ensure it works without infinite loops.</p>
      
      <SkillsInput
        value={skills}
        onChange={setSkills}
        placeholder="Type your skills..."
        maxSkills={10}
      />
      
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Selected Skills:</h3>
        <div className="text-sm text-gray-600">
          {skills.length > 0 ? skills.join(', ') : 'No skills selected'}
        </div>
      </div>
    </div>
  )
}

export default SkillsTest




