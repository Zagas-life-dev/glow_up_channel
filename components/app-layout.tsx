"use client"

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { usePage } from '@/contexts/page-context'
import AppSidebar from './app-sidebar'
import AppBottomNav from './app-bottom-nav'
import AppTopBar from './app-top-bar'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const { hideNavbar, hideFooter } = usePage()
  
  const shouldShowNav = !hideNavbar && !hideFooter
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup') || 
                     pathname?.startsWith('/forgot-password') || pathname?.startsWith('/reset-password') ||
                     pathname?.startsWith('/verify-email') || pathname?.startsWith('/onboarding')

  // Full screen pages (no nav)
  if (!shouldShowNav || isAuthPage) {
    return <div className="min-h-screen bg-[#0a0a0a]">{children}</div>
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[280px] flex-shrink-0 fixed left-0 top-0 bottom-0 z-40">
        <AppSidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-[280px] min-h-screen flex flex-col">
        {/* Top Bar */}
        <AppTopBar />
        
        {/* Scrollable Content */}
        <main className="flex-1 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <AppBottomNav />
    </div>
  )
}
