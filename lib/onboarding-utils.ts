// Utility functions for onboarding data transformation

// Map frontend form data to backend-expected format
export function transformOnboardingData(formData: any) {
  // Map career stages from frontend to backend format
  const careerStageMap: { [key: string]: string } = {
    'student': 'Student',
    'entry-level': 'Entry-Level (0-2 years)',
    'mid-career': 'Mid-Career (3-7 years)',
    'senior-executive': 'Senior/Executive (8+ years)'
  };

  // Map education levels from frontend to backend format
  const educationLevelMap: { [key: string]: string } = {
    'high-school': 'High School',
    'undergraduate': 'Undergraduate',
    'graduate': 'Graduate',
    'professional': 'Professional'
  };

  // Map interests from frontend to backend format
  const interestsMap: { [key: string]: string } = {
    'jobs-career-opportunities': 'Jobs & Career Opportunities',
    'scholarships-grants': 'Scholarships & Grants',
    'training-workshops': 'Training & Workshops',
    'networking-events': 'Networking Events',
    'volunteering-community-service': 'Volunteering & Community Service',
    'entrepreneurship-funding': 'Entrepreneurship & Funding',
    'remote-work-digital-skills': 'Remote Work & Digital Skills',
    'research-opportunities': 'Research & Academic Opportunities',
    'international-programs': 'International Exchange Programs'
  };

  // Map industry sectors from frontend to backend format
  const industrySectorsMap: { [key: string]: string } = {
    'technology': 'Technology',
    'creative-arts-media': 'Creative Arts & Media',
    'business-finance': 'Business & Finance',
    'healthcare-sciences': 'Healthcare & Sciences',
    'education-training': 'Education & Training',
    'government-public-service': 'Government & Public Service'
  };

  // Map aspirations from frontend to backend format
  const aspirationsMap: { [key: string]: string } = {
    'access-career-opportunities': 'Access to career opportunities',
    'mentorship-guidance': 'Mentorship & guidance',
    'networking-professional-connections': 'Networking & professional connections',
    'skill-development': 'Skill development',
    'entrepreneurship-support': 'Entrepreneurship support'
  };

  return {
    country: formData.country || '',
    province: formData.province || '',
    city: formData.city || undefined,
    careerStage: careerStageMap[formData.careerStage] || formData.careerStage,
    interests: (formData.interests || []).map((interest: string) => 
      interestsMap[interest] || interest
    ),
    industrySectors: (formData.industrySectors || []).map((sector: string) => 
      industrySectorsMap[sector] || sector
    ),
    educationLevel: educationLevelMap[formData.educationLevel] || formData.educationLevel,
    fieldOfStudy: formData.fieldOfStudy || undefined,
    institution: formData.institution || undefined,
    skills: formData.skills || [],
    aspirations: (formData.aspirations || []).map((aspiration: string) => 
      aspirationsMap[aspiration] || aspiration
    )
  };
}

// Validate required fields before submission
export function validateOnboardingData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.country) errors.push('Country is required');
  if (!data.province) errors.push('Province/State is required');
  if (!data.careerStage) errors.push('Career stage is required');
  if (!data.interests || data.interests.length === 0) errors.push('At least one interest is required');
  if (!data.industrySectors || data.industrySectors.length === 0) errors.push('At least one industry sector is required');
  if (!data.educationLevel) errors.push('Education level is required');
  if (!data.aspirations || data.aspirations.length === 0) errors.push('At least one aspiration is required');

  return {
    isValid: errors.length === 0,
    errors
  };
}

