"use client"

import { ReactNode, useState, useEffect, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { usePage } from '@/contexts/page-context'
import { useCleanupPastContent } from '@/hooks/use-cleanup-past-content'
import AppSidebar from './app-sidebar'
import AppBottomNav from './app-bottom-nav'
import AppTopBar from './app-top-bar'
import LockedInIndicator from './locked-in-indicator'
import PushPromptBanner from './push-prompt-banner'
import SignUpBetterExperiencePopup from './sign-up-better-experience-popup'

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

  // Auto-trigger backend cleanup of past/expired events, opportunities, jobs (once per session)
  useCleanupPastContent()

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

  /** /channels/[slug] thread or /channels/[slug]/details: full-height layout, bottom tab hidden elsewhere */
  const isChannelFullBleed =
    !!pathname &&
    (/^\/channels\/(?!create$)[^/]+$/.test(pathname) || /^\/channels\/[^/]+\/details$/.test(pathname))

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
        <Suspense fallback={null}>
          <AppSidebar
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          />
        </Suspense>
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
        <main
          className={
            isChannelFullBleed
              ? "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden pt-4 pt-safe pb-0 w-full max-w-full"
              : "flex-1 pb-24 lg:pb-8 pt-4 pt-safe w-full max-w-full overflow-x-hidden"
          }
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <AppBottomNav />
      <PushPromptBanner />
      <SignUpBetterExperiencePopup />
      <LockedInIndicator />
    </div>
  )
}
