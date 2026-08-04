"use client"

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function AppTopBar() {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setIsMobile(mq.matches)
    const fn = () => setIsMobile(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  // Hide on certain pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/signup') ||
    pathname?.startsWith('/dashboard/provider/posting') || pathname?.startsWith('/onboarding')) {
    return null
  }

  // Mobile only: render empty bar for spacing (no items). Desktop: no top bar.
  if (!isMobile) {
    return null
  }

  return (
    // z-30: purely a safe-area backdrop with no content, so page-level sticky headers
    // (which carry their own safe-area padding) must be able to sit above it.
    <header
      className="fixed top-0 z-30 bg-page/95 backdrop-blur-md min-h-[1rem] pt-[env(safe-area-inset-top,0)]"
      aria-hidden="true"
    />
  )
}
