"use client"

import { ReactNode, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { usePage } from '@/contexts/page-context'
import AppSidebar from './app-sidebar'
import AppBottomNav from './app-bottom-nav'
import AppTopBar from './app-top-bar'
import LockedInIndicator from './locked-in-indicator'

interface AppLayoutProps {
  children: ReactNode
}

const SIDEBAR_WIDTH_EXPANDED = 280
const SIDEBAR_WIDTH_COLLAPSED = 72

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const { hideNavbar, hideFooter } = usePage()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const fn = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const shouldShowNav = !hideNavbar && !hideFooter
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup') || 
                     pathname?.startsWith('/forgot-password') || pathname?.startsWith('/reset-password') ||
                     pathname?.startsWith('/verify-email') || pathname?.startsWith('/onboarding')

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED
  // When collapsed, add a tiny extra gap between the sidebar rail and content
  const contentMarginLeft = isDesktop
    ? sidebarWidth + (sidebarCollapsed ? 8 : 0)
    : 0

  // Full screen pages (no nav) — top padding + safe area for notch
  if (!shouldShowNav || isAuthPage) {
    return (
      <div className="min-h-screen bg-page text-foreground overflow-x-hidden w-full max-w-full pt-4 pt-safe">
        {children}
        <LockedInIndicator />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-page text-foreground overflow-x-hidden w-full max-w-full">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:block flex-shrink-0 fixed left-0 top-0 bottom-0 z-40 transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarWidth }}
      >
        <AppSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      </aside>

      {/* Main Content Area */}
      <div
        className="flex-1 min-h-screen flex flex-col w-full max-w-full overflow-x-hidden transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: contentMarginLeft }}
      >
        {/* Mobile only: empty top bar for spacing / safe area */}
        <div className="lg:hidden">
          <AppTopBar />
        </div>
        {/* Scrollable Content — top padding + safe area for notch */}
        <main className="flex-1 pb-24 lg:pb-8 pt-4 pt-safe w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <AppBottomNav />
      <LockedInIndicator />
    </div>
  )
}
