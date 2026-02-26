"use client"

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from './navbar'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const isAuthPage =
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/verify-email') ||
    pathname?.startsWith('/onboarding')

  // Full-screen pages: no navbar
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-page text-foreground overflow-x-hidden w-full max-w-full pt-4 pt-safe">
        {children}
      </div>
    )
  }

  // Home and Privacy Policy: minimal navbar + content
  return (
    <div className="min-h-screen bg-page text-foreground overflow-x-hidden w-full max-w-full">
      <Navbar />
      <div className="pt-24 sm:pt-28 pb-8 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}
