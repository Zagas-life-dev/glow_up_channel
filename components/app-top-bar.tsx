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
    pathname?.startsWith('/dashboard/posting') || pathname?.startsWith('/onboarding')) {
    return null
  }

  // Mobile only: render empty bar for spacing (no items). Desktop: no top bar.
  if (!isMobile) {
    return null
  }

  return (
    <header
      className="sticky top-0 z-40 bg-page/95 backdrop-blur-md min-h-[1rem] pt-[env(safe-area-inset-top,0)]"
      aria-hidden="true"
    />
  )
}
