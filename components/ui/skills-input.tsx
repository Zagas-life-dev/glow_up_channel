"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Plus, Search } from 'lucide-react'
import { cn } from "@/lib/utils"
import ApiClient from "@/lib/api-client"

interface SkillsInputProps {
  value: string[]
  onChange: (skills: string[]) => void
  placeholder?: string
  className?: string
  maxSkills?: number
  suggestions?: string[]
  onSearchSuggestions?: (query: string) => Promise<string[]>
}

const SkillsInput: React.FC<SkillsInputProps> = ({
  value = [],
  onChange,
  placeholder = "Type a skill and press Enter...",
  className,
  maxSkills = 20,
  suggestions = [],
  onSearchSuggestions
}) => {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionRef = useRef<HTMLDivElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Default skill suggestions
  const defaultSuggestions = [
    "JavaScript", "Python", "React", "Node.js", "TypeScript", "Java", "C++", "C#",
    "HTML", "CSS", "SQL", "MongoDB", "PostgreSQL", "AWS", "Docker", "Kubernetes",
    "Git", "Linux", "Machine Learning", "Data Science", "AI", "Blockchain",
    "Web Development", "Mobile Development", "UI/UX Design", "Graphic Design",
    "Digital Marketing", "Content Writing", "Project Management", "Sales",
    "Public Speaking", "Leadership", "Communication", "Problem Solving",
    "Critical Thinking", "Teamwork", "Time Management", "Analytics",
    "SEO", "Social Media", "Photography", "Video Editing", "Copywriting",
    "Customer Service", "Research", "Teaching", "Mentoring", "Networking"
  ]

  // Debounced search function
  const searchSuggestions = useCallback((query: string) => {
    if (query.trim()) {
      // Use local suggestions for all queries (API temporarily disabled)
      const queryLower = query.toLowerCase()
      const filtered = (suggestions.length > 0 ? suggestions : defaultSuggestions)
        .filter(skill => 
          skill.toLowerCase().includes(queryLower) && 
          !value.includes(skill)
        )
        .slice(0, 8)
      
      setFilteredSuggestions(filtered)
      setShowSuggestions(true)
      setIsLoading(false)
    } else {
      setFilteredSuggestions([])
      setShowSuggestions(false)
      setIsLoading(false)
    }
  }, [value, suggestions, defaultSuggestions])

  // Debounced effect for search
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      searchSuggestions(inputValue)
    }, 300) // 300ms debounce

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [inputValue, searchSuggestions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim()
    if (trimmedSkill && !value.includes(trimmedSkill) && value.length < maxSkills) {
      onChange([...value, trimmedSkill])
      setInputValue('')
      setShowSuggestions(false)
      inputRef.current?.focus()
    }
  }

  const removeSkill = (skillToRemove: string) => {
    onChange(value.filter(skill => skill !== skillToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim()) {
        addSkill(inputValue)
      } else if (filteredSuggestions.length > 0) {
        addSkill(filteredSuggestions[0])
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    addSkill(suggestion)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputFocus = () => {
    if (inputValue.trim()) {
      setShowSuggestions(true)
    }
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      if (!suggestionRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false)
      }
    }, 150)
  }

  return (
    <div className={cn("relative", className)}>
      {/* Skills Display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((skill, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="bg-orange-100 text-orange-800 hover:bg-orange-200 px-3 py-1 text-sm"
            >
              {skill}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2 h-4 w-4 p-0 hover:bg-orange-300"
                onClick={() => removeSkill(skill)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className="pl-10 pr-10"
            disabled={value.length >= maxSkills}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-4 py-2 text-left hover:bg-orange-50 focus:bg-orange-50 focus:outline-none flex items-center justify-between"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span className="text-sm text-gray-700">{suggestion}</span>
                <Plus className="h-4 w-4 text-orange-500" />
              </button>
            ))}
          </div>
        )}

        {/* No suggestions message */}
        {showSuggestions && filteredSuggestions.length === 0 && inputValue.trim() && !isLoading && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
            <p className="text-sm text-gray-500 text-center">
              Press Enter to add "{inputValue.trim()}"
            </p>
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          {value.length > 0 ? `${value.length} skill${value.length === 1 ? '' : 's'} selected` : 'No skills selected'}
        </span>
        <span>
          {value.length}/{maxSkills}
        </span>
      </div>
    </div>
  )
}

export default SkillsInput
