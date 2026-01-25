"use client"

import { useEffect } from 'react'
import { trackVisit } from '@/lib/tracking'

/**
 * Visit Tracker Component
 * 
 * Tracks when users visit the website (just open it)
 * This component should be added to the root layout
 * Completely silent - never throws errors
 */
export default function VisitTracker() {
  useEffect(() => {
    // Track visit when component mounts (app loads)
    // trackVisit is now a synchronous void function that never throws
    trackVisit()
  }, [])

  return null // This component doesn't render anything
}
