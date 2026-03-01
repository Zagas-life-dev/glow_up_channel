"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RiHomeLine, RiGlobalLine, RiAddLine, RiUserLine, RiHashtag } from 'react-icons/ri'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

const navItems = [
  { name: 'Home', icon: RiHomeLine, path: '/' },
  
  { name: 'Community', icon: RiGlobalLine, path: '/community' },
  { name: 'Post', icon: RiAddLine, path: '/post' },
  { name: 'Channels', icon: RiHashtag, path: '/channels' },
  { name: 'Profile', icon: RiUserLine, path: '/profile' },
]

export default function AppBottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const items = navItems.map((item) => ({
    ...item,
    path: item.name === 'Profile' ? (user ? `/profile/${user._id}` : '/login') : item.path,
  }))

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    if (path.startsWith('/profile')) return pathname?.startsWith('/profile')
    return pathname?.startsWith(path)
  }

  // Hide on certain pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/signup') || 
      pathname?.startsWith('/dashboard/provider/posting') || pathname?.startsWith('/onboarding') ||
      pathname?.startsWith('/post')) {
    return null
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Gradient fade: white in light mode, dark in dark mode */}
      <div className="absolute inset-x-0  -top-3 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="bg-page/95 backdrop-blur-xl border-t border-border px-2 pb-4 pb-safe">
        <div className="flex items-center justify-around h-17">
          {items.map((item) => {
            const active = isActive(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.path + item.name}
                href={item.path}
                className="flex flex-col items-center justify-center flex-1 pb-6 pt-2"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  active && "bg-muted"
                )}>
                  <Icon
                    className={cn(
                      "w-6 h-6 transition-colors duration-200",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-hidden
                  />
                </div>
                <span className={cn(
                  "text-[12px] font-medium mt-0.5 transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground"
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
