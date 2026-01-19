"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Globe, Target, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

export default function AppBottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const navItems = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Community', icon: Globe, path: '/community' },
    { name: 'Post', icon: Plus, path: '/post' },
    { name: 'Search', icon: Search, path: '/search' },
    { name: 'Profile', icon: User, path: user ? `/profile/${user._id}` : '/login' },
  ]

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    if (path.startsWith('/profile')) return pathname?.startsWith('/profile')
    return pathname?.startsWith(path)
  }

  // Hide on certain pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/signup') || 
      pathname?.startsWith('/dashboard/posting') || pathname?.startsWith('/onboarding') ||
      pathname?.startsWith('/post')) {
    return null
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Gradient fade effect */}
      <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
      
      <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.06] px-2 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const active = isActive(item.path)
            const isCenter = index === 2
            
            // Center position is now for regular posting (not provider posting)
            // Provider posting is accessed from dashboard
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className="flex flex-col items-center justify-center flex-1 py-2"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  active && "bg-white/10"
                )}>
                  <Icon className={cn(
                    "w-5 h-5 transition-colors duration-200",
                    active ? "text-orange-500" : "text-white/50"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium mt-0.5 transition-colors duration-200",
                  active ? "text-orange-500" : "text-white/50"
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
