"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Hash, X } from 'lucide-react'
import { cn } from "@/lib/utils"

interface HashtagAutocompleteProps {
  text: string
  onTextChange: (text: string) => void
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
  className?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export default function HashtagAutocomplete({ 
  text, 
  onTextChange, 
  textareaRef,
  className 
}: HashtagAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [hashtagQuery, setHashtagQuery] = useState('')
  const [hashtagStartPos, setHashtagStartPos] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch hashtag suggestions
  const fetchHashtagSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Fetch hashtag suggestions
      const hashtagResponse = await fetch(
        `${API_BASE_URL}/api/hashtags/suggestions?q=${encodeURIComponent(query)}`,
        { headers }
      )

      let hashtagSuggestions: string[] = []
      if (hashtagResponse.ok) {
        const hashtagData = await hashtagResponse.json()
        if (hashtagData.success && hashtagData.suggestions) {
          hashtagSuggestions = hashtagData.suggestions
        }
      }

      // Also fetch skills (since hashtags can be skills)
      const skillsResponse = await fetch(
        `${API_BASE_URL}/api/skills/suggestions?q=${encodeURIComponent(query)}`,
        { headers }
      )

      let skillSuggestions: string[] = []
      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json()
        if (skillsData.success && skillsData.suggestions) {
          skillSuggestions = skillsData.suggestions
        }
      }

      // Combine and deduplicate, removing spaces from all suggestions
      const allSuggestions = new Set([
        ...hashtagSuggestions.map(s => s.replace(/\s+/g, '')),
        ...skillSuggestions.map(s => s.replace(/\s+/g, ''))
      ])
      const combined = Array.from(allSuggestions)
        .filter(s => {
          // Filter out empty strings and ensure no spaces
          const cleaned = s.trim().replace(/\s+/g, '')
          return cleaned.length > 0 && 
                 cleaned.toLowerCase().includes(query.toLowerCase()) &&
                 !cleaned.includes(' ')
        })
        .slice(0, 8)

      setSuggestions(combined)
      setShowSuggestions(combined.length > 0)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Error fetching hashtag suggestions:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Detect hashtag input and show suggestions
  useEffect(() => {
    if (!textareaRef?.current) return

    const textarea = textareaRef.current
    const cursorPos = textarea.selectionStart

    // Find the current word being typed (checking for #)
    const textBeforeCursor = text.substring(0, cursorPos)
    const lastHashIndex = textBeforeCursor.lastIndexOf('#')
    const lastSpaceIndex = textBeforeCursor.lastIndexOf(' ')
    const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n')

    // Check if we're typing a hashtag (after # and before space/newline)
    if (lastHashIndex !== -1 && lastHashIndex > Math.max(lastSpaceIndex, lastNewlineIndex)) {
      const query = textBeforeCursor.substring(lastHashIndex + 1, cursorPos)
      setHashtagQuery(query)
      setHashtagStartPos(lastHashIndex)

      // Debounce the search
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      debounceTimeoutRef.current = setTimeout(() => {
        fetchHashtagSuggestions(query)
      }, 300)
    } else {
      setShowSuggestions(false)
      setHashtagQuery('')
      setHashtagStartPos(-1)
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [text, textareaRef, fetchHashtagSuggestions])

  // Insert selected hashtag
  const insertHashtag = useCallback((hashtag: string) => {
    if (!textareaRef?.current || hashtagStartPos === -1) return

    const textarea = textareaRef.current
    const beforeHashtag = text.substring(0, hashtagStartPos + 1)
    const afterCursor = text.substring(textarea.selectionStart)
    
    // Remove the partial hashtag query and insert the selected one
    const newText = beforeHashtag + hashtag + ' ' + afterCursor
    onTextChange(newText)

    // Move cursor after the inserted hashtag
    setTimeout(() => {
      const newCursorPos = hashtagStartPos + 1 + hashtag.length + 1
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)

    setShowSuggestions(false)
    setHashtagQuery('')
    setHashtagStartPos(-1)
  }, [text, hashtagStartPos, onTextChange, textareaRef])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault()
        insertHashtag(suggestions[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }, [showSuggestions, suggestions, selectedIndex, insertHashtag])

  // Expose keyboard handler to parent
  useEffect(() => {
    if (!textareaRef?.current) return

    const textarea = textareaRef.current
    const handleKeyDownEvent = (e: KeyboardEvent) => {
      handleKeyDown(e as any)
    }

    textarea.addEventListener('keydown', handleKeyDownEvent)
    return () => {
      textarea.removeEventListener('keydown', handleKeyDownEvent)
    }
  }, [textareaRef, handleKeyDown])

  // Get position for suggestions dropdown
  const getSuggestionsPosition = () => {
    if (!textareaRef?.current || hashtagStartPos === -1) {
      return { top: 0, left: 0, visible: false }
    }

    const textarea = textareaRef.current
    const rect = textarea.getBoundingClientRect()
    
    // Simple positioning: show below the textarea near cursor
    return {
      top: rect.bottom + 4,
      left: rect.left,
      visible: true
    }
  }

  if (!showSuggestions || suggestions.length === 0) {
    return null
  }

  const position = getSuggestionsPosition()
  if (!position.visible) {
    return null
  }

  return (
    <div
      ref={suggestionsRef}
      className={cn(
        "fixed z-50 bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto",
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '200px',
        maxWidth: '300px'
      }}
    >
      {isLoading ? (
        <div className="px-4 py-2 text-sm text-white/60">Loading...</div>
      ) : (
        suggestions.map((suggestion, index) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => insertHashtag(suggestion)}
            className={cn(
              "w-full px-4 py-2 text-left hover:bg-orange-500/10 focus:bg-orange-500/10 focus:outline-none flex items-center gap-2 transition-colors",
              index === selectedIndex && "bg-orange-500/10"
            )}
          >
            <Hash className="w-3 h-3 text-orange-400" />
            <span className="text-sm text-white">{suggestion}</span>
          </button>
        ))
      )}
    </div>
  )
}

