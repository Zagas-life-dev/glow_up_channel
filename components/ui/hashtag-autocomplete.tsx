"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from "@/lib/utils"
import { RiHashtag, RiAtLine } from "react-icons/ri"

interface HashtagAutocompleteProps {
  text: string
  onTextChange: (text: string) => void
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
  className?: string
}

type AutocompleteMode = 'hashtag' | 'mention' | null

type SuggestionType = 'hashtag' | 'user' | 'channel'

interface Suggestion {
  type: SuggestionType
  slug: string
  label: string
  avatarUrl?: string
  secondaryLabel?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

export default function HashtagAutocomplete({ 
  text, 
  onTextChange, 
  textareaRef,
  className 
}: HashtagAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mode, setMode] = useState<AutocompleteMode>(null)
  const [query, setQuery] = useState('')
  const [startPos, setStartPos] = useState(-1)
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
        .map(s => s.trim().replace(/\s+/g, ''))
        .filter(s => {
          // Filter out empty strings and ensure no spaces
          return s.length > 0 && 
                 s.toLowerCase().includes(query.toLowerCase()) &&
                 !s.includes(' ')
        })
        .slice(0, 8)

      const structured: Suggestion[] = combined.map(slug => ({
        type: 'hashtag',
        slug,
        label: `#${slug}`
      }))

      setSuggestions(structured)
      setShowSuggestions(structured.length > 0)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Error fetching hashtag suggestions:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch mention suggestions (channels + users) for @
  const fetchMentionSuggestions = useCallback(async (query: string) => {
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

      // 1) Fetch channels
      const channelParams = new URLSearchParams()
      channelParams.append('search', query)
      channelParams.append('limit', '8')

      const channelRes = await fetch(
        `${API_BASE_URL}/api/channels?${channelParams.toString()}`,
        { headers }
      )

      let channelSuggestions: Suggestion[] = []
      if (channelRes.ok) {
        const channelData = await channelRes.json()
        const channels = channelData?.data?.channels || channelData?.channels || []
        channelSuggestions = Array.isArray(channels)
          ? channels
              .map((ch: any): Suggestion | null => {
                const slug = (ch.slug || ch.name || '').toString().trim()
                if (!slug) return null
                return {
                  type: 'channel',
                  slug,
                  label: slug
                }
              })
              .filter((s): s is Suggestion => s !== null)
          : []
      }

      // 2) Fetch users (for user mentions) via connections search
      let userSuggestions: Suggestion[] = []
      if (token) {
        const userParams = new URLSearchParams()
        userParams.append('q', query)
        userParams.append('limit', '8')

        const userRes = await fetch(
          `${API_BASE_URL}/api/connections/search?${userParams.toString()}`,
          { headers }
        )

        if (userRes.ok) {
          const userData = await userRes.json()
          const users = userData?.data?.users || userData?.users || []
          userSuggestions = Array.isArray(users)
            ? users
                .map((u: any) => {
                  const email = typeof u.email === 'string' ? u.email : ''
                  const emailLocal = email.includes('@') ? email.split('@')[0] : email

                  const firstName = typeof u.firstName === 'string' ? u.firstName.trim() : ''
                  const lastName = typeof u.lastName === 'string' ? u.lastName.trim() : ''
                  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

                  const mentionUsername = (u.mentionUsername && typeof u.mentionUsername === 'string'
                    ? u.mentionUsername
                    : emailLocal || fullName || '').trim()

                  const displayName = (u.displayName && typeof u.displayName === 'string'
                    ? u.displayName
                    : fullName || emailLocal || mentionUsername)

                  if (!mentionUsername) return null

                  return {
                    type: 'user' as const,
                    slug: mentionUsername,
                    label: displayName,
                    secondaryLabel: `@${mentionUsername}`,
                    avatarUrl: typeof u.profileImage === 'string' ? u.profileImage : undefined
                  } as Suggestion
                })
                .filter((s: Suggestion | null): s is Suggestion => !!s)
            : []
        }
      }

      // Combine channels + users into a single suggestion list and deduplicate by type+slug
      const mergedMap = new Map<string, Suggestion>()

      const all = [...channelSuggestions, ...userSuggestions]
        .filter(s => s.slug.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 20)

      for (const s of all) {
        const key = `${s.type}:${s.slug.toLowerCase()}`
        if (!mergedMap.has(key)) {
          mergedMap.set(key, s)
        }
      }

      const merged = Array.from(mergedMap.values()).slice(0, 12)

      setSuggestions(merged)
      setShowSuggestions(merged.length > 0)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Error fetching channel suggestions:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Detect hashtag or channel input and show suggestions
  useEffect(() => {
    if (!textareaRef?.current) return

    const textarea = textareaRef.current
    const cursorPos = textarea.selectionStart

    const textBeforeCursor = text.substring(0, cursorPos)
    const lastHashIndex = textBeforeCursor.lastIndexOf('#')
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    const lastSpaceIndex = textBeforeCursor.lastIndexOf(' ')
    const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n')
    const boundary = Math.max(lastSpaceIndex, lastNewlineIndex)

    let activeMode: AutocompleteMode = null
    let triggerIndex = -1

    if (lastAtIndex !== -1 && lastAtIndex > boundary && lastAtIndex >= lastHashIndex) {
      activeMode = 'mention'
      triggerIndex = lastAtIndex
    } else if (lastHashIndex !== -1 && lastHashIndex > boundary) {
      activeMode = 'hashtag'
      triggerIndex = lastHashIndex
    }

    if (activeMode && triggerIndex !== -1) {
      const q = textBeforeCursor.substring(triggerIndex + 1, cursorPos)
      setMode(activeMode)
      setQuery(q)
      setStartPos(triggerIndex)

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      debounceTimeoutRef.current = setTimeout(() => {
        if (activeMode === 'hashtag') {
          fetchHashtagSuggestions(q)
        } else if (activeMode === 'mention') {
          fetchMentionSuggestions(q)
        }
      }, 300)
    } else {
      setShowSuggestions(false)
      setMode(null)
      setQuery('')
      setStartPos(-1)
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [text, textareaRef, fetchHashtagSuggestions, fetchMentionSuggestions])

  // Insert selected token (#hashtag or @mention)
  const insertToken = useCallback(
    (suggestion: Suggestion) => {
      if (!textareaRef?.current || startPos === -1 || !mode) return

      const textarea = textareaRef.current
      const beforeTrigger = text.substring(0, startPos + 1)
      const afterCursor = text.substring(textarea.selectionStart)

      // We already have the trigger in the text (# or @); insert the clean slug
      const value = suggestion.slug
      const newText = beforeTrigger + value + ' ' + afterCursor
      onTextChange(newText)

      // Move cursor after the inserted token
      setTimeout(() => {
        const newCursorPos = startPos + 1 + value.length + 1
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      }, 0)

      setShowSuggestions(false)
      setMode(null)
      setQuery('')
      setStartPos(-1)
    },
    [text, startPos, mode, onTextChange, textareaRef]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault()
          insertToken(suggestions[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
    },
    [showSuggestions, suggestions, selectedIndex, insertToken]
  )

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
    if (!textareaRef?.current || startPos === -1) {
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
        "fixed z-50 bg-gray-900 border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto",
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
        <div className="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
      ) : (
        suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.type}-${suggestion.slug}-${index}`}
            type="button"
            onClick={() => insertToken(suggestion)}
            className={cn(
              "w-full px-4 py-2 text-left hover:bg-primary/10 focus:bg-primary/10 focus:outline-none flex items-center gap-2 transition-colors",
              index === selectedIndex && "bg-primary/10"
            )}
          >
            {suggestion.type === 'hashtag' ? (
              <RiHashtag className="w-3 h-3 text-primary" aria-hidden />
            ) : (
              <RiAtLine className="w-3 h-3 text-primary" aria-hidden />
            )}
            <div className="flex items-center gap-2">
              {suggestion.type === 'user' && suggestion.avatarUrl && (
                // Simple avatar circle; more advanced avatar component can be used later
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={suggestion.avatarUrl}
                  alt={suggestion.label}
                  className="w-5 h-5 rounded-full object-cover"
                />
              )}
              <div className="flex flex-col">
                <span className="text-sm text-foreground font-medium">
                  {suggestion.label}
                </span>
                {suggestion.secondaryLabel && (
                  <span className="text-xs text-muted-foreground">
                    {suggestion.secondaryLabel}
                  </span>
                )}
                <span className="mt-0.5 inline-flex items-center rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {suggestion.type === 'user'
                    ? 'User'
                    : suggestion.type === 'channel'
                    ? 'Channel'
                    : 'Hashtag'}
                </span>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  )
}

